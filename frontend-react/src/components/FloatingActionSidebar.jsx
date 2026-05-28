import React from 'react';
import { Terminal, LayoutGrid, Bell, Map } from 'lucide-react';
import './SystemWidgets.css';

const FloatingActionSidebar = ({ isMapOpen, onToggleMap, isAppScannerOpen, onToggleAppScanner }) => {
    return (
        <div className="floating-action-sidebar">
            <button 
                className={`icon-btn offset-left ${isAppScannerOpen ? 'active' : ''}`} 
                title="App Scanner and Tabs"
                onClick={onToggleAppScanner}
            >
                <LayoutGrid size={20} />
            </button>
            <button className="icon-btn" title="Notifications"><Bell size={20} /></button>
            <button className="icon-btn" title="Developer Console"><Terminal size={20} /></button>
            <button 
                className={`icon-btn offset-left ${isMapOpen ? 'active' : ''}`} 
                title="Toggle Map Widget"
                onClick={onToggleMap}
            >
                <Map size={20} />
            </button>
        </div>
    );
};

export default FloatingActionSidebar;
