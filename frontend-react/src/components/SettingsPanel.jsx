import React, { useState, useEffect } from 'react';
import { Cpu, KeyRound, Volume2, Palette } from 'lucide-react';

const SettingsPanel = ({ activeModel, setActiveModel, activeColor, setActiveColor, isFocused }) => {
    const [temperature, setTemperature] = useState(70);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // Load saved API keys from localStorage on mount and set them in the DOM
        const savedGroq = localStorage.getItem('groqApiKey');
        const savedOpenAi = localStorage.getItem('openAiApiKey');
        const savedGemini = localStorage.getItem('geminiApiKey');
        
        if (savedGroq) document.getElementById('setting-groq').value = savedGroq;
        if (savedOpenAi) document.getElementById('setting-openai').value = savedOpenAi;
        if (savedGemini) document.getElementById('setting-gemini').value = savedGemini;
    }, []);

    const handleSave = () => {
        // Save directly from the DOM to localStorage
        const groqVal = document.getElementById('setting-groq').value;
        const openAiVal = document.getElementById('setting-openai').value;
        const geminiVal = document.getElementById('setting-gemini').value;

        localStorage.setItem('groqApiKey', groqVal);
        localStorage.setItem('openAiApiKey', openAiVal);
        localStorage.setItem('geminiApiKey', geminiVal);
        
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
            <div className="settings-hub">
                <h2 className="settings-title">API Configuration</h2>
                
                <div className="settings-grid" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="settings-card" style={{ width: '100%', maxWidth: '600px' }}>
                        <div className="card-header">
                            <KeyRound size={20} />
                            <h3>AI Credentials</h3>
                        </div>
                        <div className="card-body">
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label htmlFor="setting-gemini" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Google Gemini API Key</label>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Required for Realtime Voice-to-Voice AI</p>
                                <input 
                                    type="password" 
                                    id="setting-gemini" 
                                    placeholder="AIzaSyB..." 
                                    style={{ fontSize: '1.1rem', padding: '12px 16px' }}
                                />
                            </div>
                            
                            {/* Hidden inputs to preserve other keys if they exist, so we don't overwrite them with null on save */}
                            <input type="hidden" id="setting-groq" />
                            <input type="hidden" id="setting-openai" />
                        </div>
                    </div>
                </div>

                <div className="settings-footer" style={{ justifyContent: 'center', marginTop: '40px' }}>
                    <button className="save-btn" onClick={handleSave} style={{ padding: '12px 32px', fontSize: '1.1rem' }}>Save API Key</button>
                    <span className={`save-status ${isSaved ? '' : 'hidden'}`}>Saved!</span>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
