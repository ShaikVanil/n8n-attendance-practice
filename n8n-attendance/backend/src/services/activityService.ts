import { UserActivity } from '../types/user';

class ActivityService {
  private activities: UserActivity[] = [];

  async logActivity(
    userId: string,
    action: string,
    details: string,
    performedBy: string
  ): Promise<void> {
    const activity: UserActivity = {
      id: Date.now().toString(),
      userId,
      action,
      details,
      timestamp: new Date(),
      performedBy
    };

    this.activities.push(activity);
    console.log(`Activity logged: ${action} for user ${userId} by ${performedBy}`);
  }

  async getUserActivities(
    userId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    activities: UserActivity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let filteredActivities = this.activities;
    
    if (userId) {
      filteredActivities = this.activities.filter(activity => activity.userId === userId);
    }

    // Sort by timestamp (newest first)
    filteredActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredActivities.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const activities = filteredActivities.slice(startIndex, endIndex);

    return {
      activities,
      total,
      page,
      totalPages
    };
  }

  async getActivityStats(): Promise<{
    totalActivities: number;
    activitiesByAction: Record<string, number>;
    recentActivities: UserActivity[];
  }> {
    const totalActivities = this.activities.length;
    const activitiesByAction: Record<string, number> = {};
    
    this.activities.forEach(activity => {
      activitiesByAction[activity.action] = (activitiesByAction[activity.action] || 0) + 1;
    });

    const recentActivities = this.activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalActivities,
      activitiesByAction,
      recentActivities
    };
  }

  async deleteOldActivities(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialCount = this.activities.length;
    this.activities = this.activities.filter(
      activity => activity.timestamp > cutoffDate
    );
    
    return initialCount - this.activities.length;
  }
}

export const activityService = new ActivityService();