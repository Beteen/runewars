window.RW = window.RW || {};

RW.BootScene = class extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Real art: Jedi atlas (sliced by tools/slice_sheet.py).
    this.load.atlas('jedi', 'assets/sprites/jedi.png', 'assets/sprites/jedi.json');
    this.load.on('loaderror', (file) => {
      console.warn('Asset failed to load, will fall back to generated sprite:', file.key);
      RW.jediLoadFailed = true;
    });
  }

  create() {
    // Generated placeholder sprites (NPCs, enemies, tiles, and a player fallback).
    RW.SpriteGen.generateAll(this);

    if (!RW.jediLoadFailed && this.textures.exists('jedi')) {
      this.defineJediAnims();
      RW.hasJedi = true;
    }

    this.scene.start('World');
  }

  defineJediAnims() {
    // Helper to build a frame list from band + indices, skipping the
    // 15×9 "training remote" frames automatically.
    const frame = (r, i) => ({ key: 'jedi', frame: `row${r}_${i}` });
    const exists = (r, i) => this.textures.get('jedi').has(`row${r}_${i}`);
    const band = (r, idxs) => idxs.filter((i) => exists(r, i)).map((i) => frame(r, i));

    this.anims.create({
      key: 'jedi_idle',
      frames: band(0, [0, 1, 2]),
      frameRate: 4, repeat: -1,
    });
    this.anims.create({
      key: 'jedi_run',
      frames: band(1, [0, 1, 2, 3, 5, 6, 7, 8]),
      frameRate: 12, repeat: -1,
    });
    this.anims.create({
      key: 'jedi_attack',
      frames: band(2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      frameRate: 18, repeat: 0,
    });
  }
};
