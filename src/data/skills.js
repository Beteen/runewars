/* Skill definitions and the classic RS07 XP curve.
 * window.RW namespace holds all shared game data/systems. */
window.RW = window.RW || {};

RW.SKILLS = [
  { id: 'lightsaber', name: 'Lightsaber', color: '#3fa9ff', desc: 'Melee combat with energy blades.' },
  { id: 'force',      name: 'Force',      color: '#b066ff', desc: 'Channel the Force for powers.' },
  { id: 'blaster',    name: 'Blaster',    color: '#ff5a3c', desc: 'Ranged combat with blasters.' },
  { id: 'piloting',   name: 'Piloting',   color: '#ffd23f', desc: 'Fly starships across the galaxy.' },
  { id: 'slicing',    name: 'Slicing',    color: '#3fff8a', desc: 'Hack droids, doors and terminals.' },
  { id: 'engineering',name: 'Engineering',color: '#cfcfcf', desc: 'Build and repair droids and gear.' },
  { id: 'mining',     name: 'Mining',     color: '#a87b4f', desc: 'Extract kyber and ore.' },
  { id: 'hitpoints',  name: 'Hitpoints',  color: '#ff3f6e', desc: 'Your vitality.' },
];

/* RS07 XP table: xp needed to reach a given level.
 * level L requires floor( sum_{n=1}^{L-1} floor(n + 300 * 2^(n/7)) / 4 ) */
RW.XP_FOR_LEVEL = (function () {
  const table = [0, 0]; // index by level; level 1 = 0 xp
  let points = 0;
  for (let lvl = 1; lvl < 100; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    table[lvl + 1] = Math.floor(points / 4);
  }
  return table;
})();

RW.levelForXp = function (xp) {
  let lvl = 1;
  while (lvl < 99 && xp >= RW.XP_FOR_LEVEL[lvl + 1]) lvl++;
  return lvl;
};

RW.MAX_LEVEL = 99;
