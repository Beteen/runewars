/* SpriteGen: paints pixel-art sprites into Phaser textures at boot time.
 * Each sprite is a 16×16 grid of coloured 1px cells, scaled up by SCALE.
 * Call SpriteGen.generateAll(scene) once in BootScene.preload/create. */
window.RW = window.RW || {};

RW.SPRITE_SCALE = 2; // each "pixel" = 2×2 Phaser pixels → 32×32 final

RW.SpriteGen = {
  /* Paint a 16×16 pixel grid from a row-string array.
   * '.' = transparent, any other char maps into the palette. */
  makeTexture(scene, key, rows, palette) {
    const S = RW.SPRITE_SCALE;
    const W = rows[0].length, H = rows.length;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const ch = row[rx];
        if (ch === '.') continue;
        const col = palette[ch];
        if (!col) continue;
        g.fillStyle(col, 1);
        g.fillRect(rx * S, ry * S, S, S);
      }
    });
    g.generateTexture(key, W * S, H * S);
    g.destroy();
  },

  generateAll(scene) {
    /* ---- PLAYER (Jedi in a robe) ---- */
    this.makeTexture(scene, 'spr_player', [
      '....BBBBB.......',
      '....B111B.......',
      '....B1B1B.......',
      '.....BBB........',
      '....GGGGG.......',
      '...GGGGGGG......',
      '...GG...GG......',
      '...GG...GG......',
      '....GGGGG.......',
      '....G...G.......',
      '....G...G.......',
      '....GG.GG.......',
      '................',
      '................',
      '................',
      '................',
    ], {
      B: 0x1a0a00, // outline
      1: 0xf4c07a, // skin
      G: 0x2d4f1e, // dark green robe
    });

    /* Blue saber glow on weapon hand */
    this.makeTexture(scene, 'spr_saber', [
      '.S.',
      '.S.',
      '.S.',
      '.S.',
      '.S.',
      '.S.',
      '.s.',
      '.s.',
    ], {
      S: 0x7cd4ff, // blade
      s: 0x3fa9ff,
    });

    /* ---- OWEN (moisture farmer, tan robe) ---- */
    this.makeTexture(scene, 'spr_farmer', [
      '....BBBBB.......',
      '....B111B.......',
      '....B1B1B.......',
      '.....BBB........',
      '....TTTTT.......',
      '...TTTTTTT......',
      '...TT...TT......',
      '...TT...TT......',
      '....TTTTT.......',
      '....T...T.......',
      '....T...T.......',
      '....TT.TT.......',
      '................',
      '................',
      '................',
      '................',
    ], {
      B: 0x1a0a00,
      1: 0xe8c08a,
      T: 0xb8986a, // tan robes
    });

    /* ---- RODIAN (green alien, bug eyes) ---- */
    this.makeTexture(scene, 'spr_rodian', [
      '....BBBBB.......',
      '....B5B5B.......',
      '...BEBEBEB......',
      '.....BBB........',
      '....RRRRR.......',
      '...RRRRRRR......',
      '...RR...RR......',
      '...RR...RR......',
      '....RRRRR.......',
      '....R...R.......',
      '....R...R.......',
      '....RR.RR.......',
      '................',
      '................',
      '................',
      '................',
    ], {
      B: 0x0d2b00,
      5: 0x5fae5f, // green skin
      E: 0xffd700, // yellow eyes
      R: 0x2e6b2e, // dark green vest
    });

    /* ---- WOMP RAT ---- */
    this.makeTexture(scene, 'spr_womp_rat', [
      '................',
      '...BBB.......B..',
      '..BRRBB......B..',
      '.BRRRRBB...BBB..',
      '.BRR11RBB.BB....',
      '.BRRRRRBBB......',
      '.BBBBBBRBB......',
      '......BRRBB.....',
      '.......BRRBB....',
      '.......BBBBBB...',
      '.......B..B.B...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], {
      B: 0x3a2010,
      R: 0x8a5a3a, // rat brown
      1: 0xff2222, // red eyes
    });

    /* ---- PROTOCOL DROID (C3PO silhouette) ---- */
    this.makeTexture(scene, 'spr_droid', [
      '....BBBBB.......',
      '....BYYB B......',
      '....BYYB B......',
      '.....BBB........',
      '...BYYYYB.......',
      '..BYYYYYYY......',
      '..BY.....B......',
      '..BY.....B......',
      '..BYYYYYYY......',
      '..BY.B.B.B......',
      '..BY.B.B.B......',
      '...BBB.BBB......',
      '................',
      '................',
      '................',
      '................',
    ], {
      B: 0x1a1400,
      Y: 0xd4af37, // gold plating
    });

    /* ---- KYBER VEIN (crystal embedded in rock) ---- */
    this.makeTexture(scene, 'spr_kyber', [
      '....RRRRRR......',
      '...RRRRRRRR.....',
      '...RRcccRRR.....',
      '..RRRcCCcRR.....',
      '..RRcCCCcRRR....',
      '..RRcCCCcRRR....',
      '..RRRcCCcRR.....',
      '...RRcccRRR.....',
      '...RRRRRRRR.....',
      '....RRRRRR......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], {
      R: 0x6b5a3e, // rock
      c: 0x7fc8d8, // crystal edge
      C: 0xd0f4ff, // crystal bright
    });

    /* ---- TILES ---- */
    // Sand tile (16×16, tiled)
    this.makeTile(scene, 'tile_sand', 0xd9b27c, [
      [2, 3, 0xc8a06a, 1],
      [7, 5, 0xc8a06a, 1],
      [11, 9, 0xc8a06a, 1],
      [4, 12, 0xc8a06a, 1],
    ]);
    // Rock tile
    this.makeTile(scene, 'tile_rock', 0x7a6548, [
      [1, 1, 0x5a4a30, 3],
      [6, 4, 0x5a4a30, 2],
      [10, 8, 0x5a4a30, 3],
      [3, 11, 0x5a4a30, 2],
    ]);
    // Path tile (duracrete)
    this.makeTile(scene, 'tile_path', 0xb09a72, [
      [0, 0, 0xa08860, 16],  // top edge darker
    ]);
    // Cantina floor
    this.makeTile(scene, 'tile_cantina', 0x4a3d30, [
      [0, 0, 0x3a2d22, 8],
      [8, 8, 0x3a2d22, 8],
    ]);
    // Wall
    this.makeTile(scene, 'tile_wall', 0x2a2018, [
      [0, 0, 0x1a1208, 2],
      [2, 0, 0x3a3028, 2],
    ]);
    // Vaporator (for blocked water/vaporator tiles)
    this.makeTile(scene, 'tile_vapor', 0x3a5060, [
      [7, 0, 0x7ab8d0, 2],
    ]);
  },

  /* Solid base-color tile with a few highlight blobs */
  makeTile(scene, key, base, spots) {
    const S = RW.SPRITE_SCALE, W = 16, H = 16;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(base, 1);
    g.fillRect(0, 0, W * S, H * S);
    spots.forEach(([rx, ry, col, size]) => {
      g.fillStyle(col, 0.5);
      g.fillRect(rx * S, ry * S, size * S, S);
    });
    g.generateTexture(key, W * S, H * S);
    g.destroy();
  },
};
