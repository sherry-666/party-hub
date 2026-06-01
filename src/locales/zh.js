const zh = {
  common: {
    confirm: '确定',
    cancel: '取消',
    back: '返回',
    notice: '提示',
    error: '错误',
  },

  toggle: {
    zh: '中',
    en: 'EN',
    ariaLabel: '切换语言',
  },

  home: {
    title1: '聚会',
    title2: '中心',
    subtitle: '数字聚会游戏的终极目的地。',
    startNow: '立即开始',
    comingSoon: '敬请期待',
    spyTitle: '谁是卧底',
    spyDesc: '在经典的推理与欺骗游戏中揭开潜伏在你们中间的卧底。',
    musicSpyTitle: '谁是卧底：音乐版',
    musicSpyDesc: '卧底听到的是不同的音乐。你能猜出谁在听不一样的歌吗？',
    undercoverTitle: '卧底 (Undercover)',
    undercoverDesc: '节奏快速的词项关联游戏，适合多人聚会。',
    drawTitle: '你画我猜',
    drawDesc: '展示你的创意并猜出别人的绘画内容。',
  },

  spy: {
    nav: {
      exit: '← 退出游戏',
    },

    name: {
      heading: '请输入您的昵称',
      placeholder: '例如：王小明',
    },

    menu: {
      hostTitle: '主持游戏',
      hostDesc: '立即创建一个新房间',
      joinTitle: '加入游戏',
      joinDesc: '通过房间代码进入现有游戏',
    },

    config: {
      heading: '游戏配置',
      totalPlayers: '总人数: {count}',
      spyCount: '卧底人数: {count}',
      whiteboardCount: '白板人数: {count}',
      surpriseMode: '惊喜模式 (Surprise Mode)',
      createRoom: '创建房间',
    },

    join: {
      heading: '输入房间代码',
      placeholder: '4位代码',
      join: '加入',
    },

    waiting: {
      roomCodeLabel: '房间代码',
      playersJoined: '{count} 玩家已加入',
      welcomeBack: '欢迎回来!',
      configHeading: '游戏配置',
      spy: '卧底: {count}',
      whiteboard: '白板: {count}',
      surpriseMode: '惊喜模式',
      wordbankButton: '词库（已选 {selected}/{total}）',
      startGame: '开始游戏 ({count}/3+)',
      leaveRoom: '退出房间',
      leaveRoomAlt: '离开房间',
      waitingHost: '等待房主开始游戏...',
      leaveConfirm: '确定要离开房间吗？',
      reconnectTimer: '{seconds}秒',
    },

    wordbank: {
      title: '选择词库 ({selected}/{total})',
      instruction: '请勾选你想在本局游戏中使用的词库分类（至少选1个）。',
      groupCount: '({count}组)',
      done: '完成选择',
      languageLabel: '词库语言',
      languageZh: '中文',
      languageEn: 'English',
    },

    game: {
      heading: '游戏中',
      alive: '存活: {alive}/{total}',
      blindSpy: '（盲盒卧底）',
      whiteboardWord: '无（白板）',
      scratchHint: '按住向上滑动 查看身份词',
      voteHeading: '在此投票淘汰一名玩家',
      me: '(我)',
      eliminated: '[已淘汰]',
      voteEliminate: '投票淘汰',
      voted: '已投',
      waitingVote: '等待',
      waitingOthers: '你已投票，等待其他人... ({voted}/{total})',
      roundOverTitle: '本轮投票结束',
      eliminatedSuffix: '得票最高，惨遭淘汰！',
      revealRole: 'TA 的身份是：{role}',
      noElimination: '本轮居然没有人被淘汰！',
      nextRound: '进入下一轮继续投票',
      waitingNextRound: '等待房主开启下一轮...',
    },

    over: {
      spiesWin: '卧底阵营 胜利！',
      civiliansWin: '平民阵营 胜利！',
      finalReveal: '最终身份大揭晓',
      wordLabel: '词语: {word}',
      noWord: '无',
      playAgain: '再来一局',
      waitingHost: '游戏结束，等待房主再次开局...',
    },

    role: {
      spy: '卧底',
      whiteboard: '白板',
      regular: '平民',
    },
  },

  errors: {
    roomNotFound: '房间号不存在',
    unknown: '发生未知错误',
  },
};

export default zh;
