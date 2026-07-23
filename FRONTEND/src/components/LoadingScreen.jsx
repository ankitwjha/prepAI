import React, { useState, useEffect } from 'react';
import './LoadingScreen.scss';

const LOADING_PHASES = [
  "Rewriting your experience to sound 10x more impressive...",
  "Hiding stack overflow tabs before the AI starts looking...",
  "Convincing the algorithm that you actually know Kubernetes...",
  "Adding 'Senior' to your target title. Don't worry, it's our secret...",
  "Calculating coffee requirements to survive a 5-day roadmap...",
  "Synthesizing technical questions you'll Google right after the interview...",
  "AI skepticism levels: 98% (calculating chartered accountant match score)...",
  "Locating the missing semicolon in our code... Just kidding, it's JavaScript.",
  "STAR method answers generated: 8 (dread levels: low)...",
  "Polishing your custom PrepAiHelps chatbot advice..."
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
