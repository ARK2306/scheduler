import { requireAuth, getScheduleTemplates, getCurrentScheduleId, getAdminConfig } from '../_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const scheduleTemplates = await getScheduleTemplates();
    const currentScheduleId = await getCurrentScheduleId();
    const adminConfig = await getAdminConfig();
    
    const currentTemplate = currentScheduleId ? scheduleTemplates.get(currentScheduleId) : null;
    const responseCount = currentTemplate ? currentTemplate.employeeResponses.length : 0;
    
    return res.status(200).json({
      success: true,
      hasCurrentSchedule: !!currentScheduleId,
      currentScheduleId,
      currentTemplate,
      responseCount,
      allSchedules: Array.from(scheduleTemplates.values()),
      adminConfig
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to get dashboard state' });
  }
}