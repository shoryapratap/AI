import { useState, useRef, useCallback } from 'react';

export function useGeminiLive() {
    const [isConnected, setIsConnected] = useState(false);
    const [isAiTalking, setIsAiTalking] = useState(false);
    const [isUserTalking, setIsUserTalking] = useState(false);
    
    // Mute control
    const [isMuted, _setIsMuted] = useState(false);
    const isMutedRef = useRef(false);
    const toggleMute = () => {
        isMutedRef.current = !isMutedRef.current;
        _setIsMuted(isMutedRef.current);
    };

    // Mic mute control
    const [isMicMuted, _setIsMicMuted] = useState(false);
    const isMicMutedRef = useRef(false);
    const toggleMicMute = () => {
        isMicMutedRef.current = !isMicMutedRef.current;
        _setIsMicMuted(isMicMutedRef.current);
    };

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
    const activeNodesRef = useRef(0);

    // Keep track of the current streaming AI text
    const currentAiResponseRef = useRef('');

    const connectMicrophone = async () => {
        try {
            // Create context synchronously during user gesture
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            audioContext.resume().catch(console.error);
            audioContextRef.current = audioContext;

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
            streamRef.current = stream;

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

                if (isMicMutedRef.current) return;

                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                const uint8Data = new Uint8Array(pcmData.buffer);
                const chunkSize = 0x8000;
                let binary = '';
                for (let i = 0; i < uint8Data.length; i += chunkSize) {
                    binary += String.fromCharCode.apply(null, uint8Data.subarray(i, i + chunkSize));
                }
                const base64Data = btoa(binary);

                wsRef.current.send(JSON.stringify({
                    realtimeInput: {
                        audio: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Data
                        }
                    }
                }));
            };

            source.connect(processor);

            // Connect to a muted GainNode to keep processor running without echo feedback
            const dummyGain = audioContext.createGain();
            dummyGain.gain.value = 0;
            processor.connect(dummyGain);
            dummyGain.connect(audioContext.destination);

        } catch (err) {
            console.error('Microphone error:', err);
            setError('Could not access microphone: ' + err.message);
            throw err;
        }
    };

    const processAudioQueue = () => {
        if (!audioContextRef.current || playQueueRef.current.length === 0) {
            return;
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(console.error);
        }

        while (playQueueRef.current.length > 0) {
            const chunk = playQueueRef.current.shift();

            if (isMutedRef.current) {
                // Silently drain the audio chunk without playing
                activeNodesRef.current -= 1;
                if (activeNodesRef.current <= 0) {
                    activeNodesRef.current = 0;
                    setIsAiTalking(false);
                }
                continue;
            }

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
            activeNodesRef.current += 1;

            setIsAiTalking(true);

            source.onended = () => {
                activeNodesRef.current -= 1;
                if (activeNodesRef.current === 0) {
                    setIsAiTalking(false);
                }
            };
        }
    };

    const handleWebSocketMessage = useCallback(async (event) => {
        try {
            let data = event.data;
            if (typeof data !== 'string') {
                if (typeof data.text === 'function') {
                    data = await data.text();
                } else {
                    data = data.toString();
                }
            }

            const msg = JSON.parse(data);
            let newText = '';

            if (msg.serverContent) {
                const content = msg.serverContent;

                if (content.modelTurn && content.modelTurn.parts) {
                    console.log("Model parts received:", content.modelTurn.parts); // DEBUG LOG
                    for (const part of content.modelTurn.parts) {
                        if (part.text) {
                            newText += part.text;
                        }
                        if (part.inlineData && part.inlineData.data) {
                            console.log("Audio data received!"); // DEBUG LOG
                            window.audioChunksReceived = (window.audioChunksReceived || 0) + 1;
                            const binary = atob(part.inlineData.data);
                            const len = binary.length;
                            const evenLen = len - (len % 2);
                            const bytes = new Uint8Array(evenLen);
                            for (let i = 0; i < evenLen; i++) {
                                bytes[i] = binary.charCodeAt(i);
                            }
                            const pcm16 = new Int16Array(bytes.buffer);

                            const float32 = new Float32Array(pcm16.length);
                            for (let i = 0; i < pcm16.length; i++) {
                                float32[i] = pcm16[i] / 32768.0;
                            }

                            playQueueRef.current.push(float32);
                            processAudioQueue();
                        }
                    }
                }

                if (content.outputTranscription && content.outputTranscription.text) {
                    newText += content.outputTranscription.text;
                } else if (content.outputTranscription && content.outputTranscription.parts) {
                    for (const p of content.outputTranscription.parts) {
                        if (p.text) newText += p.text;
                    }
                }
            }

            if (newText) {
                const isNewTurn = currentAiResponseRef.current === '';
                currentAiResponseRef.current += newText;

                setMessages(prev => {
                    const updated = [...prev];
                    // Clean streamed text locally to prevent flicker
                    let displayText = currentAiResponseRef.current
                        .replace(/<TASK>[\s\S]*?(<\/TASK>|$)/gi, '')
                        .replace(/<COMMAND:\s*.*?>[\s\S]*?(<\/COMMAND>|$)/gi, '')
                        .replace(/<MESSAGE>|<\/MESSAGE>/gi, '')
                        .trim();

                    if (!isNewTurn && updated.length > 0 && updated[updated.length - 1].role === 'ai') {
                        updated[updated.length - 1] = {
                            role: 'ai',
                            content: displayText
                        };
                    } else {
                        updated.push({ role: 'ai', content: displayText });
                    }
                    return updated;
                });
            }

            if (msg.serverContent && msg.serverContent.turnComplete) {
                // The VoiceOrb animation is enough for the user to know the AI responded.
                if (window.electronAPI && window.electronAPI.handleAITask) {
                    window.electronAPI.handleAITask(currentAiResponseRef.current);
                }
                window.audioChunksReceived = 0;
                currentAiResponseRef.current = '';
            }

        } catch (err) {
            console.error('Error parsing WS message:', err);
            setError(`CRASH in WS handler: ${err.message || err}`);
        }
    }, []);

    const startConversation = (withMic = true, initialText = null) => {
        return new Promise(async (resolve, reject) => {
            try {
                setError(null);
                if (withMic) {
                    await connectMicrophone();
                } else {
                    // Create context for playback only
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                    audioContext.resume().catch(console.error);
                    audioContextRef.current = audioContext;
                }

            let rawKey = localStorage.getItem('geminiApiKey') || '';
            const API_KEY = rawKey.replace(/['"]/g, '').trim();

            if (!API_KEY) {
                setError("Google Gemini API Key is missing. Please save it in settings.");
                return;
            }

            let systemPromptText = '';
            if (window.electronAPI && window.electronAPI.getSystemPrompt) {
                systemPromptText = await window.electronAPI.getSystemPrompt();
            }

            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                const setupPayload = {
                    setup: {
                        model: 'models/gemini-3.1-flash-live-preview',
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: "Aoede"
                                    }
                                }
                            }
                        }
                    }
                };
                if (systemPromptText) {
                    setupPayload.setup.systemInstruction = {
                        parts: [{ text: systemPromptText }]
                    };
                }
                ws.send(JSON.stringify(setupPayload));

                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        if (initialText) {
                            sendTextMessage(initialText);
                        } else if (withMic) {
                            // Prompt AI to introduce itself only if opening mic without text
                            ws.send(JSON.stringify({
                                clientContent: {
                                    turns: [{ role: 'user', parts: [{ text: "Hello! Please introduce yourself briefly." }] }],
                                    turnComplete: true
                                }
                            }));
                        }
                        resolve();
                    }
                }, 500);
            };

            ws.onmessage = handleWebSocketMessage;

            ws.onerror = (e) => {
                console.error('WebSocket Error:', e);
                setError('WebSocket Connection Error. Check console or API key.');
                stopConversation();
            };

            ws.onclose = (e) => {
                console.log(`WebSocket closed: ${e.code} - ${e.reason}`);
                if (e.code !== 1000 && e.code !== 1005) {
                    setError(`API Disconnected (${e.code}): ${e.reason || 'Invalid API Key or Model'}`);
                }
                setIsConnected(false);
                stopConversation();
            };
            } catch (err) {
                console.error("Failed to start voice:", err);
                setError(`Failed to start voice: ${err.message}`);
                reject(err);
            }
        });
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
        activeNodesRef.current = 0;
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
        sendTextMessage,
        isMuted,
        toggleMute,
        isMicMuted,
        toggleMicMute
    };
}
