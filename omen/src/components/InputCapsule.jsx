import React, { useState } from 'react';
import { Plus, Mic, ChevronDown, Volume2, VolumeX } from 'lucide-react';

const InputCapsule = ({ activeModel, setActiveModel, onSendMessage, onMicStateChange, isMicActive, onToggleMic, voiceError, isMuted, onToggleMute, isSleepMode }) => {
    const [query, setQuery] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            const trimmedQuery = query.trim();
            if (!trimmedQuery) return;
            
            console.log(`Submitted prompt: "${trimmedQuery}"`);
            if (onSendMessage) {
                onSendMessage(trimmedQuery);
            }
            setQuery('');
            
            // Visual feedback
            setIsThinking(true);
            setTimeout(() => setIsThinking(false), 800);
        }
    };

    const toggleModel = () => {
        const isFlash = activeModel === 'flash';
        setActiveModel(isFlash ? 'pro' : 'flash');
    };

    const handleMicClick = () => {
        if (onToggleMic) {
            onToggleMic();
        }
    };

    const handleAttach = () => {
        alert("File Attachment System: Select documents or workspace files for context.");
    };

    const modelName = isSleepMode ? '🌙 Sleeping' : (activeModel === 'flash' ? 'Omen-Flash' : (activeModel === 'pro' ? 'Omen-Pro' : 'Omen-Ultra'));

    return (
        <div className="capsule-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="input-capsule" style={{ borderColor: isThinking ? 'rgba(255, 255, 255, 0.3)' : '' }}>
                <button className="capsule-btn attach-btn" title="Add files" onClick={handleAttach}>
                    <Plus size={20} />
                </button>
                
                <input 
                    type="text" 
                    id="chat-input" 
                    placeholder={isMicActive ? 'Gemini Live Voice is active...' : 'Ask Omen...'}
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                
                <div className="capsule-right-controls">
                    <div className="model-selector-pill" onClick={toggleModel} style={isSleepMode ? { color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.4)', backgroundColor: 'rgba(139, 92, 246, 0.15)' } : {}}>
                        <span className="model-name">{modelName}</span>
                        {!isSleepMode && <ChevronDown size={16} className="dropdown-arrow" />}
                    </div>
                    
                    <button 
                        className="capsule-btn mute-btn" 
                        title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
                        onClick={onToggleMute}
                        style={{
                            color: isMuted ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
                            marginRight: '0px',
                            padding: '6px'
                        }}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>

                    <button 
                        className="capsule-btn mic-btn" 
                        title="Use microphone"
                        onClick={handleMicClick}
                        style={{
                            color: isMicActive ? '#ef4444' : '',
                            backgroundColor: isMicActive ? 'rgba(239, 68, 68, 0.08)' : '',
                            marginLeft: '-4px'
                        }}
                    >
                        <Mic size={20} />
                    </button>
                </div>
            </div>
            {voiceError && <div style={{ color: '#f43f5e', fontSize: '0.85rem', marginTop: '8px' }}>{voiceError}</div>}
        </div>
    );
};

export default InputCapsule;
