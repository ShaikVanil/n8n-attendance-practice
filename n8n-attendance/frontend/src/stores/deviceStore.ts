import { create } from 'zustand';
import { Device } from '../types/device';
import { DeviceService } from '../services/deviceService';

interface DeviceState {
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  registerDevice: (deviceData: Omit<Device, 'id' | 'userId' | 'status' | 'registeredAt'>) => Promise<void>;
  fetchDevices: () => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: 'approved' | 'rejected') => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  isLoading: false,
  error: null,

  registerDevice: async (deviceData) => {
    set({ isLoading: true, error: null });
    try {
      const newDevice = await DeviceService.registerDevice(deviceData);
      set((state) => ({
        devices: [...state.devices, newDevice],
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to register device', isLoading: false });
      throw error;
    }
  },

  fetchDevices: async () => {
    set({ isLoading: true, error: null });
    try {
      const devices = await DeviceService.getUserDevices();
      set({ devices, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch devices', isLoading: false });
    }
  },

  updateDeviceStatus: async (deviceId, status) => {
    set({ isLoading: true, error: null });
    try {
      await DeviceService.updateDeviceStatus(deviceId, status);
      set((state) => ({
        devices: state.devices.map(device => 
          device.id === deviceId ? { ...device, status } : device
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update device status', isLoading: false });
    }
  }
}));