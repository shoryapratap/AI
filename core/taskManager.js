const { launchAppByName, launchGroupByName } = require('../control/appScanner');

/**
 * Task Manager
 * Parses the text output from the AI and executes the corresponding system commands.
 */
async function handleAIOutput(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'string') return;

    let executed = false;

    // Extract the TASK section
    const taskSectionMatch = aiResponse.match(/<TASK>([\s\S]*?)<\/TASK>/i);
    const taskContent = taskSectionMatch ? taskSectionMatch[1] : aiResponse;

    // Check for App Launch command
    // Expected format: <COMMAND: LAUNCH_APP>AppName</COMMAND>
    const appMatch = taskContent.match(/<COMMAND:\s*LAUNCH_APP>\s*(.*?)\s*<\/COMMAND>/i);
    if (appMatch && appMatch[1]) {
        const appName = appMatch[1];
        console.log(`[Task Manager] AI requested to launch app: ${appName}`);
        const success = await launchAppByName(appName);
        if (success) console.log(`[Task Manager] Successfully launched app: ${appName}`);
        executed = true;
    }

    // Check for Group Launch command
    // Expected format: <COMMAND: LAUNCH_GROUP>GroupName</COMMAND>
    const groupMatch = taskContent.match(/<COMMAND:\s*LAUNCH_GROUP>\s*(.*?)\s*<\/COMMAND>/i);
    if (groupMatch && groupMatch[1]) {
        const groupName = groupMatch[1];
        console.log(`[Task Manager] AI requested to launch group: ${groupName}`);
        const success = await launchGroupByName(groupName);
        if (success) console.log(`[Task Manager] Successfully launched group: ${groupName}`);
        executed = true;
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
