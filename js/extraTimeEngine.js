export const EXTRA_TIME_PLANS = {
  ET_CONTROL: { name: '控制加时节奏', effects: { control: 2, defensiveStability: 1 } },
  ET_PRESS: { name: '加时继续压迫', effects: { pressIntensity: 2, staminaCost: 2, chanceCreation: 1 } },
  ET_SAFE: { name: '稳住进入点球', effects: { defensiveStability: 3, chanceCreation: -1 } },
  ET_DIRECT: { name: '直接冲击禁区', effects: { chanceQuality: 2, setPieceAttack: 1, counterRisk: 1 } }
};
export function shouldGoExtraTime(aggregateUser, aggregateOpponent) { return aggregateUser === aggregateOpponent; }
export function simulateExtraTime(match) {
  const swing = Math.random();
  if (swing < .22) match.score.user += 1;
  else if (swing > .78) match.score.opponent += 1;
  match.timeline.push({ minute: 120, title: '加时赛结束', type: '加时', resultText: `加时后比分 ${match.score.user}-${match.score.opponent}`, score: { ...match.score } });
  return match;
}
