// Emma AI - Conversational & Settings Controller

document.addEventListener('DOMContentLoaded', () => {

    // 0. ELECTRON ENVIRONMENT DETECTION & TITLEBAR WIRING
    if (window.electronAPI) {
        document.body.classList.add('electron');

        const btnMinimize = document.getElementById('btn-minimize');
        const btnMaximize = document.getElementById('btn-maximize');
        const btnClose    = document.getElementById('btn-close');

        if (btnMinimize) btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
        if (btnMaximize) btnMaximize.addEventListener('click', () => window.electronAPI.maximize());
        if (btnClose)    btnClose.addEventListener('click',    () => window.electronAPI.close());

        // Update maximize button icon on state change
        window.electronAPI.onWindowStateChange((state) => {
            if (btnMaximize) {
                btnMaximize.classList.toggle('is-maximized', state === 'maximized');
                btnMaximize.title = state === 'maximized' ? 'Restore' : 'Maximize';
            }
        });
    }

    // 1. NAVIGATION ROUTER (3D Cubic Room Rotation Transition)
    const navLinks = document.querySelectorAll('.nav-link');
    const cubeRoom = document.getElementById('cube-room');
    const ambientGlow = document.getElementById('ambient-glow-bg');
    
    let isTransitioning = false;

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isTransitioning) return;
            if (link.classList.contains('active')) return;

            const targetView = link.getAttribute('data-view');
            isTransitioning = true;

            // Trigger breathing pulse on background glow
            if (ambientGlow) ambientGlow.classList.add('breathe');

            // Rotate cube room by toggling keyframe animation classes
            if (cubeRoom) {
                cubeRoom.classList.add('transitioning');
                if (targetView === 'settings') {
                    cubeRoom.classList.remove('to-workspace');
                    cubeRoom.classList.add('to-settings');
                } else {
                    cubeRoom.classList.remove('to-settings');
                    cubeRoom.classList.add('to-workspace');
                }
            }

            // Swap active panel classes to drive face focus (opacity, blur, pointer-events)
            const currentPanel = document.querySelector('.view-panel.active');
            if (currentPanel) {
                currentPanel.classList.remove('active');
            }
            const targetPanel = document.getElementById(`${targetView}-view`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            // Toggle navigation link active state
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');

            // Complete transition and clean up glow breathe (1600ms total)
            setTimeout(() => {
                if (ambientGlow) {
                    ambientGlow.classList.remove('breathe');
                }
                if (cubeRoom) {
                    cubeRoom.classList.remove('transitioning');
                }
                isTransitioning = false;
            }, 1600);
        });
    });

    // 2. MAIN WORKSPACE VIEW DIRECTIVE CONSOLE
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = chatInput.value.trim();
                if (!query) return;
                
                chatInput.value = '';
                console.log(`Submitted prompt: "${query}"`);
                
                const capsule = document.querySelector('.input-capsule');
                if (capsule) {
                    capsule.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    setTimeout(() => {
                        capsule.style.borderColor = '';
                    }, 800);
                }
            }
        });
    }

    // 3. MODEL SELECTOR COGNITIVE GLOW (Emma-Flash <-> Emma-Pro)
    const modelSelector = document.querySelector('.model-selector-pill');
    const modelNameText = document.querySelector('.model-name');
    const settingsModelSelect = document.getElementById('setting-model');

    const updateGlowParams = (isFlash) => {
        const root = document.documentElement;
        const colorBtn = document.querySelector('.color-btn.active');
        const activeColor = colorBtn ? colorBtn.getAttribute('data-color') : 'indigo';

        if (isFlash) {
            applyColorGlow(activeColor);
        } else {
            root.style.setProperty('--glow-color-1', 'rgba(139, 92, 246, 0.4)');
            root.style.setProperty('--glow-color-2', 'rgba(236, 72, 153, 0.18)');
        }
    };

    if (modelSelector && modelNameText) {
        modelSelector.addEventListener('click', () => {
            const isFlash = modelNameText.textContent === 'Emma-Flash';
            modelNameText.textContent = isFlash ? 'Emma-Pro' : 'Emma-Flash';
            
            if (settingsModelSelect) {
                settingsModelSelect.value = isFlash ? 'pro' : 'flash';
            }

            updateGlowParams(isFlash);
        });
    }

    // 4. MICROPHONE VOICE DICTATION SIMULATOR
    const micBtn = document.querySelector('.mic-btn');
    let isListening = false;
    if (micBtn && chatInput) {
        micBtn.addEventListener('click', () => {
            isListening = !isListening;
            
            if (isListening) {
                micBtn.style.color = '#ef4444';
                micBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                chatInput.placeholder = 'Listening to voice prompt...';
                chatInput.disabled = true;
                
                setTimeout(() => {
                    if (isListening) {
                        chatInput.disabled = false;
                        chatInput.value = 'Analyze accounts and check balance';
                        micBtn.style.color = '';
                        micBtn.style.backgroundColor = '';
                        chatInput.placeholder = 'Ask Emma...';
                        isListening = false;
                        chatInput.focus();
                    }
                }, 2500);
            } else {
                micBtn.style.color = '';
                micBtn.style.backgroundColor = '';
                chatInput.placeholder = 'Ask Emma...';
                chatInput.disabled = false;
            }
        });
    }

    // Attach Files click
    const attachBtn = document.querySelector('.attach-btn');
    if (attachBtn) {
        attachBtn.addEventListener('click', () => {
            alert("File Attachment System: Select documents or workspace files for context.");
        });
    }

    // 5. SETTINGS CONTROL LOGIC
    const tempSlider = document.getElementById('setting-temp');
    const tempValue = document.getElementById('temp-val');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', (e) => {
            tempValue.textContent = (e.target.value / 100).toFixed(1);
        });
    }

    // Color Pickers - Dynamic Glow updates
    const colorBtns = document.querySelectorAll('.color-btn');
    const glowColors = {
        indigo:  { c1: 'rgba(100, 60, 255, 0.55)',  c2: 'rgba(56, 182, 255, 0.18)' },
        purple:  { c1: 'rgba(168, 60, 255, 0.45)',  c2: 'rgba(255, 45, 154, 0.18)' },
        emerald: { c1: 'rgba(16, 185, 129, 0.40)',  c2: 'rgba(52, 211, 153, 0.18)' },
        rose:    { c1: 'rgba(255, 45, 120, 0.45)',  c2: 'rgba(123, 79, 255, 0.18)' }
    };

    function applyColorGlow(colorKey) {
        const root = document.documentElement;
        if (glowColors[colorKey]) {
            root.style.setProperty('--glow-color-1', glowColors[colorKey].c1);
            root.style.setProperty('--glow-color-2', glowColors[colorKey].c2);
        }
    }

    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const colorKey = btn.getAttribute('data-color');
            const isFlash = modelNameText ? modelNameText.textContent === 'Emma-Flash' : true;
            if (isFlash) {
                applyColorGlow(colorKey);
            }
        });
    });

    // Save Settings
    const saveBtn = document.getElementById('save-settings-btn');
    const saveStatus = document.getElementById('save-status');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (settingsModelSelect && modelNameText) {
                const selectedVal = settingsModelSelect.value;
                modelNameText.textContent = selectedVal === 'flash' ? 'Emma-Flash' : selectedVal === 'pro' ? 'Emma-Pro' : 'Emma-Ultra';
                updateGlowParams(selectedVal === 'flash');
            }

            if (saveStatus) {
                saveStatus.classList.remove('hidden');
                setTimeout(() => {
                    saveStatus.classList.add('hidden');
                }, 2000);
            }
        });
    }
});
