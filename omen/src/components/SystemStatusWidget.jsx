import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryCharging, Activity, Globe } from 'lucide-react';
import './SystemWidgets.css';

const SystemStatusWidget = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [battery, setBattery] = useState({ level: 100, charging: false });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if ('getBattery' in navigator) {
            navigator.getBattery().then(batt => {
                const updateBattery = () => {
                    setBattery({
                        level: Math.round(batt.level * 100),
                        charging: batt.charging
                    });
                };
                updateBattery();
                batt.addEventListener('levelchange', updateBattery);
                batt.addEventListener('chargingchange', updateBattery);
            });
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="system-widget status-widget">
            <div className="status-item">
                {isOnline ? <Wifi size={16} className="text-green" /> : <WifiOff size={16} className="text-red" />}
                <span>{isOnline ? 'Connected' : 'Offline'}</span>
            </div>
            <div className="status-item">
                {battery.charging ? <BatteryCharging size={16} className="text-green" /> : <Battery size={16} />}
                <span>{battery.level}%</span>
            </div>

            {/* Network Details */}
            {isOnline && (
                <div className="status-details">
                    <div className="detail-row">
                        <Activity size={14} />
                        <span>Ping: 12ms</span>
                    </div>
                    <div className="detail-row">
                        <WifiOff size={14} />
                        <span>Loss: 0.0%</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemStatusWidget;
