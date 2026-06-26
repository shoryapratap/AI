import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import visionCommands from '../../../core/vision_commands.json';

export function useVisionBrain() {
    const [isVisionActive, setIsVisionActive] = useState(false);
    
    const startVisionTask = async (prompt) => {
        setIsVisionActive(true);
        console.log(`[VisionBrain] Starting autonomous loop for task: "${prompt}"`);
        
        let rawKey = localStorage.getItem('geminiVisionApiKey') || '';
        const apiKey = rawKey.replace(/['"]/g, '').trim();
        
        if (!apiKey) {
            console.error("[VisionBrain] No vision API key found. Please save it in settings.");
            setIsVisionActive(false);
            return;
        }
        
        const ai = new GoogleGenAI({ apiKey });
        
        let isComplete = false;
        let iteration = 0;
        const MAX_ITERATIONS = 10;
        
        let systemInstruction = "You are an autonomous GUI agent. You can see the screen and execute actions.";
        systemInstruction += "\nAvailable Commands:\n" + visionCommands.join('\n');
        systemInstruction += "\nWhen the task is complete, output <COMMAND: VISION_COMPLETE></COMMAND>.";
        systemInstruction += "\nOutput ONLY one command at a time. Wait for the next screenshot before issuing the next command.";
        
        while (!isComplete && iteration < MAX_ITERATIONS) {
            iteration++;
            console.log(`[VisionBrain] --- Iteration ${iteration} ---`);
            
            try {
                if (!window.electronAPI || !window.electronAPI.takeScreenshot) {
                    console.error("[VisionBrain] IPC takeScreenshot not available.");
                    break;
                }
                
                // 1. Take a screenshot via backend IPC
                const base64Img = await window.electronAPI.takeScreenshot();
                if (!base64Img) {
                    console.error("[VisionBrain] Failed to capture screenshot.");
                    break;
                }
                
                const imagePart = {
                    inlineData: {
                        data: base64Img,
                        mimeType: "image/jpeg"
                    }
                };
                
                // 2. Ask Gemini 2.5 Flash
                const chatPrompt = iteration === 1 
                    ? `The user requested: "${prompt}". Look at the screen and output your first command.`
                    : `Previous action executed. Look at the screen and output your next command, or VISION_COMPLETE if done.`;
                    
                console.log(`[VisionBrain] Asking Gemini Vision...`);
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [imagePart, chatPrompt],
                    config: { 
                        systemInstruction: systemInstruction,
                        temperature: 0.1 
                    }
                });
                
                const aiText = response.text || '';
                console.log(`[VisionBrain] Output: ${aiText}`);
                
                // 3. Parse and execute the command via backend IPC
                const commandRegex = /<COMMAND:\s*(.*?)>\s*(.*?)\s*<\/COMMAND>/gi;
                let match = commandRegex.exec(aiText);
                
                if (match) {
                    const command = match[1].trim().toUpperCase();
                    const fullTag = match[0];
                    
                    if (command === 'VISION_COMPLETE') {
                        console.log(`[VisionBrain] Task complete!`);
                        isComplete = true;
                    } else if (command === 'MOUSE_ACTION' || command === 'KEYBOARD_ACTION') {
                        // Forward the tag to the backend task manager
                        if (window.electronAPI.handleAITask) {
                            await window.electronAPI.handleAITask(fullTag);
                            // Small delay after action before taking next screenshot
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    } else {
                        console.warn(`[VisionBrain] Unrecognized command from Vision Brain: ${command}`);
                        break;
                    }
                } else {
                    console.log(`[VisionBrain] No valid command found in response. Aborting loop.`);
                    break;
                }
                
            } catch (err) {
                console.error(`[VisionBrain] Error during loop iteration ${iteration}:`, err);
                break;
            }
        }
        
        if (iteration >= MAX_ITERATIONS) {
            console.warn(`[VisionBrain] Reached max iterations (${MAX_ITERATIONS}). Aborting to prevent infinite loop.`);
        }
        
        setIsVisionActive(false);
    };
    
    return { isVisionActive, startVisionTask };
}
