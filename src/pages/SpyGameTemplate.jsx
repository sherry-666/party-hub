import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SpyGameTemplate = () => {
  const navigate = useNavigate();
  
  // Game States: 'NAME', 'MENU', 'HOST_CONFIG', 'JOIN', 'WAITING'
  const [gameState, setGameState] = useState('NAME');
  const [userName, setUserName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  
  // Reconnect Logic States
  const [interrupted, setInterrupted] = useState(false);
  const [reconnectTimer, setReconnectTimer] = useState(120);
  const [missingPlayer, setMissingPlayer] = useState('');

  // Host Configurations
  const [playerCount, setPlayerCount] = useState(8);
  const [spyCount, setSpyCount] = useState(2); // Default 1/4
  const [whiteboardCount, setWhiteboardCount] = useState(1);
  const [surpriseMode, setSurpriseMode] = useState(false);

  // Auto-adjust spy and whiteboard count based on player count
  useEffect(() => {
    if (gameState === 'HOST_CONFIG') {
      setSpyCount(Math.max(1, Math.floor(playerCount / 4)));
      setWhiteboardCount(playerCount > 5 ? 1 : 0);
    }
  }, [playerCount, gameState]);

  // Timer for reconnection
  useEffect(() => {
    let interval;
    if (interrupted && reconnectTimer > 0) {
      interval = setInterval(() => {
        setReconnectTimer((prev) => prev - 1);
      }, 1000);
    } else if (reconnectTimer === 0) {
      setInterrupted(false);
      alert('玩家超时未归，游戏已结束');
      setGameState('MENU');
    }
    return () => clearInterval(interval);
  }, [interrupted, reconnectTimer]);

  const simulateDisconnect = () => {
    setMissingPlayer('玩家 2');
    setInterrupted(true);
    setReconnectTimer(120);
  };

  const handleStartHost = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGameCode(code);
    setIsHost(true);
    setPlayers([{ name: userName, isHost: true }]);
    setGameState('WAITING');
  };

  const handleJoinGame = () => {
    if (gameCode.length === 4) {
      setPlayers([
        { name: '房主', isHost: true },
        { name: '玩家 2', isHost: false },
        { name: userName, isHost: false, isMe: true }
      ]);
      setGameState('WAITING');
    }
  };

  const renderNameInput = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="setup-card glass-card">
      <h2>请输入您的昵称</h2>
      <input 
        type="text" 
        value={userName} 
        onChange={(e) => setUserName(e.target.value)} 
        placeholder="例如：王小明"
        className="game-input"
      />
      <button 
        className="btn btn-primary btn-lg" 
        disabled={!userName.trim()}
        onClick={() => setGameState('MENU')}
      >
        确定
      </button>
    </motion.div>
  );

  const renderMenu = () => (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="menu-grid">
      <div className="menu-card glass-card" onClick={() => setGameState('HOST_CONFIG')}>
        <div className="menu-icon">👑</div>
        <h3>主持游戏</h3>
        <p>创建一个新房间并设置规则</p>
      </div>
      <div className="menu-card glass-card" onClick={() => setGameState('JOIN')}>
        <div className="menu-icon">🤝</div>
        <h3>加入游戏</h3>
        <p>通过房间代码进入现有游戏</p>
      </div>
    </motion.div>
  );

  const renderHostConfig = () => (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="setup-card glass-card config-card">
      <h2>游戏配置</h2>
      <div className="config-item">
        <label>总人数: {playerCount}</label>
        <input type="range" min="4" max="12" value={playerCount} onChange={(e) => setPlayerCount(parseInt(e.target.value))} />
      </div>
      <div className="config-item">
        <label>卧底人数: {spyCount}</label>
        <div className="counter">
          <button onClick={() => setSpyCount(Math.max(1, spyCount - 1))}>-</button>
          <span>{spyCount}</span>
          <button onClick={() => setSpyCount(Math.min(playerCount - 2, spyCount + 1))}>+</button>
        </div>
      </div>
      <div className="config-item">
        <label>白板人数: {whiteboardCount}</label>
        <div className="counter">
          <button onClick={() => setWhiteboardCount(Math.max(0, whiteboardCount - 1))}>-</button>
          <span>{whiteboardCount}</span>
          <button onClick={() => setWhiteboardCount(Math.min(2, whiteboardCount + 1))}>+</button>
        </div>
      </div>
      <div className="config-item toggle">
        <label>惊喜模式 (Surprise Mode)</label>
        <input type="checkbox" checked={surpriseMode} onChange={(e) => setSurpriseMode(e.target.checked)} />
      </div>
      <div className="config-actions">
        <button className="btn btn-secondary" onClick={() => setGameState('MENU')}>返回</button>
        <button className="btn btn-primary" onClick={handleStartHost}>创建房间</button>
      </div>
    </motion.div>
  );

  const renderJoinInput = () => (
    <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="setup-card glass-card">
      <h2>输入房间代码</h2>
      <input 
        type="text" 
        maxLength="4"
        value={gameCode} 
        onChange={(e) => setGameCode(e.target.value)} 
        placeholder="4位代码"
        className="game-input code-input"
      />
      <div className="config-actions">
        <button className="btn btn-secondary" onClick={() => setGameState('MENU')}>返回</button>
        <button className="btn btn-primary" onClick={handleJoinGame} disabled={gameCode.length < 4}>加入</button>
      </div>
    </motion.div>
  );

  const renderWaitingRoom = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="waiting-container">
      <div className="room-header glass-card">
        <div className="code-display">
          <span>房间代码</span>
          <h3>{gameCode}</h3>
        </div>
        <div className="player-stats">
          {players.length} / {isHost ? playerCount : '?'} 玩家已就绪
        </div>
      </div>
      
      <div className="player-list">
        {players.map((p, i) => (
          <motion.div 
            key={i} 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className={`player-badge glass-card ${p.isMe ? 'me' : ''}`}
          >
            {p.name} {p.isHost && '👑'}
          </motion.div>
        ))}
        {/* Placeholder for more players */}
        {isHost && Array.from({ length: playerCount - players.length }).map((_, i) => (
          <div key={`empty-${i}`} className="player-badge placeholder">等待加入...</div>
        ))}
      </div>

      <div className="room-footer">
        {isHost ? (
          <div className="host-actions">
            <button className="btn btn-primary btn-lg" disabled={players.length < playerCount}>
              开始游戏 ({players.length}/{playerCount})
            </button>
            <button className="btn btn-secondary" onClick={simulateDisconnect}>模拟玩家掉线</button>
          </div>
        ) : (
          <div className="waiting-msg">等待房主开始游戏...</div>
        )}
      </div>

      {interrupted && (
        <div className="interruption-overlay glass-card">
          <div className="overlay-content">
            <div className="spinner"></div>
            <h2>等待玩家重连...</h2>
            <p>玩家 <strong>{missingPlayer}</strong> 已离开游戏。</p>
            <div className="timer-display">剩余时间: {reconnectTimer}秒</div>
            <button className="btn btn-primary" onClick={() => setInterrupted(false)}>玩家已回 (模拟)</button>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="spy-container">
      <nav className="game-nav animate-fade-in">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>← 退出游戏</button>
        {userName && <div className="user-profile glass-card">👤 {userName}</div>}
      </nav>

      <main className="game-layout">
        <AnimatePresence mode="wait">
          {gameState === 'NAME' && renderNameInput()}
          {gameState === 'MENU' && renderMenu()}
          {gameState === 'HOST_CONFIG' && renderHostConfig()}
          {gameState === 'JOIN' && renderJoinInput()}
          {gameState === 'WAITING' && renderWaitingRoom()}
        </AnimatePresence>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .spy-container {
          padding: 30px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 100%);
        }

        .game-nav {
          width: 100%;
          max-width: 1200px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .user-profile {
          padding: 8px 16px;
          font-weight: 600;
          border-radius: 50px;
          font-size: 0.9rem;
        }

        .game-layout {
          width: 100%;
          max-width: 800px;
          padding: 20px;
        }

        .setup-card {
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
        }

        .game-input {
          width: 100%;
          max-width: 300px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          padding: 15px 20px;
          border-radius: 12px;
          color: white;
          font-size: 1.2rem;
          font-family: inherit;
          text-align: center;
        }

        .game-input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .code-input {
          letter-spacing: 10px;
          font-weight: 800;
        }

        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
        }

        .menu-card {
          padding: 40px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          text-align: center;
        }

        .menu-card:hover {
          transform: translateY(-10px);
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.1);
        }

        .menu-icon {
          font-size: 3.5rem;
        }

        .config-card {
          width: 100%;
          align-items: stretch;
          text-align: left;
        }

        .config-item {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 25px;
        }

        .config-item label {
          font-weight: 600;
          color: var(--text-muted);
        }

        .counter {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .counter button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          background: var(--glass);
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .toggle {
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          padding: 15px;
          border-radius: 12px;
        }

        .config-actions {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }

        .config-actions .btn { flex: 1; }

        .waiting-container {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
        }

        .code-display span {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .code-display h3 {
          font-size: 2.5rem;
          letter-spacing: 5px;
          color: var(--primary);
        }

        .player-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 15px;
        }

        .player-badge {
          padding: 15px;
          border-radius: 16px;
          text-align: center;
          font-weight: 600;
        }

        .player-badge.me {
          border-color: var(--secondary);
          background: rgba(236, 72, 153, 0.1);
        }

        .player-badge.placeholder {
          background: transparent;
          border: 1px dashed var(--glass-border);
          color: var(--text-muted);
          font-weight: 400;
          font-style: italic;
        }

        .room-footer {
          text-align: center;
          padding: 20px;
        }

        .waiting-msg {
          font-style: italic;
          color: var(--text-muted);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        input[type="range"] {
          width: 100%;
          accent-color: var(--primary);
        }

        .host-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }

        .interruption-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(20px);
        }

        .overlay-content {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 40px;
        }

        .timer-display {
          font-size: 2rem;
          font-weight: 800;
          color: var(--secondary);
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid var(--glass-border);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          margin: 0 auto;
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
};
export default SpyGameTemplate;
