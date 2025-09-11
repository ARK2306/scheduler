import { requireAuth, getScheduleTemplates, getEmployeeResponses, generateOptimalSchedule, generateScheduleSummary } from '../_storage.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { scheduleId, shiftsPerEmployee } = req.body;

    if (!scheduleId || !shiftsPerEmployee) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const scheduleTemplates = getScheduleTemplates();
    const employeeResponses = getEmployeeResponses();
    
    const template = scheduleTemplates.get(scheduleId);
    if (!template) {
      return res.status(404).json({ error: 'Schedule template not found' });
    }

    // Get all employee responses
    const responses = template.employeeResponses.map(responseId => {
      return employeeResponses.get(responseId);
    }).filter(Boolean);

    if (responses.length === 0) {
      return res.status(400).json({ error: 'No employee responses found' });
    }

    // Generate the schedule using the algorithm
    const finalSchedule = generateOptimalSchedule(template.timeblocks, responses, shiftsPerEmployee);

    return res.status(200).json({
      success: true,
      schedule: finalSchedule,
      summary: generateScheduleSummary(finalSchedule, responses)
    });
  } catch (error) {
    console.error('Generate final schedule error:', error);
    return res.status(500).json({ error: 'Failed to generate final schedule' });
  }
}