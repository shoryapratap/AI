import React, { useState } from 'react';
import { Search, Radar, FolderPlus, Play, Box, Globe, Code, Music, Image as ImageIcon, Gamepad2, MessageSquare, X } from 'lucide-react';
import './SystemWidgets.css';

const MOCK_APPS = [
    { id: 1, name: 'Browser', group: 'Development', icon: <Globe size={32} color="#3b82f6" /> },
    { id: 2, name: 'Code Editor', group: 'Development', icon: <Code size={32} color="#10b981" /> },
    { id: 3, name: 'Music', group: 'Media', icon: <Music size={32} color="#ec4899" /> },
    { id: 4, name: 'Studio', group: 'Media', icon: <ImageIcon size={32} color="#f59e0b" /> },
    { id: 5, name: 'Games', group: 'Media', icon: <Gamepad2 size={32} color="#8b5cf6" /> },
    { id: 6, name: 'Chat', group: 'Development', icon: <MessageSquare size={32} color="#ef4444" /> },
];

const AppScannerWidget = ({ onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scannedApps, setScannedApps] = useState([]);
    const [activeTab, setActiveTab] = useState('All Apps');

    const handleScan = () => {
        setIsScanning(true);
        setScannedApps([]);
        setTimeout(() => {
            setScannedApps(MOCK_APPS);
            setIsScanning(false);
        }, 1500);
    };

    return (
        <div className="system-widget app-scanner-widget">
            <button className="app-scanner-close-btn" onClick={onClose} title="Close Scanner">
                <X size={20} />
            </button>

            {/* Left Panel: Scanner and App Grid */}
            <div className="app-scanner-main">
                <div className="scanner-header-left">
                    <h2>Device Applications</h2>
                    <button 
                        className={`scan-btn ${isScanning ? 'scanning' : ''}`}
                        onClick={handleScan}
                        disabled={isScanning}
                    >
                        {isScanning ? 'Scanning...' : 'Scan'}
                    </button>
                </div>
                
                <div className="app-grid-container">
                    {scannedApps.length > 0 && (
                        <div className="app-grid">
                            {scannedApps.map(app => (
                                <div key={app.id} className="app-card">
                                    <div className="app-card-icon-wrapper">
                                        {app.icon}
                                    </div>
                                    <span className="app-card-name">{app.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {isScanning && (
                        <div className="scanning-overlay">
                            <div className="scan-line"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Group Tabs */}
            <div className="app-scanner-tabs">
                {activeTab === 'All Apps' ? (
                    <>
                        <h3>App Groups</h3>
                        <div className="tab-actions-top">
                            <button className="create-group-btn">
                                <FolderPlus size={16} /> Create Group
                            </button>
                        </div>
                        <div className="tab-list">
                            <button className={`group-tab ${activeTab === 'Development' ? 'active' : ''}`} onClick={() => setActiveTab('Development')}>
                                Development
                            </button>
                            <button className={`group-tab ${activeTab === 'Media' ? 'active' : ''}`} onClick={() => setActiveTab('Media')}>
                                Media
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="group-detail-view">
                        <div className="group-detail-header">
                            <h3>{activeTab}</h3>
                            <button className="group-detail-close-btn" onClick={() => setActiveTab('All Apps')} title="Close Group">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="group-detail-content">
                            <div className="group-apps-list">
                                {scannedApps
                                    .filter(app => app.group === activeTab)
                                    .map(app => (
                                        <div key={app.id} className="group-app-item">
                                            <div className="group-app-icon">{app.icon}</div>
                                            <span>{app.name}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <button className="launch-group-btn">
                            <Play size={16} /> Launch All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppScannerWidget;
