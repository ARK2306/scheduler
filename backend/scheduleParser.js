const XLSX = require('xlsx');

class ScheduleParser {
  constructor() {
    this.timeSlots = [
      '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
    ];
    this.daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }

  parseScheduleFile(buffer, filename) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Extract employee name from filename
      // Handle format: "Graduate and Undergraduate Team Lead Schedule Fall 2025_INSERT NAME.xlsx"
      let employeeName = filename.replace(/\.[^/.]+$/, ""); // Remove extension
      
      if (employeeName.includes('_INSERT NAME')) {
        // For template files, use a placeholder name
        employeeName = "Employee_" + Date.now();
      } else if (employeeName.includes('_')) {
        // Extract name after the last underscore (assuming format: "...Schedule Fall 2025_John Doe")
        const parts = employeeName.split('_');
        employeeName = parts[parts.length - 1].trim();
      } else {
        // Fallback: use filename as-is
        employeeName = employeeName;
      }
      
      // Parse the schedule data
      const schedule = this.extractScheduleData(worksheet);
      
      return {
        employeeName,
        schedule,
        filename
      };
    } catch (error) {
      console.error('Error parsing schedule file:', error);
      throw new Error(`Failed to parse ${filename}: ${error.message}`);
    }
  }

  extractScheduleData(worksheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const schedule = {};

    // Initialize schedule structure
    this.daysOfWeek.forEach(day => {
      schedule[day] = {};
      this.timeSlots.forEach(time => {
        schedule[day][time] = {
          available: false,
          preference: 'none' // 'high', 'medium', 'low', 'none'
        };
      });
    });

    // Find the header row and column positions
    const headers = this.findHeaders(worksheet, range);
    
    if (!headers.timeColumn || !headers.dayColumns) {
      console.warn('Could not find proper headers in schedule');
      return schedule;
    }

    // Parse each time slot
    for (let row = headers.dataStartRow; row <= range.e.r; row++) {
      const timeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: headers.timeColumn })];
      if (!timeCell || !timeCell.v) continue;

      const timeSlot = this.normalizeTimeSlot(timeCell.v);
      if (!this.timeSlots.includes(timeSlot)) continue;

      // Check each day column for availability and color
      Object.entries(headers.dayColumns).forEach(([day, col]) => {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
        
        if (cell) {
          // Check if cell has content (indicating availability)
          const hasContent = cell.v !== undefined && cell.v !== null && cell.v !== '';
          
          if (hasContent) {
            schedule[day][timeSlot].available = true;
            
            // Extract color preference from cell formatting
            const preference = this.extractColorPreference(cell);
            schedule[day][timeSlot].preference = preference;
          }
        }
      });
    }

    return schedule;
  }

  findHeaders(worksheet, range) {
    let timeColumn = null;
    const dayColumns = {};
    let dataStartRow = null;

    // Look for headers in the first few rows
    for (let row = 0; row <= Math.min(5, range.e.r); row++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell || !cell.v) continue;

        const cellValue = cell.v.toString().toLowerCase().trim();

        // Look for time column
        if (cellValue.includes('time') || cellValue.includes('hour')) {
          timeColumn = col;
          dataStartRow = row + 1;
        }

        // Look for day columns
        this.daysOfWeek.forEach(day => {
          if (cellValue.includes(day.toLowerCase())) {
            dayColumns[day] = col;
          }
        });
      }
    }

    return { timeColumn, dayColumns, dataStartRow };
  }

  normalizeTimeSlot(timeString) {
    // Convert various time formats to standard format
    const time = timeString.toString().trim();
    
    // Handle different time formats
    if (time.match(/^\d{1,2}:\d{2}$/)) {
      // Convert 24-hour to 12-hour format
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    
    // Return as-is if already in correct format
    return time;
  }

  extractColorPreference(cell) {
    // Extract color preference from cell formatting
    // This is a simplified version - Excel color extraction can be complex
    
    if (cell.s && cell.s.fgColor) {
      const color = cell.s.fgColor;
      
      // Map colors to preference levels
      if (color.rgb) {
        const rgb = color.rgb.toLowerCase();
        
        // Green shades - high preference
        if (rgb.includes('00ff00') || rgb.includes('008000')) {
          return 'high';
        }
        // Yellow shades - medium preference
        if (rgb.includes('ffff00') || rgb.includes('ffa500')) {
          return 'medium';
        }
        // Red shades - low preference
        if (rgb.includes('ff0000') || rgb.includes('800000')) {
          return 'low';
        }
      }
    }

    // Check background color as well
    if (cell.s && cell.s.bgColor) {
      const color = cell.s.bgColor;
      
      if (color.rgb) {
        const rgb = color.rgb.toLowerCase();
        
        if (rgb.includes('00ff00') || rgb.includes('90ee90')) {
          return 'high';
        }
        if (rgb.includes('ffff00') || rgb.includes('ffffe0')) {
          return 'medium';
        }
        if (rgb.includes('ff0000') || rgb.includes('ffc0c0')) {
          return 'low';
        }
      }
    }

    return 'medium'; // default preference if available
  }
}

module.exports = ScheduleParser;