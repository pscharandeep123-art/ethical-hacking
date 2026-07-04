// lib/mergeStudent.js
// Turns a progress snapshot posted by a student's browser into the
// classroom record shape, merging with whatever's already stored so
// scores/XP/streaks only ever move up (a student refreshing or losing
// localStorage can't accidentally erase their best results).

function freshStudent(name) {
  return {
    name,
    score: 0,
    accuracy: 0,
    completedUnits: 0,
    completionPercentage: 0,
    rank: 'Script Kiddie',
    xp: 0,
    bestStreak: 0,
    attempts: 0,
    unitScores: {},
    achievements: [],
    createdAt: new Date().toISOString(),
    lastPlayed: null,
    lastPlayedAt: null,
  };
}

// incoming: { name, xp, rank, unitsInfo: [{id,total,title}], progress: {
//   xp, achievements: [...], [unitId]: {best, attempts, bestStreak, lastMissed} } }
function mergeStudent(existing, incoming) {
  const name = incoming.name;
  const base = existing ? { ...existing } : freshStudent(name);
  const progress = incoming.progress || {};
  const unitsInfo = incoming.unitsInfo || [];

  let totalCorrect = 0;
  let totalPossible = 0;
  let completedUnits = 0;
  let attempts = 0;
  let bestStreak = base.bestStreak || 0;
  const unitScores = { ...(base.unitScores || {}) };

  unitsInfo.forEach(u => {
    const up = progress[u.id];
    const prevUnit = unitScores[u.id] || { best: 0, attempts: 0, bestStreak: 0, total: u.total };
    if (up) {
      const best = Math.max(prevUnit.best || 0, up.best || 0);
      const unitAttempts = Math.max(prevUnit.attempts || 0, up.attempts || 0);
      const unitStreak = Math.max(prevUnit.bestStreak || 0, up.bestStreak || 0);
      unitScores[u.id] = { title: u.title, best, attempts: unitAttempts, bestStreak: unitStreak, total: u.total };
      bestStreak = Math.max(bestStreak, unitStreak);
      attempts += unitAttempts;
      if (unitAttempts > 0) completedUnits++;
      totalCorrect += best;
      totalPossible += u.total;
    } else if (prevUnit) {
      unitScores[u.id] = prevUnit;
      attempts += prevUnit.attempts || 0;
      if ((prevUnit.attempts || 0) > 0) completedUnits++;
      totalCorrect += prevUnit.best || 0;
      totalPossible += prevUnit.total || u.total;
    }
  });

  const accuracy = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0;
  const completionPercentage = unitsInfo.length > 0 ? Math.round((completedUnits / unitsInfo.length) * 100) : 0;
  const xp = Math.max(base.xp || 0, progress.xp || incoming.xp || 0);

  return {
    name,
    score: Math.max(base.score || 0, totalCorrect),
    accuracy,
    completedUnits: Math.max(base.completedUnits || 0, completedUnits),
    completionPercentage: Math.max(base.completionPercentage || 0, completionPercentage),
    rank: incoming.rankName || base.rank || 'Script Kiddie',
    xp,
    bestStreak,
    attempts: Math.max(base.attempts || 0, attempts),
    unitScores,
    achievements: (progress.achievements && progress.achievements.length ? progress.achievements : base.achievements) || [],
    createdAt: base.createdAt || new Date().toISOString(),
    lastPlayed: new Date().toISOString().split('T')[0],
    lastPlayedAt: new Date().toISOString(),
  };
}

module.exports = { mergeStudent, freshStudent };
