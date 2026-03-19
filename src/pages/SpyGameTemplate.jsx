import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SpyGameTemplate = () => {
  const navigate = useNavigate();

  return (
    <div className="spy-container">
      <nav className="game-nav animate-fade-in">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>← Exit Game</button>
        <div className="game-status glass-card">Room: #8824 | 6/8 Players</div>
      </nav>

      <main className="game-layout">
        <header className="game-header animate-fade-in">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="spy-logo"
          >🕵️‍♂️</motion.div>
          <h1>Who is the Spy?</h1>
          <p>谁是卧底</p>
        </header>

        <section className="game-content glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="template-placeholder">
            <div className="placeholder-icon">⚙️</div>
            <h3>Game Engine Template Ready</h3>
            <p>The core game logic and UI will be implemented here.</p>
            
            <div className="setup-preview">
              <div className="setup-item">
                <span className="label">Total Players</span>
                <span className="value">8</span>
              </div>
              <div className="setup-item">
                <span className="label">Spy Count</span>
                <span className="value">1</span>
              </div>
              <div className="setup-item">
                <span className="label">Civilian Count</span>
                <span className="value">7</span>
              </div>
            </div>

            <button className="btn btn-primary btn-lg">Start Setup (Coming Soon)</button>
          </div>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .spy-container {
          padding: 30px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .game-nav {
          width: 100%;
          max-width: 1200px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .game-status {
          padding: 8px 20px;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: 50px;
        }

        .game-layout {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          gap: 40px;
          align-items: center;
        }

        .game-header {
          text-align: center;
        }

        .spy-logo {
          font-size: 5rem;
          margin-bottom: 10px;
        }

        .game-header h1 {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .game-header p {
          font-size: 1.2rem;
          color: var(--text-muted);
          letter-spacing: 4px;
          text-transform: uppercase;
        }

        .game-content {
          width: 100%;
          padding: 60px 40px;
          min-height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .template-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 25px;
          max-width: 500px;
        }

        .placeholder-icon {
          font-size: 3rem;
          opacity: 0.5;
          animation: spin 10s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .setup-preview {
          width: 100%;
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
          background: rgba(255, 255, 255, 0.03);
          padding: 20px;
          border-radius: 16px;
        }

        .setup-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .setup-item .label {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .setup-item .value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .btn-lg {
          padding: 16px 40px;
          font-size: 1.1rem;
        }
      `}} />
    </div>
  );
};

export default SpyGameTemplate;
