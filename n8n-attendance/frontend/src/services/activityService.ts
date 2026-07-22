import api from './api';
import { UserActivity } from '../types/user';

export interface ActivityListResponse {
  activities: UserActivity[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ActivityStats {
  totalActivities: number;
  activitiesByAction: Record<string, number>;
  recentActivities: UserActivity[];
}

export const activityService = {
  async getActivities(
    userId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ActivityListResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get(`/activities?${params}`);
    return response.data;
  },

  async getActivityStats(): Promise<ActivityStats> {
    const response = await api.get('/activities/stats');
    return response.data;
  },

  async cleanupOldActivities(daysToKeep: number = 90): Promise<{ deletedCount: number }> {
    const response = await api.delete('/activities/cleanup', {
      data: { daysToKeep }
    });
    return response.data;
  }
};