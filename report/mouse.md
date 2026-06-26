# Comprehensive Mouse Control Capabilities

To build a truly robust mouse controller, we are strictly designing for a **standard 3-button mouse** (Left, Right, and Middle Scroll Wheel). Using the `robotjs` library, here is the complete list of everything Emma can be programmed to do with this standard hardware:

### 1. Movement Actions (Navigation)
*   **Instant Move (Absolute):** Teleport the cursor instantly to an exact X, Y pixel coordinate on the screen (e.g., `500, 300`).
*   **Smooth Move (Absolute):** Move the cursor gradually and smoothly to an exact X, Y coordinate (simulates a human hand moving the mouse).
*   **Instant Move (Relative):** Teleport the cursor instantly by a specific amount from its current location (e.g., "jump 50 pixels down").
*   **Smooth Move (Relative):** Move the cursor smoothly by a specific amount from its current location (e.g., "slide 100 pixels to the right").

### 2. Clicking Actions (Tapping)
*   **Left Click:** Standard single left-click (used to select or press buttons).
*   **Right Click:** Standard single right-click (used to open context menus).
*   **Middle Click:** Single click of the scroll wheel (often used to open links in new background tabs or close tabs).
*   **Double Click (Left):** Rapidly clicking the left button twice (used to open files/folders, or highlight a single word).
*   **Double Click (Right):** Rapidly clicking the right button twice.
*   **Rapid Clicking / Multi-Click:** Clicking any button a specific number of times at extreme speeds (e.g., "click the left button 50 times in 1 second" - highly useful for gaming, spamming, or repetitive data entry).

### 3. Holding & Releasing (Dragging Actions)
*   **Left Button Down (Hold):** Pressing the left mouse button and keeping it pressed down.
*   **Left Button Up (Release):** Letting go of the left mouse button.
*   **Right Button Down (Hold):** Pressing the right mouse button and keeping it held down (used in some games to aim or pan cameras).
*   **Right Button Up (Release):** Letting go of the right mouse button.
*   **Middle Button Down (Hold):** Pressing the scroll wheel in and holding it (used to pan around 3D environments or large canvases).
*   **Middle Button Up (Release):** Letting go of the scroll wheel.
*   **Drag-and-Drop Sequence:** A compound action: Move to X1,Y1 -> Hold Left Button -> Smooth Move to X2,Y2 -> Release Left Button.

### 4. Scrolling Actions
*   **Scroll Up (Vertical):** Spinning the mouse wheel up (to scroll up a webpage or document).
*   **Scroll Down (Vertical):** Spinning the mouse wheel down.

### 5. Sensing Actions (Information Gathering)
*   **Get Current Position:** The ability to ask the OS "where is the mouse cursor right now?" and return the exact X,Y coordinates.
*   **Get Screen Size:** The ability to check the monitor's resolution (e.g., 1920x1080) so Emma can calculate the exact center of the screen without needing hardcoded values.

---

## Cheat Sheet: MOUSE_ACTION Command Syntax

To trigger these actions, Emma generates a strict `<COMMAND>` string hidden in her response. The format requires 4 exact parameters separated by a pipe (`|`):

**`<COMMAND: MOUSE_ACTION> action | button | X,Y | amount </COMMAND>`**

Here are the specific commands Emma can use to control the physical mouse:

### Movement
*   **Move to 500, 500:** `<COMMAND: MOUSE_ACTION> move | none | 500,500 | 1 </COMMAND>`
*   **Move to 1920, 1080:** `<COMMAND: MOUSE_ACTION> move | none | 1920,1080 | 1 </COMMAND>`

### Clicking
*   **Left Click:** `<COMMAND: MOUSE_ACTION> click | left | none | 1 </COMMAND>`
*   **Right Click:** `<COMMAND: MOUSE_ACTION> click | right | none | 1 </COMMAND>`
*   **Double Left Click:** `<COMMAND: MOUSE_ACTION> click | left | none | 2 </COMMAND>`
*   **Rapid Click (50x):** `<COMMAND: MOUSE_ACTION> click | left | none | 50 </COMMAND>`

### Dragging (Hold & Release)
*   **Hold Left Button:** `<COMMAND: MOUSE_ACTION> hold | left | none | 1 </COMMAND>`
*   **Release Left Button:** `<COMMAND: MOUSE_ACTION> release | left | none | 1 </COMMAND>`

### Scrolling
*   **Scroll Down (10 ticks):** `<COMMAND: MOUSE_ACTION> scroll | down | none | 10 </COMMAND>`
*   **Scroll Up (5 ticks):** `<COMMAND: MOUSE_ACTION> scroll | up | none | 5 </COMMAND>`

### Utilities
*   **Get Screen Resolution / Cursor Position:** `<COMMAND: MOUSE_ACTION> getPos | none | none | 1 </COMMAND>`
