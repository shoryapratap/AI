const { handleAppCommand } = require('./appScanner');
const { handleKeyboardCommand } = require('./keyboardMouse');
const { handleMemoryCommand } = require('./memoryManager');

/**
 * Task Manager
 * Parses the text output from the AI and executes the corresponding system commands.
 */
async function handleAIOutput(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'string') return;

    let executed = false;

    // Use a global regex to find all <COMMAND: TASK>CONTENT</COMMAND> tags
    const commandRegex = /<COMMAND:\s*(.*?)>\s*(.*?)\s*<\/COMMAND>/gi;
    let match;

    while ((match = commandRegex.exec(aiResponse)) !== null) {
        const task = match[1].trim().toUpperCase();
        const content = match[2].trim();
        
        console.log(`[Task Manager] AI issued task: ${task} with content: ${content}`);

        // Route to the appropriate module based on task prefix or set
        const appCommands = [
            'LAUNCH_APP', 'LAUNCH_GROUP', 'CLOSE_APP', 'CLOSE_GROUP',
            'REMOVE_GROUP', 'CREATE_GROUP', 'ADD_APP_TO_GROUP', 'REMOVE_APP_FROM_GROUP'
        ];
        
        const keyboardCommands = [
            'KEYBOARD_ACTION', 'MOUSE_ACTION'
        ];

        const memoryCommands = [
            'SCHEDULE'
        ];

        if (appCommands.includes(task)) {
            executed = await handleAppCommand(task, content);
        } else if (keyboardCommands.includes(task)) {
            executed = await handleKeyboardCommand(task, content);
        } else if (memoryCommands.includes(task)) {
            executed = await handleMemoryCommand(task, content);
        } else {
            console.warn(`[Task Manager] Unhandled task: ${task}`);
        }
    }

    return executed;
}

/**
 * Extracts the conversational text from the <MESSAGE> tag
 * so that the cleaned text can be safely displayed in the UI.
 */
function cleanAIOutput(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'string') return aiResponse;
    
    // Extract the content inside <MESSAGE> tags
    const msgMatch = aiResponse.match(/<MESSAGE>([\s\S]*?)<\/MESSAGE>/i);
    if (msgMatch && msgMatch[1]) {
        return msgMatch[1].trim();
    }
    
    // Fallback: If tags are missing, just strip any <TASK> tags and <COMMAND> tags
    let cleaned = aiResponse.replace(/<TASK>[\s\S]*?<\/TASK>/gi, '');
    cleaned = cleaned.replace(/<COMMAND:\s*.*?>\s*.*?\s*<\/COMMAND>/gi, '');
    return cleaned.trim();
}

module.exports = {
    handleAIOutput,
    cleanAIOutput
};
