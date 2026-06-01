const en = {
  common: {
    confirm: 'OK',
    cancel: 'Cancel',
    back: 'Back',
    notice: 'Notice',
    error: 'Error',
  },

  toggle: {
    zh: '中',
    en: 'EN',
    ariaLabel: 'Switch language',
  },

  home: {
    title1: 'Party',
    title2: 'Hub',
    subtitle: 'Your ultimate destination for digital party games.',
    startNow: 'Start Now',
    comingSoon: 'Coming Soon',
    spyTitle: 'Who is the Spy',
    spyDesc: 'Uncover the spy hidden among you in this classic game of deduction and deception.',
    musicSpyTitle: "Who's the Spy: Music",
    musicSpyDesc: 'The spy hears a different song. Can you figure out who\'s listening to something else?',
    undercoverTitle: 'Undercover',
    undercoverDesc: 'A fast-paced word-association game perfect for larger groups.',
    drawTitle: 'Draw & Guess',
    drawDesc: 'Show off your creativity and guess what others are drawing.',
  },

  spy: {
    nav: {
      exit: '← Exit Game',
    },

    name: {
      heading: 'Enter your nickname',
      placeholder: 'e.g., Alex',
    },

    menu: {
      hostTitle: 'Host Game',
      hostDesc: 'Create a new room instantly',
      joinTitle: 'Join Game',
      joinDesc: 'Enter an existing game with a room code',
    },

    config: {
      heading: 'Game Settings',
      totalPlayers: 'Players: {count}',
      spyCount: 'Spies: {count}',
      whiteboardCount: 'Blanks: {count}',
      surpriseMode: 'Surprise Mode',
      createRoom: 'Create Room',
    },

    join: {
      heading: 'Enter Room Code',
      placeholder: '4-letter code',
      join: 'Join',
    },

    waiting: {
      roomCodeLabel: 'Room Code',
      playersJoined: '{count} player(s) joined',
      welcomeBack: 'Welcome back!',
      configHeading: 'Game Settings',
      spy: 'Spies: {count}',
      whiteboard: 'Blanks: {count}',
      surpriseMode: 'Surprise Mode',
      wordbankButton: 'Word Bank ({selected}/{total} selected)',
      startGame: 'Start Game ({count}/3+)',
      leaveRoom: 'Leave Room',
      leaveRoomAlt: 'Leave Room',
      waitingHost: 'Waiting for host to start...',
      leaveConfirm: 'Are you sure you want to leave the room?',
      reconnectTimer: '{seconds}s',
    },

    wordbank: {
      title: 'Choose Word Banks ({selected}/{total})',
      instruction: 'Pick the word-bank categories to use this round (at least 1).',
      groupCount: '({count} sets)',
      done: 'Done',
      languageLabel: 'Word Bank Language',
      languageZh: '中文',
      languageEn: 'English',
    },

    game: {
      heading: 'In Game',
      alive: 'Alive: {alive}/{total}',
      blindSpy: '(Blind Spy)',
      whiteboardWord: 'None (Blank)',
      scratchHint: 'Hold and swipe up to reveal your word',
      voteHeading: 'Vote to eliminate a player',
      me: '(me)',
      eliminated: '[Eliminated]',
      voteEliminate: 'Vote Out',
      voted: 'Voted',
      waitingVote: 'Waiting',
      waitingOthers: 'Vote cast, waiting for others... ({voted}/{total})',
      roundOverTitle: 'Round Results',
      eliminatedSuffix: 'received the most votes and was eliminated!',
      revealRole: 'Their role was: {role}',
      noElimination: 'No one was eliminated this round!',
      nextRound: 'Start Next Round',
      waitingNextRound: 'Waiting for host to start the next round...',
    },

    over: {
      spiesWin: 'The Spies Win!',
      civiliansWin: 'The Civilians Win!',
      finalReveal: 'Final Roles Revealed',
      wordLabel: 'Word: {word}',
      noWord: 'None',
      playAgain: 'Play Again',
      waitingHost: 'Game over. Waiting for host to start a new round...',
    },

    role: {
      spy: 'Spy',
      whiteboard: 'Blank',
      regular: 'Civilian',
    },
  },

  errors: {
    roomNotFound: 'Room code not found',
    unknown: 'An unknown error occurred',
  },
};

export default en;
