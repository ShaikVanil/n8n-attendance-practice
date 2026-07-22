import api from './api';
import { Device, DeviceRegistrationRequest } from '../types/device';

export class DeviceService {
  static async registerDevice(deviceData: DeviceRegistrationRequest): Promise<Device> {
    const response = await api.post('/devices/register', deviceData);
    return response.data.device;
  }

  static async getUserDevices(): Promise<Device[]> {
    const response = await api.get('/devices');
    return response.data; // Changed from response.data.devices to response.data
  }

  static async getAllDevices(): Promise<Device[]> {
    const response = await api.get('/devices');
    return response.data; // Changed from response.data.devices to response.data
  }

  static async updateDeviceStatus(deviceId: string, status: 'approved' | 'rejected'): Promise<Device> {
    const response = await api.patch(`/devices/${deviceId}/status`, { status });
    return response.data.device;
  }

  static async deleteDevice(deviceId: string): Promise<void> {
    await api.delete(`/devices/${deviceId}`);
  }
}