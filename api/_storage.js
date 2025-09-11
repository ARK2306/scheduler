// In-memory storage for Vercel (note: this will reset on each deployment)
// For production, you'd want to use a database like Vercel KV, Planetscale, etc.

let scheduleTemplates = new Map();
let employeeResponses = new Map();
let currentScheduleId = null;
let adminConfig = {
  currentScheduleId: null,
  createdAt: new Date().toISOString()
};

// Simple admin authentication
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123' // In production, use proper hashing
};

// Storage functions
export function getScheduleTemplates() {
  return scheduleTemplates;
}

export function getEmployeeResponses() {
  return employeeResponses;
}

export function getCurrentScheduleId() {
  return currentScheduleId;
}

export function setCurrentScheduleId(id) {
  currentScheduleId = id;
  adminConfig.currentScheduleId = id;
}

export function getAdminConfig() {
  return adminConfig;
}

export function getAdminCredentials() {
  return ADMIN_CREDENTIALS;
}

// Simple auth middleware function
export function requireAuth(req) {
  const token = req.headers.authorization;
  return token === 'Bearer admin-session-token';
}

// Schedule generation algorithm
export function generateOptimalSchedule(timeblocks, employeeResponses, shiftsPerEmployee) {
  const schedule = {};
  const assignments = {};

  // Initialize schedule
  timeblocks.forEach(block => {
    schedule[block.id] = {
      ...block,
      assignedEmployees: [],
      remainingSlots: block.peopleNeeded || 1,
      candidates: []
    };
  });

  // Initialize assignments tracking
  employeeResponses.forEach(response => {
    assignments[response.employeeName] = {
      targetShifts: shiftsPerEmployee[response.employeeName] || 0,
      assignedShifts: 0,
      assignments: []
    };
  });

  // Create candidate list for each timeblock
  timeblocks.forEach(block => {
    const candidates = [];

    employeeResponses.forEach(response => {
      const preference = response.preferences[block.id];
      
      // Check eligibility
      const isEligible = 
        block.shiftType === 'both' ||
        (block.shiftType === 'grad' && response.studentType === 'graduate') ||
        (block.shiftType === 'undergrad' && response.studentType === 'undergraduate');

      if (isEligible && preference !== 'cannot') {
        const priority = getPreferencePriority(preference);
        candidates.push({
          employeeName: response.employeeName,
          preference,
          priority,
          studentType: response.studentType
        });
      }
    });

    // Sort candidates by preference priority
    candidates.sort((a, b) => b.priority - a.priority);
    schedule[block.id].candidates = candidates;
  });

  // Assign shifts using priority-based algorithm
  assignShifts(schedule, assignments, timeblocks);

  return {
    schedule,
    assignments,
    timeblocks
  };
}

function assignShifts(schedule, assignments, timeblocks) {
  // Sort timeblocks by number of available candidates (ascending)
  const sortedBlocks = [...timeblocks].sort((a, b) => {
    return schedule[a.id].candidates.length - schedule[b.id].candidates.length;
  });

  sortedBlocks.forEach(block => {
    const blockSchedule = schedule[block.id];
    
    // Fill all available slots for this timeblock
    while (blockSchedule.remainingSlots > 0 && blockSchedule.candidates.length > 0) {
      let assigned = false;
      
      // Find best available candidate
      for (let i = 0; i < blockSchedule.candidates.length; i++) {
        const candidate = blockSchedule.candidates[i];
        const employeeAssignment = assignments[candidate.employeeName];
        
        // Check if employee is available and not already assigned to this timeblock
        const alreadyAssigned = blockSchedule.assignedEmployees.includes(candidate.employeeName);
        
        if (!alreadyAssigned && employeeAssignment.assignedShifts < employeeAssignment.targetShifts) {
          // Assign this shift
          blockSchedule.assignedEmployees.push(candidate.employeeName);
          blockSchedule.remainingSlots--;
          employeeAssignment.assignedShifts++;
          employeeAssignment.assignments.push({
            blockId: block.id,
            day: block.day,
            time: block.time,
            preference: candidate.preference
          });
          
          // Remove this candidate from the list to avoid duplicate assignments
          blockSchedule.candidates.splice(i, 1);
          assigned = true;
          break;
        }
      }
      
      // If no candidate could be assigned, break to avoid infinite loop
      if (!assigned) {
        break;
      }
    }
  });
}

function getPreferencePriority(preference) {
  switch (preference) {
    case 'willing': return 3;
    case 'neutral': return 2;
    case 'prefer-not': return 1;
    case 'cannot': return 0;
    default: return 0;
  }
}

export function generateScheduleSummary(finalSchedule, employeeResponses) {
  const { schedule, assignments } = finalSchedule;
  
  const summary = {
    totalTimeblocks: Object.keys(schedule).length,
    assignedTimeblocks: Object.values(schedule).filter(block => block.assignedEmployee).length,
    totalEmployees: employeeResponses.length,
    employeeSummary: {}
  };

  Object.entries(assignments).forEach(([employee, data]) => {
    summary.employeeSummary[employee] = {
      assigned: data.assignedShifts,
      requested: data.targetShifts,
      fulfillmentRate: data.targetShifts > 0 
        ? ((data.assignedShifts / data.targetShifts) * 100).toFixed(1) + '%'
        : '0%'
    };
  });

  summary.overallFulfillmentRate = summary.totalTimeblocks > 0 
    ? ((summary.assignedTimeblocks / summary.totalTimeblocks) * 100).toFixed(1) + '%'
    : '0%';

  return summary;
}