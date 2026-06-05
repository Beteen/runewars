/* WorldScene: the playable Tatooine zone. */
window.RW = window.RW || {};

/* Map tile code → texture key */
const TILE_TEX = {
  0: 'tile_sand',
  1: 'tile_rock',
  2: 'tile_path',
  3: 'tile_vapor',
  4: 'tile_cantina',
  5: 'tile_wall',
};

/* NPC type → texture key */
const NPC_TEX = {
  moisture_farmer: 'spr_farmer',
  rodian_slicer:   'spr_rodian',
};

/* Node type → texture key */
const NODE_TEX = {
  womp_rat:       'spr_womp_rat',
  protocol_droid: 'spr_droid',
  kyber_node:     'spr_kyber',
};

RW.WorldScene = class extends Phaser.Scene {
  constructor() { super('World'); }

  create() {
    const T = RW.TILE;
    this.map = RW.buildMap();
    this.pathfinder = new RW.Pathfinder(this.map);

    const saved = RW.Save.load();
    this.player = new RW.Player(saved ? saved.player : null);
    this.hud = new RW.HUD(this.player);

    this.drawMap();
    this.spawnEntities();
    this.createPlayerSprite();
    this.createNameplates();

    this.cameras.main.setBounds(0, 0, RW.MAP_W * T, RW.MAP_H * T);
    this.cameras.main.startFollow(this.playerSprite, true, 0.12, 0.12);

    this.movePath = [];
    this.moveTimer = 0;
    this.pendingInteract = null;
    this.actionLocked = false; // prevents interaction spam

    this.input.on('pointerdown', (p) => this.onClick(p));

    this.hud.log('<b>Welcome to RuneWars.</b> Click to move. Click targets to interact.');
    if (saved) this.hud.log('Game loaded from your last save.');

    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.save() });
    window.addEventListener('beforeunload', () => this.save());
    RW.scene = this;
  }

  /* ---------- map rendering ---------- */
  drawMap() {
    const T = RW.TILE;
    for (let y = 0; y < RW.MAP_H; y++) {
      for (let x = 0; x < RW.MAP_W; x++) {
        const code = this.map[y][x];
        const key = TILE_TEX[code] ?? 'tile_sand';
        this.add.image(x * T + T / 2, y * T + T / 2, key).setDisplaySize(T, T).setDepth(0);
      }
    }
    // Vaporator props on tile-3 spots
    for (let y = 0; y < RW.MAP_H; y++) {
      for (let x = 0; x < RW.MAP_W; x++) {
        if (this.map[y][x] === 3) {
          this.drawVaporator(x * T + T / 2, y * T + T / 2);
        }
      }
    }
  }

  drawVaporator(cx, cy) {
    // A simple moisture vaporator drawn with graphics (unique prop, not a tile)
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x607080, 1);
    g.fillRect(cx - 2, cy - 14, 4, 18);       // pole
    g.fillStyle(0x80a0b0, 1);
    g.fillEllipse(cx, cy - 14, 14, 5);         // dish
    g.fillStyle(0x9fe8ff, 0.5);
    g.fillCircle(cx, cy - 13, 3);              // condenser glow
  }

  /* ---------- entity spawning ---------- */
  spawnEntities() {
    const T = RW.TILE;
    this.npcs = [];
    this.nodes = [];

    RW.SPAWNS.npcs.forEach((spec) => {
      const def = RW.NPCS[spec.type];
      const texKey = NPC_TEX[spec.type] || 'spr_farmer';
      const img = this.add.image(spec.x * T + T / 2, spec.y * T + T / 2, texKey)
        .setDisplaySize(T, T).setDepth(5).setInteractive({ useHandCursor: true });

      // Idle float tween
      this.tweens.add({ targets: img, y: img.y - 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      // Dialogue indicator (golden diamond above head)
      const dia = this.add.text(spec.x * T + T / 2, spec.y * T - 4, '◆',
        { fontSize: '11px', color: '#ffd700', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(6);

      this.npcs.push({ spec, def, img, dia, tileX: spec.x, tileY: spec.y });
    });

    RW.SPAWNS.nodes.forEach((spec) => {
      const def = RW.NODES[spec.type];
      const texKey = NODE_TEX[spec.type] || 'spr_womp_rat';
      const img = this.add.image(spec.x * T + T / 2, spec.y * T + T / 2, texKey)
        .setDisplaySize(T, T).setDepth(5).setInteractive({ useHandCursor: true });

      // Womp rats get a subtle idle animation
      if (def.kind === 'combat') {
        this.tweens.add({ targets: img, scaleX: img.scaleX * 1.05, duration: 600, yoyo: true, repeat: -1 });
      }

      // HP bar (hidden until hit)
      const hpBg = this.add.rectangle(spec.x * T + T / 2, spec.y * T - 5, T - 4, 4, 0x330000).setDepth(7).setVisible(false);
      const hpBar = this.add.rectangle(spec.x * T + T / 2 - (T - 6) / 2, spec.y * T - 5, T - 6, 3, 0x44ff44)
        .setOrigin(0, 0.5).setDepth(7).setVisible(false);

      this.nodes.push({
        spec, def, img, hpBg, hpBar,
        tileX: spec.x, tileY: spec.y,
        dead: false, hp: def.hp || 1,
      });
    });
  }

  createPlayerSprite() {
    const T = RW.TILE;
    const px = this.player.tileX * T + T / 2;
    const py = this.player.tileY * T + T / 2;

    if (RW.hasJedi) {
      // Animated Jedi sprite (saber is part of the art). Anchored at the
      // feet so varying frame heights keep the character grounded.
      this.playerSprite = this.add.sprite(px, py, 'jedi', 'row0_0')
        .setOrigin(0.5, 0.5).setScale(1).setDepth(8);
      this.playerSprite.play('jedi_idle');
    } else {
      // Fallback: generated placeholder body + saber in a container.
      this.playerBody = this.add.image(0, 0, 'spr_player').setDisplaySize(T, T).setDepth(8);
      this.saberImg = this.add.image(T * 0.28, -T * 0.05, 'spr_saber').setDisplaySize(6, T * 0.55).setDepth(9);
      this.playerSprite = this.add.container(px, py, [this.playerBody, this.saberImg]).setDepth(8);
    }

    // Shadow under the player
    this.playerShadow = this.add.ellipse(
      this.player.tileX * T + T / 2, this.player.tileY * T + T * 0.6,
      T * 0.7, T * 0.2, 0x000000, 0.3,
    ).setDepth(3);
  }

  createNameplates() {
    // Drawn once as static text above NPC positions; they don't move
    this.npcs.forEach((n) => {
      const T = RW.TILE;
      this.add.text(n.tileX * T + T / 2, n.tileY * T - T * 0.6, n.def.name,
        { fontSize: '9px', color: '#ffff00', stroke: '#000000', strokeThickness: 2 })
        .setOrigin(0.5).setDepth(10);
    });
    this.nodes.forEach((n) => {
      const T = RW.TILE;
      this.add.text(n.tileX * T + T / 2, n.tileY * T - T * 0.6, n.def.name,
        { fontSize: '9px', color: '#cccccc', stroke: '#000000', strokeThickness: 2 })
        .setOrigin(0.5).setDepth(10);
    });
  }

  /* ---------- input / movement ---------- */
  onClick(pointer) {
    if (this.dialogBox) { this.closeDialog(); return; }
    const T = RW.TILE;
    const tx = Math.floor(pointer.worldX / T);
    const ty = Math.floor(pointer.worldY / T);

    const node = this.nodes.find((n) => !n.dead && n.tileX === tx && n.tileY === ty);
    const npc  = this.npcs.find((n) => n.tileX === tx && n.tileY === ty);
    const target = node || npc;

    if (target) {
      this.pendingInteract = target;
      this.walkTo(target.tileX, target.tileY, true);
      return;
    }
    this.pendingInteract = null;
    this.walkTo(tx, ty, false);
  }

  walkTo(tx, ty, adjacent) {
    let path = this.pathfinder.find(this.player.tileX, this.player.tileY, tx, ty);
    if (adjacent && path.length) path.pop();
    this.movePath = path;
    this.showClickMarker(tx, ty);
  }

  showClickMarker(tx, ty) {
    const T = RW.TILE;
    if (this.marker) this.marker.destroy();
    this.marker = this.add.star(tx * T + T / 2, ty * T + T / 2, 4, 3, 8, 0xffff00)
      .setDepth(2).setAlpha(0.9);
    this.tweens.add({ targets: this.marker, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 500,
      onComplete: () => this.marker && this.marker.destroy() });
  }

  update(time, delta) {
    this.moveTimer += delta;
    const stepMs = 150;
    if (this.movePath.length && this.moveTimer >= stepMs) {
      this.moveTimer = 0;
      const prevX = this.player.tileX;
      const next = this.movePath.shift();
      this.player.tileX = next.x;
      this.player.tileY = next.y;
      const T = RW.TILE;
      const nx = next.x * T + T / 2, ny = next.y * T + T / 2;
      this.tweens.add({ targets: this.playerSprite, x: nx, y: ny, duration: stepMs, ease: 'Linear' });
      this.tweens.add({ targets: this.playerShadow, x: nx, y: ny + T * 0.1, duration: stepMs, ease: 'Linear' });

      // Face the direction of travel.
      if (next.x < prevX) this.facePlayer(-1);
      else if (next.x > prevX) this.facePlayer(1);

      this.playPlayerAnim('jedi_run');

      if (!this.movePath.length) {
        if (this.pendingInteract) {
          this.interact(this.pendingInteract);
          this.pendingInteract = null;
        } else {
          this.playPlayerAnim('jedi_idle');
        }
      }
    }
    this.respawnNodes(time);
  }

  /* Flip the player to face left (-1) or right (1). */
  facePlayer(dir) {
    const flip = dir < 0;
    if (this.playerSprite.setFlipX) this.playerSprite.setFlipX(flip);
    else if (this.playerBody) this.playerBody.setFlipX(flip);
  }

  /* Play a Jedi animation if real art is loaded; no-op for the fallback.
   * Won't restart an animation that's already playing (except attack). */
  playPlayerAnim(key) {
    if (!RW.hasJedi || !this.playerSprite.play) return;
    if (key === 'jedi_attack') { this.playerSprite.play(key); return; }
    if (this.playerSprite.anims.isPlaying &&
        this.playerSprite.anims.currentAnim &&
        this.playerSprite.anims.currentAnim.key === 'jedi_attack' &&
        this.playerSprite.anims.isPlaying) {
      return; // let an in-progress attack finish
    }
    this.playerSprite.play(key, true);
  }

  /* ---------- interaction ---------- */
  interact(target) {
    if (target.def.tree) return this.talk(target);
    if (target.def.kind === 'combat') return this.startFight(target);
    if (target.def.kind === 'slice' || target.def.kind === 'mine') return this.gather(target);
  }

  startFight(node) {
    if (node.dead || this.fightTimer) return;
    this.doFightRound(node);
    // Auto-attack tick while adjacent
    this.fightTimer = this.time.addEvent({
      delay: 600, loop: true,
      callback: () => {
        if (node.dead || !this.adjacentToPlayer(node)) {
          this.fightTimer.remove(); this.fightTimer = null; return;
        }
        this.doFightRound(node);
      },
    });
  }

  doFightRound(node) {
    if (node.dead) return;
    const p = this.player;

    // Face the enemy and swing.
    this.facePlayer(node.tileX < this.player.tileX ? -1 : 1);
    if (RW.hasJedi && this.playerSprite.play) {
      this.playerSprite.play('jedi_attack');
      this.playerSprite.once('animationcomplete-jedi_attack', () => {
        if (!this.fightTimer) this.playPlayerAnim('jedi_idle');
      });
    }

    const lvl = p.level('lightsaber');
    const hit = Phaser.Math.Between(0, Math.max(2, Math.floor(lvl / 2)) + 2);
    node.hp -= hit;

    // Show hitsplat on enemy
    this.hitsplat(node.img.x, node.img.y, hit, '#ff3f3f');

    // Update enemy HP bar
    this.updateHpBar(node);

    // Enemy retaliates
    const back = Phaser.Math.Between(0, 2);
    if (back > 0) {
      const dead = p.damage(back);
      this.hitsplat(this.playerSprite.x, this.playerSprite.y, back, '#ffaa00');
      if (dead) { this.fightTimer && this.fightTimer.remove(); this.fightTimer = null; return this.onDeath(); }
    }

    if (node.hp <= 0) {
      this.killNode(node);
      if (this.fightTimer) { this.fightTimer.remove(); this.fightTimer = null; }
    }
  }

  updateHpBar(node) {
    const def = node.def;
    if (!def.hp) return;
    const pct = Math.max(0, node.hp / def.hp);
    const T = RW.TILE;
    const maxW = T - 6;
    node.hpBg.setVisible(true);
    node.hpBar.setVisible(true);
    node.hpBar.width = pct * maxW;
    node.hpBar.fillColor = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff3333;
  }

  gather(node) {
    if (node.dead) return;
    const def = node.def;
    const lvl = this.player.level(def.skill);
    this.floatText(node.img.x, node.img.y - 10, def.kind === 'mine' ? '*chip*' : '*slice*', '#ffffff');
    if (Phaser.Math.Between(0, 10) <= 6 + Math.floor(lvl / 20)) {
      this.killNode(node);
    } else {
      this.time.delayedCall(700, () => {
        if (!node.dead && this.adjacentToPlayer(node)) this.gather(node);
      });
    }
  }

  killNode(node) {
    const def = node.def;
    this.player.addXp(def.skill, def.xp);
    this.floatText(this.playerSprite.x, this.playerSprite.y - 12,
      `+${def.xp} ${this.skillName(def.skill)} xp`,
      RW.SKILLS.find((s) => s.id === def.skill).color);

    (def.drops || []).forEach((d) => {
      if (Math.random() <= d.chance) {
        this.player.addItem(d.item, d.qty);
        this.hud.log(`You receive ${d.qty}x ${RW.itemDef(d.item).name}.`);
      }
    });

    // Death animation
    this.tweens.add({
      targets: node.img, alpha: 0, scaleX: 0.3, scaleY: 0.3, angle: 90, duration: 400,
      onComplete: () => { node.img.setVisible(false); node.img.setAlpha(1).setScale(node.img.scaleX).setAngle(0); },
    });
    node.hpBg.setVisible(false);
    node.hpBar.setVisible(false);
    node.dead = true;
    node.hp = def.hp || 1;
    node.respawnAt = this.time.now + def.respawn;
  }

  respawnNodes(time) {
    this.nodes.forEach((n) => {
      if (n.dead && time >= n.respawnAt) {
        n.dead = false;
        n.img.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: n.img, alpha: 1, duration: 500 });
      }
    });
  }

  adjacentToPlayer(node) {
    return Math.abs(node.tileX - this.player.tileX) + Math.abs(node.tileY - this.player.tileY) <= 1;
  }

  onDeath() {
    this.hud.log('<b>Oh dear, you are dead!</b> You wake back at the farm.');
    this.player.hp = this.player.maxHp();
    this.player.tileX = RW.SPAWNS.player.x;
    this.player.tileY = RW.SPAWNS.player.y;
    const T = RW.TILE;
    this.playerSprite.setPosition(this.player.tileX * T + T / 2, this.player.tileY * T + T / 2);
    this.playerShadow.setPosition(this.player.tileX * T + T / 2, this.player.tileY * T + T * 0.6);
    this.player.emit('hp', {});
    this.movePath = [];
  }

  /* ---------- dialog ---------- */
  talk(npc) { this.openDialog(npc, npc.def.dialog); }

  openDialog(npc, nodeId) {
    this.closeDialog();
    const node = npc.def.tree[nodeId];
    if (!node) return;

    if (node.reward) {
      Object.entries(node.reward).forEach(([item, qty]) => {
        this.player.addItem(item, qty);
        this.hud.log(`${npc.def.name} gives you ${qty}x ${RW.itemDef(item).name}.`);
      });
      delete node.reward;
    }

    const cam = this.cameras.main;
    const x = cam.scrollX + cam.width / 2;
    const y = cam.scrollY + cam.height - 88;
    const W = cam.width - 40, H = 160;
    const box = this.add.container(x, y).setDepth(100);

    const bg = this.add.rectangle(0, 0, W, H, 0x1a140c, 0.97)
      .setStrokeStyle(2, 0xffd700);

    // NPC portrait area (left)
    const portrait = this.add.image(-W / 2 + 34, -30, NPC_TEX[npc.spec.type] || 'spr_farmer')
      .setDisplaySize(48, 48);
    const portBg = this.add.rectangle(-W / 2 + 34, -30, 52, 52, 0x2a1e0a).setStrokeStyle(1, 0xffd700);

    const nameText = this.add.text(-W / 2 + 66, -H / 2 + 14, npc.def.name,
      { fontSize: '13px', color: '#ffd700', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 });
    const dialogText = this.add.text(-W / 2 + 66, -H / 2 + 34, node.text,
      { fontSize: '11px', color: '#ffffff', wordWrap: { width: W - 80 } });

    box.add([bg, portBg, portrait, nameText, dialogText]);

    (node.options || []).forEach((opt, i) => {
      const oy = H / 2 - 56 + i * 20;
      const t = this.add.text(-W / 2 + 14, oy, `▶ ${opt.label}`,
        { fontSize: '12px', color: '#9fe8ff', stroke: '#000', strokeThickness: 2 })
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffea8a'));
      t.on('pointerout', () => t.setColor('#9fe8ff'));
      t.on('pointerdown', (p, lx, ly, e) => {
        e && e.stopPropagation();
        if (opt.goto) this.openDialog(npc, opt.goto);
        else this.closeDialog();
      });
      box.add(t);
    });

    // Slide up animation
    box.y += 20; box.alpha = 0;
    this.tweens.add({ targets: box, y: y, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.dialogBox = box;
  }

  closeDialog() {
    if (this.dialogBox) {
      this.tweens.add({ targets: this.dialogBox, y: this.dialogBox.y + 10, alpha: 0, duration: 120,
        onComplete: () => { if (this.dialogBox) { this.dialogBox.destroy(); this.dialogBox = null; } } });
    }
  }

  /* ---------- helpers ---------- */
  hitsplat(x, y, val, color) {
    const bg = this.add.circle(x, y, 10, val > 0 ? 0x880000 : 0x444444)
      .setStrokeStyle(1, 0x000000).setDepth(40);
    const t = this.add.text(x, y, val > 0 ? `${val}` : '0',
      { fontSize: '11px', color, fontStyle: 'bold', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(41);
    this.tweens.add({ targets: [bg, t], y: y - 20, alpha: 0, duration: 900,
      onComplete: () => { bg.destroy(); t.destroy(); } });
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg,
      { fontSize: '11px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(42);
    this.tweens.add({ targets: t, y: y - 32, alpha: 0, duration: 1000, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy() });
  }

  skillName(id) { return RW.SKILLS.find((s) => s.id === id).name; }

  save() { RW.Save.save({ player: this.player.toJSON(), savedAt: Date.now() }); }
};
