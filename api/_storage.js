// Redis-based storage using Upstash Redis (persistent and serverless-friendly)
// Falls back to in-memory storage if Redis is not configured
import { Redis } from '@upstash/redis';

// Check if Redis environment variables are available
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client only if environment variables are available
let redis = null;
if (hasRedisConfig) {
  try {
    redis = Redis.fromEnv();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    redis = null;
  }
} else {
  console.log('⚠️ Redis not configured, using fallback storage. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
}

// Storage keys
const KEYS = {
  CURRENT_SCHEDULE_ID: 'currentScheduleId',
  SCHEDULE_TEMPLATES: 'scheduleTemplates',
  EMPLOYEE_RESPONSES: 'employeeResponses',
  ADMIN_CONFIG: 'adminConfig'
};

// Fallback in-memory storage when Redis is not available
let fallbackStorage = {
  scheduleTemplates: new Map(),
  employeeResponses: new Map(),
  currentScheduleId: null,
  adminConfig: {
    currentScheduleId: null,
    createdAt: new Date().toISOString()
  }
};

// Debug function to log storage state
async function logStorageState(location) {
  try {
    if (redis) {
      const currentScheduleId = await redis.get(KEYS.CURRENT_SCHEDULE_ID);
      const scheduleTemplates = await redis.hgetall(KEYS.SCHEDULE_TEMPLATES);
      console.log(`[${location}] Redis storage state:`, {
        storageType: 'Redis',
        currentScheduleId,
        scheduleTemplateCount: Object.keys(scheduleTemplates || {}).length,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`[${location}] Fallback storage state:`, {
        storageType: 'In-Memory Fallback',
        currentScheduleId: fallbackStorage.currentScheduleId,
        scheduleTemplateCount: fallbackStorage.scheduleTemplates.size,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`[${location}] Error logging storage state:`, error);
  }
}

// Simple admin authentication
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123' // In production, use proper hashing
};

// Storage functions with Redis fallback
export async function getScheduleTemplates() {
  try {
    await logStorageState('getScheduleTemplates');
    
    if (redis) {
      // Use Redis
      const templates = await redis.hgetall(KEYS.SCHEDULE_TEMPLATES);
      const scheduleMap = new Map();
      if (templates) {
        Object.entries(templates).forEach(([key, value]) => {
          scheduleMap.set(key, JSON.parse(value));
        });
      }
      return scheduleMap;
    } else {
      // Use fallback storage
      return fallbackStorage.scheduleTemplates;
    }
  } catch (error) {
    console.error('Error getting schedule templates:', error);
    return fallbackStorage.scheduleTemplates;
  }
}

export async function getEmployeeResponses() {
  try {
    await logStorageState('getEmployeeResponses');
    
    if (redis) {
      const responses = await redis.hgetall(KEYS.EMPLOYEE_RESPONSES);
      const responseMap = new Map();
      if (responses) {
        Object.entries(responses).forEach(([key, value]) => {
          responseMap.set(key, JSON.parse(value));
        });
      }
      return responseMap;
    } else {
      return fallbackStorage.employeeResponses;
    }
  } catch (error) {
    console.error('Error getting employee responses:', error);
    return fallbackStorage.employeeResponses;
  }
}

export async function getCurrentScheduleId() {
  try {
    await logStorageState('getCurrentScheduleId');
    
    if (redis) {
      return await redis.get(KEYS.CURRENT_SCHEDULE_ID);
    } else {
      return fallbackStorage.currentScheduleId;
    }
  } catch (error) {
    console.error('Error getting current schedule ID:', error);
    return fallbackStorage.currentScheduleId;
  }
}

export async function setCurrentScheduleId(id) {
  try {
    if (redis) {
      await redis.set(KEYS.CURRENT_SCHEDULE_ID, id);
      // Also update admin config
      const adminConfig = await getAdminConfig();
      adminConfig.currentScheduleId = id;
      adminConfig.lastUpdated = new Date().toISOString();
      await redis.set(KEYS.ADMIN_CONFIG, JSON.stringify(adminConfig));
    } else {
      fallbackStorage.currentScheduleId = id;
      fallbackStorage.adminConfig.currentScheduleId = id;
      fallbackStorage.adminConfig.lastUpdated = new Date().toISOString();
    }
    await logStorageState('setCurrentScheduleId');
  } catch (error) {
    console.error('Error setting current schedule ID:', error);
  }
}

export async function getAdminConfig() {
  try {
    if (redis) {
      const config = await redis.get(KEYS.ADMIN_CONFIG);
      return config ? JSON.parse(config) : {
        currentScheduleId: null,
        createdAt: new Date().toISOString()
      };
    } else {
      return fallbackStorage.adminConfig;
    }
  } catch (error) {
    console.error('Error getting admin config:', error);
    return fallbackStorage.adminConfig;
  }
}

export async function saveScheduleTemplate(scheduleId, template) {
  try {
    if (redis) {
      await redis.hset(KEYS.SCHEDULE_TEMPLATES, scheduleId, JSON.stringify(template));
    } else {
      fallbackStorage.scheduleTemplates.set(scheduleId, template);
    }
    await logStorageState('saveScheduleTemplate');
  } catch (error) {
    console.error('Error saving schedule template:', error);
  }
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