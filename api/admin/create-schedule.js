import { requireAuth, setCurrentScheduleId, saveScheduleTemplate } from '../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { timeblocks } = req.body;
    
    if (!timeblocks || !Array.isArray(timeblocks)) {
      return res.status(400).json({ error: 'Invalid timeblocks data' });
    }

    const scheduleId = `schedule_${Date.now()}`;
    const scheduleTemplate = {
      id: scheduleId,
      timeblocks: timeblocks,
      createdAt: new Date().toISOString(),
      employeeResponses: []
    };

    await saveScheduleTemplate(scheduleId, scheduleTemplate);
    await setCurrentScheduleId(scheduleId);
    
    console.log('Schedule created:', scheduleId, 'with', timeblocks.length, 'timeblocks');

    return res.status(200).json({
      success: true,
      scheduleId: scheduleId,
      message: 'Schedule template created successfully',
      employeeLink: `/employee?schedule=${scheduleId}`
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    return res.status(500).json({ error: 'Failed to create schedule template' });
  }
}