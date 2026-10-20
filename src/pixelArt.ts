// Procedural Pixel Art Generator for PixelWorld
// Produces crisp 16/32-bit pixel art textures using Canvas 2D without external assets

export const pixelCanvasCache = new Map<string, HTMLCanvasElement>();

export function generatePixelTextures(scene: Phaser.Scene) {
  const textures = scene.textures;

  const makeCanvas = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  };

  const register = (key: string, canvas: HTMLCanvasElement) => {
    pixelCanvasCache.set(key, canvas);
    if (textures.exists(key)) textures.remove(key);
    textures.addCanvas(key, canvas);
  };

  // 1. Grass Base (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    // Base grass color
    ctx.fillStyle = '#2f6c44';
    ctx.fillRect(0, 0, 32, 32);

    // Subtle grass texture & highlights
    const darkGreen = '#255837';
    const lightGreen = '#3d8254';
    const highlightGreen = '#4e9b67';

    // Dotted grass blades and texture
    const bladePatterns = [
      [3, 4], [4, 3], [12, 8], [13, 7], [22, 5], [23, 4],
      [7, 18], [8, 17], [18, 22], [19, 21], [27, 15], [28, 14],
      [11, 27], [12, 26], [24, 28], [25, 27], [5, 10], [16, 12]
    ];

    ctx.fillStyle = lightGreen;
    bladePatterns.forEach(([x, y]) => {
      ctx.fillRect(x, y, 2, 3);
    });

    ctx.fillStyle = highlightGreen;
    bladePatterns.forEach(([x, y]) => {
      ctx.fillRect(x, y, 1, 2);
    });

    ctx.fillStyle = darkGreen;
    for (let x = 0; x < 32; x += 4) {
      for (let y = 0; y < 32; y += 4) {
        if ((x * 17 + y * 23) % 7 === 0) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
    register('tile_grass', canvas);
  }

  // 2. Grass with Yellow Flowers (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const baseImg = textures.get('tile_grass').getSourceImage() as HTMLCanvasElement;
    ctx.drawImage(baseImg, 0, 0);

    const flowers = [[6, 8], [22, 12], [10, 24], [25, 22]];
    flowers.forEach(([fx, fy]) => {
      ctx.fillStyle = '#1c452b';
      ctx.fillRect(fx - 1, fy, 4, 3);
      ctx.fillRect(fx, fy - 1, 2, 5);

      // Yellow petals
      ctx.fillStyle = '#f6d338';
      ctx.fillRect(fx - 1, fy, 4, 2);
      ctx.fillRect(fx, fy - 1, 2, 4);

      // White petal highlights
      ctx.fillStyle = '#fff4a3';
      ctx.fillRect(fx, fy, 2, 2);

      // Orange center
      ctx.fillStyle = '#e87e1f';
      ctx.fillRect(fx, fy, 1, 1);
    });
    register('tile_grass_flowers', canvas);
  }

  // 3. Grass with Pink Blossom Flowers (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const baseImg = textures.get('tile_grass').getSourceImage() as HTMLCanvasElement;
    ctx.drawImage(baseImg, 0, 0);

    const blossoms = [[8, 14], [20, 6], [16, 25], [26, 18]];
    blossoms.forEach(([fx, fy]) => {
      ctx.fillStyle = '#ea72a8';
      ctx.fillRect(fx - 1, fy, 4, 2);
      ctx.fillRect(fx, fy - 1, 2, 4);
      ctx.fillStyle = '#ffd1e5';
      ctx.fillRect(fx, fy, 1, 1);
    });
    register('tile_grass_pink', canvas);
  }

  // 4. Deep Water (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#1b4a68';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#163e58';
    for (let y = 0; y < 32; y += 4) {
      for (let x = 0; x < 32; x += 8) {
        if ((x + y) % 6 === 0) ctx.fillRect(x, y, 6, 2);
      }
    }

    ctx.fillStyle = '#26658a';
    ctx.fillRect(4, 6, 8, 2);
    ctx.fillRect(18, 14, 10, 2);
    ctx.fillRect(6, 22, 9, 2);
    ctx.fillRect(20, 28, 7, 2);

    // Ripple highlights
    ctx.fillStyle = '#4894bc';
    ctx.fillRect(6, 6, 4, 1);
    ctx.fillRect(20, 14, 5, 1);
    ctx.fillRect(8, 22, 4, 1);
    register('tile_water', canvas);
  }

  // 5. Shore / Water Bank (32x32) with Stone and Foam Edge
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    // Top half grass, bottom half water
    ctx.fillStyle = '#1b4a68';
    ctx.fillRect(0, 0, 32, 32);

    // Shoreline stone embankment
    ctx.fillStyle = '#3a5043';
    ctx.fillRect(0, 0, 32, 14);

    ctx.fillStyle = '#5c7465';
    for (let x = 0; x < 32; x += 6) {
      ctx.fillRect(x + 1, 4, 4, 6);
    }

    // Foam edge on water
    ctx.fillStyle = '#6ab8db';
    ctx.fillRect(0, 14, 32, 2);
    ctx.fillStyle = '#d4f2ff';
    ctx.fillRect(2, 14, 8, 1);
    ctx.fillRect(14, 14, 9, 1);
    ctx.fillRect(25, 14, 6, 1);

    register('tile_shore', canvas);
  }

  // 6. Cobblestone Path (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#7a6a53'; // warm dirt grout
    ctx.fillRect(0, 0, 32, 32);

    // Rounded cobblestones
    const stones = [
      { x: 1, y: 1, w: 9, h: 8, col: '#a89a84', hi: '#c7bca9', sh: '#6d5f4c' },
      { x: 12, y: 1, w: 9, h: 7, col: '#9c8e78', hi: '#bcb09c', sh: '#645644' },
      { x: 23, y: 1, w: 8, h: 8, col: '#a39580', hi: '#c3b7a4', sh: '#685a48' },

      { x: 2, y: 11, w: 12, h: 9, col: '#968872', hi: '#b6a995', sh: '#5f5240' },
      { x: 16, y: 10, w: 14, h: 10, col: '#a89a84', hi: '#c7bca9', sh: '#6d5f4c' },

      { x: 1, y: 22, w: 8, h: 9, col: '#a39580', hi: '#c3b7a4', sh: '#685a48' },
      { x: 11, y: 22, w: 10, h: 9, col: '#9c8e78', hi: '#bcb09c', sh: '#645644' },
      { x: 23, y: 22, w: 8, h: 9, col: '#a89a84', hi: '#c7bca9', sh: '#6d5f4c' },
    ];

    stones.forEach(s => {
      // base stone
      ctx.fillStyle = s.col;
      ctx.fillRect(s.x, s.y, s.w, s.h);

      // top highlight
      ctx.fillStyle = s.hi;
      ctx.fillRect(s.x + 1, s.y, s.w - 2, 2);
      ctx.fillRect(s.x, s.y + 1, 1, s.h - 2);

      // bottom shadow
      ctx.fillStyle = s.sh;
      ctx.fillRect(s.x + 1, s.y + s.h - 1, s.w - 1, 1);
      ctx.fillRect(s.x + s.w - 1, s.y + 1, 1, s.h - 1);
    });

    register('tile_path', canvas);
  }

  // 7. Stone Bridge Tile (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    // Water underneath
    ctx.fillStyle = '#18445e';
    ctx.fillRect(0, 0, 32, 32);

    // Bridge wood deck
    ctx.fillStyle = '#8f6844';
    ctx.fillRect(0, 4, 32, 24);

    // Wooden planks lines
    ctx.fillStyle = '#654426';
    for (let x = 0; x < 32; x += 8) {
      ctx.fillRect(x, 4, 1, 24);
    }

    // Wood grain highlights
    ctx.fillStyle = '#b0875c';
    for (let x = 2; x < 32; x += 8) {
      ctx.fillRect(x, 6, 4, 2);
      ctx.fillRect(x + 1, 16, 3, 2);
    }

    // Stone railings top & bottom
    ctx.fillStyle = '#515e58';
    ctx.fillRect(0, 2, 32, 4);
    ctx.fillRect(0, 26, 32, 4);

    ctx.fillStyle = '#83968d';
    ctx.fillRect(0, 2, 32, 2);
    ctx.fillRect(0, 26, 32, 2);

    // Stone rail posts
    ctx.fillStyle = '#343d39';
    ctx.fillRect(0, 1, 6, 6);
    ctx.fillRect(26, 1, 6, 6);
    ctx.fillRect(0, 25, 6, 6);
    ctx.fillRect(26, 25, 6, 6);

    register('tile_bridge', canvas);
  }

  // 8. Lush Oak Tree (64x72)
  {
    const { canvas, ctx } = makeCanvas(64, 72);

    // Tree shadow on ground
    ctx.fillStyle = '#153120';
    ctx.beginPath();
    ctx.ellipse(32, 64, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#5c3d23';
    ctx.fillRect(27, 42, 10, 23);
    ctx.fillStyle = '#3b2512';
    ctx.fillRect(34, 42, 3, 23);
    ctx.fillStyle = '#78502f';
    ctx.fillRect(27, 42, 3, 23);

    // Roots
    ctx.fillStyle = '#4c301a';
    ctx.fillRect(24, 62, 5, 3);
    ctx.fillRect(35, 62, 5, 3);

    // Foliage layers (Dark -> Mid -> Highlight)
    const drawLeafCluster = (cx: number, cy: number, r: number) => {
      // Dark under-layer
      ctx.fillStyle = '#1c4928';
      ctx.beginPath();
      ctx.arc(cx, cy + 3, r, 0, Math.PI * 2);
      ctx.fill();

      // Main foliage
      ctx.fillStyle = '#2f733e';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Light foliage
      ctx.fillStyle = '#439b55';
      ctx.beginPath();
      ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit tip
      ctx.fillStyle = '#6ec47d';
      ctx.beginPath();
      ctx.arc(cx - r * 0.35, cy - r * 0.4, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    };

    // Clusters making up the lush oak canopy
    drawLeafCluster(20, 36, 15);
    drawLeafCluster(44, 36, 15);
    drawLeafCluster(32, 22, 18);
    drawLeafCluster(18, 22, 14);
    drawLeafCluster(46, 22, 14);
    drawLeafCluster(32, 14, 13);

    register('prop_tree_oak', canvas);
  }

  // 9. Cherry Blossom / Sakura Tree (64x72)
  {
    const { canvas, ctx } = makeCanvas(64, 72);

    // Shadow
    ctx.fillStyle = '#153120';
    ctx.beginPath();
    ctx.ellipse(32, 64, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#4b3223';
    ctx.fillRect(28, 44, 9, 21);
    ctx.fillStyle = '#311f15';
    ctx.fillRect(34, 44, 3, 21);
    ctx.fillStyle = '#654431';
    ctx.fillRect(28, 44, 2, 21);

    const drawSakuraCluster = (cx: number, cy: number, r: number) => {
      ctx.fillStyle = '#9e3b6a';
      ctx.beginPath();
      ctx.arc(cx, cy + 3, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d45b8e';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f089b6';
      ctx.beginPath();
      ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.75, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd1e5';
      ctx.beginPath();
      ctx.arc(cx - r * 0.35, cy - r * 0.4, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    };

    drawSakuraCluster(20, 36, 14);
    drawSakuraCluster(44, 36, 14);
    drawSakuraCluster(32, 22, 17);
    drawSakuraCluster(18, 22, 13);
    drawSakuraCluster(46, 22, 13);
    drawSakuraCluster(32, 14, 12);

    register('prop_tree_sakura', canvas);
  }

  // 10. Water Fountain (48x48)
  {
    const { canvas, ctx } = makeCanvas(48, 48);

    // Shadow
    ctx.fillStyle = '#173624';
    ctx.beginPath();
    ctx.ellipse(24, 42, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer Stone Basin
    ctx.fillStyle = '#4a5953';
    ctx.beginPath();
    ctx.ellipse(24, 32, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7a8e85';
    ctx.beginPath();
    ctx.ellipse(24, 30, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water in basin
    ctx.fillStyle = '#2277a8';
    ctx.beginPath();
    ctx.ellipse(24, 30, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#65c4f2';
    ctx.beginPath();
    ctx.ellipse(24, 29, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone Pedestal
    ctx.fillStyle = '#3f4c47';
    ctx.fillRect(21, 16, 6, 14);
    ctx.fillStyle = '#859b91';
    ctx.fillRect(21, 16, 2, 14);

    // Upper Spout Basin
    ctx.fillStyle = '#5c6e67';
    ctx.beginPath();
    ctx.ellipse(24, 16, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water jets & spray
    ctx.fillStyle = '#9fe1ff';
    ctx.fillRect(23, 6, 2, 10);
    ctx.fillStyle = '#e8f7ff';
    ctx.fillRect(22, 4, 4, 3);
    ctx.fillRect(20, 8, 2, 2);
    ctx.fillRect(26, 8, 2, 2);

    register('prop_fountain', canvas);
  }

  // 11. Street Lamp / Lantern Post (24x48)
  {
    const { canvas, ctx } = makeCanvas(24, 48);

    // Ground shadow
    ctx.fillStyle = '#152c1e';
    ctx.beginPath();
    ctx.ellipse(12, 44, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone Base
    ctx.fillStyle = '#394640';
    ctx.fillRect(8, 40, 8, 4);
    ctx.fillStyle = '#5e6f67';
    ctx.fillRect(8, 40, 8, 1);

    // Metal pole
    ctx.fillStyle = '#222926';
    ctx.fillRect(11, 14, 2, 26);
    ctx.fillStyle = '#3a443f';
    ctx.fillRect(11, 14, 1, 26);

    // Lantern Bracket & Frame
    ctx.fillStyle = '#191f1c';
    ctx.fillRect(7, 10, 10, 2);
    ctx.fillRect(6, 12, 12, 1);
    ctx.fillRect(6, 13, 2, 9);
    ctx.fillRect(16, 13, 2, 9);
    ctx.fillRect(7, 22, 10, 2);

    // Roof cap
    ctx.fillStyle = '#222926';
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(5, 11);
    ctx.lineTo(19, 11);
    ctx.closePath();
    ctx.fill();

    // Glowing Candle / Light interior
    ctx.fillStyle = '#ffb326';
    ctx.fillRect(8, 13, 8, 9);
    ctx.fillStyle = '#fff4a8';
    ctx.fillRect(10, 14, 4, 6);

    register('prop_street_lamp', canvas);
  }

  // 12. Warm Lamp Light Glow Aura (96x96)
  {
    const { canvas, ctx } = makeCanvas(96, 96);
    const grad = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
    grad.addColorStop(0, 'rgba(255, 220, 110, 0.45)');
    grad.addColorStop(0.3, 'rgba(255, 180, 50, 0.22)');
    grad.addColorStop(0.7, 'rgba(255, 150, 30, 0.08)');
    grad.addColorStop(1, 'rgba(255, 130, 20, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(48, 48, 46, 0, Math.PI * 2);
    ctx.fill();
    register('light_halo', canvas);
  }

  // 13. Trimmed Topiary Bush (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#163622';
    ctx.beginPath();
    ctx.ellipse(16, 28, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c4928';
    ctx.beginPath();
    ctx.arc(16, 18, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2f773f';
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4fa864';
    ctx.beginPath();
    ctx.arc(14, 13, 6, 0, Math.PI * 2);
    ctx.fill();

    // Little flowers on bush
    ctx.fillStyle = '#ff8cb8';
    ctx.fillRect(10, 14, 2, 2);
    ctx.fillRect(20, 18, 2, 2);
    ctx.fillRect(15, 21, 2, 2);

    register('prop_bush', canvas);
  }

  // 14. BUILDINGS:
  // Central Palace: "Home" (128x110) with Python Logo Crest
  {
    const { canvas, ctx } = makeCanvas(128, 110);

    // Drop shadow
    ctx.fillStyle = '#12261a';
    ctx.beginPath();
    ctx.ellipse(64, 100, 58, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone Steps & Entrance Foundation
    ctx.fillStyle = '#3f4943';
    ctx.fillRect(20, 90, 88, 14);
    ctx.fillStyle = '#6b7b72';
    ctx.fillRect(22, 90, 84, 3);
    ctx.fillRect(36, 94, 56, 10);
    ctx.fillStyle = '#899c92';
    ctx.fillRect(38, 94, 52, 2);

    // Main Castle Wall (Stone blocks)
    ctx.fillStyle = '#d9d2c5'; // warm stone/stucco
    ctx.fillRect(24, 48, 80, 44);

    // Stone brick lines
    ctx.fillStyle = '#b3a998';
    for (let y = 54; y < 90; y += 8) {
      ctx.fillRect(24, y, 80, 1);
    }
    for (let x = 32; x < 100; x += 16) {
      ctx.fillRect(x, 54, 1, 36);
    }

    // Side Towers
    // Left Tower
    ctx.fillStyle = '#c5bcb0';
    ctx.fillRect(16, 36, 18, 56);
    ctx.fillStyle = '#9c9183';
    ctx.fillRect(16, 36, 2, 56);
    // Right Tower
    ctx.fillStyle = '#c5bcb0';
    ctx.fillRect(94, 36, 18, 56);
    ctx.fillStyle = '#9c9183';
    ctx.fillRect(110, 36, 2, 56);

    // Red Roofs
    // Left Tower Roof (Cone)
    ctx.fillStyle = '#9e2b25';
    ctx.beginPath();
    ctx.moveTo(25, 12);
    ctx.lineTo(12, 36);
    ctx.lineTo(38, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c73c33';
    ctx.beginPath();
    ctx.moveTo(25, 12);
    ctx.lineTo(16, 36);
    ctx.lineTo(28, 36);
    ctx.closePath();
    ctx.fill();

    // Right Tower Roof (Cone)
    ctx.fillStyle = '#9e2b25';
    ctx.beginPath();
    ctx.moveTo(103, 12);
    ctx.lineTo(90, 36);
    ctx.lineTo(116, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c73c33';
    ctx.beginPath();
    ctx.moveTo(103, 12);
    ctx.lineTo(94, 36);
    ctx.lineTo(106, 36);
    ctx.closePath();
    ctx.fill();

    // Center Main Gable Roof
    ctx.fillStyle = '#9e2b25';
    ctx.beginPath();
    ctx.moveTo(64, 14);
    ctx.lineTo(20, 50);
    ctx.lineTo(108, 50);
    ctx.closePath();
    ctx.fill();

    // Roof tile highlights
    ctx.fillStyle = '#c73c33';
    ctx.beginPath();
    ctx.moveTo(64, 14);
    ctx.lineTo(32, 50);
    ctx.lineTo(76, 50);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#df5248';
    ctx.fillRect(63, 14, 2, 36);

    // Grand Arched Doorway
    ctx.fillStyle = '#3d2516'; // dark wood door
    ctx.beginPath();
    ctx.arc(64, 76, 12, Math.PI, 0);
    ctx.rect(52, 76, 24, 16);
    ctx.fill();

    ctx.fillStyle = '#613b24';
    ctx.fillRect(54, 76, 9, 15);
    ctx.fillRect(65, 76, 9, 15);

    // Stone Arch Trim
    ctx.strokeStyle = '#5a6860';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 76, 13, Math.PI, 0);
    ctx.stroke();

    // Windows (Glowing with warm light)
    const drawWindow = (wx: number, wy: number) => {
      ctx.fillStyle = '#39281a';
      ctx.fillRect(wx - 1, wy - 1, 10, 14);
      ctx.fillStyle = '#ffcc4d';
      ctx.fillRect(wx, wy, 8, 12);
      ctx.fillStyle = '#fff4a3';
      ctx.fillRect(wx + 1, wy + 1, 3, 5);
      // Window bars
      ctx.fillStyle = '#543c26';
      ctx.fillRect(wx + 3, wy, 2, 12);
      ctx.fillRect(wx, wy + 5, 8, 2);
    };

    drawWindow(36, 62);
    drawWindow(84, 62);
    drawWindow(20, 48);
    drawWindow(98, 48);

    // Golden Crest Emblem on Center Facade
    const drawCastleCrest = (px: number, py: number) => {
      // Golden shield background
      ctx.fillStyle = '#1c2838';
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d9a741';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Golden pixel star / crest
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(px - 2, py - 8, 4, 16);
      ctx.fillRect(px - 8, py - 2, 16, 4);
      ctx.fillRect(px - 5, py - 5, 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    };

    drawCastleCrest(64, 38);

    register('building_home', canvas);

  }

  // 15. Standard Cottages & Guild Buildings:
  const makeBuildingTexture = (
    key: string,
    w: number,
    h: number,
    roofColor: string,
    roofHi: string,
    wallColor: string,
    wallDark: string,
    hasChimney = true
  ) => {
    const { canvas, ctx } = makeCanvas(w, h);

    // Shadow
    ctx.fillStyle = '#12261a';
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 8, w * 0.44, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chimney with smoke
    if (hasChimney) {
      ctx.fillStyle = '#54463c';
      ctx.fillRect(w - 24, 10, 8, 20);
      ctx.fillStyle = '#7a6759';
      ctx.fillRect(w - 25, 9, 10, 3);
      // Smoke puffs
      ctx.fillStyle = 'rgba(230, 240, 245, 0.7)';
      ctx.beginPath();
      ctx.arc(w - 20, 6, 4, 0, Math.PI * 2);
      ctx.arc(w - 18, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main Walls
    ctx.fillStyle = wallColor;
    ctx.fillRect(12, 38, w - 24, h - 46);

    // Timber framing / stone trims
    ctx.fillStyle = wallDark;
    ctx.fillRect(12, 38, 4, h - 46);
    ctx.fillRect(w - 16, 38, 4, h - 46);
    ctx.fillRect(12, h - 12, w - 24, 4);

    // Pitch Roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(w / 2, 8);
    ctx.lineTo(6, 40);
    ctx.lineTo(w - 6, 40);
    ctx.closePath();
    ctx.fill();

    // Roof Highlight
    ctx.fillStyle = roofHi;
    ctx.beginPath();
    ctx.moveTo(w / 2, 8);
    ctx.lineTo(16, 40);
    ctx.lineTo(w / 2 + 10, 40);
    ctx.closePath();
    ctx.fill();

    // Wooden Door
    ctx.fillStyle = '#3d2516';
    ctx.beginPath();
    ctx.arc(w / 2, h - 22, 7, Math.PI, 0);
    ctx.rect(w / 2 - 7, h - 22, 14, 14);
    ctx.fill();
    ctx.fillStyle = '#ffbe3b';
    ctx.fillRect(w / 2 + 3, h - 16, 2, 2); // knob

    // Glowing Windows
    const drawWin = (wx: number, wy: number) => {
      ctx.fillStyle = '#261b12';
      ctx.fillRect(wx - 1, wy - 1, 10, 10);
      ctx.fillStyle = '#ffd152';
      ctx.fillRect(wx, wy, 8, 8);
      ctx.fillStyle = '#593e27';
      ctx.fillRect(wx + 3, wy, 2, 8);
      ctx.fillRect(wx, wy + 3, 8, 2);
    };

    drawWin(20, h - 30);
    drawWin(w - 28, h - 30);

    register(key, canvas);
  };

  // Tutorials Cottage (Red/orange shingles, cozy timber)
  makeBuildingTexture('building_tutorials', 96, 84, '#a33827', '#cb4a35', '#e3dacd', '#70543e', true);

  // Library Reference (Slate blue guild, stately stone)
  makeBuildingTexture('building_library', 96, 86, '#2d547d', '#3d71a8', '#cfcac2', '#595f66', false);

  // Examples Lab (Warm purple/brown roof, tech workshop)
  makeBuildingTexture('building_examples', 96, 82, '#6c3b82', '#8e52a8', '#dbd3c8', '#614838', true);

  // What's New Pavilion (Cerulean blue roof, modern timber)
  makeBuildingTexture('building_whats_new', 92, 82, '#2563a6', '#3b82d4', '#e2ddd6', '#525a66', false);

  // How To Guides Workshop (Amber orange roof)
  makeBuildingTexture('building_guides', 96, 84, '#b86623', '#d97d32', '#dcd4c7', '#5f4633', true);

  // FAQs House (Violet / plum roof, cottage style)
  makeBuildingTexture('building_faqs', 92, 82, '#7a3e75', '#9e5297', '#e0d8cf', '#63493b', true);

  // University Quad / Main Hall (Neoclassical stone, copper green dome roof)
  makeBuildingTexture('building_quad', 96, 88, '#326b52', '#459170', '#e8e2d5', '#575249', false);

  // Studio / Project Showcase (Modern timber & terracotta workshop)
  makeBuildingTexture('building_project', 96, 84, '#b35422', '#d96c32', '#ded6cb', '#594537', true);

  // 16. External Links Dock / Portal Arch (80x56)
  {
    const { canvas, ctx } = makeCanvas(80, 56);
    // Water underneath
    ctx.fillStyle = '#1b4a68';
    ctx.fillRect(0, 0, 80, 56);

    // Wooden Pier Planks
    ctx.fillStyle = '#7a5633';
    ctx.fillRect(10, 20, 60, 32);

    ctx.fillStyle = '#54391e';
    for (let x = 10; x < 70; x += 8) {
      ctx.fillRect(x, 20, 1, 32);
    }
    ctx.fillStyle = '#9c7044';
    for (let x = 12; x < 70; x += 8) {
      ctx.fillRect(x, 22, 4, 2);
    }

    // Mooring Bollards / Wooden Posts
    ctx.fillStyle = '#382512';
    ctx.fillRect(8, 16, 5, 38);
    ctx.fillRect(67, 16, 5, 38);
    ctx.fillStyle = '#593c20';
    ctx.fillRect(8, 16, 5, 3);
    ctx.fillRect(67, 16, 5, 3);

    // Stone Portal Arch
    ctx.fillStyle = '#4c5c56';
    ctx.fillRect(24, 4, 6, 28);
    ctx.fillRect(50, 4, 6, 28);
    ctx.fillRect(24, 4, 32, 6);

    // Swirling Portal Magic
    const grad = ctx.createRadialGradient(40, 18, 2, 40, 18, 14);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#a266ff');
    grad.addColorStop(0.8, '#442299');
    grad.addColorStop(1, 'rgba(30, 10, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(40, 18, 13, 0, Math.PI * 2);
    ctx.fill();

    register('dock_portal', canvas);
  }

  // 17. BADGE ICONS (32x32)
  const makeBadge = (key: string, bgCol: string, borderCol: string, drawIcon: (ctx: CanvasRenderingContext2D) => void) => {
    const { canvas, ctx } = makeCanvas(32, 32);

    // Beveled Badge Background
    ctx.fillStyle = '#141c24';
    ctx.beginPath();
    ctx.roundRect(0, 0, 32, 32, 6);
    ctx.fill();

    ctx.fillStyle = bgCol;
    ctx.beginPath();
    ctx.roundRect(2, 2, 28, 28, 5);
    ctx.fill();

    // Top shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(3, 3, 26, 4);

    // Border
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw glyph
    drawIcon(ctx);

    register(key, canvas);
  };

  // Badge: Book (Tutorials)
  makeBadge('badge_book', '#2b6fb3', '#5ea4ee', ctx => {
    ctx.fillStyle = '#ffffff';
    // Left page
    ctx.fillRect(8, 9, 7, 13);
    // Right page
    ctx.fillRect(17, 9, 7, 13);
    // Spine
    ctx.fillStyle = '#1c4878';
    ctx.fillRect(15, 9, 2, 13);
    // Page lines
    ctx.fillStyle = '#89bbf0';
    ctx.fillRect(10, 12, 4, 2);
    ctx.fillRect(10, 15, 4, 2);
    ctx.fillRect(19, 12, 4, 2);
    ctx.fillRect(19, 15, 4, 2);
  });

  // Badge: Gear (Library Reference)
  makeBadge('badge_gear', '#2673a6', '#63b1eb', ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 7, 0, Math.PI * 2);
    ctx.fill();

    // Cogs
    ctx.fillRect(14, 6, 4, 20);
    ctx.fillRect(6, 14, 20, 4);
    ctx.fillRect(9, 9, 14, 14);

    // Center hole
    ctx.fillStyle = '#2673a6';
    ctx.beginPath();
    ctx.arc(16, 16, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Badge: Code (Examples)
  makeBadge('badge_code', '#6d3999', '#ab6eed', ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('</>', 16, 16);
  });

  // Badge: Lightbulb (How To Guides)
  makeBadge('badge_bulb', '#d97316', '#ff9f47', ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 13, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(14, 18, 4, 4);
    ctx.fillStyle = '#d97316';
    ctx.fillRect(15, 20, 2, 2);
  });

  // Badge: Question Mark (FAQs)
  makeBadge('badge_help', '#7a318f', '#b85cd4', ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 16, 16);
  });

  // Badge: Document (What's New)
  makeBadge('badge_doc', '#247db5', '#57b5f2', ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 7, 14, 18);
    ctx.fillStyle = '#247db5';
    ctx.fillRect(12, 11, 8, 2);
    ctx.fillRect(12, 15, 8, 2);
    ctx.fillRect(12, 19, 5, 2);
  });

  // Badge: External Link (Portal)
  makeBadge('badge_external', '#68369e', '#a364eb', ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 12, 11, 11);
    ctx.fillStyle = '#68369e';
    ctx.fillRect(10, 14, 7, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, 8, 9, 3);
    ctx.fillRect(21, 8, 3, 9);
    // Arrow diagonal
    ctx.beginPath();
    ctx.moveTo(15, 17);
    ctx.lineTo(23, 9);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  });

  // Badge: Campus / College (Graduation cap & shield)
  makeBadge('badge_campus', '#8f293a', '#c74e62', ctx => {
    ctx.fillStyle = '#ffffff';
    // Diamond mortarboard
    ctx.beginPath();
    ctx.moveTo(16, 8);
    ctx.lineTo(26, 13);
    ctx.lineTo(16, 18);
    ctx.lineTo(6, 13);
    ctx.closePath();
    ctx.fill();
    // Cap base
    ctx.fillRect(11, 17, 10, 5);
    // Tassel
    ctx.fillStyle = '#f6d338';
    ctx.fillRect(25, 13, 2, 7);
  });

  // Badge: Project (Rocket / Star)
  makeBadge('badge_project', '#1d7350', '#3cc28d', ctx => {
    ctx.fillStyle = '#ffffff';
    // Rocket body
    ctx.beginPath();
    ctx.moveTo(16, 7);
    ctx.lineTo(21, 15);
    ctx.lineTo(19, 21);
    ctx.lineTo(13, 21);
    ctx.lineTo(11, 15);
    ctx.closePath();
    ctx.fill();
    // Porthole
    ctx.fillStyle = '#1d7350';
    ctx.beginPath();
    ctx.arc(16, 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Flame
    ctx.fillStyle = '#f6d338';
    ctx.fillRect(14, 22, 4, 3);
  });

  // Badge: Landmark (Golden Star)
  makeBadge('badge_landmark', '#c98a1a', '#ffc44d', ctx => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(16, 6);
    ctx.lineTo(19, 13);
    ctx.lineTo(26, 14);
    ctx.lineTo(21, 19);
    ctx.lineTo(23, 26);
    ctx.lineTo(16, 22);
    ctx.lineTo(9, 26);
    ctx.lineTo(11, 19);
    ctx.lineTo(6, 14);
    ctx.lineTo(13, 13);
    ctx.closePath();
    ctx.fill();
  });

  // Badge: Home / Headquarters (Golden Crown & Citadel)
  makeBadge('badge_home', '#b45309', '#f59e0b', ctx => {
    ctx.fillStyle = '#ffffff';
    // Castle / Crown base
    ctx.fillRect(8, 16, 16, 8);
    // Three crown peaks
    ctx.fillRect(8, 11, 4, 5);
    ctx.fillRect(14, 9, 4, 7);
    ctx.fillRect(20, 11, 4, 5);
    // Jewels
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(9, 12, 2, 2);
    ctx.fillRect(15, 10, 2, 2);
    ctx.fillRect(21, 12, 2, 2);
    // Center emblem
    ctx.fillStyle = '#b45309';
    ctx.fillRect(14, 18, 4, 4);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(15, 19, 2, 2);
  });

  // 18. PLAYER CHARACTER (32x32 frames)
  // Directional idle and walk frames for smooth, authentic RPG movement
  const makePlayerFrame = (key: string, dir: 'down' | 'up' | 'left' | 'right', step: 0 | 1 | 2) => {
    const { canvas, ctx } = makeCanvas(32, 32);

    // 1. Soft Ground Shadow
    ctx.fillStyle = 'rgba(10, 22, 16, 0.55)';
    ctx.beginPath();
    ctx.ellipse(16, 29, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hair Base & Volume
    ctx.fillStyle = '#361e12'; // dark chestnut outline
    ctx.fillRect(10, 6, 12, 7);
    ctx.fillRect(9, 8, 14, 5);

    ctx.fillStyle = '#63381c'; // main hair tone
    ctx.fillRect(10, 7, 12, 5);
    ctx.fillRect(12, 6, 8, 2);

    // Hair highlight
    ctx.fillStyle = '#8f572e';
    ctx.fillRect(13, 7, 4, 1);

    // 3. Face / Skin
    ctx.fillStyle = '#fed7aa'; // warm anime skin tone
    ctx.fillRect(11, 11, 10, 7);
    // Cheeks blush
    ctx.fillStyle = '#fca5a5';
    if (dir === 'down') {
      ctx.fillRect(11, 15, 2, 1);
      ctx.fillRect(19, 15, 2, 1);
    }

    // 4. Eyes & Expressions
    if (dir === 'down') {
      // Dark iris
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(13, 13, 2, 3);
      ctx.fillRect(17, 13, 2, 3);
      // Sparkle / Glint
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(13, 13, 1, 1);
      ctx.fillRect(17, 13, 1, 1);
    } else if (dir === 'left') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(11, 13, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 13, 1, 1);
    } else if (dir === 'right') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(19, 13, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, 13, 1, 1);
    } else if (dir === 'up') {
      // Back of hair
      ctx.fillStyle = '#361e12';
      ctx.fillRect(10, 9, 12, 8);
      ctx.fillStyle = '#63381c';
      ctx.fillRect(11, 10, 10, 6);
    }

    // 5. Explorer Crimson Scarf / Neckwear (Pops vividly against all surfaces!)
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(11, 17, 10, 2);
    if (dir === 'down') {
      // Scarf knot & tails
      ctx.fillStyle = '#be123c';
      ctx.fillRect(15, 18, 2, 3);
      // Gold Brooch Pin
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(15, 17, 2, 1);
    } else if (dir === 'up') {
      ctx.fillStyle = '#be123c';
      ctx.fillRect(12, 17, 8, 2);
    }

    // 6. Torso: Azure Adventurer Tunic & Leather Satchel
    ctx.fillStyle = '#2563eb'; // vivid royal blue
    ctx.fillRect(11, 19, 10, 5);

    // Leather Travel Satchel Strap
    ctx.fillStyle = '#78350f';
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(11, 19, 2, 2);
      ctx.fillRect(13, 21, 2, 2);
      ctx.fillRect(15, 23, 2, 1);
    }

    // Leather Satchel Pouch on Hip
    ctx.fillStyle = '#92400e';
    if (dir === 'right') {
      ctx.fillRect(10, 21, 3, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(11, 22, 1, 1);
    } else if (dir === 'left') {
      ctx.fillRect(19, 21, 3, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(20, 22, 1, 1);
    } else if (dir === 'down') {
      ctx.fillRect(19, 21, 3, 3);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(20, 22, 1, 1);
    } else if (dir === 'up') {
      // Backpack on back
      ctx.fillStyle = '#78350f';
      ctx.fillRect(12, 19, 8, 5);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(13, 20, 6, 3);
    }

    // 7. Leather Belt & Buckle
    ctx.fillStyle = '#5c2d13';
    ctx.fillRect(11, 24, 10, 2);
    ctx.fillStyle = '#fbbf24'; // polished gold buckle
    ctx.fillRect(15, 24, 2, 2);

    // 8. Legs (Dark Adventurer Pants) & Boots with Walk Strides
    ctx.fillStyle = '#1e293b'; // dark slate pants
    ctx.fillStyle = '#451a03'; // sturdy leather boots

    if (step === 0) {
      // Idle Standing
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(12, 26, 3, 2);
      ctx.fillRect(17, 26, 3, 2);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(12, 28, 3, 2);
      ctx.fillRect(17, 28, 3, 2);
      // Arms hanging
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(9, 19, 2, 5);
      ctx.fillRect(21, 19, 2, 5);
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(9, 24, 2, 1);
      ctx.fillRect(21, 24, 2, 1);
    } else if (step === 1) {
      // Walk Step A
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(11, 25, 4, 3);
      ctx.fillRect(17, 26, 3, 2);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(11, 28, 4, 2);
      ctx.fillRect(17, 28, 3, 2);
      // Arms swinging
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(9, 18, 2, 5);
      ctx.fillRect(21, 20, 2, 5);
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(9, 23, 2, 1);
      ctx.fillRect(21, 25, 2, 1);
    } else {
      // Walk Step B
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(12, 26, 3, 2);
      ctx.fillRect(17, 25, 4, 3);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(12, 28, 3, 2);
      ctx.fillRect(17, 28, 4, 2);
      // Arms swinging reverse
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(9, 20, 2, 5);
      ctx.fillRect(21, 18, 2, 5);
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(9, 25, 2, 1);
      ctx.fillRect(21, 23, 2, 1);
    }

    register(key, canvas);
  };

  makePlayerFrame('player_down_0', 'down', 0);
  makePlayerFrame('player_down_1', 'down', 1);
  makePlayerFrame('player_down_2', 'down', 2);

  makePlayerFrame('player_up_0', 'up', 0);
  makePlayerFrame('player_up_1', 'up', 1);
  makePlayerFrame('player_up_2', 'up', 2);

  makePlayerFrame('player_left_0', 'left', 0);
  makePlayerFrame('player_left_1', 'left', 1);
  makePlayerFrame('player_left_2', 'left', 2);

  makePlayerFrame('player_right_0', 'right', 0);
  makePlayerFrame('player_right_1', 'right', 1);
  makePlayerFrame('player_right_2', 'right', 2);

  // 19. NPC Characters (Instructor, Scholar, Coder)
  const makeNPC = (key: string, hairCol: string, robeCol: string, hasHat = false) => {
    const { canvas, ctx } = makeCanvas(32, 32);

    ctx.fillStyle = '#14291c';
    ctx.beginPath();
    ctx.ellipse(16, 29, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = hairCol;
    ctx.fillRect(11, 8, 10, 6);

    if (hasHat) {
      // Wizard / scholar cap
      ctx.fillStyle = '#342247';
      ctx.beginPath();
      ctx.moveTo(16, 1);
      ctx.lineTo(8, 9);
      ctx.lineTo(24, 9);
      ctx.closePath();
      ctx.fill();
    }

    // Face
    ctx.fillStyle = '#ffcf9e';
    ctx.fillRect(11, 11, 10, 7);
    ctx.fillStyle = '#261b14';
    ctx.fillRect(13, 14, 2, 2);
    ctx.fillRect(17, 14, 2, 2);

    // Beard / mustache for instructor
    if (key === 'npc_instructor') {
      ctx.fillStyle = '#9c9c9c';
      ctx.fillRect(12, 16, 8, 3);
    }

    // Robe
    ctx.fillStyle = robeCol;
    ctx.fillRect(10, 18, 12, 9);
    ctx.fillStyle = '#f0c438';
    ctx.fillRect(15, 18, 2, 9);

    // Shoes
    ctx.fillStyle = '#261b14';
    ctx.fillRect(12, 27, 3, 2);
    ctx.fillRect(17, 27, 3, 2);

    register(key, canvas);
  };

  makeNPC('npc_instructor', '#858585', '#57371c', true); // Wise instructor
  makeNPC('npc_scholar', '#42281a', '#244878', false); // Scholar
  makeNPC('npc_coder', '#e38227', '#6c3285', false); // Coder
}
