import React, { useState } from 'react';
import { X, Globe, Code, Music, Gamepad2, MessageSquare, Monitor, Play } from 'lucide-react';
import './SystemWidgets.css';

const AppScannerWidget = ({ onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scannedApps, setScannedApps] = useState([]);
    const [isCreatingTab, setIsCreatingTab] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const [selectedApps, setSelectedApps] = useState([]);
    const [savedTabs, setSavedTabs] = useState([]);
    const [editingTabId, setEditingTabId] = useState(null);

    const handleSaveTab = () => {
        if (!newTabName.trim() || selectedApps.length === 0) return;
        
        if (editingTabId) {
            setSavedTabs(prev => prev.map(tab => 
                tab.id === editingTabId ? { ...tab, name: newTabName, apps: selectedApps } : tab
            ));
        } else {
            setSavedTabs(prev => [...prev, {
                id: Date.now(),
                name: newTabName,
                apps: selectedApps
            }]);
        }
        
        setIsCreatingTab(false);
        setNewTabName('');
        setSelectedApps([]);
        setEditingTabId(null);
    };

    const handleEditTab = (tab) => {
        setEditingTabId(tab.id);
        setNewTabName(tab.name);
        setSelectedApps(tab.apps);
        setIsCreatingTab(true);
    };

    const handleCancel = () => {
        setIsCreatingTab(false);
        setSelectedApps([]);
        setNewTabName('');
        setEditingTabId(null);
    };

    const handleAppClick = async (app) => {
        if (!isCreatingTab) {
            if (app.path && window.electronAPI && window.electronAPI.launchApp) {
                await window.electronAPI.launchApp(app.path);
            }
            return;
        }

        if (selectedApps.some(selected => selected.name === app.name)) {
            setSelectedApps(prev => prev.filter(selected => selected.name !== app.name));
        } else {
            setSelectedApps(prev => [...prev, app]);
        }
    };

    const handleRemoveApp = (appToRemove) => {
        setSelectedApps(prev => prev.filter(app => app.name !== appToRemove.name));
    };

    const handleScan = async () => {
        if (isScanning) return;
        setIsScanning(true);
        
        try {
            if (window.electronAPI && window.electronAPI.scanApps) {
                const apps = await window.electronAPI.scanApps();
                
                const appsWithIcons = apps.map(app => {
                    let fallbackIcon = <Monitor size={32} color="#94a3b8" />;

                    const lowerName = app.name.toLowerCase();
                    if (lowerName.includes('browser') || lowerName.includes('chrome') || lowerName.includes('edge') || lowerName.includes('brave') || lowerName.includes('firefox')) {
                        fallbackIcon = <Globe size={32} color="#3b82f6" />;
                    } else if (lowerName.includes('code') || lowerName.includes('studio') || lowerName.includes('git')) {
                        fallbackIcon = <Code size={32} color="#10b981" />;
                    } else if (lowerName.includes('music') || lowerName.includes('spotify') || lowerName.includes('media')) {
                        fallbackIcon = <Music size={32} color="#ec4899" />;
                    } else if (lowerName.includes('game') || lowerName.includes('xbox') || lowerName.includes('steam')) {
                        fallbackIcon = <Gamepad2 size={32} color="#8b5cf6" />;
                    } else if (lowerName.includes('chat') || lowerName.includes('discord') || lowerName.includes('whatsapp') || lowerName.includes('teams')) {
                        fallbackIcon = <MessageSquare size={32} color="#ef4444" />;
                    }
                    
                    return { ...app, fallbackIcon };
                });
                
                setScannedApps(appsWithIcons);
            } else {
                setTimeout(() => {
                    setScannedApps([{ id: 1, name: 'Browser', fallbackIcon: <Globe size={32} color="#3b82f6" /> }]);
                }, 1000);
            }
        } catch (error) {
            console.error("Failed to scan apps:", error);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="system-widget app-scanner-widget" style={{ 
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(145deg, rgba(15, 15, 20, 0.9), rgba(5, 5, 10, 0.95))',
            boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(30px)',
            animation: 'popupScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            overflow: 'hidden'
        }}>
            {/* Div 1: Top Bar */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '15px 20px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <h3 style={{ margin: 0, color: '#e2e8f0', fontWeight: '500' }}>Apps tab</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} />
                </button>
            </div>

            {/* Divs 2 & 3: Bottom Area */}
            <div style={{ flex: 1, display: 'flex', gap: '20px', padding: '20px', boxSizing: 'border-box', width: '100%', minHeight: 0 }}>
                <div style={{ flex: 1, width: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', padding: '20px', minHeight: 0 }}>
                    
                    {/* Inner Div (App Grid) */}
                    <div className="custom-scroll" style={{ flex: 1, border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '15px', minHeight: 0 }}>
                        {isScanning ? (
                            <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8' }}>Scanning system...</span>
                            </div>
                        ) : scannedApps.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '15px' }}>
                                {scannedApps.map((app, index) => {
                                    const isSelected = selectedApps.some(s => s.name === app.name);
                                    return (
                                        <div 
                                            key={app.id || index} 
                                            onClick={() => handleAppClick(app)}
                                            style={{ 
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '8px',
                                                cursor: 'pointer',
                                                opacity: isSelected && isCreatingTab ? 0.3 : 1,
                                                transform: isSelected && isCreatingTab ? 'scale(0.95)' : 'scale(1)',
                                                transition: 'all 0.2s',
                                                minHeight: '70px',
                                                width: '100%'
                                            }}
                                        >
                                            <div style={{ width: '36px', height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                {app.iconBase64 ? (
                                                    <img src={app.iconBase64} alt={app.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    app.fallbackIcon
                                                )}
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#cbd5e1', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={app.name}>
                                                {app.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <span style={{ color: '#64748b' }}>No apps scanned yet. Click Scan below.</span>
                            </div>
                        )}
                    </div>

                    <button onClick={handleScan} disabled={isScanning} style={{ padding: '10px 15px', backgroundColor: isScanning ? '#1e293b' : '#3b82f6', color: isScanning ? '#94a3b8' : 'white', border: 'none', borderRadius: '6px', cursor: isScanning ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                        {isScanning ? 'Scanning...' : 'Scan'}
                    </button>
                </div>
                <div style={{ flex: 1, width: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', padding: '20px', minHeight: 0 }}>
                    {isCreatingTab ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', minHeight: 0 }}>
                            <input 
                                type="text" 
                                placeholder="Enter tab name..." 
                                value={newTabName}
                                onChange={(e) => setNewTabName(e.target.value)}
                                style={{ padding: '12px 15px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontSize: '14px', outline: 'none' }}
                            />
                            <div className="custom-scroll" style={{ flex: 1, border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '8px', minHeight: 0, padding: '15px', overflowY: 'auto' }}>
                                {selectedApps.length === 0 ? (
                                    <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                        <span style={{ color: '#64748b', fontSize: '13px', textAlign: 'center' }}>Click apps on the left to add them here.</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '15px' }}>
                                        {selectedApps.map((app, index) => (
                                            <div 
                                                key={app.id || index} 
                                                onClick={() => handleRemoveApp(app)}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', position: 'relative' }}
                                                title="Click to remove"
                                            >
                                                <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                                    <X size={10} color="white" />
                                                </div>
                                                {app.iconBase64 ? (
                                                    <img src={app.iconBase64} alt={app.name} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                                                ) : (
                                                    app.fallbackIcon
                                                )}
                                                <span style={{ fontSize: '11px', color: '#cbd5e1', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                                    {app.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {editingTabId && (
                                    <button 
                                        onClick={() => {
                                            setSavedTabs(prev => prev.filter(t => t.id !== editingTabId));
                                            handleCancel();
                                        }} 
                                        style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                                    >
                                        Delete
                                    </button>
                                )}
                                <button onClick={handleCancel} style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>Cancel</button>
                                <button 
                                    onClick={handleSaveTab} 
                                    disabled={!newTabName.trim() || selectedApps.length === 0}
                                    style={{ 
                                        flex: 1, padding: '10px', 
                                        backgroundColor: (!newTabName.trim() || selectedApps.length === 0) ? 'rgba(16, 185, 129, 0.4)' : '#10b981', 
                                        border: 'none', color: 'white', borderRadius: '6px', 
                                        cursor: (!newTabName.trim() || selectedApps.length === 0) ? 'not-allowed' : 'pointer', 
                                        fontWeight: 'bold', transition: 'all 0.2s' 
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Inner Div (Tabs Grid) */}
                            <div className="custom-scroll" style={{ flex: 1, border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '15px', minHeight: 0 }}>
                                {savedTabs.length === 0 ? (
                                    <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                        <span style={{ color: '#64748b' }}>No tabs created yet.</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {savedTabs.map(tab => (
                                            <div 
                                                key={tab.id} 
                                                onClick={() => handleEditTab(tab)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>{tab.name}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>{tab.apps.length} app{tab.apps.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {tab.apps.slice(0, 3).map((app, idx) => (
                                                            <div key={idx} style={{ width: '24px', height: '24px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                {app.iconBase64 ? (
                                                                    <img src={app.iconBase64} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                                                ) : (
                                                                    <div style={{ transform: 'scale(0.5)', display: 'flex' }}>{app.fallbackIcon}</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {tab.apps.length > 3 && (
                                                            <div style={{ width: '24px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>
                                                                +{tab.apps.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSavedTabs(prev => prev.filter(t => t.id !== tab.id));
                                                            }}
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '50%',
                                                                width: '32px', height: '32px', cursor: 'pointer', transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                            title="Delete tab"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                for (const app of tab.apps) {
                                                                    if (app.path && window.electronAPI && window.electronAPI.launchApp) {
                                                                        window.electronAPI.launchApp(app.path);
                                                                    }
                                                                }
                                                            }}
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '50%',
                                                                width: '32px', height: '32px', cursor: 'pointer', transition: 'all 0.2s',
                                                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            title="Launch group"
                                                        >
                                                            <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setIsCreatingTab(true)} style={{ padding: '10px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>
                                Create new tab
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppScannerWidget;
