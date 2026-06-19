export const EFFECT_LABELS = {
  control: '控球掌控',
  chanceCreation: '机会产量',
  chanceQuality: '机会质量',
  transitionAttack: '反击威胁',
  defensiveStability: '防守稳定',
  counterRisk: '被反击风险',
  staminaCost: '体能消耗',
  pressIntensity: '压迫强度',
  setPieceAttack: '定位球进攻',
  setPieceDefense: '定位球防守',
  foulRisk: '犯规/吃牌风险',
  instantGoalChance: '即时进球机会',
  instantConcedeChance: '即时丢球风险'
};

export const TRAIT_INFO = {
  aerial: { label: '空中优势', gain: '可在传中、长传和定位球选择中触发；对应关键抉择通常获得定位球进攻 +1。' },
  aerial_reach: { label: '制空范围', gain: '提升门前高球覆盖，适合防守定位球和高空球处理。' },
  b2b_engine: { label: 'B2B 跑动', gain: '增强往返覆盖和后排插上，适合高节奏与攻防转换。' },
  between_lines: { label: '线间接球', gain: '提升中路渗透与肋部接应，适合破解密集防守。' },
  big_game: { label: '大场面', gain: '关键抉择带有“大场面”标签时，机会质量 +1；同时即时进球判定略有加成。' },
  box_crasher: { label: '禁区冲击', gain: '增加后排插入禁区威胁，适合直接冲击禁区的选择。' },
  complete_forward: { label: '全能前锋', gain: '兼顾支点、终结和串联，提升多类进攻选择的稳定性。' },
  composure: { label: '冷静处理', gain: '减少高压下失误，适合小空间出球和关键球处理。' },
  creator: { label: '创造核心', gain: '增强传威胁球能力，适合控球组织和高质量机会制造。' },
  cut_inside: { label: '内切威胁', gain: '适合边路内切和肋部射门，提升机会质量倾向。' },
  distribution: { label: '出球能力', gain: '提升门将/后卫向前出球质量，适合短传出球和混合推进。' },
  dribbler: { label: '盘带突破', gain: '提升一对一突破成功率，适合边路和肋部破局。' },
  duel: { label: '身体对抗', gain: '提升基础对抗能力，适合中后场防守和二点球争夺。' },
  duel_winner: { label: '对抗强点', gain: '关键抉择带有“对抗强点”标签时，定位球防守 +1。' },
  elite_creator: { label: '顶级创造者', gain: '显著提升最后一传与机会质量，适合围攻和中路渗透。' },
  elite_dribbler: { label: '顶级盘带', gain: '显著提升单点爆破能力，适合边路强攻和肋部突破。' },
  elite_finisher: { label: '顶级终结', gain: '即时进球判定获得额外加成，越多顶级终结点越容易把 xG 转化为进球。' },
  elite_shot_stopper: { label: '顶级扑救', gain: '提升门线救险能力，降低高质量机会转化率。' },
  endurance_engine: { label: '体能引擎', gain: '体能下降事件中更适合维持节奏，相关选择可获得控球 +1。' },
  engine: { label: '跑动覆盖', gain: '提升持续压迫和回防能力，适合高强度体系。' },
  experience: { label: '比赛经验', gain: '提升关键阶段稳定性，适合控制节奏和保护领先。' },
  final_ball: { label: '最后一传', gain: '提升传中、直塞和二次传中质量，适合制造高质量机会。' },
  finisher: { label: '终结能力', gain: '即时进球判定小幅加成，帮助把中途机会转化为比分变化。' },
  finishing: { label: '射门终结', gain: '提升射门转化稳定性，适合禁区直接冲击。' },
  flair: { label: '灵气创造', gain: '提升非常规破局能力，适合僵局和密集防守。' },
  inside_forward: { label: '内锋属性', gain: '适合边路内切和禁区攻击，提升射门参与度。' },
  late_runner: { label: '后排插上', gain: '提升禁区二点和后插上威胁，适合围攻局面。' },
  leader: { label: '领袖气质', gain: '提升关键阶段稳定性，适合逆风和压力场景。' },
  left_channel: { label: '左路通道', gain: '适合左侧推进与左肋配合，提升局部进攻方向价值。' },
  link_play: { label: '前场串联', gain: '提升中锋回撤和前场连续配合质量。' },
  long_shot: { label: '远射威胁', gain: '适合禁区外寻找射门窗口，破解低位防守。' },
  mentality: { label: '心理韧性', gain: '提升逆风和淘汰赛关键阶段稳定性。' },
  mobile_forward: { label: '机动前锋', gain: '关键抉择带有“机动前锋”标签时，如阵中具备该类球员，机会质量 +1。' },
  movement: { label: '无球跑动', gain: '提升跑位牵制和接应质量，适合反击和肋部组合。' },
  off_ball: { label: '无球意识', gain: '提升禁区接应和反越位威胁。' },
  one_v_one: { label: '一对一', gain: '适合边路单挑和快攻终结。' },
  overlap: { label: '套边插上', gain: '提升边后卫/翼卫参与进攻的宽度价值。' },
  pace: { label: '速度冲击', gain: '关键抉择带有“速度冲击”标签时，反击威胁 +1。' },
  pace_defender: { label: '速度型后卫', gain: '提升回追和防反覆盖能力，降低身后球风险。' },
  passing: { label: '传球能力', gain: '提升整体传控稳定性，适合控球和组织选择。' },
  positioning: { label: '位置感', gain: '提升防守站位和协防稳定性。' },
  power: { label: '力量冲击', gain: '提升身体对抗和禁区冲击表现。' },
  press_resistant: { label: '抗压出球', gain: '关键抉择带有“抗压出球”标签时，机会质量 +1。' },
  pressing: { label: '压迫能力', gain: '适合高位压迫和丢球即反抢；相关选择可提升压迫强度/机会产量。' },
  pressing_forward: { label: '压迫前锋', gain: '提升前场逼抢质量，适合前场直接抢回球权。' },
  run_in_behind: { label: '反越位前插', gain: '提升身后球和反击威胁，适合快速纵向打法。' },
  set_piece_threat: { label: '定位球威胁', gain: '提升前场定位球得分潜力，适合后点和直接攻门。' },
  short_passing: { label: '短传配合', gain: '提升小范围传递质量，适合耐心渗透。' },
  shot_stopper: { label: '门线扑救', gain: '提升常规扑救能力，适合面对高射门压力。' },
  sweeper_keeper: { label: '清道夫门将', gain: '提升身后空间覆盖，适合高位防线。' },
  target_forward: { label: '支点中锋', gain: '提升长传、二点和禁区支点价值。' },
  tempo_controller: { label: '节奏控制器', gain: '关键抉择带有“节奏控制器”标签时，控球掌控 +1。' },
  transition_threat: { label: '转换威胁', gain: '提升攻守转换速度，适合反击机会。' },
  two_footed: { label: '双足能力', gain: '提升多角度处理球和射门选择。' },
  wide_creator: { label: '边路创造者', gain: '关键抉择带有“边路创造者”标签时，机会产量 +2。' },
  wide_delivery: { label: '边路传中', gain: '提升传中和二次进攻质量，适合边路人数优势。' },
  wide_support: { label: '边路支援', gain: '提升边路协防与套边配合稳定性。' },
  work_rate: { label: '高工作率', gain: '提升持续跑动、压迫和回防覆盖。' }
};

export const OPTION_TAG_INFO = {
  press_resistant: { label: '抗压出球', gain: '若首发含抗压出球球员：机会质量 +1。' },
  wide_creator: { label: '边路创造者', gain: '若首发含边路创造者：机会产量 +2。' },
  aerial: { label: '空中优势', gain: '若首发含空中优势球员：定位球进攻 +1。' },
  duel_winner: { label: '对抗强点', gain: '若首发含对抗强点：定位球防守 +1。' },
  pace: { label: '速度冲击', gain: '若首发含速度型球员：反击威胁 +1。' },
  big_game: { label: '大场面', gain: '若首发含大场面球员：机会质量 +1；即时进球判定小幅提高。' },
  mobile_forward: { label: '机动前锋', gain: '若首发含机动前锋/盘带型前锋：机会质量 +1。' },
  tempo_controller: { label: '节奏控制器', gain: '若首发含节奏控制器：控球掌控 +1。' },
  counter_press: { label: '前场反抢', gain: '若首发压迫能力强：压迫强度 +1，机会产量 +1。' },
  aggressive_defense: { label: '强硬防守', gain: '若首发对抗能力强：防守稳定 +1，但仍保留犯规风险。' },
  endurance_engine: { label: '体能引擎', gain: '若首发含体能引擎：控球掌控 +1，疲劳局面更稳。' },
  elite_finisher: { label: '顶级终结', gain: '关键时刻射门或点球时，命中率/即时进球判定明显提高。' },
    elite_shot_stopper: { label: '顶级扑救', gain: '对方单刀或点球时，门将扑救判定明显提高。' },
    composure: { label: '冷静处理', gain: '关键时刻降低慌乱概率，点球和单刀处理更稳。' },
    creator: { label: '创造核心', gain: '关键时刻选择横传或最后一传时，提高机会质量。' },
    final_ball: { label: '最后一传', gain: '单刀横传、反击传球、二次进攻中提高助攻质量。' },
    flair: { label: '灵气创造', gain: '非常规处理在关键时刻有更高上限，但也保留波动。' },
    shot_stopper: { label: '门线扑救', gain: '对方单刀或点球时，常规扑救能力提供小幅加成。' },
    sweeper_keeper: { label: '清道夫门将', gain: '面对单刀时，出击压缩角度效果更好。' },
    pace_defender: { label: '速度型后卫', gain: '面对单刀回追时，降低被直接打穿的概率。' },
    mentality: { label: '心理韧性', gain: '点球、伤退、逆风关键时刻中，提高稳定性。' },
    substitution: { label: '换人调整', gain: '不依赖球员隐藏标签；用于降低体能风险并提高阵容新鲜度。' },
  safe: { label: '稳健方案', gain: '降低比赛波动，通常减少被反击或即时丢球风险。' },
  balanced: { label: '平衡方案', gain: '收益与风险适中，适合比分未拉开时保持结构。' },
  risk: { label: '冒险方案', gain: '提高改写比分概率，但通常伴随被反击或丢球风险。' }
};

export function traitLabel(id) {
  return TRAIT_INFO[id]?.label || id;
}

export function traitTooltip(id) {
  const info = TRAIT_INFO[id];
  return info ? `${info.label}：${info.gain}` : `${id}：暂无中文说明，后续可继续补充。`;
}

export function optionTagLabel(id) {
  return OPTION_TAG_INFO[id]?.label || traitLabel(id);
}

export function optionTagTooltip(id) {
  const info = OPTION_TAG_INFO[id];
  return info ? `${info.label}：${info.gain}` : traitTooltip(id);
}

export function effectSummary(effects = {}) {
  const parts = Object.entries(effects)
    .filter(([, value]) => value !== 0 && value !== undefined && value !== null)
    .map(([key, value]) => `${EFFECT_LABELS[key] || key} ${value > 0 ? '+' : ''}${value}`);
  return parts.length ? parts.join('；') : '无明显数值变化';
}
