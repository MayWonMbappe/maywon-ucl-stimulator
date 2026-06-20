export const EVENT_TEMPLATES = [
  {
    id: 'BUILD_PRESSURE', type: '后场出球受压', minutes: [12, 28, 52, 68],
    title: '对手开始压迫你的后场出球',
    desc: '中卫和后腰被迫在狭小空间处理球，失误会直接形成危险。',
    triggers: ['BUILD_SHORT','DEF_HIGH_PRESS'],
    options: [
      { text: '让门将和中卫继续短传，吸引压迫后找中场。', effects: { control: 2, chanceQuality: 1, counterRisk: 1 }, tags: ['press_resistant'] },
      { text: '改为混合推进，必要时直接找边路。', effects: { control: 1, transitionAttack: 1, counterRisk: -1 }, tags: ['safe'] },
      { text: '直接长传找前锋，放弃后场冒险。', effects: { control: -2, chanceCreation: 1, instantGoalChance: 3 }, tags: ['aerial'] }
    ]
  },
  {
    id: 'WIDE_CRISIS', type: '边路危机', minutes: [18, 36, 58, 77],
    title: '你的边路被连续冲击',
    desc: '对方边锋和边后卫形成二打一，你的边路防守开始吃紧。',
    options: [
      { text: '让边锋回撤协防，稳住这一侧。', effects: { defensiveStability: 3, chanceCreation: -1, staminaCost: 1 }, tags: ['safe'] },
      { text: '让中场横移保护，保持前场反击点。', effects: { defensiveStability: 1, transitionAttack: 1, control: -1 }, tags: ['balanced'] },
      { text: '不退，继续压上，赌对手身后空间。', effects: { chanceCreation: 3, counterRisk: 4, instantGoalChance: 4, instantConcedeChance: 5 }, tags: ['risk'] }
    ]
  },
  {
    id: 'CENTRAL_BLOCK', type: '中路被堵', minutes: [24, 42, 61, 83],
    title: '中路渗透被压缩',
    desc: '对手中路站位紧凑，你的前腰和中锋之间联系不顺。',
    options: [
      { text: '增加肋部短传配合，耐心寻找裂缝。', effects: { control: 2, chanceQuality: 2 }, tags: ['press_resistant'] },
      { text: '把进攻转向边路，制造传中和定位球。', effects: { chanceCreation: 2, setPieceAttack: 1 }, tags: ['wide_creator'] },
      { text: '直接把球打进禁区，争取二点球。', effects: { chanceQuality: 2, control: -2, counterRisk: 2 }, tags: ['aerial'] }
    ]
  },
  {
    id: 'WIDE_OVERLOAD', type: '边路人数优势', minutes: [16, 31, 56, 74],
    title: '你在边路形成局部人数优势',
    desc: '边锋、边后卫和中场已经把对方边路压住。',
    options: [
      { text: '继续边路耐心倒脚，等传中窗口。', effects: { control: 1, chanceCreation: 2, setPieceAttack: 1 }, tags: ['wide_creator'] },
      { text: '突然内切打肋部，寻找禁区前沿射门。', effects: { chanceQuality: 3, counterRisk: 1 }, tags: ['mobile_forward'] },
      { text: '大举压上制造围攻。', effects: { chanceCreation: 4, instantGoalChance: 5, counterRisk: 4 }, tags: ['risk'] }
    ]
  },
  {
    id: 'COUNTER_CHANCE', type: '反击机会', minutes: [9, 39, 63, 81],
    title: '你获得快速反击机会',
    desc: '对手压上后身后出现大片空间。',
    options: [
      { text: '第一时间纵向推进，找速度最快的前锋。', effects: { transitionAttack: 4, instantGoalChance: 6, counterRisk: 1 }, tags: ['pace'] },
      { text: '先控住球，等待后排跟进。', effects: { control: 2, chanceQuality: 1 }, tags: ['safe'] },
      { text: '直接远距离斜传打身后。', effects: { instantGoalChance: 5, control: -1, counterRisk: 2 }, tags: ['wide_creator'] }
    ]
  },
  {
    id: 'COUNTER_THREAT', type: '被反击威胁', minutes: [21, 44, 66, 86],
    title: '对手反击威胁正在上升',
    desc: '你的攻转守保护不足，对方前锋多次冲击中卫身后。',
    options: [
      { text: '降低边后卫压上，恢复 3-2 保护。', effects: { defensiveStability: 4, counterRisk: -3, chanceCreation: -1 }, tags: ['safe'] },
      { text: '要求后腰更早犯规破坏反击。', effects: { defensiveStability: 2, foulRisk: 3, counterRisk: -2 }, tags: ['aggressive_defense'] },
      { text: '继续压迫，争取在前场直接抢回。', effects: { pressIntensity: 3, staminaCost: 2, instantGoalChance: 3, instantConcedeChance: 5 }, tags: ['counter_press'] }
    ]
  },
  {
    id: 'STAR_MARKED', type: '核心被限制', minutes: [27, 57, 72],
    title: '你的核心球员被重点限制',
    desc: '对手安排专人贴防，核心球员接球次数明显下降。',
    options: [
      { text: '让核心回撤接球，参与组织。', effects: { control: 2, chanceCreation: 1, staminaCost: 1 }, tags: ['tempo_controller'] },
      { text: '把进攻重心转移到另一侧。', effects: { chanceCreation: 2, control: 1 }, tags: ['wide_creator'] },
      { text: '让核心频繁换位，制造盯防混乱。', effects: { chanceQuality: 3, counterRisk: 1, instantGoalChance: 4 }, tags: ['big_game'] }
    ]
  },
  {
    id: 'ATTACK_SETPIECE', type: '进攻定位球', minutes: [33, 69, 88],
    title: '你获得前场定位球机会',
    desc: '这是打破僵局或扳平比分的好机会。',
    options: [
      { text: '找后点高点。', effects: { setPieceAttack: 4, instantGoalChance: 6 }, tags: ['aerial','duel_winner'] },
      { text: '短传配合，制造二次传中。', effects: { control: 1, chanceQuality: 2, instantGoalChance: 3 }, tags: ['wide_creator'] },
      { text: '直接射门或低平球偷袭。', effects: { instantGoalChance: 5, counterRisk: 1 }, tags: ['big_game'] }
    ]
  },
  {
    id: 'DEF_SETPIECE', type: '防守定位球', minutes: [14, 47, 79],
    title: '对手获得危险定位球',
    desc: '禁区内对抗会决定这一波是否丢球。',
    options: [
      { text: '区域防守，保护门前核心区域。', effects: { setPieceDefense: 4, defensiveStability: 1 }, tags: ['safe'] },
      { text: '让最强中卫盯住对方高点。', effects: { setPieceDefense: 3, foulRisk: 1 }, tags: ['duel_winner'] },
      { text: '留两名前锋准备反击。', effects: { transitionAttack: 2, setPieceDefense: -2, instantConcedeChance: 5 }, tags: ['risk'] }
    ]
  },
  {
    id: 'YELLOW_RISK', type: '黄牌风险', minutes: [35, 62, 82],
    title: '一名防守球员已经吃牌',
    desc: '他还在承担高强度防守任务，二黄风险上升。',
    options: [
      { text: '降低他的上抢频率。', effects: { foulRisk: -3, defensiveStability: -1 }, tags: ['safe'] },
      { text: '让队友更多保护他的区域。', effects: { foulRisk: -2, defensiveStability: 1, staminaCost: 1 }, tags: ['balanced'] },
      { text: '继续要求强硬防守。', effects: { defensiveStability: 2, foulRisk: 4, instantConcedeChance: 2 }, tags: ['risk'] }
    ]
  },
  {
    id: 'FATIGUE_DROP', type: '体能下降', minutes: [64, 76, 87],
    title: '你的中前场体能开始下降',
    desc: '高压迫和快速推进让部分球员动作变慢。',
    options: [
      { text: '降低节奏，保留最后阶段体能。', effects: { staminaCost: -3, control: 2, chanceCreation: -1 }, tags: ['endurance_engine'] },
      { text: '换上体能更好的球员。', effects: { staminaCost: -2, chanceCreation: 1, defensiveStability: 1 }, tags: ['substitution'] },
      { text: '继续高强度冲击。', effects: { chanceCreation: 3, staminaCost: 3, instantGoalChance: 3, instantConcedeChance: 4 }, tags: ['risk'] }
    ]
  },
  {
    id: 'SCORE_PRESSURE', type: '比分压力', minutes: [71, 84, 90],
    title: '比赛进入关键阶段',
    desc: '比分形势要求你做出明确选择。',
    options: [
      { text: '优先稳住结构，避免崩盘。', effects: { defensiveStability: 3, counterRisk: -2, chanceCreation: -1 }, tags: ['safe'] },
      { text: '平衡推进，等待一次高质量机会。', effects: { control: 1, chanceQuality: 2 }, tags: ['big_game'] },
      { text: '全线压上，强行改变比分。', effects: { chanceCreation: 5, instantGoalChance: 7, counterRisk: 5, instantConcedeChance: 6 }, tags: ['risk'] }
    ]
  }
];


export const CRITICAL_MOMENT_TEMPLATES = [
  {
    id: 'CRITICAL_ONE_ON_ONE_FOR',
    isCritical: true,
    type: '关键时刻｜我方单刀',
    criticalKind: 'one_on_one_for',
    title: '我方前锋获得单刀机会',
    desc: '一次纵向传球打穿防线，前锋已经面对门将。这个选择会直接影响比分。',
    options: [
      { text: '冷静推远角，优先把握确定性。', effects: { chanceQuality: 4, instantGoalChance: 14 }, tags: ['elite_finisher','composure','big_game'] },
      { text: '横传给跟进队友，追求空门机会。', effects: { chanceCreation: 3, chanceQuality: 3, instantGoalChance: 11, counterRisk: 1 }, tags: ['creator','final_ball','balanced'] },
      { text: '挑射或爆射，赌门将站位。', effects: { chanceQuality: 5, instantGoalChance: 16, counterRisk: 2 }, tags: ['flair','risk','big_game'] }
    ]
  },
  {
    id: 'CRITICAL_ONE_ON_ONE_AGAINST',
    isCritical: true,
    type: '关键时刻｜对方单刀',
    criticalKind: 'one_on_one_against',
    title: '对方前锋获得单刀机会',
    desc: '你的防线被打穿，对方前锋已经直面门将。处理方式会直接决定是否丢球。',
    options: [
      { text: '门将果断出击，压缩射门角度。', effects: { defensiveStability: 3, instantConcedeChance: 9 }, tags: ['elite_shot_stopper','sweeper_keeper','big_game'] },
      { text: '中卫回追封内线，迫使对手打小角度。', effects: { defensiveStability: 4, instantConcedeChance: 10, staminaCost: 1 }, tags: ['pace_defender','duel_winner','safe'] },
      { text: '战术犯规破坏机会，承担任意球和吃牌风险。', effects: { defensiveStability: 2, foulRisk: 6, instantConcedeChance: 6, counterRisk: 1 }, tags: ['aggressive_defense','risk'] }
    ]
  },
  {
    id: 'CRITICAL_PENALTY_FOR',
    isCritical: true,
    type: '关键时刻｜我方点球',
    criticalKind: 'penalty_for',
    title: '我方获得点球',
    desc: '裁判指向十二码点。点球主罚方式会被终结能力、大场面和心理属性影响。',
    options: [
      { text: '让头号射手主罚，选择稳妥角度。', effects: { chanceQuality: 5, instantGoalChance: 18 }, tags: ['elite_finisher','finisher','big_game'] },
      { text: '让心理最稳的球员主罚，等待门将先动。', effects: { chanceQuality: 4, instantGoalChance: 16 }, tags: ['composure','mentality','big_game'] },
      { text: '选择勺子点球或非常规节奏，追求心理压制。', effects: { chanceQuality: 6, instantGoalChance: 17, counterRisk: 1 }, tags: ['flair','risk','big_game'] }
    ]
  },
  {
    id: 'CRITICAL_PENALTY_AGAINST',
    isCritical: true,
    type: '关键时刻｜对方点球',
    criticalKind: 'penalty_against',
    title: '对方获得点球',
    desc: '对手站上点球点。你的门将策略和门线能力会决定这次危机。',
    options: [
      { text: '门将研究习惯后提前判断方向。', effects: { defensiveStability: 3, instantConcedeChance: 10 }, tags: ['elite_shot_stopper','big_game'] },
      { text: '门将坚持到最后一刻再扑，避免被假动作骗过。', effects: { defensiveStability: 2, instantConcedeChance: 11 }, tags: ['shot_stopper','composure','balanced'] },
      { text: '尝试心理干扰，制造对方主罚犹豫。', effects: { defensiveStability: 1, foulRisk: 1, instantConcedeChance: 9 }, tags: ['mentality','risk'] }
    ]
  },
  {
    id: 'CRITICAL_KEY_INJURY',
    isCritical: true,
    type: '关键时刻｜核心伤退',
    criticalKind: 'key_injury',
    title: '我方重要球员疑似伤退',
    desc: '一名关键球员无法继续坚持。你必须决定如何换人或变阵。',
    options: [
      { text: '对位换人，尽量保持原战术结构。', effects: { defensiveStability: 2, control: 1, staminaCost: -1 }, tags: ['substitution','safe'] },
      { text: '借机变阵，补强中场控制。', effects: { control: 3, chanceCreation: -1, defensiveStability: 1 }, tags: ['tempo_controller','balanced'] },
      { text: '换上进攻球员，接受结构风险继续抢分。', effects: { chanceCreation: 3, instantGoalChance: 5, counterRisk: 3, defensiveStability: -1 }, tags: ['risk','mobile_forward'] }
    ]
  }
];
