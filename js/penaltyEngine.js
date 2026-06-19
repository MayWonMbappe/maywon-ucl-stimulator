import { countTrait } from './utils.js';
export function simulatePenaltyShootout(userTeam, opponentTeam) {
  let user = 0, opponent = 0;
  const rounds = [];
  for (let i = 1; i <= 5; i++) {
    const u = rollPenalty(userTeam, opponentTeam);
    const o = rollPenalty(opponentTeam, userTeam);
    if (u) user++; if (o) opponent++;
    rounds.push({ round: i, userScored: u, opponentScored: o, score: `${user}-${opponent}` });
  }
  let sudden = 6;
  while (user === opponent && sudden < 12) {
    const u = rollPenalty(userTeam, opponentTeam);
    const o = rollPenalty(opponentTeam, userTeam);
    if (u) user++; if (o) opponent++;
    rounds.push({ round: sudden, userScored: u, opponentScored: o, score: `${user}-${opponent}` });
    sudden++;
  }
  return { user, opponent, rounds, winner: user > opponent ? 'user' : 'opponent' };
}
function rollPenalty(attackingTeam, defendingTeam) {
  let chance = 72 + countTrait(attackingTeam, 'big_game') * 1.6 + countTrait(attackingTeam, 'elite_finisher') * 2.4 - countTrait(defendingTeam, 'elite_shot_stopper') * 3;
  chance = Math.max(54, Math.min(88, chance));
  return Math.random() * 100 < chance;
}
