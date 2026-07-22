import api from './api';
import { io, Socket } from 'socket.io-client';

// Remove API_BASE_URL and use api from './api'
const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  realTimeEnabled: boolean;
  checkInConfirmation: boolean;
  checkOutConfirmation: boolean;
  autoCheckInFailure: boolean;
  policyViolations: boolean;
  deviceApproval: boolean;
}

export interface NotificationHistory {
  id: string;
  type: string;
  subject?: string;
  content: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

class NotificationService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  /**
   * Initialize real-time notifications
   */
  initializeRealTime(userId: string): void {
    this.userId = userId;
    
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to notification service');
      this.socket?.emit('join-user-room', userId);
    });

    this.socket.on('notification', (notification) => {
      this.handleRealTimeNotification(notification);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from notification service');
    });
  }

  /**
   * Handle incoming real-time notifications
   */
  private handleRealTimeNotification(notification: any): void {
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png'
      });
    }

    // Emit custom event for components to listen
    window.dispatchEvent(new CustomEvent('realtime-notification', {
      detail: notification
    }));
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Disconnect from real-time notifications
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  async getUserPreferences(): Promise<any> {
    const response = await api.get('/notifications/preferences');
    return response.data;
  }

  async updateUserPreferences(preferences: any): Promise<any> {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data;
  }

  async getNotificationHistory(limit = 50, offset = 0): Promise<any> {
    const response = await api.get('/notifications/history', {
      params: { limit, offset }
    });
    return response.data;
  }

  // Admin methods
  async getAdminConfig(): Promise<any> {
    const response = await api.get('/notifications/admin/config');
    return response.data;
  }

  async updateAdminConfig(config: any): Promise<any> {
    const response = await api.put('/notifications/admin/config', config);
    return response.data;
  }

  async getNotificationTemplates(): Promise<any> {
    const response = await api.get('/notifications/admin/templates');
    return response.data;
  }

  async updateNotificationTemplate(templateId: string, updates: any): Promise<any> {
    const response = await api.put(`/notifications/admin/templates/${templateId}`, updates);
    return response.data;
  }

  async getNotificationStats(): Promise<any> {
    const response = await api.get('/notifications/admin/stats');
    return response.data;
  }

  async sendTestNotification(channel: string): Promise<any> {
    const response = await api.post('/notifications/admin/test', { channel });
    return response.data;
  }
}

export const notificationService = new NotificationService();