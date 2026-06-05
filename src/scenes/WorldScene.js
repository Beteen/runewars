/* WorldScene: the playable Tatooine zone. Renders the tile grid and entities
 * with placeholder vector art, handles click-to-move, interactions, combat,
 * floating XP drops, dialog, and autosave. */
window.RW = window.RW || {};

RW.WorldScene = class extends Phaser.Scene {
  constructor() { super('World'); }

  create() {
    const T = RW.TILE;
    this.map = RW.buildMap();
    this.pathfinder = new RW.Pathfinder(this.map);

    // Load or create the player model.
    const saved = RW.Save.load();
    this.player = new RW.Player(saved ? saved.player : null);
    this.hud = new RW.HUD(this.player);
    this.player.on('message', () => {}); // HUD already logs

    this.drawMap();
    this.spawnEntities();
    this.createPlayerSprite();

    // Camera follows the player within world bounds.
    this.cameras.main.setBounds(0, 0, RW.MAP_W * T, RW.MAP_H * T);
    this.cameras.main.startFollow(this.playerSprite, true, 0.12, 0.12);

    this.movePath = [];
    this.moveTimer = 0;
    this.pendingInteract = null;

    // Click to move / interact.
    this.input.on('pointerdown', (p) => this.onClick(p));

    this.hud.log('<b>Welcome to RuneWars.</b> Click to move. Click a target to interact.');
    if (saved) this.hud.log('Game loaded from your last save.');

    // Autosave every 15s and on unload.
    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.save() });
    window.addEventListener('beforeunload', () => this.save());

    // Expose for debugging/console.
    RW.scene = this;
  }

  /* ---------- rendering ---------- */
  drawMap() {
    const T = RW.TILE;
    const g = this.add.graphics();
    for (let y = 0; y < RW.MAP_H; y++) {
      for (let x = 0; x < RW.MAP_W; x++) {
        const code = this.map[y][x];
        g.fillStyle(RW.TILE_COLORS[code] ?? 0x000000, 1);
        g.fillRect(x * T, y * T, T, T);
        g.lineStyle(1, 0x000000, 0.08);
        g.strokeRect(x * T, y * T, T, T);
      }
    }
    g.setDepth(0);
  }

  spawnEntities() {
    const T = RW.TILE;
    this.npcs = [];
    this.nodes = [];

    RW.SPAWNS.npcs.forEach((spec) => {
      const def = RW.NPCS[spec.type];
      const c = this.add.container(spec.x * T + T / 2, spec.y * T + T / 2);
      const body = this.add.circle(0, 0, T * 0.38, Phaser.Display.Color.HexStringToColor(def.color).color);
      body.setStrokeStyle(2, 0x000000);
      const tag = this.add.text(0, -T * 0.7, def.name.split(' ')[0], { fontSize: '10px', color: '#ffff00' }).setOrigin(0.5);
      const star = this.add.text(0, T * 0.55, '◆', { fontSize: '10px', color: '#ffd23f' }).setOrigin(0.5);
      c.add([body, tag, star]);
      c.setDepth(5);
      this.npcs.push({ spec, def, container: c, tileX: spec.x, tileY: spec.y });
    });

    RW.SPAWNS.nodes.forEach((spec) => {
      const def = RW.NODES[spec.type];
      const c = this.add.container(spec.x * T + T / 2, spec.y * T + T / 2);
      const shape = def.kind === 'mine'
        ? this.add.rectangle(0, 0, T * 0.6, T * 0.6, Phaser.Display.Color.HexStringToColor(def.color).color)
        : this.add.circle(0, 0, T * 0.36, Phaser.Display.Color.HexStringToColor(def.color).color);
      shape.setStrokeStyle(2, 0x000000);
      const tag = this.add.text(0, -T * 0.7, def.name, { fontSize: '9px', color: '#ffffff' }).setOrigin(0.5);
      c.add([shape, tag]);
      c.setDepth(5);
      this.nodes.push({ spec, def, container: c, shape, tileX: spec.x, tileY: spec.y, dead: false, hp: def.hp });
    });
  }

  createPlayerSprite() {
    const T = RW.TILE;
    const c = this.add.container(this.player.tileX * T + T / 2, this.player.tileY * T + T / 2);
    const body = this.add.circle(0, 0, T * 0.36, 0x39ff14);
    body.setStrokeStyle(2, 0x0a3d00);
    const saber = this.add.rectangle(T * 0.3, -T * 0.1, 3, T * 0.5, 0x3fa9ff);
    c.add([body, saber]);
    c.setDepth(8);
    this.playerSprite = c;
  }

  /* ---------- input / movement ---------- */
  onClick(pointer) {
    const T = RW.TILE;
    const wx = pointer.worldX, wy = pointer.worldY;
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);

    // Did we click an entity?
    const node = this.nodes.find((n) => !n.dead && n.tileX === tx && n.tileY === ty);
    const npc = this.npcs.find((n) => n.tileX === tx && n.tileY === ty);
    const target = node || npc;

    if (target) {
      this.pendingInteract = target;
      this.walkTo(target.tileX, target.tileY, /*adjacent*/ true);
      return;
    }
    this.pendingInteract = null;
    this.walkTo(tx, ty, false);
  }

  walkTo(tx, ty, adjacent) {
    let path = this.pathfinder.find(this.player.tileX, this.player.tileY, tx, ty);
    if (adjacent && path.length) path.pop(); // stop on the tile next to the target
    this.movePath = path;
    this.showClickMarker(tx, ty);
  }

  showClickMarker(tx, ty) {
    const T = RW.TILE;
    if (this.marker) this.marker.destroy();
    this.marker = this.add.star(tx * T + T / 2, ty * T + T / 2, 4, 3, 7, 0xffff00).setDepth(2);
    this.tweens.add({ targets: this.marker, alpha: 0, duration: 500, onComplete: () => this.marker && this.marker.destroy() });
  }

  update(time, delta) {
    this.moveTimer += delta;
    const stepMs = 150; // tiles per ~0.15s
    if (this.movePath.length && this.moveTimer >= stepMs) {
      this.moveTimer = 0;
      const next = this.movePath.shift();
      this.player.tileX = next.x;
      this.player.tileY = next.y;
      const T = RW.TILE;
      this.tweens.add({
        targets: this.playerSprite,
        x: next.x * T + T / 2, y: next.y * T + T / 2,
        duration: stepMs, ease: 'Linear',
      });
      if (!this.movePath.length && this.pendingInteract) {
        this.interact(this.pendingInteract);
        this.pendingInteract = null;
      }
    }
    this.respawnNodes(time);
  }

  /* ---------- interaction ---------- */
  interact(target) {
    if (target.def.tree) return this.talk(target);
    const def = target.def;
    if (def.kind === 'combat') return this.fight(target);
    if (def.kind === 'slice' || def.kind === 'mine') return this.gather(target);
  }

  fight(node) {
    if (node.dead) return;
    const p = this.player;
    const lvl = p.level('lightsaber');
    const hit = Phaser.Math.Between(0, Math.max(2, Math.floor(lvl / 2)) + 2);
    node.hp -= hit;
    this.floatText(node.container.x, node.container.y, hit > 0 ? `-${hit}` : 'miss', hit > 0 ? '#ff3f3f' : '#cccccc');

    // The enemy hits back a little.
    const back = Phaser.Math.Between(0, 2);
    if (back > 0) {
      const dead = p.damage(back);
      this.floatText(this.playerSprite.x, this.playerSprite.y, `-${back}`, '#ff3f3f');
      if (dead) return this.onDeath();
    }

    if (node.hp <= 0) {
      this.killNode(node);
    }
  }

  gather(node) {
    if (node.dead) return;
    const def = node.def;
    this.floatText(node.container.x, node.container.y, def.kind === 'mine' ? '*chip*' : '*slice*', '#ffffff');
    // Simple success roll improves with level.
    const lvl = this.player.level(def.skill);
    if (Phaser.Math.Between(0, 10) <= 6 + Math.floor(lvl / 20)) {
      this.killNode(node);
    } else {
      // try again shortly if still walking-adjacent
      this.time.delayedCall(600, () => { if (!node.dead && this.adjacentToPlayer(node)) this.gather(node); });
    }
  }

  killNode(node) {
    const def = node.def;
    this.player.addXp(def.skill, def.xp);
    this.floatText(this.playerSprite.x, this.playerSprite.y - 10, `+${def.xp} ${this.skillName(def.skill)}`, def.color || '#ffea8a');
    // Drops
    (def.drops || []).forEach((d) => {
      if (Math.random() <= d.chance) {
        this.player.addItem(d.item, d.qty);
        this.hud.log(`You receive ${d.qty} ${RW.itemDef(d.item).name}.`);
      }
    });
    // Hide and schedule respawn.
    node.dead = true;
    node.hp = def.hp;
    node.respawnAt = this.time.now + def.respawn;
    node.container.setVisible(false);
  }

  respawnNodes(time) {
    this.nodes.forEach((n) => {
      if (n.dead && time >= n.respawnAt) {
        n.dead = false;
        n.container.setVisible(true);
      }
    });
  }

  adjacentToPlayer(node) {
    const dx = Math.abs(node.tileX - this.player.tileX);
    const dy = Math.abs(node.tileY - this.player.tileY);
    return dx + dy <= 1;
  }

  onDeath() {
    this.hud.log('<b>Oh dear, you are dead!</b> You wake back at the farm.');
    this.player.hp = this.player.maxHp();
    this.player.tileX = RW.SPAWNS.player.x;
    this.player.tileY = RW.SPAWNS.player.y;
    const T = RW.TILE;
    this.playerSprite.setPosition(this.player.tileX * T + T / 2, this.player.tileY * T + T / 2);
    this.player.emit('hp', {});
    this.movePath = [];
  }

  /* ---------- dialog ---------- */
  talk(npc) {
    this.openDialog(npc, npc.def.dialog);
  }

  openDialog(npc, nodeId) {
    this.closeDialog();
    const node = npc.def.tree[nodeId];
    if (!node) return;
    if (node.reward) {
      Object.entries(node.reward).forEach(([item, qty]) => {
        this.player.addItem(item, qty);
        this.hud.log(`${npc.def.name} gives you ${qty} ${RW.itemDef(item).name}.`);
      });
      delete node.reward; // one-time
    }

    const cam = this.cameras.main;
    const x = cam.scrollX + cam.width / 2;
    const y = cam.scrollY + cam.height - 90;
    const box = this.add.container(x, y).setDepth(50);
    const bg = this.add.rectangle(0, 0, cam.width - 30, 150, 0x1a140c, 0.95).setStrokeStyle(2, 0xffd23f);
    const name = this.add.text(-(cam.width - 60) / 2, -64, npc.def.name, { fontSize: '13px', color: '#ffd23f', fontStyle: 'bold' });
    const text = this.add.text(-(cam.width - 60) / 2, -44, node.text,
      { fontSize: '12px', color: '#ffffff', wordWrap: { width: cam.width - 60 } });
    box.add([bg, name, text]);

    (node.options || []).forEach((opt, i) => {
      const oy = -10 + i * 20;
      const t = this.add.text(-(cam.width - 60) / 2, oy, `> ${opt.label}`,
        { fontSize: '12px', color: '#9fe8ff' }).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffea8a'));
      t.on('pointerout', () => t.setColor('#9fe8ff'));
      t.on('pointerdown', (p, lx, ly, e) => {
        if (e) e.stopPropagation();
        if (opt.goto) this.openDialog(npc, opt.goto);
        else this.closeDialog();
      });
      box.add(t);
    });
    this.dialogBox = box;
  }

  closeDialog() {
    if (this.dialogBox) { this.dialogBox.destroy(); this.dialogBox = null; }
  }

  /* ---------- helpers ---------- */
  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontSize: '12px', color, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  skillName(id) { return RW.SKILLS.find((s) => s.id === id).name; }

  save() {
    RW.Save.save({ player: this.player.toJSON(), savedAt: Date.now() });
  }
};
