export const FORMATIONS = {
  F433: { id: 'F433', name: '4-3-3', desc: '边锋宽度与三中场控制兼具。', effects: { control: 2, chanceCreation: 2, defensiveStability: 0 } },
  F4231: { id: 'F4231', name: '4-2-3-1', desc: '双后腰保护与前腰创造并存。', effects: { control: 1, chanceCreation: 2, defensiveStability: 1 } },
  F343: { id: 'F343', name: '3-4-3', desc: '边翼卫压上，适合主动压制。', effects: { chanceCreation: 3, counterRisk: 2, staminaCost: 1 } },
  F352: { id: 'F352', name: '3-5-2', desc: '中路密度高，适合双前锋与稳守反击。', effects: { control: 2, defensiveStability: 2, chanceCreation: -1 } },
  F442: { id: 'F442', name: '4-4-2', desc: '结构直接，适合边路和身体对抗。', effects: { defensiveStability: 1, setPieceAttack: 1, control: -1 } },
  F532: { id: 'F532', name: '5-3-2', desc: '保护禁区和领先优势。', effects: { defensiveStability: 4, chanceCreation: -2, control: -1 } }
};

export const TACTIC_GROUPS = {
  buildUp: {
    label: '进攻组织',
    options: {
      BUILD_SHORT: { name: '短传后场出球', effects: { control: 3, chanceQuality: 1, counterRisk: 1, staminaCost: 0 } },
      BUILD_MIXED: { name: '混合推进', effects: { control: 1, chanceCreation: 1 } },
      BUILD_DIRECT: { name: '快速直传', effects: { transitionAttack: 3, control: -1, chanceCreation: 1 } },
      BUILD_WIDE: { name: '边路推进', effects: { chanceCreation: 2, setPieceAttack: 1, control: 0 } },
      BUILD_TARGET: { name: '长传找支点', effects: { chanceQuality: 2, control: -2, setPieceAttack: 1 } }
    }
  },
  attackingFocus: {
    label: '进攻重点',
    options: {
      ATTACK_LEFT: { name: '主攻左路', effects: { chanceCreation: 2, counterRisk: 1 } },
      ATTACK_RIGHT: { name: '主攻右路', effects: { chanceCreation: 2, counterRisk: 1 } },
      ATTACK_BOTH_WINGS: { name: '两翼齐飞', effects: { chanceCreation: 3, staminaCost: 1, counterRisk: 2 } },
      ATTACK_CENTRAL: { name: '中路渗透', effects: { control: 2, chanceQuality: 1 } },
      ATTACK_HALF_SPACE: { name: '肋部组合', effects: { chanceQuality: 2, chanceCreation: 1 } },
      ATTACK_BOX_DIRECT: { name: '禁区直接冲击', effects: { chanceQuality: 3, control: -2, setPieceAttack: 1 } }
    }
  },
  tempo: {
    label: '比赛节奏',
    options: {
      TEMPO_PATIENT: { name: '耐心控球', effects: { control: 3, chanceCreation: -1, counterRisk: -1, staminaCost: -1 } },
      TEMPO_BALANCED: { name: '平衡节奏', effects: { control: 1, chanceCreation: 1 } },
      TEMPO_VERTICAL: { name: '快速纵向', effects: { transitionAttack: 3, chanceCreation: 1, staminaCost: 1, counterRisk: 1 } },
      TEMPO_CHAOS: { name: '强行提速', effects: { chanceCreation: 4, counterRisk: 4, staminaCost: 3, foulRisk: 1 } }
    }
  },
  defensiveApproach: {
    label: '防守方式',
    options: {
      DEF_LOW_BLOCK: { name: '低位防守', effects: { defensiveStability: 4, control: -2, transitionAttack: 1 } },
      DEF_MID_BLOCK: { name: '中位防守', effects: { defensiveStability: 2, control: 1 } },
      DEF_HIGH_PRESS: { name: '高位压迫', effects: { pressIntensity: 4, chanceCreation: 1, staminaCost: 2, counterRisk: 2 } },
      DEF_COUNTER_PRESS: { name: '丢球即反抢', effects: { pressIntensity: 3, control: 2, staminaCost: 2, foulRisk: 1 } },
      DEF_HYBRID_PRESS: { name: '混合压迫', effects: { pressIntensity: 2, defensiveStability: 1, control: 1 } }
    }
  },
  restDefense: {
    label: '攻转守保护',
    options: {
      REST_CONSERVATIVE_32: { name: '稳健 3-2 保护', effects: { defensiveStability: 3, counterRisk: -2, chanceCreation: -1 } },
      REST_BALANCED_32: { name: '平衡 3-2 保护', effects: { defensiveStability: 1, control: 1 } },
      REST_AGGRESSIVE_23: { name: '激进 2-3 压制', effects: { chanceCreation: 2, pressIntensity: 1, counterRisk: 2 } },
      REST_MAX_ATTACK_14: { name: '极限压上', effects: { chanceCreation: 4, chanceQuality: 2, counterRisk: 5, defensiveStability: -3 } }
    }
  },
  markingPlan: {
    label: '盯防计划',
    options: {
      MARK_ZONAL_COMPACT: { name: '区域紧凑防守', effects: { defensiveStability: 3, control: 0 } },
      MARK_MAN_ORIENTED: { name: '人盯人倾向', effects: { defensiveStability: 2, staminaCost: 1, foulRisk: 1 } },
      MARK_STAR_SHADOW: { name: '专人限制核心', effects: { defensiveStability: 2, control: -1, staminaCost: 1 } },
      MARK_WIDE_TRAP: { name: '边路围抢陷阱', effects: { pressIntensity: 2, transitionAttack: 1, counterRisk: 1 } },
      MARK_BOX_PROTECTION: { name: '禁区保护优先', effects: { defensiveStability: 4, setPieceDefense: 1, chanceCreation: -1 } }
    }
  },
  setPiecePlan: {
    label: '定位球计划',
    options: {
      SET_BALANCED: { name: '平衡定位球', effects: { setPieceAttack: 1, setPieceDefense: 1 } },
      SET_NEAR_POST: { name: '前点冲击', effects: { setPieceAttack: 2, counterRisk: 1 } },
      SET_FAR_POST: { name: '后点高点', effects: { setPieceAttack: 3, counterRisk: 1 } },
      SET_SHORT_ROUTINE: { name: '短角球配合', effects: { chanceQuality: 1, setPieceAttack: 1, counterRisk: -1 } },
      SET_SAFE_DEFENSIVE: { name: '定位球防反优先', effects: { setPieceDefense: 3, setPieceAttack: -1, counterRisk: -2 } }
    }
  }
};

export const HALFTIME_COMMANDS = {
  HT_STAY_COURSE: { name: '保持比赛计划', effects: { control: 1, defensiveStability: 1 } },
  HT_RAISE_INTENSITY: { name: '提高压迫强度', effects: { pressIntensity: 3, chanceCreation: 1, staminaCost: 2, foulRisk: 1 } },
  HT_CALM_CONTROL: { name: '降速控场', effects: { control: 3, counterRisk: -1, chanceCreation: -1, staminaCost: -1 } },
  HT_PROTECT_LEAD: { name: '保护领先优势', effects: { defensiveStability: 4, chanceCreation: -2, counterRisk: -2 } },
  HT_CHASE_GOAL: { name: '主动追分', effects: { chanceCreation: 3, chanceQuality: 1, counterRisk: 2, staminaCost: 1 } },
  HT_ALL_OR_NOTHING: { name: '孤注一掷', effects: { chanceCreation: 5, chanceQuality: 2, counterRisk: 5, defensiveStability: -3 } },
  HT_LOCK_MIDFIELD: { name: '加强中场控制', effects: { control: 4, defensiveStability: 1, chanceCreation: -1 } },
  HT_EXPLOIT_FLANK: { name: '强化边路突破', effects: { chanceCreation: 3, setPieceAttack: 1, counterRisk: 1 } }
};

export const DEFAULT_TACTICS = {
  formation: 'F433',
  buildUp: 'BUILD_MIXED',
  attackingFocus: 'ATTACK_HALF_SPACE',
  tempo: 'TEMPO_BALANCED',
  defensiveApproach: 'DEF_HYBRID_PRESS',
  restDefense: 'REST_BALANCED_32',
  markingPlan: 'MARK_ZONAL_COMPACT',
  setPiecePlan: 'SET_BALANCED'
};

export const EFFECT_KEYS = ['control','chanceCreation','chanceQuality','transitionAttack','defensiveStability','counterRisk','staminaCost','pressIntensity','setPieceAttack','setPieceDefense','foulRisk','instantGoalChance','instantConcedeChance'];
