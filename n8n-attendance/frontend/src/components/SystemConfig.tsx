import React, { useState, useEffect } from 'react';
import GracePeriodManager from './GracePeriodManager';

import {
    SystemConfigService,
    SystemConfig as SystemConfigType,
    Office,
    WiFiNetwork,
    CreateOfficeRequest,
    UpdateOfficeRequest,
    CreateWiFiRequest,
    UpdateWiFiRequest,
    SystemConfigUpdate
} from '../services/systemConfigService';

// Add these fields to the OfficeFormData interface
interface OfficeFormData {
    name: string;
    address: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    timezone: string;
    // Missing GPS fields:
    latitude: number;
    longitude: number;
    geofence_radius_meters: number;
    geofence_enabled: boolean;
}

interface WiFiFormData {
    officeId: string;
    ssid: string;
    bssid: string;
}

const SystemConfig: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'offices' | 'wifi' | 'grace-periods'>('general');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // General Configuration
    const [systemConfig, setSystemConfig] = useState<SystemConfigType[]>([]);
    const [configValues, setConfigValues] = useState<{ [key: string]: string }>({});

    // Offices
    const [offices, setOffices] = useState<Office[]>([]);
    const [showOfficeModal, setShowOfficeModal] = useState(false);
    const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
    // Fix the initial state (around line 50-56)
    const [officeFormData, setOfficeFormData] = useState<OfficeFormData>({
        name: '',
        address: '',
        workingHoursStart: '09:00',
        workingHoursEnd: '17:00',
        timezone: 'UTC',
        latitude: 0,
        longitude: 0,
        geofence_radius_meters: 100,
        geofence_enabled: true
    });

    // WiFi Networks
    const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
    const [showWiFiModal, setShowWiFiModal] = useState(false);
    const [selectedWiFi, setSelectedWiFi] = useState<WiFiNetwork | null>(null);
    const [wifiFormData, setWiFiFormData] = useState<WiFiFormData>({
        officeId: '',
        ssid: '',
        bssid: ''
    });


    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (activeTab === 'general') {
                const config = await SystemConfigService.getSystemConfig();
                setSystemConfig(Array.isArray(config) ? config : []);

                // Convert to key-value pairs for form
                const values: { [key: string]: string } = {};
                if (Array.isArray(config)) {
                    config.forEach(item => {
                        values[`${item.category}.${item.key}`] = item.value;
                    });
                }
                setConfigValues(values);
            } else if (activeTab === 'offices') {
                const officesData = await SystemConfigService.getOffices();
                setOffices(Array.isArray(officesData) ? officesData : []);
            } else if (activeTab === 'wifi') {
                const wifiData = await SystemConfigService.getWiFiNetworks();
                setWifiNetworks(Array.isArray(wifiData) ? wifiData : []);

                // Load offices for dropdown
                if (offices.length === 0) {
                    const officesData = await SystemConfigService.getOffices();
                    setOffices(Array.isArray(officesData) ? officesData : []);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load data');
            // Ensure arrays are always initialized even on error
            if (activeTab === 'general') {
                setSystemConfig([]);
                setConfigValues({});
            } else if (activeTab === 'offices') {
                setOffices([]);
            } else if (activeTab === 'wifi') {
                setWifiNetworks([]);
                if (offices.length === 0) {
                    setOffices([]);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfigSave = async () => {
        try {
            setLoading(true);
            setError(null);

            await SystemConfigService.updateSystemConfig(configValues);
            setSuccess('Configuration updated successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleOfficeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);

            if (selectedOffice) {
                await SystemConfigService.updateOffice(selectedOffice.id, officeFormData);
                setSuccess('Office updated successfully!');
            } else {
                await SystemConfigService.createOffice(officeFormData as CreateOfficeRequest);
                setSuccess('Office created successfully!');
            }

            setShowOfficeModal(false);
            setSelectedOffice(null);
            resetOfficeForm();
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save office');
        } finally {
            setLoading(false);
        }
    };

    const handleWiFiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);

            if (selectedWiFi) {
                await SystemConfigService.updateWiFiNetwork(selectedWiFi.id, {
                    ssid: wifiFormData.ssid,
                    bssid: wifiFormData.bssid || undefined,
                    // Add the missing officeId for updates
                    officeId: wifiFormData.officeId
                });
                setSuccess('WiFi network updated successfully!');
            } else {
                await SystemConfigService.createWiFiNetwork({
                    officeId: wifiFormData.officeId,
                    ssid: wifiFormData.ssid,
                    bssid: wifiFormData.bssid || undefined
                });
                setSuccess('WiFi network created successfully!');
            }

            setShowWiFiModal(false);
            setSelectedWiFi(null);
            resetWiFiForm();
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save WiFi network');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOffice = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this office?')) return;

        try {
            setLoading(true);
            await SystemConfigService.deleteOffice(id);
            setSuccess('Office deleted successfully!');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete office');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWiFi = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this WiFi network?')) return;

        try {
            setLoading(true);
            await SystemConfigService.deleteWiFiNetwork(id);
            setSuccess('WiFi network deleted successfully!');
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete WiFi network');
        } finally {
            setLoading(false);
        }
    };

    // Fix the openOfficeModal function (around line 217-224)
    // Add this useEffect to monitor form data changes
    useEffect(() => {
        console.log('Form data updated:', officeFormData);
    }, [officeFormData]);
    
    // Fix the openOfficeModal function
    const openOfficeModal = (office?: Office) => {
        if (office) {
            console.log('Opening office modal with data:', office);
            setSelectedOffice(office);
            
            const newFormData = {
                name: office.name,
                address: office.address,
                workingHoursStart: office.workingHoursStart,
                workingHoursEnd: office.workingHoursEnd,
                timezone: office.timezone,
                latitude: (office as any).latitude || 0,
                longitude: (office as any).longitude || 0,
                geofence_radius_meters: (office as any).geofence_radius_meters || 100,
                geofence_enabled: (office as any).geofence_enabled ?? true
            };
            
            console.log('Setting form data to:', newFormData); // Debug the data being set
            setOfficeFormData(newFormData);
            
            // The actual state will be logged by the useEffect above
        } else {
            setSelectedOffice(null);
            resetOfficeForm();
        }
        setShowOfficeModal(true);
    };

    const openWiFiModal = (wifi?: WiFiNetwork) => {
        if (wifi) {
            setSelectedWiFi(wifi);
            setWiFiFormData({
                officeId: wifi.officeId,
                ssid: wifi.ssid,
                bssid: wifi.bssid || ''
            });
        } else {
            setSelectedWiFi(null);
            resetWiFiForm();
        }
        setShowWiFiModal(true);
    };

    // Fix the resetOfficeForm function (around line 247-253)
    const resetOfficeForm = () => {
        setOfficeFormData({
            name: '',
            address: '',
            workingHoursStart: '09:00',
            workingHoursEnd: '17:00',
            timezone: 'UTC',
            latitude: 0,
            longitude: 0,
            geofence_radius_meters: 100,
            geofence_enabled: true
        });
    };

    const resetWiFiForm = () => {
        setWiFiFormData({
            officeId: '',
            ssid: '',
            bssid: ''
        });
    };

    <button
        onClick={() => setActiveTab('grace-periods')}
        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'grace-periods'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
    >
        Grace Periods
    </button>


    const renderGeneralConfig = () => {
        const categories = Array.from(new Set(systemConfig.map(item => item.category)));

        return (
            <div className="space-y-6">
                {categories.map(category => (
                    <div key={category} className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4 capitalize">
                            {category.replace('_', ' ')} Settings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {systemConfig
                                .filter(item => item.category === category)
                                .map(item => (
                                    <div key={`${item.category}.${item.key}`}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {item.key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </label>
                                        {item.key.includes('enabled') || item.key.includes('allow') ? (
                                            <select
                                                value={configValues[`${item.category}.${item.key}`] || item.value}
                                                onChange={(e) => setConfigValues(prev => ({
                                                    ...prev,
                                                    [`${item.category}.${item.key}`]: e.target.value
                                                }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="true">Enabled</option>
                                                <option value="false">Disabled</option>
                                            </select>
                                        ) : (
                                            <input
                                                type={item.key.includes('time') || item.key.includes('hours') ? 'time' :
                                                    item.key.includes('minutes') || item.key.includes('threshold') ? 'number' : 'text'}
                                                value={configValues[`${item.category}.${item.key}`] || item.value}
                                                onChange={(e) => setConfigValues(prev => ({
                                                    ...prev,
                                                    [`${item.category}.${item.key}`]: e.target.value
                                                }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder={item.description}
                                            />
                                        )}
                                        {item.description && (
                                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}

                <div className="flex justify-end">
                    <button
                        onClick={handleConfigSave}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        );
    };

    const renderOffices = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Office Locations</h3>
                <button
                    onClick={() => openOfficeModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Add Office
                </button>
            </div>

            {/* Changed overflow-hidden to overflow-x-auto to enable horizontal scrolling */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Address
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Working Hours
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            {/* Made Actions column sticky to always be visible */}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {offices.map((office) => (
                            <tr key={office.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {office.name}
                                </td>
                                {/* Allow address to wrap on smaller screens */}
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                    <div className="truncate" title={office.address}>
                                        {office.address}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {office.workingHoursStart} - {office.workingHoursEnd}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        office.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {office.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                {/* Made Actions column sticky to always be visible */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white">
                                    <button
                                        onClick={() => openOfficeModal(office)}
                                        className="text-blue-600 hover:text-blue-900 mr-3"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOffice(office.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderWiFiNetworks = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">WiFi Networks</h3>
                <button
                    onClick={() => openWiFiModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Add WiFi Network
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                SSID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                BSSID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Office
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {wifiNetworks.map((wifi) => {
                            const office = offices.find(o => o.id === wifi.officeId);
                            return (
                                <tr key={wifi.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {wifi.ssid}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {wifi.bssid || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {office?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${wifi.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {wifi.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => openWiFiModal(wifi)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWiFi(wifi.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
                <p className="mt-2 text-gray-600">
                    Manage system settings, office locations, and WiFi networks
                </p>
            </div>

            {/* Error and Success Messages */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {success}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { key: 'general', label: 'General Settings' },
                        { key: 'offices', label: 'Office Locations' },
                        { key: 'wifi', label: 'WiFi Networks' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {loading && (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {!loading && (
                <>
                    {activeTab === 'general' && renderGeneralConfig()}
                    {activeTab === 'offices' && renderOffices()}
                    {activeTab === 'wifi' && renderWiFiNetworks()}
                    {activeTab === 'grace-periods' && <GracePeriodManager />}
                </>
            )}

            {/* Office Modal */}
            {showOfficeModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {selectedOffice ? 'Edit Office' : 'Add Office'}
                            </h3>
                            <form onSubmit={handleOfficeSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Office Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={officeFormData.name}
                                        onChange={(e) => setOfficeFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <textarea
                                        required
                                        value={officeFormData.address}
                                        onChange={(e) => setOfficeFormData(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={officeFormData.workingHoursStart}
                                            onChange={(e) => setOfficeFormData(prev => ({ ...prev, workingHoursStart: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={officeFormData.workingHoursEnd}
                                            onChange={(e) => setOfficeFormData(prev => ({ ...prev, workingHoursEnd: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Timezone
                                    </label>
                                    <select
                                        required
                                        value={officeFormData.timezone}
                                        onChange={(e) => setOfficeFormData(prev => ({ ...prev, timezone: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">Eastern Time</option>
                                        <option value="America/Chicago">Central Time</option>
                                        <option value="America/Denver">Mountain Time</option>
                                        <option value="America/Los_Angeles">Pacific Time</option>
                                        <option value="Europe/London">London</option>
                                        <option value="Europe/Paris">Paris</option>
                                        <option value="Asia/Kolkata">Indian Standard Time (IST)</option>
                                        <option value="Asia/Tokyo">Tokyo</option>
                                        <option value="Asia/Shanghai">Shanghai</option>
                                    </select>
                                </div>
                                {/* Add GPS Coordinates Section */}
<div className="border-t pt-4 mt-4">
    <h4 className="text-md font-medium text-gray-900 mb-3">GPS & Geofencing Settings</h4>
    <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude *
            </label>
            <input
                type="number"
                step="any"
                required
                value={officeFormData.latitude || ''}
                onChange={(e) => setOfficeFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="40.7128"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude *
            </label>
            <input
                type="number"
                step="any"
                required
                value={officeFormData.longitude || ''}
                onChange={(e) => setOfficeFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-74.0060"
            />
        </div>
    </div>
    <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Geofence Radius (meters)
            </label>
            <input
                type="number"
                min="10"
                max="1000"
                value={officeFormData.geofence_radius_meters || 100}
                onChange={(e) => setOfficeFormData(prev => ({ ...prev, geofence_radius_meters: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100"
            />
        </div>
        <div className="flex items-center pt-6">
            <input
                type="checkbox"
                id="geofence_enabled"
                checked={officeFormData.geofence_enabled ?? true}
                onChange={(e) => setOfficeFormData(prev => ({ ...prev, geofence_enabled: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="geofence_enabled" className="ml-2 block text-sm text-gray-700">
                Enable Geofencing
            </label>
        </div>
    </div>
    <div className="mt-2 text-sm text-gray-500">
        💡 Tip: Use Google Maps to find exact coordinates. Right-click on the office location and copy the coordinates.
    </div>
</div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowOfficeModal(false);
                                            setSelectedOffice(null);
                                            resetOfficeForm();
                                        }}
                                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : selectedOffice ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* WiFi Modal */}
            {showWiFiModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {selectedWiFi ? 'Edit WiFi Network' : 'Add WiFi Network'}
                            </h3>
                            <form onSubmit={handleWiFiSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Office
                                    </label>
                                    <select
                                        required
                                        value={wifiFormData.officeId}
                                        onChange={(e) => setWiFiFormData(prev => ({ ...prev, officeId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={!!selectedWiFi}
                                    >
                                        <option value="">Select Office</option>
                                        {offices.map(office => (
                                            <option key={office.id} value={office.id}>
                                                {office.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        SSID (Network Name)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={wifiFormData.ssid}
                                        onChange={(e) => setWiFiFormData(prev => ({ ...prev, ssid: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="WiFi network name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        BSSID (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={wifiFormData.bssid}
                                        onChange={(e) => setWiFiFormData(prev => ({ ...prev, bssid: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="MAC address (optional)"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowWiFiModal(false);
                                            setSelectedWiFi(null);
                                            resetWiFiForm();
                                        }}
                                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : selectedWiFi ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemConfig;
