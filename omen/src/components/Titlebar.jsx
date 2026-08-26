import React, { useState, useEffect } from 'react';

const Titlebar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (window.electronAPI) {
            document.body.classList.add('electron');
            
            window.electronAPI.onWindowStateChange((state) => {
                setIsMaximized(state === 'maximized');
            });
        }
    }, []);

    const handleMinimize = () => {
        if (window.electronAPI) window.electronAPI.minimize();
    };

    const handleMaximize = () => {
        if (window.electronAPI) window.electronAPI.maximize();
    };

    const handleClose = () => {
        if (window.electronAPI) window.electronAPI.close();
    };

    return (
        <div className="electron-titlebar" id="electron-titlebar">
            <div className="titlebar-drag-region"></div>
            <div className="titlebar-controls">
                <button className="titlebar-btn btn-minimize" onClick={handleMinimize} title="Minimize">
                    <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
                </button>
                <button className={`titlebar-btn btn-maximize ${isMaximized ? 'is-maximized' : ''}`} onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
                    <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
                </button>
                <button className="titlebar-btn btn-close" onClick={handleClose} title="Close">
                    <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/></svg>
                </button>
            </div>
        </div>
    );
};

export default Titlebar;
