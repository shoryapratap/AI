import React, { useState } from 'react';
import InputCapsule from './InputCapsule';
import MessageWindow from './MessageWindow';
import MapWidget from './MapWidget';
import VoiceOrb from './VoiceOrb';
import DateTimeWidget from './DateTimeWidget';
import SystemStatusWidget from './SystemStatusWidget';
import PlaceholderWidget from './PlaceholderWidget';
import FloatingActionSidebar from './FloatingActionSidebar';
import AppScannerWidget from './AppScannerWidget';
import { Map, Camera, MonitorPlay } from 'lucide-react';

const MainWorkspace = ({ activeModel, setActiveModel, isFocused }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am Emma. How can I help you control your PC today?' }
    ]);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isAppScannerOpen, setIsAppScannerOpen] = useState(false);
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
            {/* Top Left Placeholder Windows - Always visible */}
            <PlaceholderWidget title="AI Camera Feed" className="placeholder-1" icon={Camera} />
            <PlaceholderWidget title="Screen Share" className="placeholder-2" icon={MonitorPlay} />

            {/* Central Widgets - Fades out when map or app scanner is open */}
            <div className={`widget-fade ${isMapOpen || isAppScannerOpen ? 'hidden' : ''}`}>
                {/* Central Placeholder Window */}
                <PlaceholderWidget title="Main Center Hub" className="placeholder-center" />
                <DateTimeWidget />
                <VoiceOrb isUserTalking={isUserTalking} isAiTalking={isAiTalking} />
                <SystemStatusWidget />
            </div>

            {/* Floating Action Sidebar - Fades out when map or app scanner is open */}
            <div className={`widget-fade ${isMapOpen || isAppScannerOpen ? 'hidden' : ''}`}>
                <FloatingActionSidebar 
                    isMapOpen={isMapOpen} 
                    onToggleMap={() => {
                        setIsMapOpen(!isMapOpen);
                        setIsAppScannerOpen(false);
                    }} 
                    isAppScannerOpen={isAppScannerOpen}
                    onToggleAppScanner={() => {
                        setIsAppScannerOpen(!isAppScannerOpen);
                        setIsMapOpen(false);
                    }}
                />
            </div>
            <div className="widgets-container">
                {isMapOpen && <MapWidget onClose={() => setIsMapOpen(false)} />}
                {isAppScannerOpen && <AppScannerWidget onClose={() => setIsAppScannerOpen(false)} />}
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
