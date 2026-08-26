import React, { useState } from 'react';
import InputCapsule from '../components/InputCapsule';
import MessageWindow from '../components/MessageWindow';
import MapWidget from '../components/MapWidget';
import VoiceOrb from '../components/VoiceOrb';
import DateTimeWidget from '../components/DateTimeWidget';
import SystemStatusWidget from '../components/SystemStatusWidget';
import PlaceholderWidget from '../components/PlaceholderWidget';
import AiCameraFeed from '../components/AiCameraFeed';
import VoskWakewordEngine from '../components/VoskWakewordEngine';

import FloatingActionSidebar from '../components/FloatingActionSidebar';
import AppScannerWidget from '../components/AppScannerWidget';
import { Map, Camera, MonitorPlay } from 'lucide-react';
import { useGeminiLive } from '../services/useGeminiLive';
import { useVisionBrain } from '../services/useVisionBrain';
import '../components/SystemWidgets.css';

const MainWorkspace = ({ activeModel, setActiveModel, isFocused }) => {

    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isAppScannerOpen, setIsAppScannerOpen] = useState(false);
    const [isAiTalking, setIsAiTalking] = useState(false);
    const [isUserTalking, setIsUserTalking] = useState(false);
    const [isCameraAwake, setIsCameraAwake] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');
    const autoStartedRef = React.useRef(false);
    
    // 2. Vision Brain State
    const { isVisionActive, startVisionTask } = useVisionBrain();

    // 3. Gemini Live (Voice API) hook
    const { isConnected, isAiTalking: geminiAiTalking, isUserTalking: geminiUserTalking, error, messages, setMessages, startConversation, stopConversation, sendTextMessage, isMuted, toggleMute, isMicMuted, toggleMicMute, forceWakeword } = useGeminiLive({ isCameraAwake });

    React.useEffect(() => {
        if (window.electronAPI && window.electronAPI.getSystemPrompt) {
            window.electronAPI.getSystemPrompt().then(setSystemPrompt);
        }

        if (!autoStartedRef.current) {
            autoStartedRef.current = true;
            // Auto-connect Mic and Speaker on startup
            const rawKey = localStorage.getItem('geminiApiKey');
            if (rawKey) {
                // Delay slightly to ensure UI is ready
                setTimeout(() => {
                    startConversation(true).catch(err => console.log("Auto-start voice failed:", err));
                }, 1000);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayAiTalking = isAiTalking || geminiAiTalking;
    const displayUserTalking = isUserTalking || geminiUserTalking;

    const handleSendMessage = async (content) => {
        if (isConnected) {
            // If live voice is active, seamlessly inject the text message into the live WebSocket!
            sendTextMessage(content);
            return;
        }

        // Start Bidi API without microphone to get native audio stream output for text input
        try {
            setIsAiTalking(true);
            await startConversation(false, content);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', content: `Error connecting to Gemini: ${err.message}` }]);
            setIsAiTalking(false);
        }
    };

    return (
        <div id="main-view" className={`view-panel ${isFocused ? 'active' : ''}`}>
            {/* Top Left Windows - Always visible */}
            <AiCameraFeed className="placeholder-1" onAwakeChange={setIsCameraAwake} />
            <VoskWakewordEngine onWakeword={forceWakeword} />
            <PlaceholderWidget title="Screen Share" className="placeholder-2" icon={MonitorPlay} />

            {/* Central Widgets - Fades out when map or app scanner is open */}
            <div className={`widget-fade ${isMapOpen || isAppScannerOpen ? 'hidden' : ''}`}>
                {/* Central Placeholder Window */}
                <PlaceholderWidget title="Main Center Hub" className="placeholder-center">
                </PlaceholderWidget>
                <DateTimeWidget />

                <VoiceOrb isUserTalking={displayUserTalking} isAiTalking={displayAiTalking} />
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
                    isMicActive={!isMicMuted && isConnected}
                    onToggleMic={toggleMicMute}
                    voiceError={error}
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                />
            </div>
        </div>
    );
};

export default MainWorkspace;
