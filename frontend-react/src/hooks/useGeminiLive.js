import { useState, useRef, useCallback } from 'react';

export function useGeminiLive() {
    const [isConnected, setIsConnected] = useState(false);
    const [isAiTalking, setIsAiTalking] = useState(false);
    const [isUserTalking, setIsUserTalking] = useState(false);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am Emma. How can I help you control your PC today?' }
    ]);

    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);
    const sourceRef = useRef(null);
    const processorRef = useRef(null);
    
    // Playback state
    const playQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const nextPlayTimeRef = useRef(0);
    
    // Keep track of the current streaming AI text
    const currentAiResponseRef = useRef('');

    const connectMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: {
                channelCount: 1,
                sampleRate: 16000
            }});
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);
                setIsUserTalking(rms > 0.05);

                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                const uint8Data = new Uint8Array(pcmData.buffer);
                let binary = '';
                for (let i = 0; i < uint8Data.byteLength; i++) {
                    binary += String.fromCharCode(uint8Data[i]);
                }
                const base64Data = btoa(binary);

                wsRef.current.send(JSON.stringify({
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Data
                        }]
                    }
                }));
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

        } catch (err) {
            console.error('Microphone error:', err);
            setError('Could not access microphone: ' + err.message);
            throw err;
        }
    };

    const processAudioQueue = () => {
        if (!audioContextRef.current || playQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsAiTalking(false);
            return;
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        isPlayingRef.current = true;
        setIsAiTalking(true);

        const chunk = playQueueRef.current.shift();
        
        const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000); 
        buffer.copyToChannel(chunk, 0);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);

        const currentTime = audioContextRef.current.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime;
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buffer.duration;

        source.onended = () => {
            if (playQueueRef.current.length === 0) {
                isPlayingRef.current = false;
                setIsAiTalking(false);
            }
        };

        processAudioQueue();
    };

    const handleWebSocketMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.data);
            let newText = '';

            if (msg.serverContent) {
                const content = msg.serverContent;
                
                // Parse old modelTurn text if present (for backward compatibility)
                if (content.modelTurn && content.modelTurn.parts) {
                    for (const part of content.modelTurn.parts) {
                        if (part.text) {
                            newText += part.text;
                        }
                        // Extract streaming audio
                        if (part.inlineData && part.inlineData.data) {
                            const binary = atob(part.inlineData.data);
                            const len = binary.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binary.charCodeAt(i);
                            }
                            const pcm16 = new Int16Array(bytes.buffer);
                            
                            const float32 = new Float32Array(pcm16.length);
                            for (let i = 0; i < pcm16.length; i++) {
                                float32[i] = pcm16[i] / 32768.0;
                            }

                            playQueueRef.current.push(float32);
                            
                            if (!isPlayingRef.current) {
                                processAudioQueue();
                            }
                        }
                    }
                }
                
                // Parse new outputAudioTranscription
                if (content.outputTranscription) {
                    if (content.outputTranscription.text) {
                        newText += content.outputTranscription.text;
                    } else if (content.outputTranscription.parts) {
                        for (const p of content.outputTranscription.parts) {
                            if (p.text) newText += p.text;
                        }
                    }
                }
            }
                
                if (newText) {
                    currentAiResponseRef.current += newText;
                    setMessages(prev => {
                        const updated = [...prev];
                        // If the last message is from AI, update it
                        if (updated.length > 0 && updated[updated.length - 1].role === 'ai') {
                            updated[updated.length - 1] = { 
                                role: 'ai', 
                                content: currentAiResponseRef.current 
                            };
                        } else {
                            // Otherwise push a new message
                            updated.push({ role: 'ai', content: currentAiResponseRef.current });
                        }
                        return updated;
                    });
                }
            
            if (msg.serverContent && msg.serverContent.turnComplete) {
                // The AI finished its turn, reset the active buffer
                currentAiResponseRef.current = '';
            }
        } catch (err) {
            console.error('Error parsing WS message:', err);
        }
    }, []);

    const startConversation = async () => {
        setError(null);
        await connectMicrophone();

        let rawKey = localStorage.getItem('geminiApiKey') || '';
        const API_KEY = rawKey.replace(/['"]/g, '').trim();
        
        if (!API_KEY) {
            setError("Google Gemini API Key is missing. Please save it in settings.");
            return;
        }

        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            ws.send(JSON.stringify({
                setup: {
                    model: 'models/gemini-3.1-flash-live-preview',
                    generationConfig: {
                        responseModalities: ["AUDIO"]
                    },
                    outputAudioTranscription: {},
                    inputAudioTranscription: {}
                }
            }));
        };

        ws.onmessage = handleWebSocketMessage;

        ws.onerror = (e) => {
            console.error('WebSocket Error:', e);
            setError('WebSocket Connection Error. Check console or API key.');
            stopConversation();
        };

        ws.onclose = (e) => {
            console.log(`WebSocket closed: ${e.code} - ${e.reason}`);
            setIsConnected(false);
            stopConversation();
        };
    };

    const stopConversation = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsConnected(false);
        setIsAiTalking(false);
        setIsUserTalking(false);
        playQueueRef.current = [];
        isPlayingRef.current = false;
        nextPlayTimeRef.current = 0;
        currentAiResponseRef.current = '';
    };

    const sendTextMessage = (text) => {
        if (!text.trim()) return;
        
        // Add user text to UI immediately
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Send clientContent turn via WebSocket
            wsRef.current.send(JSON.stringify({
                clientContent: {
                    turns: [
                        {
                            role: 'user',
                            parts: [{ text: text }]
                        }
                    ],
                    turnComplete: true
                }
            }));
            
            // Push a placeholder for the AI response to start streaming into
            setMessages(prev => [...prev, { role: 'ai', content: '' }]);
            currentAiResponseRef.current = '';
        } else {
            setError("Cannot send text: Live connection is not open. Try restarting the voice feature.");
        }
    };

    return {
        isConnected,
        isAiTalking,
        isUserTalking,
        error,
        messages,
        setMessages, // expose setter in case we want to manipulate it externally
        startConversation,
        stopConversation,
        sendTextMessage
    };
}
