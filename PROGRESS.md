# Emma AI - Project Progress Tracker

This document tracks our progress, completed features, and upcoming tasks across the different modules of the Emma AI project.

## 🏗️ Core & System (`main.js`, `preload.js`)
- [x] Disabled auto-opening of DevTools on startup
- [x] Updated IPC bridge (`scan-apps`) to support `forceFullScan` parameter
- [x] Created `core/taskManager.js` to parse AI output and execute system commands natively.
- [x] Defined structured AI outputs (`systemPrompt.txt`) separating conversational `<MESSAGE>` from executable `<TASK>`.
- [x] Created `handle-ai-task`, `clean-ai-text`, and `get-system-prompt` IPC bridges.
- [x] Dynamically injected user's custom app groups into the AI system prompt to enable accurate `<COMMAND: LAUNCH_GROUP>` generation.
- [x] Verified end-to-end AI workflow: Tool calls are translated to text commands, processed natively by Task Manager, and clean responses are routed to TTS.

## 🖥️ Frontend (`frontend-react`)
- [x] Integrated Leaflet interactive map into `MapWidget.jsx`
- [x] Polished 3D UI layouts, fixed Chromium `preserve-3d` hit-testing bug for inputs, improved 3D animation performance by removing `backdrop-filter`, and refined widget spacing around the Voice Orb.
- [x] Made `AppScannerWidget.jsx` tabs (groups) persistent across restarts using `localStorage`.
- [x] Refactored `AppScannerWidget.jsx` UI to load cached apps instantly, preventing unnecessary auto-rescans and keeping apps visible during background scans.
- [x] Wired Gemini REST API and Voice WebSocket API to parse and inject the dynamic system prompt.
- [x] Forwarded AI generation payloads to the Task Manager backend via IPC to natively spawn apps and groups.
- [x] Built real-time cleaning of incoming streamed tokens in Voice mode to prevent XML `<TASK>` tags from flickering in the chat UI.

## ⚙️ Control Module
- [x] Implemented app scanning backend cache (`scanned_apps_cache.json`) in `appScanner.js` to skip slow icon extraction for previously scanned apps (Fast Scan).

## 💰 Finance Module
- [ ] 

## 🎬 Media Module
- [ ] 

## 🧠 Memory Module
- [x] Set up `schedules.json` for tracking events, routines, tasks, and anniversaries
- [x] Refactored `schedules.json` to a flat array format for simpler chronological querying
- [x] Created `conversations.json` to log interaction history and tasks completed by AI

## 🔒 Security Module
- [ ] 

## 🚀 Upgrade Module
- [ ] 

---

## 🛠️ Important UI & Architecture Rules (DO NOT BREAK)
To prevent recurring bugs, follow these established rules:
- **3D Input Bug (Chromium):** HTML inputs (`<input>`) nested inside `preserve-3d` contexts (`.cube-room`) lose their hit-boxes on Windows Electron. **Fix:** Do NOT use CSS hacks that snap rotations (causes massive lag). Instead, add `transform: translateZ(10px)` directly to the input/button inline styles to force a new hardware compositor layer.
- **Message Auto-Scroll:** Do NOT use `scrollIntoView()` on child elements in the chat window, as it randomly shifts the entire parent UI/page. **Fix:** Use a `ref` on the `.message-window` parent container and set `scrollTop` to `scrollHeight` using `scrollTo({ top: ... })`.
- **3D Animation Lag:** Do NOT use `backdrop-filter: blur()` on `::before` pseudo-elements inside the 3D rotating cube. It completely tanks the GPU and drops frames to zero. **Fix:** Use a solid/semi-transparent dark `background: rgba(...)` without blur.
- **Electron Dev Server:** We use `npm run electron:dev` which uses `concurrently` and `wait-on` to start Vite (React) and Electron simultaneously. Do NOT run them separately.

---
*Note: Update this file at the end of each session or after completing a significant feature to maintain context.*
