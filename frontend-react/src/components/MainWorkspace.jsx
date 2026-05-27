import React, { useState } from 'react';
import InputCapsule from './InputCapsule';
import MessageWindow from './MessageWindow';
import MapWidget from './MapWidget';
import VoiceOrb from './VoiceOrb';
import { Map } from 'lucide-react';

const MainWorkspace = ({ activeModel, setActiveModel, isFocused }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am Emma. How can I help you control your PC today?' }
    ]);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isAiTalking, setIsAiTalking] = useState(false);
    const [isUserTalking, setIsUserTalking] = useState(false);

    const handleSendMessage = (content) => {
        setMessages(prev => [...prev, { role: 'user', content }]);
        setIsAiTalking(true);

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', content: 'I am a mock response. The Python backend is not connected yet!' }]);
            
            // Keep the animation going slightly longer after response arrives to simulate talking
            setTimeout(() => {
                setIsAiTalking(false);
            }, 2000);
        }, 1000);
    };

    return (
        <div id="main-view" className={`view-panel ${isFocused ? 'active' : ''}`}>
            <div className="widgets-container">
                <button 
                    className={`map-toggle-btn ${isMapOpen ? 'active' : ''}`} 
                    onClick={() => setIsMapOpen(!isMapOpen)}
                    title="Toggle Map Widget"
                >
                    <Map size={20} />
                </button>

                {isMapOpen && <MapWidget />}

                {/* AI Voice Orb - Fades out when map is open */}
                <div className={`widget-fade ${isMapOpen ? 'hidden' : ''}`}>
                    <VoiceOrb isUserTalking={isUserTalking} isAiTalking={isAiTalking} />
                </div>
            </div>

            <MessageWindow messages={messages} />
            
            <div className="conversational-hub" style={{ marginTop: 'auto', marginBottom: '40px' }}>
                <InputCapsule 
                    activeModel={activeModel} 
                    setActiveModel={setActiveModel} 
                    onSendMessage={handleSendMessage}
                    onMicStateChange={(isListening) => setIsUserTalking(isListening)}
                />
            </div>
        </div>
    );
};

export default MainWorkspace;
