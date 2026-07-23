import React, { useState, useEffect } from 'react';
import './LoadingScreen.scss';

const LOADING_PHASES = [
  "One day you're gonna make the onions cry...",
  "I love deadlines. I love the whooshing noise they make as they go by...",
  "Reality continues to ruin my life....",
  // "Synthesizing Technical & Behavioral Questions...",
  // "Building 5-Day Targeted Preparation Roadmap...",
  // "Finalizing AI Interview Strategy Report..."
];

const LoadingScreen = ({ message }) => {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen-container">
      <div className="loading-content">
        <div className="orb-wrapper">
          <div className="orb-core"></div>
          <div className="orb-ring orb-ring-1"></div>
          <div className="orb-ring orb-ring-2"></div>
        </div>

        <h2 className="loading-title">{message || "Processing..."}</h2>
        <p className="loading-phase">{LOADING_PHASES[phaseIndex]}</p>

        <div className="progress-bar-container">
          <div className="progress-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
