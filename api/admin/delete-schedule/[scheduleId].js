import { requireAuth, getScheduleTemplates, getEmployeeResponses, getCurrentScheduleId, setCurrentScheduleId } from '../../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { scheduleId } = req.query;
    const scheduleTemplates = await getScheduleTemplates();
    const employeeResponses = await getEmployeeResponses();
    const currentScheduleId = await getCurrentScheduleId();
    
    if (!scheduleTemplates.has(scheduleId)) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Get the schedule to find associated responses
    const schedule = scheduleTemplates.get(scheduleId);
    
    // Delete associated employee responses
    if (schedule && schedule.employeeResponses) {
      schedule.employeeResponses.forEach(responseId => {
        employeeResponses.delete(responseId);
      });
    }
    
    // Delete the schedule
    scheduleTemplates.delete(scheduleId);
    
    // Update current schedule if this was the current one
    if (currentScheduleId === scheduleId) {
      await setCurrentScheduleId(null);
    }

    return res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return res.status(500).json({ error: 'Failed to delete schedule' });
  }
}