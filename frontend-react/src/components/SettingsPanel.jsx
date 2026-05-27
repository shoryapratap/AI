import React, { useState } from 'react';
import { Cpu, KeyRound, Volume2, Palette } from 'lucide-react';

const SettingsPanel = ({ activeModel, setActiveModel, activeColor, setActiveColor, isFocused }) => {
    const [temperature, setTemperature] = useState(70);
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const colors = [
        { key: 'indigo', hex: '#6366f1' },
        { key: 'purple', hex: '#a855f7' },
        { key: 'emerald', hex: '#10b981' },
        { key: 'rose', hex: '#f43f5e' }
    ];

    return (
        <div id="settings-view" className={`view-panel ${isFocused ? 'active' : ''}`}>
            <div className="settings-hub">
                <h2 className="settings-title">Settings Configurations</h2>
                
                <div className="settings-grid">
                    {/* Card 1: Model parameters */}
                    <div className="settings-card">
                        <div className="card-header">
                            <Cpu size={20} />
                            <h3>Kernel Model</h3>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label htmlFor="setting-model">Active Agent Model</label>
                                <select 
                                    id="setting-model"
                                    value={activeModel}
                                    onChange={(e) => setActiveModel(e.target.value)}
                                >
                                    <option value="flash">Emma-Flash (Low Latency)</option>
                                    <option value="pro">Emma-Pro (Balanced)</option>
                                    <option value="ultra">Emma-Ultra (High Reasoning)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="setting-temp">Temperature (Creativity)</label>
                                <div className="slider-group">
                                    <input 
                                        type="range" 
                                        id="setting-temp" 
                                        min="0" 
                                        max="100" 
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                    />
                                    <span id="temp-val">{(temperature / 100).toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Environment API Keys */}
                    <div className="settings-card">
                        <div className="card-header">
                            <KeyRound size={20} />
                            <h3>API Credentials</h3>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label htmlFor="setting-groq">GroqCloud API Token</label>
                                <input type="password" id="setting-groq" placeholder="gsk_xxxxxxxxxxxxxxxx" defaultValue="gsk_demo_credentials_val" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="setting-openai">OpenAI API Key</label>
                                <input type="password" id="setting-openai" placeholder="sk-proj-xxxxxxxxxxxxxxxx" />
                            </div>
                        </div>
                    </div>

                    {/* Card 3: System Voice options */}
                    <div className="settings-card">
                        <div className="card-header">
                            <Volume2 size={20} />
                            <h3>Audio & Voice</h3>
                        </div>
                        <div className="card-body">
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <h4>Speech Synthesis</h4>
                                    <span>Synthesize voice responses locally</span>
                                </div>
                                <label className="switch-toggle">
                                    <input type="checkbox" id="setting-speech" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <h4>High Sensitivity Mic</h4>
                                    <span>Lower trigger delay for dictation</span>
                                </div>
                                <label className="switch-toggle">
                                    <input type="checkbox" id="setting-micsens" />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Aesthetics & UI Theme */}
                    <div className="settings-card">
                        <div className="card-header">
                            <Palette size={20} />
                            <h3>Glow Preferences</h3>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label>Atmosphere Backdrop Color</label>
                                <div className="color-picker-grid">
                                    {colors.map(color => (
                                        <button 
                                            key={color.key}
                                            className={`color-btn ${activeColor === color.key ? 'active' : ''}`}
                                            style={{ backgroundColor: color.hex }}
                                            onClick={() => setActiveColor(color.key)}
                                        ></button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="save-btn" onClick={handleSave}>Apply Configs</button>
                    <span className={`save-status ${isSaved ? '' : 'hidden'}`}>Saved!</span>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
