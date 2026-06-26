import React, { useState, useEffect } from 'react';
import { Cpu, KeyRound, Volume2, Palette } from 'lucide-react';

const SettingsPanel = ({ activeModel, setActiveModel, activeColor, setActiveColor, isFocused }) => {
    const [temperature, setTemperature] = useState(70);
    const [isSaved, setIsSaved] = useState(false);

    // State for API Keys
    const [geminiKey, setGeminiKey] = useState('');
    const [geminiVisionKey, setGeminiVisionKey] = useState('');
    const [groqKey, setGroqKey] = useState('');
    const [openAiKey, setOpenAiKey] = useState('');

    useEffect(() => {
        // Load saved API keys from localStorage on mount
        setGeminiKey(localStorage.getItem('geminiApiKey') || '');
        setGeminiVisionKey(localStorage.getItem('geminiVisionApiKey') || '');
        setGroqKey(localStorage.getItem('groqApiKey') || '');
        setOpenAiKey(localStorage.getItem('openAiApiKey') || '');
    }, []);

    const handleSave = () => {
        // Save to localStorage
        localStorage.setItem('geminiApiKey', geminiKey);
        localStorage.setItem('geminiVisionApiKey', geminiVisionKey);
        localStorage.setItem('groqApiKey', groqKey);
        localStorage.setItem('openAiApiKey', openAiKey);
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        
        // Let the app know settings might have updated
        window.dispatchEvent(new Event('storage'));
    };

    const colors = [
        { key: 'indigo', hex: '#6366f1' },
        { key: 'purple', hex: '#a855f7' },
        { key: 'emerald', hex: '#10b981' },
        { key: 'rose', hex: '#f43f5e' }
    ];

    return (
        <div id="settings-view" className={`view-panel ${isFocused ? 'active' : ''}`}>
            <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingBottom: '100px' }}>
                <div className="settings-hub" style={{ flexDirection: 'column', gap: '40px', padding: '40px 60px' }}>
                
                {/* General Settings Section */}
                <div className="settings-section">
                    <h2 className="settings-title">General Settings</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Configure your workspace preferences.</p>
                    
                    <div className="settings-card" style={{ marginTop: '20px', maxWidth: '600px' }}>
                        <div className="card-header">
                            <Palette size={20} />
                            <h3>Theme Color</h3>
                        </div>
                        <div className="card-body" style={{ flexDirection: 'row', gap: '15px' }}>
                            {colors.map(color => (
                                <div 
                                    key={color.key}
                                    onClick={() => setActiveColor && setActiveColor(color.key)}
                                    style={{ 
                                        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: color.hex, 
                                        cursor: 'pointer', border: activeColor === color.key ? '3px solid white' : '3px solid transparent',
                                        transition: 'all 0.2s', pointerEvents: 'auto'
                                    }}
                                    title={color.key}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* API Configuration Section */}
                <div className="settings-section">
                    <h2 className="settings-title">API Configuration</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your AI credentials.</p>
                    
                    <div className="settings-grid" style={{ display: 'flex', marginTop: '20px' }}>
                        <div className="settings-card" style={{ width: '100%', maxWidth: '600px' }}>
                            <div className="card-header">
                                <span style={{ fontSize: '20px', marginRight: '8px' }}>🔑</span>
                                <h3>AI Credentials</h3>
                            </div>
                            <div className="card-body">
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label htmlFor="setting-gemini" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Google Gemini API Key</label>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Required for Realtime Voice-to-Voice AI</p>
                                        <input 
                                        type="text" 
                                        id="setting-gemini" 
                                        placeholder="Paste your Gemini API key here..." 
                                        style={{ 
                                            fontSize: '1.1rem', padding: '12px 16px', width: '100%', 
                                            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', 
                                            color: 'white', borderRadius: '8px', 
                                            pointerEvents: 'auto', userSelect: 'text', WebkitUserSelect: 'text',
                                            WebkitAppRegion: 'no-drag',
                                            position: 'relative', zIndex: 99999, transform: 'translateZ(20px)'
                                        }}
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label htmlFor="setting-vision" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Vision API Key (Secondary)</label>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Required for Screen Understanding / Mouse Control</p>
                                        <input 
                                        type="text" 
                                        id="setting-vision" 
                                        placeholder="Paste your second Gemini API key here..." 
                                        style={{ 
                                            fontSize: '1.1rem', padding: '12px 16px', width: '100%', 
                                            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', 
                                            color: 'white', borderRadius: '8px', 
                                            pointerEvents: 'auto', userSelect: 'text', WebkitUserSelect: 'text',
                                            WebkitAppRegion: 'no-drag',
                                            position: 'relative', zIndex: 99999, transform: 'translateZ(20px)'
                                        }}
                                        value={geminiVisionKey}
                                        onChange={(e) => setGeminiVisionKey(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="settings-footer" style={{ marginTop: '25px' }}>
                        <button className="save-btn" onClick={handleSave} style={{ pointerEvents: 'auto', userSelect: 'auto', padding: '12px 32px', fontSize: '1.1rem', cursor: 'pointer', background: 'var(--accent-purple)', border: 'none', color: 'white', borderRadius: '8px' }}>Save API Key</button>
                        <span className={`save-status ${isSaved ? '' : 'hidden'}`} style={{ marginLeft: '15px', color: 'var(--accent-emerald)', opacity: isSaved ? 1 : 0, transition: 'opacity 0.3s' }}>Saved!</span>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
