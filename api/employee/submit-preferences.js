import { getScheduleTemplates, getEmployeeResponses } from '../_storage.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employeeName, studentType, scheduleId, preferences } = req.body;

    if (!employeeName || !studentType || !scheduleId || !preferences) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const scheduleTemplates = getScheduleTemplates();
    const employeeResponses = getEmployeeResponses();
    
    const template = scheduleTemplates.get(scheduleId);
    if (!template) {
      return res.status(404).json({ error: 'Schedule template not found' });
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

    return res.status(200).json({
      success: true,
      message: 'Preferences submitted successfully',
      responseId
    });
  } catch (error) {
    console.error('Submit preferences error:', error);
    return res.status(500).json({ error: 'Failed to submit preferences' });
  }
}