/* Phaser game bootstrap. */
window.RW = window.RW || {};

const config = {
  type: Phaser.AUTO,
  width: 512,
  height: 480,
  parent: 'game-container',
  backgroundColor: '#000000',
  pixelArt: true,
  scene: [RW.BootScene, RW.WorldScene],
  render: { antialias: false },
};

RW.game = new Phaser.Game(config);
