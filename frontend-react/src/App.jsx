import React, { useState, useEffect } from 'react'
import Titlebar from './components/Titlebar'
import Navbar from './components/Navbar'
import MainWorkspace from './components/MainWorkspace'
import SettingsPanel from './components/SettingsPanel'
import './style.css'

function App() {
  const [activeView, setActiveView] = useState('main')
  const [activeModel, setActiveModel] = useState('flash')
  const [activeColor, setActiveColor] = useState('indigo')
  
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [cubeClass, setCubeClass] = useState('')
  const [isBreathing, setIsBreathing] = useState(false)

  // Handle View Transitions (Safe 2D Fade)
  const handleViewChange = (newView) => {
    if (isTransitioning || newView === activeView) return;
    
    setIsTransitioning(true);
    setCubeClass('fade-out');
    
    setTimeout(() => {
      setActiveView(newView);
      setCubeClass('fade-in');
      
      setTimeout(() => {
        setCubeClass('');
        setIsTransitioning(false);
      }, 300);
    }, 300);
  };

  // Handle Dynamic Glow Updates
  useEffect(() => {
    const root = document.documentElement;
    const isFlash = activeModel === 'flash';

    if (!isFlash) {
      root.style.setProperty('--glow-color-1', 'rgba(139, 92, 246, 0.4)');
      root.style.setProperty('--glow-color-2', 'rgba(236, 72, 153, 0.18)');
      return;
    }

    const glowColors = {
      indigo:  { c1: 'rgba(100, 60, 255, 0.55)',  c2: 'rgba(56, 182, 255, 0.18)' },
      purple:  { c1: 'rgba(168, 60, 255, 0.45)',  c2: 'rgba(255, 45, 154, 0.18)' },
      emerald: { c1: 'rgba(16, 185, 129, 0.40)',  c2: 'rgba(52, 211, 153, 0.18)' },
      rose:    { c1: 'rgba(255, 45, 120, 0.45)',  c2: 'rgba(123, 79, 255, 0.18)' }
    };

    if (glowColors[activeColor]) {
      root.style.setProperty('--glow-color-1', glowColors[activeColor].c1);
      root.style.setProperty('--glow-color-2', glowColors[activeColor].c2);
    }
  }, [activeModel, activeColor]);

  return (
    <>
      <Titlebar />
      
      {/* App Body - Handles Electron Top Spacing */}
      <div className="workspace-container" style={{ position: 'relative' }}>
        <Navbar activeView={activeView} setActiveView={handleViewChange} />
        
        <main className="chat-workspace" id="chat-workspace-panel">
          {/* Background Ambient Glow */}
          <div className={`ambient-glow ${isBreathing ? 'breathe' : ''}`} id="ambient-glow-bg"></div>

          <div className={`cube-room ${cubeClass}`} id="cube-room">
            {/* View 1: Main Workspace */}
            <MainWorkspace 
              activeModel={activeModel} 
              setActiveModel={setActiveModel} 
              isFocused={activeView === 'main'}
            />
            
            {/* View 2: Settings Panel */}
            <SettingsPanel 
              activeModel={activeModel}
              setActiveModel={setActiveModel}
              activeColor={activeColor}
              setActiveColor={setActiveColor}
              isFocused={activeView === 'settings'}
            />
          </div>
        </main>
      </div>
    </>
  )
}

export default App
