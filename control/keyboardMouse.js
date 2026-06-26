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
    
    // <COMMAND: MOUSE_ACTION> action | button | X,Y | amount </COMMAND>
    const parts = content.split('|').map(p => p.trim());
    const action = parts[0] ? parts[0].toLowerCase() : 'none';
    const button = parts[1] ? parts[1].toLowerCase() : 'none';
    const coords = parts[2] ? parts[2].toLowerCase() : 'none';
    const amountStr = parts[3] ? parts[3].toLowerCase() : 'none';
    
    const amount = (amountStr !== 'none' && !isNaN(amountStr)) ? parseInt(amountStr) : 1;
    
    console.log(`[KeyboardMouse] Mouse Action - Action: "${action}", Button: "${button}", Coords: "${coords}", Amount: ${amount}`);
    
    try {
        // Handle coordinate parsing for move actions
        if (coords !== 'none' && coords.includes(',')) {
            const [xStr, yStr] = coords.split(',');
            const x = parseInt(xStr.trim());
            const y = parseInt(yStr.trim());
            if (!isNaN(x) && !isNaN(y)) {
                if (action === 'move') {
                    robot.moveMouseSmooth(x, y);
                } else {
                    // For other actions, we can optionally move first
                    robot.moveMouseSmooth(x, y);
                }
            }
        }
        
        switch (action) {
            case 'move':
                // Handled above in coordinates check
                break;
            case 'click':
                if (button !== 'none') {
                    for (let i = 0; i < amount; i++) {
                        robot.mouseClick(button);
                        if (amount > 1 && i < amount - 1) {
                            await new Promise(r => setTimeout(r, 100)); // small delay between rapid clicks
                        }
                    }
                }
                break;
            case 'hold':
                if (button !== 'none') robot.mouseToggle('down', button);
                break;
            case 'release':
                if (button !== 'none') robot.mouseToggle('up', button);
                break;
            case 'scroll':
                // robot.scrollMouse(x, y) - scroll in corresponding direction
                if (button === 'up') {
                    robot.scrollMouse(0, amount);
                } else if (button === 'down') {
                    robot.scrollMouse(0, -amount);
                } else if (button === 'left') {
                    robot.scrollMouse(-amount, 0);
                } else if (button === 'right') {
                    robot.scrollMouse(amount, 0);
                }
                break;
            case 'getpos':
                const pos = robot.getMousePos();
                const screen = robot.getScreenSize();
                console.log(`[KeyboardMouse] Current Pos: X=${pos.x}, Y=${pos.y} | Screen Size: ${screen.width}x${screen.height}`);
                break;
            default:
                console.warn(`[KeyboardMouse] Unknown mouse action: ${action}`);
                break;
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
