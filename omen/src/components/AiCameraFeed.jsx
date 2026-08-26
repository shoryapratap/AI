import React, { useEffect, useRef, useState } from 'react';
import { User, Eye, Bot } from 'lucide-react';

const AiCameraFeed = ({ className, onAwakeChange }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const previousAreEyesOnScreen = useRef(false);

    const [faceStatus, setFaceStatus] = useState('AWAY');
    const [eyesStatus, setEyesStatus] = useState('AWAY');
    const [finalStatus, setFinalStatus] = useState('NOT LOOKING AT AI');
    const [isFaceDetected, setIsFaceDetected] = useState(false);

    useEffect(() => {
        if (onAwakeChange) {
            onAwakeChange(finalStatus === 'LOOKING AT AI');
        }
    }, [finalStatus, onAwakeChange]);

    useEffect(() => {
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext('2d');
        
        let camera = null;
        let faceMesh = null;

        const onResults = (results) => {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                setIsFaceDetected(true);
                const landmarks = results.multiFaceLandmarks[0];

                // 1. FACE POSE
                const nose = landmarks[1];
                const leftEyeCorner = landmarks[33];
                const rightEyeCorner = landmarks[263];
                const eyeCenter = { x: (leftEyeCorner.x + rightEyeCorner.x) / 2, y: (leftEyeCorner.y + rightEyeCorner.y) / 2 };

                const dx = nose.x - eyeCenter.x;
                const dy = nose.y - eyeCenter.y;
                const faceYaw = dx * 100;
                const facePitch = dy * 100;

                const isFaceCentered = Math.abs(faceYaw) < 1.2 && (facePitch > -5.0 && facePitch < 12.0);

                // 2. EYE GAZE
                const leftIris = landmarks[468];
                const leftEyeInner = landmarks[133];
                const leftEyeWidth = Math.abs(leftEyeInner.x - leftEyeCorner.x);
                const leftPupilPos = Math.abs(leftIris.x - leftEyeCorner.x);
                const leftEyeYaw = (leftPupilPos / leftEyeWidth) - 0.5;

                const rightIris = landmarks[473];
                const rightEyeInner = landmarks[362];
                const rightEyeWidth = Math.abs(rightEyeInner.x - rightEyeCorner.x);
                const rightPupilPos = Math.abs(rightIris.x - rightEyeCorner.x);
                const rightEyeYaw = (1.0 - (rightPupilPos / rightEyeWidth)) - 0.5;

                const eyeYawRelative = (leftEyeYaw + rightEyeYaw) / 2;

                // 3. TRUE GAZE
                const trueGazeX = faceYaw + (eyeYawRelative * 22.0);
                const absGaze = Math.abs(trueGazeX);

                let areEyesOnScreen = previousAreEyesOnScreen.current;

                if (areEyesOnScreen) {
                    // It was ON. It takes a larger threshold (1.6) to turn it OFF (Sticky ON)
                    if (absGaze > 1.6) {
                        areEyesOnScreen = false;
                    }
                } else {
                    // It was OFF. It takes a strict threshold (1.2) to turn it ON (Hard to trigger)
                    if (absGaze < 1.2) {
                        areEyesOnScreen = true;
                    }
                }

                previousAreEyesOnScreen.current = areEyesOnScreen;

                // State Updates
                setFaceStatus(isFaceCentered ? 'ON SCREEN' : 'AWAY');
                setEyesStatus(areEyesOnScreen ? 'ON SCREEN' : 'AWAY');
                setFinalStatus(areEyesOnScreen ? 'LOOKING AT AI' : 'LOOKING AWAY');

            } else {
                setIsFaceDetected(false);
                setFaceStatus('AWAY');
                setEyesStatus('AWAY');
                setFinalStatus('NO FACE DETECTED');
            }
            canvasCtx.restore();
        };

        if (window.FaceMesh && window.Camera) {
            faceMesh = new window.FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
            faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            faceMesh.onResults(onResults);

            let lastProcessTime = 0;
            camera = new window.Camera(videoElement, {
                onFrame: async () => {
                    if (faceMesh) {
                        const now = performance.now();
                        if (now - lastProcessTime > 100) { // Throttle to ~10 FPS
                            lastProcessTime = now;
                            await faceMesh.send({ image: videoElement });
                        }
                    }
                },
                width: 640,
                height: 480
            });
            camera.start();
        } else {
            console.error("MediaPipe scripts not loaded in index.html");
        }

        return () => {
            if (camera) camera.stop();
            if (faceMesh) faceMesh.close();
        };
    }, []);

    const circleStyle = {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        transition: 'all 0.3s ease',
        border: '1px solid #1e293b'
    };
    
    const getCircleStyle = (status) => {
        if (!isFaceDetected) return { ...circleStyle, background: '#334155' };
        if (status === 'ON SCREEN' || status === 'LOOKING AT AI') {
            return { ...circleStyle, background: '#22c55e', borderColor: '#16a34a', boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)' };
        }
        return { ...circleStyle, background: '#ef4444', borderColor: '#dc2626', boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)' };
    };

    return (
        <div className={`system-widget placeholder-widget ${className}`} style={{ padding: '8px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', width: '100%' }}>
                <h3 className="placeholder-title" style={{ margin: 0, fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Camera</h3>
                
                {/* Indicators beside the text */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }} title="Face Pose">
                        <div style={getCircleStyle(faceStatus)}></div>
                        <User size={10} color="#94a3b8" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }} title="Eye Gaze">
                        <div style={getCircleStyle(eyesStatus)}></div>
                        <Eye size={10} color="#94a3b8" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }} title="AI Awake">
                        <div style={getCircleStyle(finalStatus)}></div>
                        <Bot size={10} color="#94a3b8" />
                    </div>
                </div>
            </div>
            
            <div className="cam-feed-container" style={{ position: 'relative', width: '100%', flex: 1, minHeight: '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: '#000' }}>
                <video ref={videoRef} className="input_video" autoPlay playsInline style={{ display: 'none' }}></video>
                <canvas ref={canvasRef} className="output_canvas" width="640" height="480" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}></canvas>
            </div>
        </div>
    );
};

export default AiCameraFeed;
