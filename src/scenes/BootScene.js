window.RW = window.RW || {};

RW.BootScene = class extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    RW.SpriteGen.generateAll(this);
    this.scene.start('World');
  }
};
