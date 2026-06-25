const { 
    launchAppByName, 
    launchGroupByName, 
    closeAppByName,
    closeGroupByName,
    createGroupByName, 
    addAppsToGroup, 
    removeAppsFromGroup, 
    removeGroupByName 
} = require('../control/appScanner');

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

        switch (task) {
            case 'LAUNCH_APP':
                const successApp = await launchAppByName(content);
                if (successApp) console.log(`[Task Manager] Successfully launched app: ${content}`);
                executed = true;
                break;
                
            case 'LAUNCH_GROUP':
                const successGrp = await launchGroupByName(content);
                if (successGrp) console.log(`[Task Manager] Successfully launched group: ${content}`);
                executed = true;
                break;

            case 'CLOSE_APP':
                const successClose = await closeAppByName(content);
                if (successClose) console.log(`[Task Manager] Successfully closed app: ${content}`);
                executed = true;
                break;
                
            case 'CLOSE_GROUP':
                const successCloseGrp = await closeGroupByName(content);
                if (successCloseGrp) console.log(`[Task Manager] Successfully closed group: ${content}`);
                executed = true;
                break;

            case 'REMOVE_GROUP':
                console.log(`[Task Manager] Removing group: ${content}`);
                const successDelGrp = await removeGroupByName(content);
                if (successDelGrp) console.log(`[Task Manager] Successfully removed group: ${content}`);
                executed = true;
                break;
                
            case 'CREATE_GROUP':
            case 'ADD_APP_TO_GROUP':
            case 'REMOVE_APP_FROM_GROUP':
                // Expected content format: GroupName|App1,App2,App3
                const parts = content.split('|');
                if (parts.length >= 1) {
                    const groupName = parts[0].trim();
                    const appsArray = parts.length > 1 ? parts[1].split(',').map(s => s.trim()).filter(s => s) : [];
                    
                    if (task === 'CREATE_GROUP') {
                        console.log(`[Task Manager] Creating group: ${groupName}`);
                        const successCreate = await createGroupByName(groupName, appsArray);
                        if (successCreate) console.log(`[Task Manager] Successfully created group: ${groupName}`);
                    } else if (task === 'ADD_APP_TO_GROUP') {
                        console.log(`[Task Manager] Adding apps to group: ${groupName}`);
                        const successAdd = await addAppsToGroup(groupName, appsArray);
                        if (successAdd) console.log(`[Task Manager] Successfully added apps to group: ${groupName}`);
                    } else if (task === 'REMOVE_APP_FROM_GROUP') {
                        console.log(`[Task Manager] Removing apps from group: ${groupName}`);
                        const successRem = await removeAppsFromGroup(groupName, appsArray);
                        if (successRem) console.log(`[Task Manager] Successfully removed apps from group: ${groupName}`);
                    }
                    executed = true;
                }
                break;
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
