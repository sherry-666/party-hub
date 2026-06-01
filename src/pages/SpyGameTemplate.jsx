import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCookie, setCookie } from '../utils/cookieUtils';
import { socket, connectSocket } from '../utils/socket';
import { useTranslation } from '../contexts/LanguageContext';
import wordsData from '../assets/spy/words_comprehensive.json';

const DEFAULT_WORDBANK_LANG = 'zh';
const categoriesByLanguage = (lang) => wordsData.categories.filter(c => (c.language || 'zh') === lang);

const SpyGameTemplate = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  // Game States: 'NAME', 'MENU', 'JOIN', 'WAITING'
  const [gameState, setGameState] = useState('NAME');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  // Host Configurations
  const [playerCount, setPlayerCount] = useState(8);
  const [spyCount, setSpyCount] = useState(2); // Default 1/4
  const [whiteboardCount, setWhiteboardCount] = useState(1);
  const [surpriseMode, setSurpriseMode] = useState(false);
  const [wordbankLanguage, setWordbankLanguage] = useState(lang);
  const [selectedCategories, setSelectedCategories] = useState(() => categoriesByLanguage(lang).map(c => c.name));
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const filteredCategories = useMemo(() => categoriesByLanguage(wordbankLanguage), [wordbankLanguage]);

  // Game Play States
  const [myRole, setMyRole] = useState(null);
  const [myWord, setMyWord] = useState('');
  const [alivePlayers, setAlivePlayers] = useState([]);
  const [votersList, setVotersList] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [gameOverResult, setGameOverResult] = useState(null);

  // Modal State
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  const showModal = (title, message, onConfirm = null, showCancel = false) => {
    setModal({ isOpen: true, title, message, onConfirm, showCancel });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  // Load user info and auto-reconnect on mount
  useEffect(() => {
    const userInfo = getCookie('user_info');
    const activeRoom = getCookie('active_room_code');
    
    if (userInfo && userInfo.name) {
      setUserName(userInfo.name);
      const id = userInfo.id || crypto.randomUUID();
      setUserId(id);
      setGameState('MENU');
      connectSocket();
      
      // Auto-reconnect if room code exists
      if (activeRoom) {
        console.log(`[TRACE] Emitting join-room for ${activeRoom} (User: ${userInfo.name}, ID: ${id})`);
        socket.emit('join-room', { gameCode: activeRoom, userData: { name: userInfo.name, userId: id } });
      }
    }
  }, []);

  // Socket Event Listeners
  useEffect(() => {
    socket.on('room-created', ({ gameCode, players, settings }) => {
      console.log(`[TRACE] Received room-created for ${gameCode}`);
      setGameCode(gameCode);
      setCookie('active_room_code', gameCode, 1); // Persist for 1 day
      const me = players.find(p => p.userId === userId);
      if (me) setIsHost(me.isHost);

      // Update settings from server
      if (settings) {
        if (settings.playerCount) setPlayerCount(settings.playerCount);
        if (settings.spyCount) setSpyCount(settings.spyCount);
        if (settings.whiteboardCount) setWhiteboardCount(settings.whiteboardCount);
        if (settings.surpriseMode !== undefined) setSurpriseMode(settings.surpriseMode);
        if (settings.wordbankLanguage) setWordbankLanguage(settings.wordbankLanguage);
        if (settings.selectedCategories) setSelectedCategories(settings.selectedCategories);
      }

      setPlayers(players.map(p => ({ ...p, isMe: p.userId === userId })));
      setGameState('WAITING');
    });

    socket.on('join-success', ({ gameCode, players, settings }) => {
      console.log(`[TRACE] Received join-success for ${gameCode} | Players: ${players.length}`);
      setGameCode(gameCode);
      setCookie('active_room_code', gameCode, 1);
      const me = players.find(p => p.userId === userId);
      if (me) {
        console.log(`[TRACE] My Host Status: ${me.isHost}`);
        setIsHost(me.isHost);
      }

      // Update settings from server
      if (settings) {
        if (settings.playerCount) setPlayerCount(settings.playerCount);
        if (settings.spyCount) setSpyCount(settings.spyCount);
        if (settings.whiteboardCount) setWhiteboardCount(settings.whiteboardCount);
        if (settings.surpriseMode !== undefined) setSurpriseMode(settings.surpriseMode);
        if (settings.wordbankLanguage) setWordbankLanguage(settings.wordbankLanguage);
        if (settings.selectedCategories) setSelectedCategories(settings.selectedCategories);
      }

      setPlayers(players.map(p => ({ ...p, isMe: p.userId === userId })));
      setGameState('WAITING');
    });

    socket.on('player-update', (updatedPlayers) => {
      console.log(`[TRACE] Received player-update | Current count: ${updatedPlayers.length} | Names: ${updatedPlayers.map(p => p.name).join(', ')}`);
      const me = updatedPlayers.find(p => p.userId === userId);
      if (me) setIsHost(me.isHost);
      setPlayers(updatedPlayers.map(p => ({ ...p, isMe: p.userId === userId })));
    });

    socket.on('connect', () => console.log('[TRACE] Socket Connected:', socket.id));
    socket.on('disconnect', () => console.log('[TRACE] Socket Disconnected'));
    socket.on('connect_error', (err) => console.error('[TRACE] Socket Connect Error:', err));

    socket.on('player-disconnected', (name) => {
      console.log(`[TRACE] Received player-disconnected: ${name}`);
      // We no longer show a full-screen overlay for better UX
      console.log(`Player ${name} disconnected`);
    });

    socket.on('error', (payload) => {
      const code = payload && typeof payload === 'object' ? payload.code : null;
      const legacyMsg = typeof payload === 'string' ? payload : null;
      const errorKey = code === 'ROOM_NOT_FOUND' ? 'errors.roomNotFound' : 'errors.unknown';
      const message = legacyMsg || t(errorKey);
      showModal(t('common.error'), message);
      if (code === 'ROOM_NOT_FOUND' || legacyMsg === '房间号不存在') {
        setCookie('active_room_code', '', -1); // Clear invalid room
      }
    });

    socket.on('settings-updated', (newSettings) => {
      if (newSettings.spyCount) setSpyCount(newSettings.spyCount);
      if (newSettings.whiteboardCount) setWhiteboardCount(newSettings.whiteboardCount);
      if (newSettings.surpriseMode !== undefined) setSurpriseMode(newSettings.surpriseMode);
      if (newSettings.playerCount) setPlayerCount(newSettings.playerCount);
      if (newSettings.wordbankLanguage) setWordbankLanguage(newSettings.wordbankLanguage);
      if (newSettings.selectedCategories) setSelectedCategories(newSettings.selectedCategories);
    });

    socket.on('game-started', (data) => {
      setGameState(data.gameState);
      setMyRole(data.myRole);
      setMyWord(data.myWord);
      setAlivePlayers(data.alivePlayers);
      setMyVote(null);
      setVotersList([]);
      setRoundResult(null);
      setGameOverResult(null);
    });

    socket.on('room-state-update', (data) => {
      if (data.gameState) setGameState(data.gameState);
      if (data.alivePlayers) setAlivePlayers(data.alivePlayers);
    });

    socket.on('vote-update', (data) => {
      setVotersList(data.voters || []);
    });

    socket.on('round-ended', (data) => {
      setRoundResult(data);
      setAlivePlayers(data.alivePlayers);
      setMyVote(null);
      setVotersList([]);
    });

    socket.on('game-over', (data) => {
      setGameState('GAME_OVER');
      setGameOverResult(data);
    });

    socket.on('return-to-waiting', () => {
      setGameState('WAITING');
      setMyRole(null);
      setMyWord('');
      setAlivePlayers([]);
      setMyVote(null);
      setVotersList([]);
      setRoundResult(null);
      setGameOverResult(null);
    });

    return () => {
      socket.off('room-created');
      socket.off('join-success');
      socket.off('player-update');
      socket.off('settings-updated');
      socket.off('player-disconnected');
      socket.off('error');
      socket.off('game-started');
      socket.off('room-state-update');
      socket.off('vote-update');
      socket.off('round-ended');
      socket.off('game-over');
      socket.off('return-to-waiting');
    };
  }, [userName, userId]);

  // Auto-adjust spy and whiteboard count based on player count
  useEffect(() => {
    if (gameState === 'HOST_CONFIG') {
      setSpyCount(Math.max(1, Math.floor(playerCount / 4) || 1));
      setWhiteboardCount(playerCount > 5 ? 1 : 0);
    }
  }, [playerCount, gameState]);

  // Timer for reconnection and UI refresh for disconnected players
  useEffect(() => {
    const interval = setInterval(() => {
      // Just trigger a re-render to update the countdowns in player badges
      if (players.some(p => p.isDisconnected)) {
        setPlayers([...players]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [players]);

  const simulateDisconnect = () => {
    // This now serves as a local UI test, though server handles real disconnects
    setMissingPlayer('测试玩家');
    setInterrupted(true);
    setReconnectTimer(120);
  };

  const handleStartHost = () => {
    setIsHost(true);
    const initialLang = lang;
    const initialCats = categoriesByLanguage(initialLang).map(c => c.name);
    setWordbankLanguage(initialLang);
    setSelectedCategories(initialCats);
    socket.emit('create-room', {
      userData: { name: userName, userId },
      settings: {
        playerCount: 8,
        spyCount: 2,
        whiteboardCount: 1,
        surpriseMode: false,
        wordbankLanguage: initialLang,
        selectedCategories: initialCats
      }
    });
  };

  const handleJoinGame = () => {
    if (gameCode.length === 4) {
      socket.emit('join-room', { gameCode: gameCode.toUpperCase(), userData: { name: userName, userId } });
    }
  };

  const handleLeaveRoom = () => {
    showModal(t('common.notice'), t('spy.waiting.leaveConfirm'), () => {
      socket.emit('leave-room', { userId, name: userName });
      setCookie('active_room_code', '', -1); // Clear cookie
      setPlayers([]);
      setGameCode('');
      setIsHost(false);
      setGameState('MENU');
    }, true);
  };

  const handleWordbankLanguageChange = (newLang) => {
    if (newLang === wordbankLanguage) return;
    const newCats = categoriesByLanguage(newLang).map(c => c.name);
    setWordbankLanguage(newLang);
    setSelectedCategories(newCats);
    if (gameCode) {
      socket.emit('update-settings', { gameCode, settings: { wordbankLanguage: newLang, selectedCategories: newCats } });
    }
  };

  const handleConfirmName = () => {
    const id = userId || crypto.randomUUID();
    setUserId(id);
    setCookie('user_info', { name: userName, id }, 30);
    setGameState('MENU');
    connectSocket();
  };

  const renderCategoryModal = () => (
    <AnimatePresence>
      {showCategoryModal && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="modal-content glass-card"
            style={{ maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            <h3>{t('spy.wordbank.title', { selected: selectedCategories.length, total: filteredCategories.length })}</h3>
            <p style={{ fontSize: '0.9em', color: 'rgba(255,255,255,0.7)', marginBottom: '15px' }}>
              {t('spy.wordbank.instruction')}
            </p>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 600 }}>
                {t('spy.wordbank.languageLabel')}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${wordbankLanguage === 'zh' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.9em' }}
                  onClick={() => handleWordbankLanguageChange('zh')}
                >
                  {t('spy.wordbank.languageZh')}
                </button>
                <button
                  type="button"
                  className={`btn ${wordbankLanguage === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.9em' }}
                  onClick={() => handleWordbankLanguageChange('en')}
                >
                  {t('spy.wordbank.languageEn')}
                </button>
              </div>
            </div>

            <div className="category-list" style={{ flex: 1, overflowY: 'auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', paddingRight: '10px' }}>
              {filteredCategories.map(cat => (
                <label key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.name)}
                    onChange={(e) => {
                      let newSelection = [...selectedCategories];
                      if (e.target.checked) {
                        newSelection.push(cat.name);
                      } else {
                        newSelection = newSelection.filter(c => c !== cat.name);
                      }
                      if (newSelection.length === 0) return; // Prevent deselecting all
                      setSelectedCategories(newSelection);
                      socket.emit('update-settings', { gameCode, settings: { selectedCategories: newSelection } });
                    }}
                    style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '1.05em' }}>{cat.name} <span style={{ fontSize: '0.8em', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>{t('spy.wordbank.groupCount', { count: cat.words.length })}</span></div>
                    <div style={{ fontSize: '0.8em', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{cat.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <button className="btn btn-primary" onClick={() => setShowCategoryModal(false)} style={{ width: '100%' }}>
              {t('spy.wordbank.done')}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderModal = () => (
    <AnimatePresence>
      {modal.isOpen && (
        <div className="modal-overlay">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="modal-content glass-card"
          >
            <h3>{modal.title}</h3>
            <p>{modal.message}</p>
            <div className="modal-actions">
              {modal.showCancel && (
                <button className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  closeModal();
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderNameInput = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="setup-card glass-card">
      <h2>{t('spy.name.heading')}</h2>
      <input
        type="text"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder={t('spy.name.placeholder')}
        className="game-input"
      />
      <button
        className="btn btn-primary btn-lg"
        disabled={!userName.trim()}
        onClick={handleConfirmName}
      >
        {t('common.confirm')}
      </button>
    </motion.div>
  );

  const renderMenu = () => (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="menu-grid">
      <div className="menu-card glass-card" onClick={handleStartHost}>
        <div className="menu-icon">👑</div>
        <h3>{t('spy.menu.hostTitle')}</h3>
        <p>{t('spy.menu.hostDesc')}</p>
      </div>
      <div className="menu-card glass-card" onClick={() => setGameState('JOIN')}>
        <div className="menu-icon">🤝</div>
        <h3>{t('spy.menu.joinTitle')}</h3>
        <p>{t('spy.menu.joinDesc')}</p>
      </div>
    </motion.div>
  );

  const renderHostConfig = () => (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="setup-card glass-card config-card">
      <h2>{t('spy.config.heading')}</h2>
      <div className="config-item">
        <label>{t('spy.config.totalPlayers', { count: playerCount })}</label>
        <input type="range" min="3" max="12" value={playerCount} onChange={(e) => setPlayerCount(parseInt(e.target.value))} />
      </div>
      <div className="config-item">
        <label>{t('spy.config.spyCount', { count: spyCount })}</label>
        <div className="counter">
          <button onClick={() => setSpyCount(Math.max(1, spyCount - 1))}>-</button>
          <span>{spyCount}</span>
          <button onClick={() => setSpyCount(Math.min(playerCount - 2, spyCount + 1))}>+</button>
        </div>
      </div>
      <div className="config-item">
        <label>{t('spy.config.whiteboardCount', { count: whiteboardCount })}</label>
        <div className="counter">
          <button onClick={() => setWhiteboardCount(Math.max(0, whiteboardCount - 1))}>-</button>
          <span>{whiteboardCount}</span>
          <button onClick={() => setWhiteboardCount(Math.min(2, whiteboardCount + 1))}>+</button>
        </div>
      </div>
      <div className="config-item toggle">
        <label>{t('spy.config.surpriseMode')}</label>
        <input type="checkbox" checked={surpriseMode} onChange={(e) => setSurpriseMode(e.target.checked)} />
      </div>
      <div className="config-actions">
        <button className="btn btn-secondary" onClick={() => setGameState('MENU')}>{t('common.back')}</button>
        <button className="btn btn-primary" onClick={handleStartHost}>{t('spy.config.createRoom')}</button>
      </div>
    </motion.div>
  );

  const renderJoinInput = () => (
    <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="setup-card glass-card">
      <h2>{t('spy.join.heading')}</h2>
      <input
        type="text"
        maxLength={4}
        value={gameCode}
        onChange={(e) => setGameCode(e.target.value.toUpperCase())}
        placeholder={t('spy.join.placeholder')}
        className="game-input code-input"
      />
      <div className="config-actions">
        <button className="btn btn-secondary" onClick={() => setGameState('MENU')}>{t('common.back')}</button>
        <button className="btn btn-primary" onClick={handleJoinGame} disabled={gameCode.length < 4}>{t('spy.join.join')}</button>
      </div>
    </motion.div>
  );

  const renderWaitingRoom = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="waiting-container">
      <div className="room-header glass-card">
        <div className="code-display">
          <span>{t('spy.waiting.roomCodeLabel')}</span>
          <h3>{gameCode}</h3>
        </div>
        <div className="player-stats">
          {t('spy.waiting.playersJoined', { count: players.length })}
        </div>
      </div>

      <div className="player-list">
        {players.map((p, i) => {
          const timeLeft = p.isDisconnected && p.timeoutAt ? Math.max(0, Math.floor((p.timeoutAt - Date.now()) / 1000)) : null;

          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`player-badge glass-card ${p.isMe ? 'me' : ''} ${p.isDisconnected ? 'disconnected' : ''}`}
            >
              <div className="player-info">
                {p.name} {p.isHost && '👑'}
              </div>
              {p.isDisconnected && (
                <div className="disconnect-status">
                  <span className="emoji">🔌</span>
                  <span className="timer">{t('spy.waiting.reconnectTimer', { seconds: timeLeft })}</span>
                </div>
              )}
              {p.isMe && p.id === userId && !isHost && !p.isDisconnected && (
                <span className="returning-tag">{t('spy.waiting.welcomeBack')}</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {isHost && (
        <div className="host-config-section glass-card animate-fade-in">
          <h4>{t('spy.waiting.configHeading')}</h4>
          <div className="config-grid">
            <div className="config-item">
              <label>{t('spy.waiting.spy', { count: spyCount })}</label>
              <div className="counter small">
                <button onClick={() => {
                  const newCount = Math.max(1, spyCount - 1);
                  setSpyCount(newCount);
                  socket.emit('update-settings', { gameCode, settings: { spyCount: newCount } });
                }}>-</button>
                <span>{spyCount}</span>
                <button onClick={() => {
                  const newCount = Math.min(Math.max(1, players.length - 2), spyCount + 1);
                  setSpyCount(newCount);
                  socket.emit('update-settings', { gameCode, settings: { spyCount: newCount } });
                }}>+</button>
              </div>
            </div>
            <div className="config-item">
              <label>{t('spy.waiting.whiteboard', { count: whiteboardCount })}</label>
              <div className="counter small">
                <button onClick={() => {
                  const newCount = Math.max(0, whiteboardCount - 1);
                  setWhiteboardCount(newCount);
                  socket.emit('update-settings', { gameCode, settings: { whiteboardCount: newCount } });
                }}>-</button>
                <span>{whiteboardCount}</span>
                <button onClick={() => {
                  const newCount = Math.min(2, whiteboardCount + 1);
                  setWhiteboardCount(newCount);
                  socket.emit('update-settings', { gameCode, settings: { whiteboardCount: newCount } });
                }}>+</button>
              </div>
            </div>
            <div className="config-item toggle-inline">
              <label>{t('spy.waiting.surpriseMode')}</label>
              <input type="checkbox" checked={surpriseMode} onChange={(e) => {
                setSurpriseMode(e.target.checked);
                socket.emit('update-settings', { gameCode, settings: { surpriseMode: e.target.checked } });
              }} />
            </div>
          </div>
          <div className="config-item" style={{ marginTop: '15px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(true)} style={{ width: '100%' }}>
              {t('spy.waiting.wordbankButton', { selected: selectedCategories.length, total: filteredCategories.length })}
            </button>
          </div>
        </div>
      )}

      <div className="room-footer">
        {isHost ? (
          <div className="host-actions">
            <button
              className="btn btn-primary btn-lg"
              disabled={players.length < 3}
              onClick={() => socket.emit('start-game', { gameCode })}
            >
              {t('spy.waiting.startGame', { count: players.length })}
            </button>
            <div className="action-row">
              <button className="btn btn-secondary btn-sm" onClick={handleLeaveRoom}>{t('spy.waiting.leaveRoom')}</button>
            </div>
          </div>
        ) : (
          <div className="waiting-footer">
            <div className="waiting-msg">{t('spy.waiting.waitingHost')}</div>
            <button className="btn btn-secondary" onClick={handleLeaveRoom}>{t('spy.waiting.leaveRoomAlt')}</button>
          </div>
        )}
      </div>
    </motion.div>
  );

  const handleExitGame = () => {
    if (gameState === 'WAITING' || gameState === 'HOST_CONFIG' || gameState === 'IN_GAME' || gameState === 'GAME_OVER') {
      handleLeaveRoom();
    } else {
      navigate('/');
    }
  };

  const roleLabel = (role) => {
    if (role === 'SPY') return t('spy.role.spy');
    if (role === 'WHITEBOARD') return t('spy.role.whiteboard');
    return t('spy.role.regular');
  };

  const renderInGame = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ingame-container">
      <div className="room-header glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{t('spy.game.heading')}</h3>
        <p>{t('spy.game.alive', { alive: alivePlayers.length, total: players.length })}</p>
      </div>

      <div className="word-reveal-section glass-card" style={{ position: 'relative', height: '150px', overflow: 'hidden', margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="secret-word" style={{ fontSize: '2em', fontWeight: 'bold', color: '#fff' }}>
          {myRole === 'SPY' && !myWord && surpriseMode ? t('spy.game.blindSpy') : (myWord || t('spy.game.whiteboardWord'))}
        </div>
        <motion.div
          className="scratch-card-cover"
          drag="y"
          dragConstraints={{ top: -150, bottom: 0 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #4f46e5, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', borderRadius: '12px', zIndex: 10, cursor: 'grab', userSelect: 'none' }}
        >
          {t('spy.game.scratchHint')}
        </motion.div>
      </div>

      <div className="voting-section glass-card">
        <h4>{t('spy.game.voteHeading')}</h4>
        <div className="player-list voting-list" style={{ marginTop: '15px' }}>
          {players.map((p, i) => {
            const isMe = p.userId === userId;
            const isAlive = alivePlayers.includes(p.userId);
            const hasVoted = votersList.includes(userId);

            return (
              <div key={i} className={`player-badge glass-card ${!isAlive ? 'eliminated' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: myVote === p.userId ? 'rgba(79, 70, 229, 0.3)' : '', opacity: isAlive ? 1 : 0.5 }}>
                <span style={{ textDecoration: !isAlive ? 'line-through' : 'none' }}>
                  {p.name} {isMe && t('spy.game.me')}
                  {!isAlive && <span style={{ color: '#ff4d4f', marginLeft: '5px' }}>{t('spy.game.eliminated')}</span>}
                </span>

                {isAlive && !isMe && alivePlayers.includes(userId) && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={hasVoted}
                    onClick={() => {
                      setMyVote(p.userId);
                      socket.emit('submit-vote', { gameCode, targetUserId: p.userId, myUserId: userId });
                    }}
                  >
                    {hasVoted ? (myVote === p.userId ? t('spy.game.voted') : t('spy.game.waitingVote')) : t('spy.game.voteEliminate')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {votersList.includes(userId) && !roundResult && (
          <div className="waiting-msg" style={{ marginTop: '15px', textAlign: 'center' }}>
            {t('spy.game.waitingOthers', { voted: votersList.length, total: alivePlayers.length })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {roundResult && !gameOverResult && (
          <div className="modal-overlay">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="modal-content glass-card">
              <h3>{t('spy.game.roundOverTitle')}</h3>
              {roundResult.eliminatedUserId ? (
                <div>
                  <h4 style={{ color: '#ff4d4f', fontSize: '1.5em' }}>{roundResult.eliminatedName}</h4>
                  <p>{t('spy.game.eliminatedSuffix')}</p>
                  <p style={{ marginTop: '10px' }}>{t('spy.game.revealRole', { role: '' })}<strong>{roleLabel(roundResult.eliminatedRole)}</strong></p>
                </div>
              ) : (
                <p>{t('spy.game.noElimination')}</p>
              )}
              {isHost && (
                <button className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }} onClick={() => setRoundResult(null)}>
                  {t('spy.game.nextRound')}
                </button>
              )}
              {!isHost && <p style={{ marginTop: '20px' }}>{t('spy.game.waitingNextRound')}</p>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderGameOver = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ingame-container">
      <div className="room-header glass-card" style={{ textAlign: 'center' }}>
        <h2 style={{ color: gameOverResult?.winner === 'SPIES' ? '#ff4d4f' : '#4f46e5', fontSize: '2em' }}>
          {gameOverResult?.winner === 'SPIES' ? t('spy.over.spiesWin') : t('spy.over.civiliansWin')}
        </h2>
      </div>

      <div className="glass-card" style={{ marginTop: '20px' }}>
        <h3>{t('spy.over.finalReveal')}</h3>
        <div className="player-list" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {gameOverResult?.players.map((p, i) => (
            <div key={i} className="player-badge glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{p.name} {p.userId === userId ? t('spy.game.me') : ''}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold', color: p.role === 'SPY' ? '#ff4d4f' : '#10b981' }}>
                  {roleLabel(p.role)}
                </span>
                <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>{t('spy.over.wordLabel', { word: p.word || t('spy.over.noWord') })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={() => socket.emit('play-again', { gameCode })}>
            {t('spy.over.playAgain')}
          </button>
        </div>
      )}
      {!isHost && (
        <div className="waiting-msg" style={{ marginTop: '30px', textAlign: 'center' }}>
          {t('spy.over.waitingHost')}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="spy-container">
      <nav className="game-nav animate-fade-in">
        <button className="btn btn-secondary" onClick={handleExitGame}>{t('spy.nav.exit')}</button>
        {userName && <div className="user-profile glass-card">👤 {userName}</div>}
      </nav>

      <main className="game-layout">
        <AnimatePresence mode="wait">
          {gameState === 'NAME' && renderNameInput()}
          {gameState === 'MENU' && renderMenu()}
          {gameState === 'JOIN' && renderJoinInput()}
          {gameState === 'WAITING' && renderWaitingRoom()}
          {gameState === 'IN_GAME' && renderInGame()}
          {gameState === 'GAME_OVER' && renderGameOver()}
        </AnimatePresence>
      </main>

      {renderCategoryModal()}
      {renderModal()}

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

        .player-badge.disconnected {
          opacity: 0.6;
          filter: grayscale(0.8);
          border: 1px dashed var(--error);
        }

        .player-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .disconnect-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 8px;
          font-size: 0.75rem;
          color: var(--error);
          font-weight: 700;
        }

        .disconnect-status .emoji {
          font-size: 1.2rem;
          margin-bottom: 2px;
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

        .waiting-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .waiting-footer .btn {
          padding: 8px 24px;
          font-size: 0.9rem;
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

        .host-config-section {
          padding: 20px;
          margin-top: 20px;
          border: 1px solid rgba(99, 102, 241, 0.3);
          background: rgba(255, 255, 255, 0.03);
        }

        .host-config-section h4 {
          margin: 0 0 15px 0;
          color: var(--primary);
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 20px;
        }

        .config-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        .config-item label {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .counter.small {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 5px 10px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
        }

        .counter.small button {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: var(--primary);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          transition: transform 0.2s;
        }

        .counter.small button:hover {
          transform: scale(1.1);
        }

        .counter.small span {
          font-weight: 700;
          min-width: 20px;
          text-align: center;
        }

        .toggle-inline {
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .action-row {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.8rem;
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

        .returning-tag {
          font-size: 0.7rem;
          background: var(--primary);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 5px;
          vertical-align: middle;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2000;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 400px;
          padding: 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modal-content h3 {
          margin: 0;
          color: var(--primary);
        }

        .modal-content p {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .modal-actions .btn {
          min-width: 100px;
        }
      `}} />
    </div>
  );
};
export default SpyGameTemplate;
