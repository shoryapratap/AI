// Keyboard and Mouse control module
const robot = require('robotjs');

// Configure typing speed
robot.setKeyboardDelay(10);
const mapKeyGlobal = (k) => {
    const aliases = {
        'windows': 'command', 'win': 'command', 'super': 'command', 'meta': 'command',
        'ctrl': 'control', 'esc': 'escape', 'return': 'enter', 'del': 'delete',
        'opt': 'alt', 'option': 'alt',
        '+': '=', 'plus': '=', 'add': '=',
        '-': '-', 'minus': '-', 'subtract': '-'
    };
    return aliases[k] || k;
};

async function keyboardAction(content) {
    try {
        let holdKey = null;
        let iterations = 1;
        let keyCombo = null;
        let text = content;
        
        // Parse holdKey | iterations | keyCombo | text format
        if (content.includes('|')) {
            const parts = content.split('|');
            if (parts.length >= 4) {
                holdKey = parts[0].trim();
                iterations = parseInt(parts[1].trim(), 10) || 1;
                keyCombo = parts[2].trim();
                text = parts.slice(3).join('|').trim();
            } else {
                // Fallback for older formats just in case
                keyCombo = parts[0].trim();
                text = parts.slice(1).join('|').trim();
            }
        }

        console.log(`[KeyboardMouse] Action - Hold: "${holdKey}", Iterations: ${iterations}, Key: "${keyCombo}", Text: "${text}"`);
        
        const shouldHold = holdKey && holdKey.toLowerCase() !== 'none' && holdKey.toLowerCase() !== 'null' && holdKey !== '';
        
        // 1. Hold the key down if requested
        if (shouldHold) {
            robot.keyToggle(mapKeyGlobal(holdKey.toLowerCase()), 'down');
            // Slight delay to ensure the OS registers the hold
            await new Promise(r => setTimeout(r, 50)); 
        }
        
        // 2. Loop through the iterations
        for (let i = 0; i < iterations; i++) {
            // Type the text first
            if (text && text.toLowerCase() !== 'none' && text.toLowerCase() !== 'null' && text !== '') {
                robot.typeString(text);
            }
            
            // Press the key combo
            if (keyCombo && keyCombo.toLowerCase() !== 'none' && keyCombo.toLowerCase() !== 'null' && keyCombo !== '') {
                if (keyCombo.includes('+') && keyCombo.trim() !== '+') {
                    // Safe guard for "ctrl++" by replacing "++" with "+plus" before splitting
                    const normalizedCombo = keyCombo.replace('++', '+plus');
                    const keys = normalizedCombo.split('+').map(k => mapKeyGlobal(k.trim().toLowerCase()));
                    
                    if (shouldHold) {
                        // Holding key is present and multiple keys in combo -> run inner loop
                        for (const k of keys) {
                            robot.keyTap(k);
                            await new Promise(r => setTimeout(r, 50));
                        }
                    } else {
                        // No holding key -> treat as a standard combination (chord)
                        const mainKey = keys.pop();
                        const modifiers = keys;
                        robot.keyTap(mainKey, modifiers);
                    }
                } else if (keyCombo.includes(',')) {
                    if (shouldHold) {
                        const keys = keyCombo.split(',').map(k => mapKeyGlobal(k.trim().toLowerCase()));
                        for (const k of keys) {
                            if (k && k !== 'none' && k !== 'null') {
                                robot.keyTap(k);
                                await new Promise(r => setTimeout(r, 50));
                            }
                        }
                    } else {
                        console.error("[KeyboardMouse] Invalid comma sequence without holdKey.");
                    }
                } else {
                    // Single key
                    robot.keyTap(mapKeyGlobal(keyCombo.toLowerCase()));
                }
            }
            
            // Small delay between multiple taps so the OS doesn't miss them
            if (iterations > 1 && i < iterations - 1) {
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        // 3. Release the held key
        if (shouldHold) {
            robot.keyToggle(mapKeyGlobal(holdKey.toLowerCase()), 'up');
        }
        
        return true;
    } catch (error) {
        console.error(`[KeyboardMouse] Error in keyboardAction:`, error);
        return false;
    }
}

async function mouseAction(content) {
    if (!content) return false;
    
    // <COMMAND: MOUSE_ACTION> action | button | amount | start | end | direction </COMMAND>
    const parts = content.split('|').map(p => p.trim());
    const action = parts[0] ? parts[0].toLowerCase() : 'none';
    const button = parts[1] ? parts[1].toLowerCase() : 'none';
    const amountStr = parts[2] ? parts[2].toLowerCase() : 'none';
    const startStr = parts[3] ? parts[3].toLowerCase() : 'null';
    const endStr = parts[4] ? parts[4].toLowerCase() : 'null';
    const direction = parts[5] ? parts[5].toLowerCase() : 'null';
    
    const amount = (amountStr !== 'none' && amountStr !== 'null' && !isNaN(amountStr)) ? parseInt(amountStr) : 1;
    
    console.log(`[KeyboardMouse] Mouse Action - Action: "${action}", Button: "${button}", Amount: ${amount}, Start: "${startStr}", End: "${endStr}", Direction: "${direction}"`);
    
    // Helper to move mouse if valid coordinates are provided
    const moveToCoord = (coordStr) => {
        if (coordStr && coordStr !== 'null' && coordStr !== 'none' && coordStr.includes(',')) {
            const [xStr, yStr] = coordStr.split(',');
            const x = parseInt(xStr.trim());
            const y = parseInt(yStr.trim());
            if (!isNaN(x) && !isNaN(y)) {
                robot.moveMouseSmooth(x, y);
                return true;
            }
        }
        return false;
    };

    try {
        if (action === 'click') {
            // 1. Move to start coords if provided
            moveToCoord(startStr);
            
            // 2. Click the button the specified amount of times
            if (button !== 'none' && button !== 'null') {
                for (let i = 0; i < amount; i++) {
                    robot.mouseClick(button);
                    if (amount > 1 && i < amount - 1) {
                        await new Promise(r => setTimeout(r, 100)); // small delay between rapid clicks
                    }
                }
            }
        } 
        else if (action === 'hold&release') {
            // 1. Move to start position
            moveToCoord(startStr);
            
            // 2. Start holding
            if (button !== 'none' && button !== 'null') {
                robot.mouseToggle('down', button);
            }
            
            // Small delay to ensure the OS registers the hold before moving
            await new Promise(r => setTimeout(r, 100));
            
            // 3. Move to end position
            moveToCoord(endStr);
            
            // 4. Release
            if (button !== 'none' && button !== 'null') {
                robot.mouseToggle('up', button);
            }
        }
        else if (action === 'scroll') {
            // 1. Move to start position
            moveToCoord(startStr);
            
            // 2. Scroll up or down
            if (direction === 'up') {
                robot.scrollMouse(0, amount);
            } else if (direction === 'down') {
                robot.scrollMouse(0, -amount);
            } else {
                console.warn(`[KeyboardMouse] Invalid scroll direction: ${direction}`);
            }
        } 
        else {
            console.warn(`[KeyboardMouse] Unknown mouse action: ${action}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error(`[KeyboardMouse] Error in mouseAction:`, error);
        return false;
    }
}

async function handleKeyboardCommand(task, content) {
    let executed = false;
    switch (task) {
        case 'KEYBOARD_ACTION':
            executed = await keyboardAction(content);
            if (executed) console.log(`[KeyboardMouse] Successfully executed keyboard action.`);
            break;
        case 'MOUSE_ACTION':
            executed = await mouseAction(content);
            if (executed) console.log(`[KeyboardMouse] Successfully executed mouse action.`);
            break;
    }
    return executed;
}

module.exports = {
    handleKeyboardCommand,
    keyboardAction,
    mouseAction
};
