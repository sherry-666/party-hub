const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const wordsData = require('../src/assets/spy/words_comprehensive.json');
const musicPairsData = require('./music_pairs.json');

const app = express();
app.use(cors());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, replace with your frontend URL
    methods: ['GET', 'POST']
  }
});

// Store active rooms and players
// rooms: { [gameCode]: { players: [{ id, userId, name, isHost }], settings: {} } }
const rooms = {};
const roomTimers = {};
const playerTimers = {}; // { [userId]: { timeout: timeoutId, timeoutAt: timestamp } }

// Helper to log host changes
const logHostChange = (code, oldHostId, newHostId, reason) => {
  const room = rooms[code];
  const oldHost = room?.players.find(p => p.userId === oldHostId);
  const newHost = room?.players.find(p => p.userId === newHostId);
  console.log(`[HOST_EVENT] Room ${code}: ${reason} | Host: ${oldHost?.name || 'None'} (${oldHostId || 'None'}) -> ${newHost?.name || 'None'} (${newHostId || 'None'})`);
};

// Helper to broadcast player updates
const broadcastPlayerUpdate = (code) => {
  const roomCode = String(code);
  if (rooms[roomCode]) {
    const sockets = io.sockets.adapter.rooms.get(roomCode);
    console.log(`[BROADCAST] Room ${roomCode}: ${rooms[roomCode].players.length} players | ${sockets ? sockets.size : 0} sockets connected`);
    io.to(roomCode).emit('player-update', rooms[roomCode].players);
  }
};

// Helper to remove user from all rooms (Manual Leave or Kick)
// excludeCode: prevent removal from a room if we are just rejoining it
const removeFromAllRooms = (userId, excludeCode = null) => {
  for (const code in rooms) {
    if (String(code) === String(excludeCode)) {
      console.log(`[TRACE] Skipping removal of ${userId} from room ${code} (is current room)`);
      continue;
    }

    const playerIndex = rooms[code].players.findIndex(p => p.userId === userId);
    if (playerIndex !== -1) {
      const oldHostId = rooms[code].hostUserId;
      const isLeavingHost = oldHostId === userId;
      const playerName = rooms[code].players[playerIndex].name;
      
      console.log(`[TRACE] Removing player ${playerName} (${userId}) from room ${code}. Was host: ${isLeavingHost}`);
      rooms[code].players.splice(playerIndex, 1);
      
      // Clear any pending disconnect timers for this player
      if (playerTimers[userId]) {
        console.log(`[TRACE] Clearing disconnect timer for ${userId} during removal`);
        clearTimeout(playerTimers[userId].timeout);
        delete playerTimers[userId];
      }

      // If the host left, assign a new host from remaining players
      if (isLeavingHost && rooms[code].players.length > 0) {
        const nextActivePlayer = rooms[code].players.find(p => !p.isDisconnected) || rooms[code].players[0];
        nextActivePlayer.isHost = true;
        rooms[code].hostUserId = nextActivePlayer.userId;
        logHostChange(code, oldHostId, nextActivePlayer.userId, 'Host Permanent Departure');
      } else if (isLeavingHost) {
        console.log(`[TRACE] Room ${code}: Last player (host) removed.`);
        rooms[code].hostUserId = null;
      }

      broadcastPlayerUpdate(code);
      
      // If room is empty, start a 2-minute deletion timer
      if (rooms[code].players.length === 0 && !roomTimers[code]) {
        console.log(`[TRACE] Room ${code} is empty. Starting 2-minute expiration timer.`);
        roomTimers[code] = setTimeout(() => {
          console.log(`[TRACE] Room ${code} expired and was deleted.`);
          delete rooms[code];
          delete roomTimers[code];
        }, 120000); // 2 minutes
      }
    }
  }
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- Host Room ---
  socket.on('create-room', ({ userData, settings }) => {
    removeFromAllRooms(userData.userId);
    
    // Generate 4-character alphanumeric code (A-Z, 0-9)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded O, 0, I, 1 for clarity
    let gameCode = '';
    for (let i = 0; i < 4; i++) {
      gameCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure uniqueness (simple retry)
    if (rooms[gameCode]) {
      gameCode = '';
      for (let i = 0; i < 4; i++) {
        gameCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    if (roomTimers[gameCode]) {
      clearTimeout(roomTimers[gameCode]);
      delete roomTimers[gameCode];
    }

    rooms[gameCode] = {
      players: [{ ...userData, id: socket.id, isHost: true }],
      hostUserId: userData.userId,
      settings: settings || {},
      gameState: 'WAITING',
      gameData: null
    };

    socket.join(gameCode);
    socket.emit('room-created', { gameCode, players: rooms[gameCode].players, settings: rooms[gameCode].settings });
    console.log(`Room ${gameCode} created by ${userData.name} with settings:`, settings);
  });

  // --- Join Room ---
  socket.on('join-room', ({ gameCode, userData, gameType }) => {
    const targetRoom = String(gameCode);
    console.log(`[JOIN] User ${userData.name} (${userData.userId}) joining room ${targetRoom}`);

    if (rooms[targetRoom]) {
      // Reject joins from the wrong game mode (e.g. a word-game client trying to
      // join a music room via a shared code). Without this, the music server would
      // send the song title as `myWord` and the word client would render it as a prompt.
      const requestedType = gameType || 'word';
      const roomType = rooms[targetRoom].settings?.gameType || 'word';
      if (requestedType !== roomType) {
        console.log(`[JOIN] Rejected ${userData.name}: requested ${requestedType} room but ${targetRoom} is ${roomType}`);
        socket.emit('error', { code: 'WRONG_GAME_MODE' });
        return;
      }
    }

    // If joining a different room, remove from old ones
    removeFromAllRooms(userData.userId, targetRoom);

    if (rooms[targetRoom]) {
      // If the room was about to expire, cancel the timer
      if (roomTimers[targetRoom]) {
        clearTimeout(roomTimers[targetRoom]);
        delete roomTimers[targetRoom];
        console.log(`[TRACE] Room ${targetRoom} expiration timer canceled.`);
      }

      // Check if user is already in the room list
      const existingPlayerIndex = rooms[targetRoom].players.findIndex(p => p.userId === userData.userId);
      const isHost = userData.userId === rooms[targetRoom].hostUserId;
      
      if (existingPlayerIndex !== -1) {
        // Clear disconnect timer if any
        if (playerTimers[userData.userId]) {
          clearTimeout(playerTimers[userData.userId].timeout);
          delete playerTimers[userData.userId];
          console.log(`[TRACE] Player ${userData.name} (${userData.userId}) reconnected. Host status: ${isHost}`);
        }

        rooms[targetRoom].players[existingPlayerIndex].id = socket.id;
        rooms[targetRoom].players[existingPlayerIndex].isHost = isHost;
        rooms[targetRoom].players[existingPlayerIndex].isDisconnected = false;
        delete rooms[targetRoom].players[existingPlayerIndex].timeoutAt;
        console.log(`[TRACE] Player ${userData.name} (${userData.userId}) reconnected to ${targetRoom}. Host status: ${isHost}`);
      } else {
        rooms[targetRoom].players.push({ ...userData, id: socket.id, isHost, isDisconnected: false });
        console.log(`[TRACE] Player ${userData.name} (${userData.userId}) joined ${targetRoom} as new.`);
      }

      socket.join(targetRoom);
      broadcastPlayerUpdate(targetRoom);
      socket.emit('join-success', { gameCode: targetRoom, players: rooms[targetRoom].players, settings: rooms[targetRoom].settings });
      console.log(`[JOIN_SUCCESS] ${userData.name} in room ${targetRoom}`);
    } else {
      socket.emit('error', { code: 'ROOM_NOT_FOUND' });
    }
  });

  // --- Update Settings ---
  socket.on('update-settings', ({ gameCode, settings }) => {
    if (rooms[gameCode] && socket.id === rooms[gameCode].players.find(p => p.isHost)?.id) {
      rooms[gameCode].settings = { ...rooms[gameCode].settings, ...settings };
      io.to(gameCode).emit('settings-updated', rooms[gameCode].settings);
      console.log(`Settings updated for room ${gameCode}:`, settings);
    }
  });

  // --- Leave Room ---
  socket.on('leave-room', (userData) => {
    removeFromAllRooms(userData.userId);
    socket.leaveAll();
    console.log(`${userData.name} left all rooms`);
  });

  // --- Game Flow Methods ---

  const tallyVotes = (gameCode) => {
    const room = rooms[gameCode];
    if (!room || !room.gameData) return;

    const votes = room.gameData.votes;
    const tallies = {};
    let maxVotes = 0;
    let votedOut = [];

    Object.values(votes).forEach(target => {
      tallies[target] = (tallies[target] || 0) + 1;
      if (tallies[target] > maxVotes) {
        maxVotes = tallies[target];
        votedOut = [target];
      } else if (tallies[target] === maxVotes) {
        votedOut.push(target);
      }
    });

    // Pick one randomly if tied
    const eliminatedUserId = votedOut.length > 0 ? votedOut[Math.floor(Math.random() * votedOut.length)] : null;
    let eliminatedPlayer = null;

    if (eliminatedUserId) {
      room.gameData.alivePlayers = room.gameData.alivePlayers.filter(id => id !== eliminatedUserId);
      eliminatedPlayer = room.players.find(p => p.userId === eliminatedUserId);
      if (eliminatedPlayer) eliminatedPlayer.isAlive = false;
    }

    // Check win conditions
    const aliveSpies = room.players.filter(p => p.isAlive && p.role === 'SPY').length;
    const aliveRegulars = room.players.filter(p => p.isAlive && p.role !== 'SPY').length;

    let winner = null;
    if (aliveSpies === 0) winner = 'REGULARS';
    else if (aliveSpies >= aliveRegulars) winner = 'SPIES';

    if (winner) {
      room.gameState = 'GAME_OVER';
      io.to(gameCode).emit('game-over', {
        winner,
        eliminatedUserId,
        eliminatedRole: eliminatedPlayer ? eliminatedPlayer.role : null,
        players: room.players.map(p => ({ userId: p.userId, name: p.name, role: p.role, word: p.word }))
      });
    } else {
      // Next round
      room.gameData.votes = {};
      room.gameData.round += 1;
      io.to(gameCode).emit('round-ended', {
        eliminatedUserId,
        eliminatedName: eliminatedPlayer ? eliminatedPlayer.name : null,
        eliminatedRole: eliminatedPlayer ? eliminatedPlayer.role : null,
        alivePlayers: room.gameData.alivePlayers,
        votesRecord: votes
      });
    }
  };

  socket.on('start-game', ({ gameCode }) => {
    const room = rooms[gameCode];
    if (!room) return;
    if (socket.id !== room.players.find(p => p.isHost)?.id) return;
    if (room.players.length < 3) return;

    const gameType = room.settings.gameType || 'word';

    let spyCount = room.settings.spyCount || 1;
    let whiteboardCount = room.settings.whiteboardCount || 0;
    const totalPlayers = room.players.length;
    
    // Safety fallback
    if (spyCount + whiteboardCount >= totalPlayers) {
      spyCount = 1; whiteboardCount = 0;
    }
    
    let roles = [];
    for(let i=0; i<spyCount; i++) roles.push('SPY');
    for(let i=0; i<whiteboardCount; i++) roles.push('WHITEBOARD');
    for(let i=roles.length; i<totalPlayers; i++) roles.push('REGULAR');
    roles.sort(() => 0.5 - Math.random());

    room.gameState = 'IN_GAME';
    room.gameData = {
      votes: {},
      alivePlayers: room.players.map(p => p.userId),
      round: 1
    };

    if (gameType === 'music') {
      // --- MUSIC GAME ---
      // Pick 2 distinct songs randomly from the pool
      const songs = musicPairsData.songs;
      const shuffled = [...songs].sort(() => 0.5 - Math.random());
      const normalSong = shuffled[0];
      const spySong = shuffled[1];
      const audioBasePath = '/audio/music-spy/';
      const normalAudioUrl = audioBasePath + normalSong.file;
      const spyAudioUrl = audioBasePath + spySong.file;
      const silenceUrl = audioBasePath + 'silence.wav';

      room.players.forEach((p, idx) => {
        p.role = roles[idx];
        p.isAlive = true;
        if (p.role === 'WHITEBOARD') {
          p.audioUrl = silenceUrl;
          p.trackTitle = 'Silence';
          p.word = '';
        } else if (p.role === 'SPY') {
          p.audioUrl = spyAudioUrl;
          p.trackTitle = spySong.title;
          p.word = spySong.title;
        } else {
          p.audioUrl = normalAudioUrl;
          p.trackTitle = normalSong.title;
          p.word = normalSong.title;
        }

        io.to(p.id).emit('game-started', {
          gameState: room.gameState,
          gameType: 'music',
          myRole: p.role,
          myAudioUrl: p.audioUrl,
          myTrackTitle: p.trackTitle,
          myWord: p.word,
          alivePlayers: room.gameData.alivePlayers
        });
      });

      console.log(`[GAME] Music Room ${gameCode} started. Normal: "${normalSong.title}" (${normalSong.genre}), Spy: "${spySong.title}" (${spySong.genre}), Spies: ${spyCount}, Whiteboards: ${whiteboardCount}`);
    } else {
      // --- WORD GAME (existing behavior) ---
      const wordbankLanguage = room.settings.wordbankLanguage || 'zh';
      const availableCats = wordsData.categories.filter(c => (c.language || 'zh') === wordbankLanguage);
      const fallbackCats = availableCats.length > 0 ? availableCats : wordsData.categories;
      const selectedNames = room.settings.selectedCategories && room.settings.selectedCategories.length > 0
          ? room.settings.selectedCategories
          : fallbackCats.map(c => c.name);
      const eligible = fallbackCats.filter(c => selectedNames.includes(c.name));
      const pool = eligible.length > 0 ? eligible : fallbackCats;

      const category = pool[Math.floor(Math.random() * pool.length)];
      const catName = category.name;
      
      const wordSet = category.words[Math.floor(Math.random() * category.words.length)];
      const shuffledSet = [...wordSet].sort(() => 0.5 - Math.random());
      const normalWord = shuffledSet[0];
      const spyWord = shuffledSet[1];

      room.players.forEach((p, idx) => {
        p.role = roles[idx];
        p.word = p.role === 'WHITEBOARD' ? '' : (p.role === 'SPY' ? spyWord : normalWord);
        p.isAlive = true;
        
        io.to(p.id).emit('game-started', {
          gameState: room.gameState,
          gameType: 'word',
          myRole: p.role,
          myWord: p.word,
          alivePlayers: room.gameData.alivePlayers
        });
      });

      console.log(`[GAME] Word Room ${gameCode} started. Category: ${catName}, Spies: ${spyCount}, Whiteboards: ${whiteboardCount}`);
    }

    // Broadcast generic state change
    io.to(gameCode).emit('room-state-update', { 
      gameState: 'IN_GAME', 
      alivePlayers: room.gameData.alivePlayers 
    });
  });

  socket.on('submit-vote', ({ gameCode, targetUserId, myUserId }) => {
    const room = rooms[gameCode];
    if (!room || room.gameState !== 'IN_GAME' || !room.gameData) return;
    
    if (!room.gameData.alivePlayers.includes(myUserId)) return; // Dead cannot vote

    room.gameData.votes[myUserId] = targetUserId;
    io.to(gameCode).emit('vote-update', { voters: Object.keys(room.gameData.votes) });

    if (Object.keys(room.gameData.votes).length === room.gameData.alivePlayers.length) {
      console.log(`[GAME] Room ${gameCode}: All players voted. Tallying...`);
      tallyVotes(gameCode);
    }
  });

  socket.on('play-again', ({ gameCode }) => {
    const room = rooms[gameCode];
    if (!room) return;
    if (socket.id !== room.players.find(p => p.isHost)?.id) return;
    
    room.gameState = 'WAITING';
    room.gameData = null;
    room.players.forEach(p => { delete p.role; delete p.word; delete p.isAlive; });

    io.to(gameCode).emit('return-to-waiting');
  });

  // --- Handle Disconnection ---
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find rooms the player was in
    for (const code in rooms) {
      const playerIndex = rooms[code].players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = rooms[code].players[playerIndex];
        console.log(`Player ${player.name} disconnected from room ${code}`);
        
        // Notify others about disconnection
        io.to(code).emit('player-disconnected', player.name);
        
        // Mark player as disconnected
        player.isDisconnected = true;
        const timeoutAt = Date.now() + 120000;
        player.timeoutAt = timeoutAt;

        // Start 120s timer for removal
        if (playerTimers[player.userId]) clearTimeout(playerTimers[player.userId].timeout);
        playerTimers[player.userId] = {
          timeoutAt: timeoutAt,
          timeout: setTimeout(() => {
            console.log(`Player ${player.name} (${player.userId}) timed out. Removing from room ${code}.`);
            removeFromAllRooms(player.userId);
            delete playerTimers[player.userId];
          }, 120000)
        };
 
        broadcastPlayerUpdate(code);
 
        // If room is empty, start expiration timer (checking only for truly re-re-disconnected or empty array)
        const activeCount = rooms[code].players.length; // All players (including disconnected)
        if (activeCount === 0 && !roomTimers[code]) {
          console.log(`Room ${code} is empty after disconnect. Starting 2-minute expiration timer.`);
          roomTimers[code] = setTimeout(() => {
            console.log(`Room ${code} expired after disconnect and was deleted.`);
            delete rooms[code];
            delete roomTimers[code];
          }, 120000);
        }
      }
    }
  });
});

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, settlement) => {
  settlement.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
