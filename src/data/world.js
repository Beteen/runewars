/* Starter zone: Tatooine — the Dune Sea moisture farm.
 * The map is a grid of tile codes. Each entity is placed by tile coords. */
window.RW = window.RW || {};

RW.TILE = 32;          // pixel size of one tile
RW.MAP_W = 30;         // tiles wide
RW.MAP_H = 22;         // tiles tall

/* Tile legend:
 *  0 sand (walkable)
 *  1 rock (blocked)
 *  2 path/duracrete (walkable)
 *  3 water/vaporator base (blocked)
 *  4 cantina floor (walkable)
 *  5 wall (blocked) */
RW.TILE_COLORS = {
  0: 0xd9b27c, 1: 0x8a7355, 2: 0xc2a878, 3: 0x4f7d8c, 4: 0x6b5d4f, 5: 0x3a3026,
};
RW.BLOCKED_TILES = new Set([1, 3, 5]);

/* Procedurally build a simple map: sand field, a rocky border, a path,
 * and a small cantina building in the corner. */
RW.buildMap = function () {
  const W = RW.MAP_W, H = RW.MAP_H;
  const map = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      let t = 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) t = 1; // rocky border
      if (y === Math.floor(H / 2) && x > 1 && x < W - 2) t = 2;     // horizontal path
      if (x === Math.floor(W / 3) && y > 1 && y < H - 2) t = 2;     // vertical path
      row.push(t);
    }
    map.push(row);
  }
  // Cantina building top-right (floor + walls)
  for (let y = 2; y <= 6; y++) {
    for (let x = W - 8; x <= W - 3; x++) {
      const edge = (y === 2 || y === 6 || x === W - 8 || x === W - 3);
      map[y][x] = edge ? 5 : 4;
    }
  }
  map[6][W - 6] = 4; // doorway
  // A few scattered rocks
  const rocks = [[5, 4], [7, 8], [20, 14], [12, 17], [23, 16]];
  rocks.forEach(([x, y]) => { if (map[y] && map[y][x] !== undefined) map[y][x] = 1; });
  return map;
};

/* Entity placements (tile coords). */
RW.SPAWNS = {
  player: { x: 4, y: 11 },
  npcs: [
    { type: 'moisture_farmer', x: 6, y: 9 },
    { type: 'rodian_slicer', x: 23, y: 8 },
  ],
  nodes: [
    { type: 'womp_rat', x: 18, y: 9 },
    { type: 'womp_rat', x: 20, y: 11 },
    { type: 'womp_rat', x: 16, y: 13 },
    { type: 'protocol_droid', x: 24, y: 10 },
    { type: 'protocol_droid', x: 26, y: 13 },
    { type: 'kyber_node', x: 8, y: 16 },
    { type: 'kyber_node', x: 10, y: 18 },
  ],
};
