import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

const Live2DWidget = ({ isAiTalking }) => {
    const canvasContainerRef = useRef(null);
    const appRef = useRef(null);
    const modelRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const initLive2D = async () => {
            if (!canvasContainerRef.current) return;

            // Make PIXI globally available for pixi-live2d-display
            window.PIXI = PIXI;
            const { Live2DModel } = await import('pixi-live2d-display');

            // Initialize PixiJS Application
            const app = new PIXI.Application({
                view: document.createElement('canvas'),
                backgroundAlpha: 0, // Transparent background
                resizeTo: canvasContainerRef.current,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1,
            });
            
            appRef.current = app;
            canvasContainerRef.current.appendChild(app.view);

            try {
                // Load the Shizuku sample model directly from local public folder
                const modelUrl = './shizuku/shizuku.model.json';
                const model = await Live2DModel.from(modelUrl);
                
                if (!isMounted) {
                    model.destroy();
                    return;
                }

                modelRef.current = model;
                app.stage.addChild(model);

                // Fit model to canvas
                const origWidth = model.internalModel.width;
                const origHeight = model.internalModel.height;
                
                const scaleX = canvasContainerRef.current.clientWidth / origWidth;
                const scaleY = canvasContainerRef.current.clientHeight / origHeight;
                
                // Scale up slightly so she fills the box nicely
                model.scale.set(Math.min(scaleX, scaleY) * 1.8);
                
                // In PixiJS, after setting scale, model.width/height are already the scaled dimensions
                model.x = (canvasContainerRef.current.clientWidth - model.width) / 2;
                // Shift her up a bit so she's perfectly positioned
                model.y = (canvasContainerRef.current.clientHeight - model.height) / 2 + 50;

                // Make model track the mouse cursor
                model.on('pointermove', (e) => {
                    model.focus(e.data.global.x, e.data.global.y);
                });

                setIsLoading(false);

            } catch (error) {
                console.error("Failed to load Live2D model:", error);
                setIsLoading(false);
            }
        };

        initLive2D();

        return () => {
            isMounted = false;
            if (modelRef.current) {
                modelRef.current.destroy();
            }
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
            }
        };
    }, []);

    // Handle AI talking animations
    useEffect(() => {
        let talkingInterval;

        const handleTalking = () => {
            if (!modelRef.current) return;
            const model = modelRef.current;
            
            if (isAiTalking) {
                // Pick a random motion to keep it lively
                const motions = ['tap_body', 'flick_head'];
                const randomMotion = motions[Math.floor(Math.random() * motions.length)];
                
                // Play motion, forcing it to interrupt any idle state
                model.motion(randomMotion);
            }
        };

        if (isAiTalking) {
            handleTalking(); // Trigger immediately
            // Loop motions every 4 seconds while talking so she doesn't freeze
            talkingInterval = setInterval(handleTalking, 4000);
        } else {
            if (modelRef.current) {
                modelRef.current.motion('idle');
            }
        }

        return () => {
            if (talkingInterval) clearInterval(talkingInterval);
        };
    }, [isAiTalking]);

    return (
        <div 
            className={`live2d-container ${isAiTalking ? 'talking' : ''}`}
            style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            ref={canvasContainerRef}
        >
            {isLoading && (
                <div style={{ position: 'absolute', color: 'var(--text-muted)' }}>
                    Loading Model...
                </div>
            )}
        </div>
    );
};

export default Live2DWidget;
