import React from 'react';

const Navbar = ({ activeView, setActiveView }) => {
    return (
        <header className="hud-navbar">
            <div className="nav-left">
                <img src="assets/icon.png" className="logo-img" alt="Emma AI Logo" />
                <span className="logo-text">EMMA<span className="logo-sub">AI</span></span>
            </div>
            <nav className="nav-links-container">
                <ul className="nav-links">
                    <li 
                        className={`nav-link ${activeView === 'main' ? 'active' : ''}`} 
                        onClick={() => setActiveView('main')}
                    >
                        Workspace
                    </li>
                    <li 
                        className={`nav-link ${activeView === 'settings' ? 'active' : ''}`} 
                        onClick={() => setActiveView('settings')}
                    >
                        Settings
                    </li>
                </ul>
            </nav>
            <div className="nav-right">
                <div className="user-profile-badge">S</div>
            </div>
        </header>
    );
};

export default Navbar;
