import React, { useState } from 'react';
import InputCapsule from './InputCapsule';
import MessageWindow from './MessageWindow';

const MainWorkspace = ({ activeModel, setActiveModel, isFocused }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am Emma. How can I help you control your PC today?' }
    ]);

    const handleSendMessage = (content) => {
        setMessages(prev => [...prev, { role: 'user', content }]);
        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', content: 'I am a mock response. The Python backend is not connected yet!' }]);
        }, 1000);
    };

    return (
        <div id="main-view" className={`view-panel ${isFocused ? 'active' : ''}`}>
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
