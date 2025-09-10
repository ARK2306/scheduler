class ScheduleGenerator {
  constructor() {
    this.timeSlots = [
      '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
    ];
    this.daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }

  generateWeeklySchedule(employeeSchedules, shiftsPerEmployee) {
    // Initialize the master schedule
    const masterSchedule = this.initializeMasterSchedule();
    
    // Create assignment tracking
    const assignments = {};
    employeeSchedules.forEach(emp => {
      assignments[emp.employeeName] = {
        assignedShifts: 0,
        targetShifts: shiftsPerEmployee[emp.employeeName] || 3,
        assignments: []
      };
    });

    // Sort employees by target shifts (ascending) to prioritize those with fewer required shifts
    const sortedEmployees = employeeSchedules.sort((a, b) => {
      const aTarget = shiftsPerEmployee[a.employeeName] || 3;
      const bTarget = shiftsPerEmployee[b.employeeName] || 3;
      return aTarget - bTarget;
    });

    // Generate assignments using priority-based algorithm
    this.assignShifts(sortedEmployees, masterSchedule, assignments);

    // Optimize schedule for better distribution
    this.optimizeSchedule(masterSchedule, assignments);

    return {
      schedule: masterSchedule,
      assignments: assignments,
      summary: this.generateSummary(assignments)
    };
  }

  initializeMasterSchedule() {
    const schedule = {};
    this.daysOfWeek.forEach(day => {
      schedule[day] = {};
      this.timeSlots.forEach(time => {
        schedule[day][time] = {
          assigned: null,
          candidates: [],
          priority: 0
        };
      });
    });
    return schedule;
  }

  assignShifts(employees, masterSchedule, assignments) {
    // Create a list of all possible shifts with priorities
    const allShifts = [];
    
    this.daysOfWeek.forEach(day => {
      this.timeSlots.forEach(time => {
        employees.forEach(employee => {
          const empSchedule = employee.schedule;
          if (empSchedule[day] && empSchedule[day][time] && empSchedule[day][time].available) {
            const preference = empSchedule[day][time].preference;
            const priority = this.getPreferencePriority(preference);
            
            allShifts.push({
              day,
              time,
              employee: employee.employeeName,
              priority,
              preference
            });
          }
        });
      });
    });

    // Sort shifts by priority (highest first) and then by employee need
    allShifts.sort((a, b) => {
      // First sort by priority
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      
      // Then by how much the employee needs shifts
      const aRemaining = assignments[a.employee].targetShifts - assignments[a.employee].assignedShifts;
      const bRemaining = assignments[b.employee].targetShifts - assignments[b.employee].assignedShifts;
      return bRemaining - aRemaining;
    });

    // Assign shifts
    allShifts.forEach(shift => {
      const { day, time, employee } = shift;
      const assignment = assignments[employee];
      
      // Check if slot is available and employee needs more shifts
      if (!masterSchedule[day][time].assigned && 
          assignment.assignedShifts < assignment.targetShifts &&
          !this.hasConflict(assignment.assignments, day, time)) {
        
        // Assign the shift
        masterSchedule[day][time].assigned = employee;
        assignment.assignedShifts++;
        assignment.assignments.push({ day, time, preference: shift.preference });
      }
    });
  }

  optimizeSchedule(masterSchedule, assignments) {
    // Try to redistribute shifts for better balance
    const maxIterations = 100;
    let iteration = 0;
    
    while (iteration < maxIterations) {
      let improved = false;
      
      // Find overassigned and underassigned employees
      const overassigned = [];
      const underassigned = [];
      
      Object.entries(assignments).forEach(([employee, data]) => {
        if (data.assignedShifts > data.targetShifts) {
          overassigned.push({ employee, excess: data.assignedShifts - data.targetShifts, data });
        } else if (data.assignedShifts < data.targetShifts) {
          underassigned.push({ employee, deficit: data.targetShifts - data.assignedShifts, data });
        }
      });

      // Try to move shifts from overassigned to underassigned
      for (const over of overassigned) {
        for (const under of underassigned) {
          if (this.trySwapShift(over, under, masterSchedule)) {
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      
      if (!improved) break;
      iteration++;
    }
  }

  trySwapShift(overEmployee, underEmployee, masterSchedule) {
    // Try to find a shift that can be moved from over to under
    for (const assignment of overEmployee.data.assignments) {
      const { day, time } = assignment;
      
      // Check if underemployee is available for this slot
      // This would require access to their original schedule - simplified for now
      if (this.canEmployeeWork(underEmployee.employee, day, time)) {
        // Make the swap
        masterSchedule[day][time].assigned = underEmployee.employee;
        
        // Update assignments
        overEmployee.data.assignedShifts--;
        overEmployee.data.assignments = overEmployee.data.assignments.filter(a => 
          !(a.day === day && a.time === time)
        );
        
        underEmployee.data.assignedShifts++;
        underEmployee.data.assignments.push({ day, time, preference: 'medium' });
        
        return true;
      }
    }
    return false;
  }

  canEmployeeWork(employeeName, day, time) {
    // Simplified - in real implementation, check against original availability
    return Math.random() > 0.5; // Placeholder
  }

  hasConflict(assignments, day, time) {
    // Check if employee already has a shift at this time on this day
    return assignments.some(assignment => 
      assignment.day === day && assignment.time === time
    );
  }

  getPreferencePriority(preference) {
    switch (preference) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  generateSummary(assignments) {
    const summary = {
      totalEmployees: Object.keys(assignments).length,
      totalShiftsAssigned: 0,
      totalShiftsRequested: 0,
      employeeSummary: {}
    };

    Object.entries(assignments).forEach(([employee, data]) => {
      summary.totalShiftsAssigned += data.assignedShifts;
      summary.totalShiftsRequested += data.targetShifts;
      
      summary.employeeSummary[employee] = {
        assigned: data.assignedShifts,
        requested: data.targetShifts,
        fulfillmentRate: (data.assignedShifts / data.targetShifts * 100).toFixed(1) + '%'
      };
    });

    summary.overallFulfillmentRate = (summary.totalShiftsAssigned / summary.totalShiftsRequested * 100).toFixed(1) + '%';

    return summary;
  }

  formatScheduleForCalendar(scheduleData) {
    const calendarEvents = [];
    
    this.daysOfWeek.forEach((day, dayIndex) => {
      this.timeSlots.forEach(time => {
        const assignment = scheduleData.schedule[day][time];
        if (assignment.assigned) {
          calendarEvents.push({
            title: assignment.assigned,
            day: dayIndex,
            time: time,
            employee: assignment.assigned
          });
        }
      });
    });

    return calendarEvents;
  }
}

module.exports = ScheduleGenerator;