const { GoogleGenAI } = require('@google/genai');
const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');
const { handleKeyboardCommand } = require('./keyboardMouse');

// Initialize the Vision Brain with the second API key
// If the key isn't present, we'll log a warning and abort gracefully.
const visionApiKey = process.env.GEMINI_VISION_API_KEY;
let ai = null;
if (visionApiKey) {
    ai = new GoogleGenAI({ apiKey: visionApiKey });
}

async function startVisionLoop(prompt) {
    if (!ai) {
        console.error('[VisionAgent] GEMINI_VISION_API_KEY is not set in .env. Aborting vision task.');
        return;
    }
    
    console.log(`[VisionAgent] Starting autonomous loop for task: "${prompt}"`);
    let isTaskComplete = false;
    let iteration = 0;
    const MAX_ITERATIONS = 10;
    
    // Load instructions for Vision Brain
    const visionCommandsPath = path.join(__dirname, '../core/vision_commands.json');
    let systemInstruction = "You are an autonomous GUI agent. You can see the screen and execute actions.";
    try {
        const cmds = JSON.parse(fs.readFileSync(visionCommandsPath, 'utf8'));
        systemInstruction += "\nAvailable Commands:\n" + cmds.join('\n');
        systemInstruction += "\nWhen the task is complete, output <COMMAND: VISION_COMPLETE></COMMAND>.";
        systemInstruction += "\nOutput ONLY one command at a time. Wait for the next screenshot before issuing the next command.";
    } catch (e) {
        console.error('[VisionAgent] Failed to load vision_commands.json', e);
    }

    while (!isTaskComplete && iteration < MAX_ITERATIONS) {
        iteration++;
        console.log(`[VisionAgent] --- Iteration ${iteration} ---`);
        
        try {
            // 1. Take a screenshot
            const imgPath = path.join(__dirname, '../screenshot_temp.jpg');
            await screenshot({ format: 'jpg', filename: imgPath });
            
            const imageBytes = fs.readFileSync(imgPath);
            const imagePart = {
                inlineData: {
                    data: Buffer.from(imageBytes).toString("base64"),
                    mimeType: "image/jpeg"
                }
            };
            
            // 2. Ask the Vision Brain
            const chatPrompt = iteration === 1 
                ? `The user requested: "${prompt}". Look at the screen and output your first command.`
                : `Previous action executed. Look at the screen and output your next command, or VISION_COMPLETE if done.`;
                
            console.log(`[VisionAgent] Asking Gemini Vision...`);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [imagePart, chatPrompt],
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.1 // Keep it deterministic
                }
            });
            
            const aiText = response.text || '';
            console.log(`[VisionAgent] Output: ${aiText}`);
            
            // 3. Parse and execute the command
            const commandRegex = /<COMMAND:\s*(.*?)>\s*(.*?)\s*<\/COMMAND>/gi;
            let match = commandRegex.exec(aiText);
            
            if (match) {
                const command = match[1].trim().toUpperCase();
                const content = match[2].trim();
                
                if (command === 'VISION_COMPLETE') {
                    console.log(`[VisionAgent] Task complete!`);
                    isTaskComplete = true;
                } else if (command === 'MOUSE_ACTION' || command === 'KEYBOARD_ACTION') {
                    await handleKeyboardCommand(command, content);
                    // Small delay after action before taking next screenshot
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    console.warn(`[VisionAgent] Unrecognized command from Vision Brain: ${command}`);
                    break;
                }
            } else {
                console.log(`[VisionAgent] No valid command found in response. Aborting loop.`);
                break;
            }
            
        } catch (err) {
            console.error(`[VisionAgent] Error during loop iteration ${iteration}:`, err);
            break;
        }
    }
    
    if (iteration >= MAX_ITERATIONS) {
        console.warn(`[VisionAgent] Reached max iterations (${MAX_ITERATIONS}). Aborting to prevent infinite loop.`);
    }
}

module.exports = {
    startVisionLoop
};
