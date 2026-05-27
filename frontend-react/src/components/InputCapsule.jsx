import React, { useState } from 'react';
import { Plus, Mic, ChevronDown } from 'lucide-react';

const InputCapsule = ({ activeModel, setActiveModel, onSendMessage, onMicStateChange }) => {
    const [query, setQuery] = useState('');
    const [isListening, setIsListening] = useState(false);
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
        const newListeningState = !isListening;
        setIsListening(newListeningState);
        
        if (onMicStateChange) {
            onMicStateChange(newListeningState);
        }
        
        if (!newListeningState) {
            setTimeout(() => {
                setQuery('Analyze accounts and check balance');
                setIsListening(false);
            }, 2500);
        } else {
            setQuery('');
        }
    };

    const handleAttach = () => {
        alert("File Attachment System: Select documents or workspace files for context.");
    };

    const modelName = activeModel === 'flash' ? 'Emma-Flash' : (activeModel === 'pro' ? 'Emma-Pro' : 'Emma-Ultra');

    return (
        <div className="capsule-container">
            <div className="input-capsule" style={{ borderColor: isThinking ? 'rgba(255, 255, 255, 0.3)' : '' }}>
                <button className="capsule-btn attach-btn" title="Add files" onClick={handleAttach}>
                    <Plus size={20} />
                </button>
                
                <input 
                    type="text" 
                    id="chat-input" 
                    placeholder={isListening ? 'Listening to voice prompt...' : 'Ask Emma...'}
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isListening}
                />
                
                <div className="capsule-right-controls">
                    <div className="model-selector-pill" onClick={toggleModel}>
                        <span className="model-name">{modelName}</span>
                        <ChevronDown size={16} className="dropdown-arrow" />
                    </div>
                    
                    <button 
                        className="capsule-btn mic-btn" 
                        title="Use microphone"
                        onClick={handleMicClick}
                        style={{
                            color: isListening ? '#ef4444' : '',
                            backgroundColor: isListening ? 'rgba(239, 68, 68, 0.08)' : ''
                        }}
                    >
                        <Mic size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputCapsule;
