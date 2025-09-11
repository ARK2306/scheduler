import { requireAuth, getScheduleTemplates, getEmployeeResponses } from '../../_storage.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { scheduleId } = req.query;
    const scheduleTemplates = getScheduleTemplates();
    const employeeResponses = getEmployeeResponses();
    
    const template = scheduleTemplates.get(scheduleId);

    if (!template) {
      return res.status(404).json({ error: 'Schedule template not found' });
    }

    const responses = template.employeeResponses.map(responseId => {
      return employeeResponses.get(responseId);
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      scheduleId,
      responses,
      totalResponses: responses.length
    });
  } catch (error) {
    console.error('Get employee responses error:', error);
    return res.status(500).json({ error: 'Failed to get employee responses' });
  }
}