import asyncio
import websockets
import json
import base64
import sounddevice as sd
import numpy as np
import sys
import threading
import queue

# The API key you provided
API_KEY = "AIzaSyBpDfseI5QRyu_NMux8XitIEoxH8Uon9RQ"
MODEL = "models/gemini-3.1-flash-live-preview"
HOST = "generativelanguage.googleapis.com"
WS_URL = f"wss://{HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}"

# Audio configuration
SAMPLE_RATE = 16000
CHANNELS = 1

# Queues for thread-safe communication
audio_out_queue = queue.Queue()
text_in_queue = queue.Queue()

# ---- Audio Recording Callback ----
def audio_callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    # Convert float32 [-1.0, 1.0] to int16
    pcm_data = (indata[:, 0] * 32767).astype(np.int16)
    audio_out_queue.put(pcm_data.tobytes())

# ---- Keyboard Input Thread ----
def keyboard_input_thread():
    print("\n[System] Type your message and hit Enter. You can also just speak into your mic!")
    while True:
        try:
            line = sys.stdin.readline()
            if line:
                text_in_queue.put(line.strip())
        except:
            break

async def main():
    print("Connecting to Gemini Live API...")
    try:
        async with websockets.connect(WS_URL) as ws:
            print("Connected! Starting audio streams...")
            
            # 1. Send Setup Message
            setup_msg = {
                "setup": {
                    "model": MODEL,
                    "generationConfig": {
                        "responseModalities": ["AUDIO"]
                    }
                }
            }
            setup_msg["setup"]["outputAudioTranscription"] = {}
            setup_msg["setup"]["inputAudioTranscription"] = {}
            await ws.send(json.dumps(setup_msg))

            # 2. Start Audio Playback Stream (Output to speakers)
            # We will write directly to the output stream as data arrives
            out_stream = sd.RawOutputStream(
                samplerate=24000, # Gemini returns 24kHz audio
                channels=CHANNELS,
                dtype='int16'
            )
            out_stream.start()

            # 3. Start Audio Recording Stream (Input from mic)
            in_stream = sd.InputStream(
                samplerate=SAMPLE_RATE,
                channels=CHANNELS,
                dtype='float32',
                callback=audio_callback,
                blocksize=1024
            )
            in_stream.start()

            # Start keyboard thread
            threading.Thread(target=keyboard_input_thread, daemon=True).start()

            print("==========================================")
            print("Emma AI - Live Multimodal Voice Session")
            print("Speak into your microphone, or type text below.")
            print("==========================================")

            # --- Async tasks to handle sending and receiving ---

            async def send_audio():
                while True:
                    try:
                        # Non-blocking get from queue
                        data = audio_out_queue.get_nowait()
                        b64_data = base64.b64encode(data).decode('utf-8')
                        msg = {
                            "realtimeInput": {
                                "audio": {
                                    "mimeType": "audio/pcm;rate=16000",
                                    "data": b64_data
                                }
                            }
                        }
                        await ws.send(json.dumps(msg))
                    except queue.Empty:
                        await asyncio.sleep(0.01)

            async def send_text():
                while True:
                    try:
                        text = text_in_queue.get_nowait()
                        if text:
                            print(f"\n[You Typed]: {text}")
                            msg = {
                                "clientContent": {
                                    "turns": [{
                                        "role": "user",
                                        "parts": [{"text": text}]
                                    }],
                                    "turnComplete": True
                                }
                            }
                            await ws.send(json.dumps(msg))
                    except queue.Empty:
                        await asyncio.sleep(0.1)

            async def receive_from_gemini():
                async for message in ws:
                    try:
                        data = json.loads(message)
                        if "serverContent" in data:
                            content = data["serverContent"]
                            if "modelTurn" in content:
                                for part in content["modelTurn"]["parts"]:
                                    if "inlineData" in part:
                                        audio_bytes = base64.b64decode(part["inlineData"]["data"])
                                        out_stream.write(audio_bytes)
                                    if "text" in part:
                                        print(part["text"], end="", flush=True)
                            
                            if "outputTranscription" in content:
                                # New Live API transcription format
                                if "text" in content["outputTranscription"]:
                                    print(content["outputTranscription"]["text"], end="", flush=True)
                                elif "parts" in content["outputTranscription"]:
                                    for p in content["outputTranscription"]["parts"]:
                                        if "text" in p:
                                            print(p["text"], end="", flush=True)
                                    
                        if "serverContent" in data and "turnComplete" in data["serverContent"]:
                            print("\n") # Newline when AI finishes speaking
                    except Exception as e:
                        print(f"Error processing message: {e}")

            # Run all tasks concurrently
            await asyncio.gather(
                send_audio(),
                send_text(),
                receive_from_gemini()
            )

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
