import React, { useState } from 'react';
import InputCapsule from './InputCapsule';
import MessageWindow from './MessageWindow';
import MapWidget from './MapWidget';
import { Map } from 'lucide-react';

const MainWorkspace = ({ activeModel, setActiveModel, isFocused }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am Emma. How can I help you control your PC today?' }
    ]);
    const [isMapOpen, setIsMapOpen] = useState(false);

    const handleSendMessage = (content) => {
        setMessages(prev => [...prev, { role: 'user', content }]);
        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', content: 'I am a mock response. The Python backend is not connected yet!' }]);
        }, 1000);
    };

    return (
        <div id="main-view" className={`view-panel ${isFocused ? 'active' : ''}`}>
            <button 
                className={`map-toggle-btn ${isMapOpen ? 'active' : ''}`} 
                onClick={() => setIsMapOpen(!isMapOpen)}
                title="Toggle Map Widget"
            >
                <Map size={20} />
            </button>

            {isMapOpen && <MapWidget />}

            <MessageWindow messages={messages} />
            
            <div className="conversational-hub" style={{ marginTop: 'auto', marginBottom: '40px' }}>
                <InputCapsule 
                    activeModel={activeModel} 
                    setActiveModel={setActiveModel} 
                    onSendMessage={handleSendMessage} 
                />
            </div>
        </div>
    );
};

export default MainWorkspace;
