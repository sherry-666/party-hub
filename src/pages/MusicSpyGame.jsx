import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCookie, setCookie } from '../utils/cookieUtils';
import { socket, connectSocket } from '../utils/socket';
import { useTranslation } from '../contexts/LanguageContext';

const MusicSpyGame = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [gameState, setGameState] = useState('NAME');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  // Host config
  const [spyCount, setSpyCount] = useState(2);
  const [whiteboardCount, setWhiteboardCount] = useState(1);
  const [surpriseMode, setSurpriseMode] = useState(false);

  // In-game state
  const [myRole, setMyRole] = useState(null);
  const [myAudioUrl, setMyAudioUrl] = useState('');
  const [myTrackTitle, setMyTrackTitle] = useState('');
  const [alivePlayers, setAlivePlayers] = useState([]);
  const [votersList, setVotersList] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [gameOverResult, setGameOverResult] = useState(null);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasListened, setHasListened] = useState(false);
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // Modal
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, showCancel: false });
  const showModal = (title, message, onConfirm = null, showCancel = false) =>
    setModal({ isOpen: true, title, message, onConfirm, showCancel });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Load saved user info
  useEffect(() => {
    const userInfo = getCookie('user_info');
    const activeRoom = getCookie('active_room_code_music');
    if (userInfo?.name) {
      setUserName(userInfo.name);
      const id = userInfo.id || crypto.randomUUID();
      setUserId(id);
      setGameState('MENU');
      connectSocket();
      if (activeRoom) {
        socket.emit('join-room', { gameCode: activeRoom, userData: { name: userInfo.name, userId: id } });
      }
    }
  }, []);

  // Socket listeners
  useEffect(() => {
    socket.on('room-created', ({ gameCode, players, settings }) => {
      setGameCode(gameCode);
      setCookie('active_room_code_music', gameCode, 1);
      const me = players.find(p => p.userId === userId);
      if (me) setIsHost(me.isHost);
      if (settings?.spyCount) setSpyCount(settings.spyCount);
      if (settings?.whiteboardCount) setWhiteboardCount(settings.whiteboardCount);
      if (settings?.surpriseMode !== undefined) setSurpriseMode(settings.surpriseMode);
      setPlayers(players.map(p => ({ ...p, isMe: p.userId === userId })));
      setGameState('WAITING');
    });

    socket.on('join-success', ({ gameCode, players, settings }) => {
      setGameCode(gameCode);
      setCookie('active_room_code_music', gameCode, 1);
      const me = players.find(p => p.userId === userId);
      if (me) setIsHost(me.isHost);
      if (settings?.spyCount) setSpyCount(settings.spyCount);
      if (settings?.whiteboardCount) setWhiteboardCount(settings.whiteboardCount);
      if (settings?.surpriseMode !== undefined) setSurpriseMode(settings.surpriseMode);
      setPlayers(players.map(p => ({ ...p, isMe: p.userId === userId })));
      setGameState('WAITING');
    });

    socket.on('player-update', updated => {
      const me = updated.find(p => p.userId === userId);
      if (me) setIsHost(me.isHost);
      setPlayers(updated.map(p => ({ ...p, isMe: p.userId === userId })));
    });

    socket.on('settings-updated', s => {
      if (s.spyCount) setSpyCount(s.spyCount);
      if (s.whiteboardCount !== undefined) setWhiteboardCount(s.whiteboardCount);
      if (s.surpriseMode !== undefined) setSurpriseMode(s.surpriseMode);
    });

    socket.on('game-started', data => {
      setGameState(data.gameState);
      setMyRole(data.myRole);
      setMyAudioUrl(data.myAudioUrl || '');
      setMyTrackTitle(data.myTrackTitle || '');
      setAlivePlayers(data.alivePlayers);
      setMyVote(null);
      setVotersList([]);
      setRoundResult(null);
      setGameOverResult(null);
      setIsPlaying(false);
      setAudioProgress(0);
      setHasListened(false);
    });

    socket.on('room-state-update', data => {
      if (data.gameState) setGameState(data.gameState);
      if (data.alivePlayers) setAlivePlayers(data.alivePlayers);
    });

    socket.on('vote-update', data => setVotersList(data.voters || []));

    socket.on('round-ended', data => {
      setRoundResult(data);
      setAlivePlayers(data.alivePlayers);
      setMyVote(null);
      setVotersList([]);
      setIsPlaying(false);
    });

    socket.on('game-over', data => {
      setGameState('GAME_OVER');
      setGameOverResult(data);
      setIsPlaying(false);
    });

    socket.on('return-to-waiting', () => {
      setGameState('WAITING');
      setMyRole(null);
      setMyAudioUrl('');
      setMyTrackTitle('');
      setAlivePlayers([]);
      setMyVote(null);
      setVotersList([]);
      setRoundResult(null);
      setGameOverResult(null);
      setIsPlaying(false);
      setAudioProgress(0);
      setHasListened(false);
    });

    socket.on('error', payload => {
      const code = payload?.code;
      const msg = typeof payload === 'string' ? payload : (code === 'ROOM_NOT_FOUND' ? 'Room not found' : 'Unknown error');
      showModal('Error', msg);
      if (code === 'ROOM_NOT_FOUND') setCookie('active_room_code_music', '', -1);
    });

    socket.on('connect', () => console.log('[Music] Socket connected:', socket.id));
    socket.on('disconnect', () => console.log('[Music] Socket disconnected'));

    return () => {
      ['room-created','join-success','player-update','settings-updated','game-started',
       'room-state-update','vote-update','round-ended','game-over','return-to-waiting',
       'error','connect','disconnect'].forEach(e => socket.off(e));
    };
  }, [userId]);

  // Audio progress tracking
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          setAudioProgress(audioRef.current.currentTime);
          setAudioDuration(audioRef.current.duration || 0);
        }
      }, 100);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying]);

  // Handlers
  const handleConfirmName = () => {
    const id = userId || crypto.randomUUID();
    setUserId(id);
    setCookie('user_info', { name: userName, id }, 30);
    setGameState('MENU');
    connectSocket();
  };

  const handleStartHost = () => {
    setIsHost(true);
    socket.emit('create-room', {
      userData: { name: userName, userId },
      settings: { spyCount: 2, whiteboardCount: 1, surpriseMode: false, gameType: 'music' }
    });
  };

  const handleJoinGame = () => {
    if (gameCode.length === 4) {
      socket.emit('join-room', { gameCode: gameCode.toUpperCase(), userData: { name: userName, userId } });
    }
  };

  const handleLeaveRoom = () => {
    showModal('Notice', 'Are you sure you want to leave the room?', () => {
      socket.emit('leave-room', { userId, name: userName });
      setCookie('active_room_code_music', '', -1);
      setPlayers([]);
      setGameCode('');
      setIsHost(false);
      setGameState('MENU');
    }, true);
  };

  const handleExitGame = () => {
    if (['WAITING','IN_GAME','GAME_OVER'].includes(gameState)) handleLeaveRoom();
    else navigate('/');
  };

  const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      setHasListened(true);
    }
  }, [isPlaying]);

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const roleLabel = role => {
    if (role === 'SPY') return '🕵️ Spy';
    if (role === 'WHITEBOARD') return '⬜ Blank';
    return '👤 Civilian';
  };

  const formatTime = s => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Renders ──────────────────────────────────────────────────────────────
  const renderModal = () => (
    <AnimatePresence>
      {modal.isOpen && (
        <div className="modal-overlay">
          <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}} className="modal-content glass-card">
            <h3>{modal.title}</h3>
            <p>{modal.message}</p>
            <div className="modal-actions">
              {modal.showCancel && <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>}
              <button className="btn btn-primary" onClick={() => { if (modal.onConfirm) modal.onConfirm(); closeModal(); }}>OK</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderNameInput = () => (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="setup-card glass-card">
      <div className="music-icon-big">🎵</div>
      <h2>Enter Your Nickname</h2>
      <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="e.g., Alex" className="game-input" onKeyDown={e => e.key==='Enter' && userName.trim() && handleConfirmName()} />
      <button className="btn btn-primary btn-lg" disabled={!userName.trim()} onClick={handleConfirmName}>Confirm</button>
    </motion.div>
  );

  const renderMenu = () => (
    <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="menu-grid">
      <div className="menu-card glass-card" onClick={handleStartHost}>
        <div className="menu-icon">👑</div>
        <h3>Host Game</h3>
        <p>Create a new music room</p>
      </div>
      <div className="menu-card glass-card" onClick={() => setGameState('JOIN')}>
        <div className="menu-icon">🤝</div>
        <h3>Join Game</h3>
        <p>Enter a room code to join</p>
      </div>
    </motion.div>
  );

  const renderJoinInput = () => (
    <motion.div initial={{opacity:0,x:-50}} animate={{opacity:1,x:0}} className="setup-card glass-card">
      <h2>Enter Room Code</h2>
      <input type="text" maxLength={4} value={gameCode} onChange={e => setGameCode(e.target.value.toUpperCase())} placeholder="4-letter code" className="game-input code-input" />
      <div className="config-actions">
        <button className="btn btn-secondary" onClick={() => setGameState('MENU')}>Back</button>
        <button className="btn btn-primary" onClick={handleJoinGame} disabled={gameCode.length < 4}>Join</button>
      </div>
    </motion.div>
  );

  const renderWaitingRoom = () => (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="waiting-container">
      <div className="room-header glass-card">
        <div className="code-display"><span>Room Code</span><h3>{gameCode}</h3></div>
        <div className="player-stats">{players.length} player(s) joined</div>
      </div>
      <div className="player-list">
        {players.map((p, i) => {
          const timeLeft = p.isDisconnected && p.timeoutAt ? Math.max(0, Math.floor((p.timeoutAt - Date.now()) / 1000)) : null;
          return (
            <motion.div key={i} initial={{scale:0}} animate={{scale:1}} className={`player-badge glass-card ${p.isMe?'me':''} ${p.isDisconnected?'disconnected':''}`}>
              <div className="player-info">{p.name} {p.isHost && '👑'}</div>
              {p.isDisconnected && <div className="disconnect-status"><span>🔌</span><span>{timeLeft}s</span></div>}
            </motion.div>
          );
        })}
      </div>
      {isHost && (
        <div className="host-config-section glass-card animate-fade-in">
          <h4>🎵 Music Game Settings</h4>
          <div className="config-grid">
            <div className="config-item">
              <label>Spies: {spyCount}</label>
              <div className="counter small">
                <button onClick={() => { const n=Math.max(1,spyCount-1); setSpyCount(n); socket.emit('update-settings',{gameCode,settings:{spyCount:n}}); }}>-</button>
                <span>{spyCount}</span>
                <button onClick={() => { const n=Math.min(Math.max(1,players.length-2),spyCount+1); setSpyCount(n); socket.emit('update-settings',{gameCode,settings:{spyCount:n}}); }}>+</button>
              </div>
            </div>
            <div className="config-item">
              <label>Blanks: {whiteboardCount}</label>
              <div className="counter small">
                <button onClick={() => { const n=Math.max(0,whiteboardCount-1); setWhiteboardCount(n); socket.emit('update-settings',{gameCode,settings:{whiteboardCount:n}}); }}>-</button>
                <span>{whiteboardCount}</span>
                <button onClick={() => { const n=Math.min(2,whiteboardCount+1); setWhiteboardCount(n); socket.emit('update-settings',{gameCode,settings:{whiteboardCount:n}}); }}>+</button>
              </div>
            </div>
            <div className="config-item toggle-inline">
              <label>Surprise Mode</label>
              <input type="checkbox" checked={surpriseMode} onChange={e => { setSurpriseMode(e.target.checked); socket.emit('update-settings',{gameCode,settings:{surpriseMode:e.target.checked}}); }} />
            </div>
          </div>
        </div>
      )}
      <div className="room-footer">
        {isHost ? (
          <div className="host-actions">
            <button className="btn btn-primary btn-lg" disabled={players.length < 3} onClick={() => socket.emit('start-game',{gameCode})}>
              Start Game ({players.length}/3+)
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleLeaveRoom}>Leave Room</button>
          </div>
        ) : (
          <div className="waiting-footer">
            <div className="waiting-msg">Waiting for host to start...</div>
            <button className="btn btn-secondary" onClick={handleLeaveRoom}>Leave Room</button>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderInGame = () => {
    const progressPct = audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0;
    const isWhiteboard = myRole === 'WHITEBOARD';
    return (
      <motion.div initial={{opacity:0}} animate={{opacity:1}} className="ingame-container">
        <div className="room-header glass-card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3>🎵 Music Edition</h3>
          <p>Alive: {alivePlayers.length}/{players.length}</p>
        </div>

        {/* Audio Player Card - no role shown, everyone sees the same UI */}
        <div className="music-player-card glass-card">
          {myAudioUrl && <audio ref={audioRef} src={myAudioUrl} onEnded={handleAudioEnded} preload="auto" />}

          {isWhiteboard ? (
            <div className="whiteboard-message">
              <div style={{fontSize:'3rem'}}>🎵</div>
              <p style={{color:'var(--text-muted)',marginTop:'10px'}}>No music assigned to you this round.</p>
              <p style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.4)',marginTop:'5px'}}>Listen to others talk about their song.</p>
            </div>
          ) : (
            <>
              <div className="music-visualizer" style={{opacity: isPlaying ? 1 : 0.3}}>
                {[...Array(12)].map((_,i) => (
                  <div key={i} className="bar" style={{animationDelay:`${i*0.1}s`, animationPlayState: isPlaying?'running':'paused'}} />
                ))}
              </div>
              <div className="music-track-hint">
                {hasListened ? (isPlaying ? '♪ Playing...' : '⏸ Paused') : '🎧 Press to listen to your song'}
              </div>
              <button className={`music-play-btn ${isPlaying?'playing':''}`} onClick={toggleAudio}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div className="music-progress-bar">
                <div className="music-progress-fill" style={{width:`${progressPct}%`}} />
              </div>
              <div className="music-time">
                {formatTime(audioProgress)} / {formatTime(audioDuration)}
              </div>
              <p style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.4)',marginTop:'8px'}}>
                {hasListened ? 'You can replay anytime' : 'Only you can hear this — listen carefully!'}
              </p>
            </>
          )}
        </div>

        {/* Voting */}
        <div className="voting-section glass-card">
          <h4>Vote to Eliminate</h4>
          <div className="player-list voting-list" style={{marginTop:'15px'}}>
            {players.map((p, i) => {
              const isMe = p.userId === userId;
              const isAlive = alivePlayers.includes(p.userId);
              const hasVoted = votersList.includes(userId);
              return (
                <div key={i} className={`player-badge glass-card ${!isAlive?'eliminated':''}`} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:myVote===p.userId?'rgba(79,70,229,0.3)':'',opacity:isAlive?1:0.5}}>
                  <span style={{textDecoration:!isAlive?'line-through':'none'}}>
                    {p.name} {isMe && '(me)'}
                    {!isAlive && <span style={{color:'#ff4d4f',marginLeft:'5px'}}>[Out]</span>}
                  </span>
                  {isAlive && !isMe && alivePlayers.includes(userId) && (
                    <button className="btn btn-primary btn-sm" disabled={hasVoted} onClick={() => { setMyVote(p.userId); socket.emit('submit-vote',{gameCode,targetUserId:p.userId,myUserId:userId}); }}>
                      {hasVoted ? (myVote===p.userId?'✓ Voted':'...') : 'Vote Out'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {votersList.includes(userId) && !roundResult && (
            <div className="waiting-msg" style={{marginTop:'15px',textAlign:'center'}}>
              Waiting for others... ({votersList.length}/{alivePlayers.length})
            </div>
          )}
        </div>

        {/* Round Result Modal */}
        <AnimatePresence>
          {roundResult && !gameOverResult && (
            <div className="modal-overlay">
              <motion.div initial={{scale:0.9}} animate={{scale:1}} className="modal-content glass-card">
                <h3>Round Results</h3>
                {roundResult.eliminatedUserId ? (
                  <div>
                    <h4 style={{color:'#ff4d4f',fontSize:'1.5em'}}>{roundResult.eliminatedName}</h4>
                    <p>received the most votes and was eliminated!</p>
                    <p style={{marginTop:'10px'}}>Their role: <strong>{roleLabel(roundResult.eliminatedRole)}</strong></p>
                  </div>
                ) : <p>No one was eliminated this round!</p>}
                {isHost && <button className="btn btn-primary" style={{marginTop:'20px',width:'100%'}} onClick={() => setRoundResult(null)}>Next Round</button>}
                {!isHost && <p style={{marginTop:'20px',color:'var(--text-muted)'}}>Waiting for host...</p>}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderGameOver = () => (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="ingame-container">
      <div className="room-header glass-card" style={{textAlign:'center'}}>
        <h2 style={{color:gameOverResult?.winner==='SPIES'?'#ff4d4f':'#10b981',fontSize:'2em'}}>
          {gameOverResult?.winner==='SPIES' ? '🕵️ Spies Win!' : '🎉 Civilians Win!'}
        </h2>
      </div>
      <div className="glass-card" style={{marginTop:'20px',padding:'25px'}}>
        <h3>🎵 Final Reveal</h3>
        <div style={{marginTop:'15px',display:'flex',flexDirection:'column',gap:'10px'}}>
          {gameOverResult?.players.map((p,i) => (
            <div key={i} className="player-badge glass-card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{p.name} {p.userId===userId?'(me)':''}</span>
              <div style={{textAlign:'right'}}>
                <span style={{fontWeight:'bold',color:p.role==='SPY'?'#ff4d4f':'#10b981'}}>{roleLabel(p.role)}</span>
                <div style={{fontSize:'0.85em',color:'rgba(255,255,255,0.6)'}}>🎵 {p.word || 'Silence'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isHost && (
        <div style={{marginTop:'30px',textAlign:'center'}}>
          <button className="btn btn-primary btn-lg" onClick={() => socket.emit('play-again',{gameCode})}>Play Again</button>
        </div>
      )}
      {!isHost && <div className="waiting-msg" style={{marginTop:'30px',textAlign:'center'}}>Waiting for host to start a new round...</div>}
    </motion.div>
  );

  return (
    <div className="spy-container">
      <nav className="game-nav animate-fade-in">
        <button className="btn btn-secondary" onClick={handleExitGame}>← Exit Game</button>
        {userName && <div className="user-profile glass-card">👤 {userName}</div>}
        <div className="game-badge glass-card">🎵 Music Edition</div>
      </nav>
      <main className="game-layout">
        <AnimatePresence mode="wait">
          {gameState==='NAME' && renderNameInput()}
          {gameState==='MENU' && renderMenu()}
          {gameState==='JOIN' && renderJoinInput()}
          {gameState==='WAITING' && renderWaitingRoom()}
          {gameState==='IN_GAME' && renderInGame()}
          {gameState==='GAME_OVER' && renderGameOver()}
        </AnimatePresence>
      </main>
      {renderModal()}
      <style dangerouslySetInnerHTML={{ __html: `
        .music-icon-big { font-size: 4rem; margin-bottom: 10px; }
        .game-badge { padding: 8px 16px; font-weight: 600; border-radius: 50px; font-size: 0.9rem; background: rgba(236,72,153,0.15); border-color: rgba(236,72,153,0.3); }
        .music-player-card { padding: 30px; margin: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .music-player-header { width: 100%; display: flex; justify-content: center; }
        .music-role-badge { padding: 8px 20px; border-radius: 50px; font-weight: 700; font-size: 1rem; }
        .whiteboard-message { text-align: center; padding: 20px 0; }
        .music-visualizer { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
        .music-visualizer .bar { width: 6px; border-radius: 3px; background: linear-gradient(to top, var(--primary), var(--secondary)); animation: equalize 0.8s ease-in-out infinite alternate; }
        .music-visualizer .bar:nth-child(1)  { height: 20px; } .music-visualizer .bar:nth-child(2)  { height: 45px; }
        .music-visualizer .bar:nth-child(3)  { height: 30px; } .music-visualizer .bar:nth-child(4)  { height: 55px; }
        .music-visualizer .bar:nth-child(5)  { height: 25px; } .music-visualizer .bar:nth-child(6)  { height: 50px; }
        .music-visualizer .bar:nth-child(7)  { height: 35px; } .music-visualizer .bar:nth-child(8)  { height: 60px; }
        .music-visualizer .bar:nth-child(9)  { height: 40px; } .music-visualizer .bar:nth-child(10) { height: 28px; }
        .music-visualizer .bar:nth-child(11) { height: 52px; } .music-visualizer .bar:nth-child(12) { height: 38px; }
        @keyframes equalize { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
        .music-track-hint { font-size: 0.95rem; color: var(--text-muted); }
        .music-play-btn { width: 80px; height: 80px; border-radius: 50%; border: none; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; font-size: 2rem; cursor: pointer; box-shadow: 0 8px 30px rgba(99,102,241,0.4); transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .music-play-btn:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(99,102,241,0.6); }
        .music-play-btn.playing { background: linear-gradient(135deg, var(--secondary), var(--primary)); }
        .music-progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
        .music-progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 3px; transition: width 0.1s linear; }
        .music-time { font-size: 0.8rem; color: var(--text-muted); }
        .voting-section { padding: 25px; }
        .voting-section h4 { color: var(--primary); margin-bottom: 5px; }
        .player-badge.eliminated { opacity: 0.5; }
        .spy-container { padding: 30px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; background: radial-gradient(circle at 30% 20%, rgba(236,72,153,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(99,102,241,0.08) 0%, transparent 50%); }
        .game-nav { width: 100%; max-width: 1200px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .user-profile { padding: 8px 16px; font-weight: 600; border-radius: 50px; font-size: 0.9rem; }
        .game-layout { width: 100%; max-width: 800px; padding: 20px; }
        .setup-card { padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
        .game-input { width: 100%; max-width: 300px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 15px 20px; border-radius: 12px; color: white; font-size: 1.2rem; font-family: inherit; text-align: center; }
        .game-input:focus { outline: none; border-color: var(--primary); background: rgba(255,255,255,0.1); }
        .code-input { letter-spacing: 10px; font-weight: 800; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; }
        .menu-card { padding: 40px; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center; }
        .menu-card:hover { transform: translateY(-10px); border-color: var(--secondary); background: rgba(236,72,153,0.1); }
        .menu-icon { font-size: 3.5rem; }
        .config-actions { display: flex; gap: 15px; margin-top: 20px; }
        .config-actions .btn { flex: 1; }
        .waiting-container { display: flex; flex-direction: column; gap: 30px; }
        .room-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; }
        .code-display span { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; }
        .code-display h3 { font-size: 2.5rem; letter-spacing: 5px; color: var(--secondary); }
        .player-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 15px; }
        .player-badge { padding: 15px; border-radius: 16px; text-align: center; font-weight: 600; }
        .player-badge.me { border-color: var(--secondary); background: rgba(236,72,153,0.1); }
        .player-badge.disconnected { opacity: 0.6; filter: grayscale(0.8); border: 1px dashed rgba(239,68,68,0.6); }
        .player-info { display: flex; align-items: center; justify-content: center; gap: 5px; }
        .disconnect-status { display: flex; flex-direction: column; align-items: center; margin-top: 8px; font-size: 0.75rem; color: rgba(239,68,68,0.8); font-weight: 700; }
        .host-config-section { padding: 20px; border: 1px solid rgba(236,72,153,0.3); background: rgba(255,255,255,0.03); }
        .host-config-section h4 { margin: 0 0 15px; color: var(--secondary); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 20px; }
        .config-item { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        .config-item label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
        .counter.small { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 12px; border: 1px solid var(--glass-border); }
        .counter.small button { width: 28px; height: 28px; border-radius: 8px; border: none; background: var(--secondary); color: white; cursor: pointer; font-size: 1.2rem; transition: transform 0.2s; }
        .counter.small button:hover { transform: scale(1.1); }
        .counter.small span { font-weight: 700; min-width: 20px; text-align: center; }
        .toggle-inline { flex-direction: row; justify-content: space-between; align-items: center; width: 100%; }
        .room-footer { text-align: center; padding: 20px; }
        .host-actions { display: flex; flex-direction: column; gap: 10px; align-items: center; }
        .waiting-footer { display: flex; flex-direction: column; align-items: center; gap: 15px; }
        .waiting-msg { font-style: italic; color: var(--text-muted); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .btn-lg { padding: 16px 40px; font-size: 1.1rem; }
        .btn-sm { padding: 6px 12px; font-size: 0.8rem; }
        .ingame-container { display: flex; flex-direction: column; gap: 20px; }
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; z-index:2000; background: rgba(15,23,42,0.7); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { width: 100%; max-width: 400px; padding: 30px; text-align: center; display: flex; flex-direction: column; gap: 20px; }
        .modal-content h3 { margin: 0; color: var(--secondary); }
        .modal-content p { margin: 0; color: var(--text-muted); line-height: 1.5; }
        .modal-actions { display: flex; gap: 12px; justify-content: center; }
        .modal-actions .btn { min-width: 100px; }
      `}} />
    </div>
  );
};

export default MusicSpyGame;
