import React, { useEffect, useRef } from 'react';
import { createModel } from 'vosk-browser';

const VoskWakewordEngine = ({ onWakeword }) => {
    const isReadyRef = useRef(false);
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const modelRef = useRef(null);
    const recognizerRef = useRef(null);
    const processorRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const initEngine = async () => {
            try {
                console.log('[VoskEngine] Downloading and extracting model (45MB)...');
                
                // 1. Load the model
                modelRef.current = await createModel('/vosk-model-small-en-us-0.15.zip');
                if (!isMounted) return;
                console.log('[VoskEngine] Model loaded into RAM!');

                // 2. Initialize Recognizer with restrictive grammar
                console.log('[VoskEngine] Initializing KaldiRecognizer with custom grammar...');
                recognizerRef.current = new modelRef.current.KaldiRecognizer(16000, '["omen", "[unk]"]');
                recognizerRef.current.setWords(true);

                // 3. Setup result listener
                recognizerRef.current.on("result", (message) => {
                    const text = message.result.text;
                    if (text && text.toLowerCase().includes('omen')) {
                        console.log('🔥 [VoskEngine] WAKEWORD DETECTED! ("Omen") 🔥');
                        if (onWakeword) {
                            onWakeword();
                        }
                    }
                });

                // 4. Request Microphone Access
                console.log('[VoskEngine] Requesting Microphone Access...');
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
                    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1, sampleRate: 16000 } 
                });
                
                if (!isMounted) return;
                console.log('[VoskEngine] SUCCESS: Microphone active.');

                // 5. Connect Audio Web API
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                
                processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                source.connect(processorRef.current);
                
                // Connect to a muted gain node to prevent feedback while keeping processor active
                const dummyGain = audioContextRef.current.createGain();
                dummyGain.gain.value = 0;
                processorRef.current.connect(dummyGain);
                dummyGain.connect(audioContextRef.current.destination);
                
                processorRef.current.onaudioprocess = (e) => {
                    if (recognizerRef.current) {
                        try {
                            // Pass the audio buffer to Vosk
                            recognizerRef.current.acceptWaveform(e.inputBuffer);
                        } catch (err) {
                            // Ignore dropped frames
                        }
                    }
                };

                isReadyRef.current = true;
                console.log('[VoskEngine] --- LISTENING NOW! ---');

            } catch (err) {
                console.error('[VoskEngine] CRITICAL ERROR:', err);
            }
        };

        initEngine();

        // Cleanup on unmount
        return () => {
            isMounted = false;
            console.log('[VoskEngine] Shutting down...');
            if (audioContextRef.current) audioContextRef.current.close();
            if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
            if (processorRef.current) processorRef.current.disconnect();
            if (recognizerRef.current) recognizerRef.current.free();
            if (modelRef.current) modelRef.current.terminate();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount!

    // This component runs invisibly in the background
    return null;
};

export default VoskWakewordEngine;
