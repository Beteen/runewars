/* BootScene: no external assets to load (placeholder art is drawn with
 * Phaser graphics), so we just hand off to the WorldScene. */
window.RW = window.RW || {};

RW.BootScene = class extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.scene.start('World');
  }
};
