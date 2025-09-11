import { getScheduleTemplates } from '../_storage.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scheduleId } = req.query;
    const scheduleTemplates = getScheduleTemplates();
    const template = scheduleTemplates.get(scheduleId);

    if (!template) {
      return res.status(404).json({ error: 'Schedule template not found' });
    }

    return res.status(200).json({
      success: true,
      ...template
    });
  } catch (error) {
    console.error('Get schedule template error:', error);
    return res.status(500).json({ error: 'Failed to get schedule template' });
  }
}