/* BFS pathfinding on the tile grid (4-directional). Good enough for
 * click-to-move in a small zone; returns a list of {x,y} steps to the goal. */
window.RW = window.RW || {};

RW.Pathfinder = class {
  constructor(map) { this.map = map; }

  blocked(x, y) {
    const row = this.map[y];
    if (!row || row[x] === undefined) return true;
    return RW.BLOCKED_TILES.has(row[x]);
  }

  /* Breadth-first search from start to goal. If the goal is blocked,
   * find the nearest walkable tile adjacent to it. */
  find(sx, sy, gx, gy) {
    if (this.blocked(gx, gy)) {
      const adj = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]]
        .filter(([x, y]) => !this.blocked(x, y));
      if (!adj.length) return [];
      [gx, gy] = adj[0];
    }
    const key = (x, y) => `${x},${y}`;
    const queue = [[sx, sy]];
    const came = new Map();
    came.set(key(sx, sy), null);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length) {
      const [cx, cy] = queue.shift();
      if (cx === gx && cy === gy) break;
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (this.blocked(nx, ny)) continue;
        const k = key(nx, ny);
        if (came.has(k)) continue;
        came.set(k, key(cx, cy));
        queue.push([nx, ny]);
      }
    }

    const goalKey = key(gx, gy);
    if (!came.has(goalKey)) return [];
    const path = [];
    let cur = goalKey;
    while (cur) {
      const [x, y] = cur.split(',').map(Number);
      path.unshift({ x, y });
      cur = came.get(cur);
    }
    path.shift(); // drop the starting tile
    return path;
  }
};
