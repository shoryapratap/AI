# Tasks for Tomorrow

1. **Rebuild the Connection Between the Two AIs**
   - Architect and implement the communication bridge between the Main Brain (`useGeminiLive.js`) and the Vision Brain (`useVisionBrain.js`) based on the new custom architecture.

2. **Clear Emma's Memory / Enforce Strict Separation**
   - Since Emma occasionally "remembers" the old `<COMMAND: KEYBOARD_ACTION>` syntax from earlier in the session, we need to enforce a hard block.
   - We will update the logic (likely in `useGeminiLive.js` or `taskManager.js`) to strictly ignore or block any keyboard/mouse commands coming from the Main Brain, ensuring she can *only* use the commands explicitly listed in `ai_commands.json`.
