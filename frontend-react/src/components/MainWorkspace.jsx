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
import { useGeminiLive } from '../hooks/useGeminiLive';

const MainWorkspace = ({ activeModel, setActiveModel, isFocused }) => {

    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isAppScannerOpen, setIsAppScannerOpen] = useState(false);
    const [isAiTalking, setIsAiTalking] = useState(false);
    const [isUserTalking, setIsUserTalking] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');

    React.useEffect(() => {
        if (window.electronAPI && window.electronAPI.getSystemPrompt) {
            window.electronAPI.getSystemPrompt().then(setSystemPrompt);
        }
    }, []);

    const { isConnected, isAiTalking: geminiAiTalking, isUserTalking: geminiUserTalking, error, messages, setMessages, startConversation, stopConversation, sendTextMessage } = useGeminiLive();

    const displayAiTalking = isAiTalking || geminiAiTalking;
    const displayUserTalking = isUserTalking || geminiUserTalking;

    const handleSendMessage = async (content) => {
        if (isConnected) {
            // If live voice is active, seamlessly inject the text message into the live WebSocket!
            sendTextMessage(content);
            return;
        }

        // Fallback to text-only REST API if voice is disabled
        setMessages(prev => [...prev, { role: 'user', content }]);
        setIsAiTalking(true);

        try {
            const rawKey = localStorage.getItem('geminiApiKey') || '';
            const API_KEY = rawKey.replace(/['"]/g, '').trim();

            if (!API_KEY) {
                setMessages(prev => [...prev, { role: 'ai', content: 'Error: Gemini API Key is missing. Please add it in settings.' }]);
                setIsAiTalking(false);
                return;
            }

            const payload = {
                contents: [{ parts: [{ text: content }] }]
            };
            if (systemPrompt) {
                payload.systemInstruction = { parts: [{ text: systemPrompt }] };
            }

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`API Error: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

            let displayResponse = aiResponse;
            if (window.electronAPI) {
                if (window.electronAPI.handleAITask) {
                    window.electronAPI.handleAITask(aiResponse);
                }
                if (window.electronAPI.cleanAIText) {
                    displayResponse = await window.electronAPI.cleanAIText(aiResponse);
                }
            }

            setMessages(prev => [...prev, { role: 'ai', content: displayResponse }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', content: `Error connecting to Gemini: ${err.message}` }]);
        } finally {
            setIsAiTalking(false);
        }
    };

    return (
        <div id="main-view" className={`view-panel ${isFocused ? 'active' : ''}`}>
            {/* Top Left Placeholder Windows - Always visible */}
            <PlaceholderWidget title="AI Camera Feed" className="placeholder-1" icon={Camera} />
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
                    isVoiceConnected={isConnected}
                    startVoice={startConversation}
                    stopVoice={stopConversation}
                    voiceError={error}
                />
            </div>
        </div>
    );
};

export default MainWorkspace;
