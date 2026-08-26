export class AudioFusionEngine {
    constructor(onFlushData) {
        this.buffer = []; // Array of base64 audio chunks
        // At 16000Hz, bufferSize 2048, one chunk is 128ms. 
        // 16 chunks = ~2.04 seconds of audio.
        this.maxBufferChunks = 16; 
        
        this.isAwake = false;
        this.onFlushData = onFlushData; // Callback to send base64 to WebSocket
        
        this.cooldownTimeout = null;
        this.cooldownMs = 2000;

        // Wakeword & Silence Logic
        this.isWakewordActive = false;
        this.wakewordTimeout = null;
        this.silenceTimeout = null;
        this.silenceCutoffMs = 1500;
        this.isSilent = true;
    }

    setAwake(awake) {
        if (awake) {
            // User looked at screen
            this.isAwake = true;
            
            // Clear any cooldown timer
            if (this.cooldownTimeout) {
                clearTimeout(this.cooldownTimeout);
                this.cooldownTimeout = null;
            }

            // Flush the entire 2-second buffer to the AI instantly
            this._flushBuffer();
        } else {
            // User looked away
            this.isAwake = false;
            
            // Start 2.0-second trailing cooldown
            if (!this.cooldownTimeout) {
                console.log("[AudioFusion] User looked away. Starting 2.0s cooldown timer...");
                this.cooldownTimeout = setTimeout(() => {
                    console.log("[AudioFusion] Cooldown expired. Microphone muted. Buffering started.");
                    this.cooldownTimeout = null;
                }, this.cooldownMs); // 2 seconds
            }
        }
    }

    _flushBuffer() {
        if (this.buffer.length > 0) {
            console.log(`[AudioFusion] Flushing ${this.buffer.length} chunks (~${(this.buffer.length * 0.128).toFixed(1)}s) to AI`);
            for (const chunk of this.buffer) {
                this.onFlushData(chunk);
            }
            this.buffer = []; // Clear buffer after flush
        }
    }

    processAudioChunk(base64Data) {
        // If the AI is awake (via Camera) OR Wakeword is active, pass audio to WebSocket
        if (this.isAwake || this.isWakewordActive) {
            this.onFlushData(base64Data);
        } else {
            // We are muted. Secretly record to the sliding window buffer.
            this.buffer.push(base64Data);
            
            // If the conveyor belt is full, drop the oldest chunk
            if (this.buffer.length > this.maxBufferChunks) {
                this.buffer.shift();
            }
        }
    }

    reset() {
        this.isAwake = false;
        this.buffer = [];
        this.isWakewordActive = false;
        if (this.cooldownTimeout) {
            clearTimeout(this.cooldownTimeout);
            this.cooldownTimeout = null;
        }
        if (this.wakewordTimeout) {
            clearTimeout(this.wakewordTimeout);
            this.wakewordTimeout = null;
        }
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }
    }

    // Called when the Wakeword is detected
    triggerWakeword() {
        console.log("[AudioFusion] Wakeword detected! Forcing gate open.");
        
        if (!this.isWakewordActive && !this.isAwake) {
            this._flushBuffer();
        }
        
        this.isWakewordActive = true;
        this.isSilent = false;
        
        // Hard cap at 15 seconds to prevent infinite loop
        if (this.wakewordTimeout) clearTimeout(this.wakewordTimeout);
        this.wakewordTimeout = setTimeout(() => {
            console.log("[AudioFusion] 15-second hard cap reached. Cutting Wakeword.");
            this._endWakeword();
        }, 15000);
        
        this._resetSilenceTimeout();
    }

    _endWakeword() {
        this.isWakewordActive = false;
        if (this.wakewordTimeout) {
            clearTimeout(this.wakewordTimeout);
            this.wakewordTimeout = null;
        }
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }
        console.log("[AudioFusion] Wakeword gate closed.");
    }

    // Receives RMS volume from the microphone stream
    updateRms(rms) {
        if (!this.isWakewordActive) return;

        const SILENCE_THRESHOLD = 0.01; 

        if (rms < SILENCE_THRESHOLD) {
            if (!this.isSilent) {
                this.isSilent = true;
                this._resetSilenceTimeout();
            }
        } else {
            this.isSilent = false;
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }
        }
    }

    _resetSilenceTimeout() {
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        this.silenceTimeout = setTimeout(() => {
            console.log("[AudioFusion] 1.5s of silence detected! Cutting microphone.");
            this._endWakeword();
        }, this.silenceCutoffMs);
    }
}
