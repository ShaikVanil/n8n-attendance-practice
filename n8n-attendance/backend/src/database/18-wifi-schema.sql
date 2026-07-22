-- Wi-Fi Networks table
CREATE TABLE IF NOT EXISTS wifi_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ssid VARCHAR(255) NOT NULL,
    bssid VARCHAR(17), -- MAC address of access point
    office_id UUID REFERENCES offices(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device Connection Logs table
CREATE TABLE IF NOT EXISTS device_connection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    mac_address VARCHAR(17) NOT NULL,
    user_id UUID REFERENCES users(id),
    network_id UUID REFERENCES wifi_networks(id),
    connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('connect', 'disconnect')),
    timestamp TIMESTAMP NOT NULL,
    signal_strength INTEGER, -- Signal strength in dBm
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offices table (if not exists)
CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    working_hours_start TIME DEFAULT '09:00:00',
    working_hours_end TIME DEFAULT '18:00:00',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_connection_logs_device_id ON device_connection_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_connection_logs_mac_address ON device_connection_logs(mac_address);
CREATE INDEX IF NOT EXISTS idx_device_connection_logs_timestamp ON device_connection_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_wifi_networks_active ON wifi_networks(is_active);
CREATE INDEX IF NOT EXISTS idx_offices_active ON offices(is_active);