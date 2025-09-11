import { getScheduleTemplates } from '../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scheduleId } = req.query;
    const scheduleTemplates = await getScheduleTemplates();
    const template = scheduleTemplates.get(scheduleId);

    if (!template) {
      return res.status(200).json({ 
        success: false,
        template: null,
        message: 'Schedule template not found' 
      });
    }

    return res.status(200).json({
      success: true,
      template,
      ...template
    });
  } catch (error) {
    console.error('Get schedule template error:', error);
    return res.status(500).json({ error: 'Failed to get schedule template' });
  }
}