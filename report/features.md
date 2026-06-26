# Emma AI - Features & Capabilities

This document highlights the user-facing features and core capabilities that have been successfully integrated into Emma AI.

## 🧠 Core Intelligence & Workflow
*   **Dual-Stream Generation:** Emma processes conversational responses (`<MESSAGE>`) simultaneously with executable system commands (`<TASK>`) in real-time, preventing UI flickering.
*   **Dynamic System Prompts:** Emma automatically injects your customized app groups into her own memory, allowing her to understand and execute highly personalized commands.
*   **Real-time Command Execution:** Commands outputted by the AI are natively caught and processed by the Task Manager bridge without relying on unstable external tool-calling frameworks.

## 🖥️ User Interface (Frontend)
*   **3D Interactive Interface:** A polished, rotating 3D environment with interactive widgets and a central Voice Orb.
*   **Interactive Map Widget:** A fully integrated Leaflet map for location-based queries and visual data display.
*   **Smart App Scanner UI:** A persistent application scanner that caches your installed apps locally. Apps load instantly on startup while background rescanning happens silently, preventing UI lockups.
*   **Command Hub Visibility:** Real-time visibility into the exact command code Emma is generating via the Main Center Hub widget.

## ⚙️ PC Control & Automation
*   **Fast App Scanning:** Intelligent backend caching (`scanned_apps_cache.json`) skips slow icon extraction for previously scanned applications.
*   **App & Group Management:** Emma can natively launch or close specific apps, or launch entire predefined "groups" of apps with a single command.
*   **Advanced Keyboard Control (`KEYBOARD_ACTION`):** Emma has full control over the physical keyboard using a unified 4-parameter syntax (`holdKey | iterations | keyCombo | text`):
    *   *Simultaneous Chords:* She can press traditional shortcuts exactly at the same time (e.g., `ctrl+c`).
    *   *Sequential Sequences:* She can hold down a modifier key (like `Windows`) and tap multiple keys in a row (e.g., `up`, then `left` to snap windows).
    *   *Smart Text Injection:* She can seamlessly type long strings of text automatically during a sequence.
    *   *Fail-safes:* Intelligent comma and plus parsing guarantees that the OS never gets stuck holding a key down.

## 🗓️ Memory & Scheduling
*   **Schedules & Routines:** A flat-array JSON architecture (`schedules.json`) tracks events, routines, and anniversaries.
*   **Interaction History:** Long-term conversation logging (`conversations.json`) keeps a persistent record of past AI actions and tasks completed.

---
*Note: This feature log will be continuously updated as new modules (Finance, Media, Security, Upgrade, Mouse Control) are integrated.*
