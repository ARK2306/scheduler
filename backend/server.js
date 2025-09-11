const fastify = require('fastify')({ logger: true });

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-app-name.onrender.com']
    : ['http://localhost:3000']
});

// JSON body parsing is built into Fastify by default

const fs = require('fs');
const path = require('path');

// Register static file serving for production
if (process.env.NODE_ENV === 'production') {
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../client/build'),
    prefix: '/'
  });
}

// File-based persistent storage
const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
const RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize storage
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

// Load existing data asynchronously
async function loadData() {
  try {
    if (fs.existsSync(SCHEDULES_FILE)) {
      const schedulesData = JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
      scheduleTemplates = new Map(Object.entries(schedulesData));
    }
    
    if (fs.existsSync(RESPONSES_FILE)) {
      const responsesData = JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf8'));
      employeeResponses = new Map(Object.entries(responsesData));
    }
    
    if (fs.existsSync(CONFIG_FILE)) {
      adminConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      currentScheduleId = adminConfig.currentScheduleId;
    }
    
    console.log('Data loaded successfully');
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to files
function saveData() {
  try {
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(Object.fromEntries(scheduleTemplates), null, 2));
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify(Object.fromEntries(employeeResponses), null, 2));
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(adminConfig, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Load data on startup (non-blocking)
loadData().catch(console.error);

// Health check route - optimized for fast response
fastify.get('/api/health', async (request, reply) => {
  reply.type('application/json');
  return { 
    status: 'OK', 
    message: 'Scheduler API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Admin login
fastify.post('/api/admin/login', async (request, reply) => {
  try {
    const { username, password } = request.body;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      return {
        success: true,
        message: 'Login successful',
        token: 'admin-session-token' // Simple token for demo
      };
    } else {
      return reply.status(401).send({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Login failed' });
  }
});

// Simple auth middleware function
function requireAuth(request, reply, done) {
  const token = request.headers.authorization;
  if (token !== 'Bearer admin-session-token') {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  done();
}

// Get admin dashboard state (protected)
fastify.get('/api/admin/dashboard', { preHandler: requireAuth }, async (request, reply) => {
  try {
    const currentTemplate = currentScheduleId ? scheduleTemplates.get(currentScheduleId) : null;
    const responseCount = currentTemplate ? currentTemplate.employeeResponses.length : 0;
    
    return {
      success: true,
      hasCurrentSchedule: !!currentScheduleId,
      currentScheduleId,
      currentTemplate,
      responseCount,
      allSchedules: Array.from(scheduleTemplates.values()),
      adminConfig
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to get dashboard state' });
  }
});

// Admin: Create schedule template (protected)
fastify.post('/api/admin/create-schedule', { preHandler: requireAuth }, async (request, reply) => {
  try {
    const { timeblocks } = request.body;
    
    if (!timeblocks || !Array.isArray(timeblocks)) {
      return reply.status(400).send({ error: 'Invalid timeblocks data' });
    }

    const scheduleId = `schedule_${Date.now()}`;
    const scheduleTemplate = {
      id: scheduleId,
      timeblocks: timeblocks,
      createdAt: new Date().toISOString(),
      employeeResponses: []
    };

    scheduleTemplates.set(scheduleId, scheduleTemplate);
    currentScheduleId = scheduleId;
    adminConfig.currentScheduleId = scheduleId;
    adminConfig.lastUpdated = new Date().toISOString();
    
    // Save to persistent storage
    saveData();

    return {
      success: true,
      scheduleId: scheduleId,
      message: 'Schedule template created successfully',
      employeeLink: `/employee?schedule=${scheduleId}`
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to create schedule template' });
  }
});

// Get schedule template by ID
fastify.get('/api/schedule-template/:scheduleId', async (request, reply) => {
  try {
    const { scheduleId } = request.params;
    const template = scheduleTemplates.get(scheduleId);

    if (!template) {
      return reply.status(404).send({ error: 'Schedule template not found' });
    }

    return {
      success: true,
      ...template
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to get schedule template' });
  }
});

// Get latest schedule template
fastify.get('/api/schedule-template/latest', async (request, reply) => {
  try {
    if (!currentScheduleId || !scheduleTemplates.has(currentScheduleId)) {
      return reply.status(404).send({ error: 'No schedule template found' });
    }

    const template = scheduleTemplates.get(currentScheduleId);
    return {
      success: true,
      ...template
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to get latest schedule template' });
  }
});

// Employee: Submit preferences
fastify.post('/api/employee/submit-preferences', async (request, reply) => {
  try {
    const { employeeName, studentType, scheduleId, preferences } = request.body;

    if (!employeeName || !studentType || !scheduleId || !preferences) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const template = scheduleTemplates.get(scheduleId);
    if (!template) {
      return reply.status(404).send({ error: 'Schedule template not found' });
    }

    const responseId = `${scheduleId}_${employeeName.replace(/\s+/g, '_').toLowerCase()}`;
    const employeeResponse = {
      id: responseId,
      employeeName,
      studentType,
      scheduleId,
      preferences,
      submittedAt: new Date().toISOString()
    };

    employeeResponses.set(responseId, employeeResponse);

    // Add to template's employee responses list
    if (!template.employeeResponses.includes(responseId)) {
      template.employeeResponses.push(responseId);
    }

    // Save to persistent storage
    saveData();

    return {
      success: true,
      message: 'Preferences submitted successfully',
      responseId
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to submit preferences' });
  }
});

// Admin: Get all employee responses for a schedule (protected)
fastify.get('/api/admin/employee-responses/:scheduleId', { preHandler: requireAuth }, async (request, reply) => {
  try {
    const { scheduleId } = request.params;
    const template = scheduleTemplates.get(scheduleId);

    if (!template) {
      return reply.status(404).send({ error: 'Schedule template not found' });
    }

    const responses = template.employeeResponses.map(responseId => {
      return employeeResponses.get(responseId);
    }).filter(Boolean);

    return {
      success: true,
      scheduleId,
      responses,
      totalResponses: responses.length
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to get employee responses' });
  }
});

// Admin: Delete schedule (protected)
fastify.delete('/api/admin/delete-schedule/:scheduleId', { preHandler: requireAuth }, async (request, reply) => {
  try {
    const { scheduleId } = request.params;
    
    if (!scheduleTemplates.has(scheduleId)) {
      return reply.status(404).send({ error: 'Schedule not found' });
    }

    // Get the schedule to find associated responses
    const schedule = scheduleTemplates.get(scheduleId);
    
    // Delete associated employee responses
    if (schedule.employeeResponses) {
      schedule.employeeResponses.forEach(responseId => {
        employeeResponses.delete(responseId);
      });
    }
    
    // Delete the schedule
    scheduleTemplates.delete(scheduleId);
    
    // Update current schedule if this was the current one
    if (currentScheduleId === scheduleId) {
      currentScheduleId = null;
      adminConfig.currentScheduleId = null;
    }
    
    // Save to persistent storage
    saveData();

    return {
      success: true,
      message: 'Schedule deleted successfully'
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to delete schedule' });
  }
});

// Admin: Generate final schedule (protected)
fastify.post('/api/admin/generate-final-schedule', { preHandler: requireAuth }, async (request, reply) => {
  try {
    const { scheduleId, shiftsPerEmployee } = request.body;

    if (!scheduleId || !shiftsPerEmployee) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const template = scheduleTemplates.get(scheduleId);
    if (!template) {
      return reply.status(404).send({ error: 'Schedule template not found' });
    }

    // Get all employee responses
    const responses = template.employeeResponses.map(responseId => {
      return employeeResponses.get(responseId);
    }).filter(Boolean);

    if (responses.length === 0) {
      return reply.status(400).send({ error: 'No employee responses found' });
    }

    // Generate the schedule using the algorithm
    const finalSchedule = generateOptimalSchedule(template.timeblocks, responses, shiftsPerEmployee);

    return {
      success: true,
      schedule: finalSchedule,
      summary: generateScheduleSummary(finalSchedule, responses)
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to generate final schedule' });
  }
});

// Schedule generation algorithm
function generateOptimalSchedule(timeblocks, employeeResponses, shiftsPerEmployee) {
  const schedule = {};
  const assignments = {};

  // Initialize schedule
  timeblocks.forEach(block => {
    schedule[block.id] = {
      ...block,
      assignedEmployees: [], // Changed from single assignedEmployee to array
      remainingSlots: block.peopleNeeded || 1, // Track remaining slots
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

function generateScheduleSummary(finalSchedule, employeeResponses) {
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

// Catch-all route for React Router (production only)
if (process.env.NODE_ENV === 'production') {
  fastify.get('*', async (request, reply) => {
    return reply.sendFile('index.html');
  });
}

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    await fastify.listen({ port: port, host: host });
    fastify.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();