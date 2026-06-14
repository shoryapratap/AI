const { handleAIOutput, cleanAIOutput } = require('./taskManager');

async function runTest() {
    console.log("--- STARTING AI TEST ---");
    
    // Fake response simulated from the AI
    const fakeAIResponse = `
<MESSAGE>
Ji zaroor, main aapke liye Notepad open kar rahi hoon!
</MESSAGE>
<TASK>
<COMMAND: LAUNCH_APP>Notepad</COMMAND>
</TASK>
    `;

    console.log("\n[1] AI NE BHEJA YE RAW TEXT:");
    console.log("-----------------------------------------");
    console.log(fakeAIResponse.trim());
    console.log("-----------------------------------------");

    console.log("\n[2] MESSAGE WINDOW (UI) MEIN KYA DIKHEGA?");
    const uiText = cleanAIOutput(fakeAIResponse);
    console.log("-> " + uiText);

    console.log("\n[3] TASK MANAGER KYA KAREGA?");
    await handleAIOutput(fakeAIResponse);
    
    console.log("\n--- TEST COMPLETE ---");
}

runTest();
