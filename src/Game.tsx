import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { World, Page } from './types';
import { generatePixelTextures, pixelCanvasCache } from './pixelArt';

interface GameProps {
  world: World;
  onSelect: (p: Page) => void;
  selectedId?: string;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomChange?: (newZoom: number) => void;
  onPlayerPos?: (pos: { x: number; y: number; pctX: number; pctY: number }) => void;
}

export default function Game({
  world,
  onSelect,
  selectedId,
  zoom = 1.15,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onPlayerPos,
}: GameProps) {
  const host = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<any>(null);
  const latest = useRef({ world, onSelect, selectedId, zoom, onZoomIn, onZoomOut, onZoomChange, onPlayerPos });
  latest.current = { world, onSelect, selectedId, zoom, onZoomIn, onZoomOut, onZoomChange, onPlayerPos };

  // Handle external zoom updates with smooth camera animation & intelligent centering
  useEffect(() => {
    if (sceneRef.current && sceneRef.current.updateZoom) {
      sceneRef.current.updateZoom(zoom);
    }
  }, [zoom]);

  useEffect(() => {
    if (!host.current) return;

    class PixelScene extends Phaser.Scene {
      player!: Phaser.Physics.Arcade.Sprite;
      playerBeacon!: Phaser.GameObjects.Ellipse;
      playerTag!: Phaser.GameObjects.Text;
      keys: any;
      buildings: Phaser.GameObjects.Container[] = [];
      npcs: Phaser.GameObjects.Sprite[] = [];
      interactPrompt!: Phaser.GameObjects.Container;
      promptTextObj!: Phaser.GameObjects.Text;
      obstacles!: Phaser.Physics.Arcade.StaticGroup;
      nearestPage: Page | null = null;
      stepTimer = 0;
      stepFrame = 0;
      currentDir: 'down' | 'up' | 'left' | 'right' = 'down';

      // Mouse Drag Panning state
      isDragging = false;
      dragStartX = 0;
      dragStartY = 0;
      camStartX = 0;
      camStartY = 0;

      // Export entire world map to high-resolution PNG
      exportFullMap = () => {
        const w = latest.current.world;
        if (!w) return;

        const tile = 32;
        const gridW = Math.max(54, w.width || 54);
        const gridH = Math.max(48, w.height || 48);

        const canvas = document.createElement('canvas');
        canvas.width = gridW * tile;
        canvas.height = gridH * tile;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        // 1. Fill entire background with deep ocean water (Guarantees zero blank/white areas)
        ctx.fillStyle = '#1b4a68';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const getImg = (key: string): HTMLCanvasElement | null => {
          if (pixelCanvasCache.has(key)) {
            return pixelCanvasCache.get(key)!;
          }
          if (this.textures.exists(key)) {
            const src = this.textures.get(key).getSourceImage();
            if (src instanceof HTMLCanvasElement || src instanceof Image) {
              return src as any;
            }
          }
          return null;
        };

        const waterImg = getImg('tile_water');
        const grassImg = getImg('tile_grass');
        const flowersImg = getImg('tile_grass_flowers');
        const pinkImg = getImg('tile_grass_pink');
        const pathImg = getImg('tile_path');
        const bridgeImg = getImg('tile_bridge');
        const fountainImg = getImg('prop_fountain');
        const lampImg = getImg('prop_street_lamp');
        const haloImg = getImg('light_halo');
        const oakImg = getImg('prop_tree_oak');
        const sakuraImg = getImg('prop_tree_sakura');
        const bushImg = getImg('prop_bush');

        // 2. Draw Terrain Layer (Water + Grass)
        for (let x = 0; x < gridW; x++) {
          for (let y = 0; y < gridH; y++) {
            const isWater = this.isWaterTile(x, y, gridW, gridH);
            if (isWater) {
              if (waterImg) ctx.drawImage(waterImg, x * tile, y * tile);
            } else {
              const n = (x * 17 + y * 31) % 19;
              let img = grassImg;
              if (n === 3 || n === 7) img = flowersImg;
              else if (n === 11 || n === 15) img = pinkImg;
              if (img) ctx.drawImage(img, x * tile, y * tile);
            }
          }
        }

        // 3. Draw Paths and Bridges
        const pathCoords = this.getPathTiles(w, gridW, gridH);
        pathCoords.forEach(coord => {
          const [px, py] = coord.split(',').map(Number);
          const isWater = this.isWaterTile(px, py, gridW, gridH);
          const pImg = isWater ? bridgeImg : pathImg;
          if (pImg) ctx.drawImage(pImg, px * tile, py * tile);
        });

        // 4. Draw Fountains in Town Plaza
        const home = w.pages[0] || { x: 24, y: 6 };
        if (fountainImg) {
          ctx.drawImage(fountainImg, (home.x - 3) * tile, (home.y + 2) * tile);
          ctx.drawImage(fountainImg, (home.x + 3) * tile, (home.y + 2) * tile);
        }

        // 5. Draw Street Lamps beside paths
        const lampCoords = this.getLampCoords(pathCoords, w, gridW, gridH);
        lampCoords.forEach(([lx, ly]) => {
          if (haloImg) ctx.drawImage(haloImg, lx * tile - 32, ly * tile - 32);
          if (lampImg) ctx.drawImage(lampImg, lx * tile + 4, ly * tile - 12);
        });

        // 6. Draw Trees and Bushes in Green Spaces
        const treeCoords = this.getTreeCoords(pathCoords, w, gridW, gridH);
        treeCoords.forEach(([tx, ty, type]) => {
          const tImg = type === 'sakura' ? sakuraImg : type === 'bush' ? bushImg : oakImg;
          if (tImg) {
            const ox = type === 'bush' ? tx * tile + 8 : tx * tile;
            const oy = type === 'bush' ? ty * tile + 10 : ty * tile - 24;
            ctx.drawImage(tImg, ox, oy);
          }
        });

        // 7. Draw Buildings (Sorted by Y for proper 2.5D perspective)
        const sortedPages = [...w.pages].sort((a, b) => a.y - b.y);
        sortedPages.forEach(p => {
          const bx = p.x * tile + 16;
          const by = p.y * tile + 16;

          let bldgKey = 'building_library';
          if (p.buildingType === 'home') bldgKey = 'building_home';
          else if (p.buildingType === 'quad') bldgKey = 'building_quad';
          else if (p.buildingType === 'project') bldgKey = 'building_project';
          else if (p.buildingType === 'tutorials') bldgKey = 'building_tutorials';
          else if (p.buildingType === 'examples') bldgKey = 'building_examples';
          else if (p.buildingType === 'whats_new') bldgKey = 'building_whats_new';
          else if (p.buildingType === 'guides') bldgKey = 'building_guides';
          else if (p.buildingType === 'faqs') bldgKey = 'building_faqs';
          else if (p.buildingType === 'dock') bldgKey = 'dock_portal';

          const bImg = getImg(bldgKey);
          if (bImg) {
            ctx.drawImage(bImg, bx - bImg.width / 2, by - bImg.height * 0.8);
          }

          // Generous Signboard with Full Title Visibility (Dynamic width up to 184px, height 26px)
          const signY = p.buildingType === 'home' || p.buildingType === 'quad' ? -70 : -54;
          const titleLen = p.title.length;
          const signW = Math.max(130, Math.min(184, Math.round(titleLen * 8.6 + 26)));
          const signH = 26;
          const sx = bx - signW / 2;
          const sy = by + signY - signH / 2;

          // Drop Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.fillRect(sx, sy + 2, signW, signH);

          // Card Background
          ctx.fillStyle = '#09111a';
          ctx.fillRect(sx, sy, signW, signH);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(sx, sy, signW, signH);

          // Crisp High-Contrast White Text (12.5px font)
          ctx.font = "bold 12.5px 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.title, bx, by + signY);

          // Badge Icon
          let badgeKey = 'badge_doc';
          if (p.badgeIcon === 'home') badgeKey = 'badge_home';
          else if (p.badgeIcon === 'campus') badgeKey = 'badge_campus';
          else if (p.badgeIcon === 'project') badgeKey = 'badge_project';
          else if (p.badgeIcon === 'landmark') badgeKey = 'badge_landmark';
          else if (p.badgeIcon === 'book') badgeKey = 'badge_book';
          else if (p.badgeIcon === 'gear') badgeKey = 'badge_gear';
          else if (p.badgeIcon === 'code') badgeKey = 'badge_code';
          else if (p.badgeIcon === 'bulb') badgeKey = 'badge_bulb';
          else if (p.badgeIcon === 'help') badgeKey = 'badge_help';
          else if (p.badgeIcon === 'external') badgeKey = 'badge_external';

          const badgeImg = getImg(badgeKey);
          if (badgeImg) {
            // Position badge cleanly above signboard with 4px gap (zero overlap with text or top border)
            ctx.drawImage(badgeImg, bx - 16, by + signY - 49);
          }
        });

        // 8. Draw Player Character
        const playerImg = getImg('player_down_0');
        if (playerImg && this.player) {
          ctx.drawImage(playerImg, this.player.x - 16, this.player.y - 16);
        }

        // 9. Town Map Legend Card (Bottom-Left Corner)
        const plaqueW = 280;
        const plaqueH = 68;
        const px = 24;
        const py = gridH * tile - plaqueH - 24;

        ctx.fillStyle = 'rgba(11, 20, 32, 0.95)';
        ctx.fillRect(px, py, plaqueW, plaqueH);
        ctx.strokeStyle = '#38c474';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, plaqueW, plaqueH);

        ctx.font = "bold 15px 'Space Grotesk', sans-serif";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(w.titleBanner, px + 16, py + 12);

        ctx.font = "12px 'Space Grotesk', sans-serif";
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${w.pages.length} Locations · Connected Roads · PixelWorld 🎮`, px + 16, py + 36);

        // Download PNG
        canvas.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${w.name.replace(/[^a-z0-9-]/gi, '-')}-pixelworld-fullmap.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }, 'image/png');
      };

      // Helper: Determines if a tile coordinate is ocean water (natural rounded island)
      isWaterTile(x: number, y: number, gridW: number, gridH: number): boolean {
        // Outer 4 border tiles are deep water
        if (x < 4 || x >= gridW - 4 || y < 3 || y >= gridH - 3) return true;

        // Smooth natural rounded corners for the island
        const cornerSize = 7;
        const tl = x <= cornerSize && y <= cornerSize && x + y <= cornerSize + 2;
        const tr = x >= gridW - 1 - cornerSize && y <= cornerSize && (gridW - 1 - x) + y <= cornerSize + 2;
        const bl = x <= cornerSize && y >= gridH - 1 - cornerSize && x + (gridH - 1 - y) <= cornerSize + 2;
        const br =
          x >= gridW - 1 - cornerSize &&
          y >= gridH - 1 - cornerSize &&
          (gridW - 1 - x) + (gridH - 1 - y) <= cornerSize + 2;

        return tl || tr || bl || br;
      }

      // Helper: Generates the structured village street network
      getPathTiles(w: World, gridW: number, gridH: number): Set<string> {
        const pathTiles = new Set<string>();

        const buildingFootprints = new Set<string>();
        w.pages.forEach(p => {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 0; dy++) {
              buildingFootprints.add(`${p.x + dx},${p.y + dy}`);
            }
          }
        });

        const addPoint = (x: number, y: number) => {
          if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
            // NEVER allow paths to intersect building walls/roofs!
            if (!buildingFootprints.has(`${x},${y}`)) {
              pathTiles.add(`${x},${y}`);
            }
          }
        };

        const home = w.pages[0] || { x: 24, y: 6 };
        const centerAveX = home.x;

        // 1. Central Plaza around Home
        for (let px = centerAveX - 2; px <= centerAveX + 2; px++) {
          for (let py = home.y + 1; py <= home.y + 3; py++) {
            addPoint(px, py);
          }
        }

        // 2. Central North-South Avenue
        const maxBY = Math.max(...w.pages.map(p => p.y));
        for (let py = home.y + 1; py <= maxBY + 2; py++) {
          addPoint(centerAveX, py);
          addPoint(centerAveX + 1, py);
        }

        // 3. Boulevards in front of each row of buildings
        const uniqueRows = Array.from(new Set(w.pages.map(p => p.y))).sort((a, b) => a - b);
        const minBX = Math.max(5, Math.min(...w.pages.map(p => p.x)) - 1);
        const maxBX = Math.min(gridW - 6, Math.max(...w.pages.map(p => p.x)) + 1);

        uniqueRows.forEach(ry => {
          const streetY = ry + 2; // directly in front of the row
          for (let sx = minBX; sx <= maxBX; sx++) {
            addPoint(sx, streetY);
          }
        });

        // 4. Walkways connecting each building's door to the street
        w.pages.forEach(p => {
          addPoint(p.x, p.y + 1); // doorstep
          addPoint(p.x, p.y + 2); // connection to boulevard
        });

        return pathTiles;
      }

      // Helper: Places street lamps on grass beside paths
      getLampCoords(pathTiles: Set<string>, w: World, gridW: number, gridH: number): [number, number][] {
        const buildingFootprints = new Set<string>();
        w.pages.forEach(p => {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              buildingFootprints.add(`${p.x + dx},${p.y + dy}`);
            }
          }
        });

        const lamps: [number, number][] = [];
        w.pages.forEach(p => {
          // Place two lamps flanking the walkway of each building on grass
          const leftLamp = `${p.x - 2},${p.y + 2}`;
          const rightLamp = `${p.x + 2},${p.y + 2}`;

          if (!buildingFootprints.has(leftLamp) && !pathTiles.has(leftLamp)) {
            lamps.push([p.x - 2, p.y + 2]);
          }
          if (!buildingFootprints.has(rightLamp) && !pathTiles.has(rightLamp)) {
            lamps.push([p.x + 2, p.y + 2]);
          }
        });

        return lamps;
      }

      // Helper: Places trees and bushes in green courtyard spaces
      getTreeCoords(pathTiles: Set<string>, w: World, gridW: number, gridH: number): [number, number, string][] {
        const buildingFootprints = new Set<string>();
        w.pages.forEach(p => {
          for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
              buildingFootprints.add(`${p.x + dx},${p.y + dy}`);
            }
          }
        });

        const trees: [number, number, string][] = [];
        for (let x = 5; x < gridW - 5; x += 3) {
          for (let y = 4; y < gridH - 4; y += 3) {
            const key = `${x},${y}`;
            if (!this.isWaterTile(x, y, gridW, gridH) && !pathTiles.has(key) && !buildingFootprints.has(key)) {
              const r = (x * 19 + y * 29) % 17;
              if (r < 5) {
                trees.push([x, y, r % 2 === 0 ? 'oak' : 'sakura']);
              } else if (r === 6) {
                trees.push([x, y, 'bush']);
              }
            }
          }
        }
        return trees;
      }

      create() {
        sceneRef.current = this;
        const w = latest.current.world;
        const tile = 32;

        // Generate procedural pixel textures
        generatePixelTextures(this);

        // Deep ocean water background color everywhere
        this.cameras.main.setBackgroundColor('#1b4a68');

        // Set default mouse cursor to grab on the canvas
        if (this.game.canvas) {
          this.game.canvas.style.cursor = 'grab';
        }

        const gridW = Math.max(54, w.width || 54);
        const gridH = Math.max(48, w.height || 48);

        // 1. SETUP PHYSICS OBSTACLES (Water and Buildings)
        this.obstacles = this.physics.add.staticGroup();

        // 2. PATHS & BOULEVARDS
        const pathTiles = this.getPathTiles(w, gridW, gridH);

        // Track building footprints for collisions
        const buildingFootprints = new Set<string>();
        w.pages.forEach(p => {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 0; dy++) {
              buildingFootprints.add(`${p.x + dx},${p.y + dy}`);
            }
          }
        });

        // 3. TERRAIN RENDERING (Natural Island with Ocean Borders)
        for (let x = 0; x < gridW; x++) {
          for (let y = 0; y < gridH; y++) {
            const isWater = this.isWaterTile(x, y, gridW, gridH);
            const hasPath = pathTiles.has(`${x},${y}`);
            const isBridge = hasPath && isWater;

            if (isWater) {
              this.add.image(x * tile, y * tile, 'tile_water').setOrigin(0);

              // Water collision: Player CANNOT walk on water unless there is a bridge!
              if (!isBridge) {
                const waterBlock = this.add.rectangle(x * tile + 16, y * tile + 16, tile, tile);
                this.physics.add.existing(waterBlock, true);
                this.obstacles.add(waterBlock);
              }
            } else {
              const n = (x * 17 + y * 31) % 19;
              let key = 'tile_grass';
              if (n === 3 || n === 7) key = 'tile_grass_flowers';
              else if (n === 11 || n === 15) key = 'tile_grass_pink';

              this.add.image(x * tile, y * tile, key).setOrigin(0);
            }
          }
        }

        // Render cobblestone paths and bridges
        pathTiles.forEach(coord => {
          const [px, py] = coord.split(',').map(Number);
          const isWater = this.isWaterTile(px, py, gridW, gridH);
          const tileKey = isWater ? 'tile_bridge' : 'tile_path';
          this.add.image(px * tile, py * tile, tileKey).setOrigin(0);
        });

        // 4. TOWN PROPS (Fountains in Plaza, Street Lamps, Park Trees)
        const homePage = w.pages[0] || { x: 24, y: 6 };

        // Fountains flanking Town Plaza
        if (homePage.x > 4 && homePage.x < gridW - 4) {
          this.add.image((homePage.x - 3) * tile + 16, (homePage.y + 2) * tile + 16, 'prop_fountain').setDepth(15);
          this.add.image((homePage.x + 3) * tile + 16, (homePage.y + 2) * tile + 16, 'prop_fountain').setDepth(15);

          const fcol1 = this.add.rectangle((homePage.x - 3) * tile + 16, (homePage.y + 2) * tile + 16, 32, 24);
          const fcol2 = this.add.rectangle((homePage.x + 3) * tile + 16, (homePage.y + 2) * tile + 16, 32, 24);
          this.physics.add.existing(fcol1, true);
          this.physics.add.existing(fcol2, true);
          this.obstacles.add(fcol1);
          this.obstacles.add(fcol2);
        }

        // Street Lamps beside paths (on grass)
        const lamps = this.getLampCoords(pathTiles, w, gridW, gridH);
        lamps.forEach(([lx, ly]) => {
          const lamp = this.add.image(lx * tile + 16, ly * tile + 16, 'prop_street_lamp').setOrigin(0.5, 0.85);
          lamp.setDepth(ly * 10 + 2);

          const halo = this.add.image(lx * tile + 16, ly * tile + 8, 'light_halo').setDepth(ly * 10 + 1);
          this.tweens.add({
            targets: halo,
            alpha: { from: 0.8, to: 1 },
            scale: { from: 0.96, to: 1.04 },
            duration: 1800 + Math.random() * 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        });

        // Trees & Bushes in Green Courtyards
        const trees = this.getTreeCoords(pathTiles, w, gridW, gridH);
        trees.forEach(([tx, ty, type]) => {
          if (type === 'bush') {
            const bush = this.add.image(tx * tile + 16, ty * tile + 16, 'prop_bush').setOrigin(0.5, 0.7);
            bush.setDepth(ty * 10);
          } else {
            const treeKey = type === 'sakura' ? 'prop_tree_sakura' : 'prop_tree_oak';
            const tree = this.add.image(tx * tile + 16, ty * tile + 16, treeKey).setOrigin(0.5, 0.9);
            tree.setDepth(ty * 10);

            const treeCol = this.add.rectangle(tx * tile + 16, ty * tile + 12, 16, 12);
            this.physics.add.existing(treeCol, true);
            this.obstacles.add(treeCol);
          }
        });

        // 5. BUILDINGS, SIGNS & BADGES (High Clarity, Generous Width, Guaranteed Zero Overlap)
        w.pages.forEach(p => {
          const bx = p.x * tile + 16;
          const by = p.y * tile + 16;
          const container = this.add.container(bx, by);

          let bldgKey = 'building_library';
          if (p.buildingType === 'home') bldgKey = 'building_home';
          else if (p.buildingType === 'quad') bldgKey = 'building_quad';
          else if (p.buildingType === 'project') bldgKey = 'building_project';
          else if (p.buildingType === 'tutorials') bldgKey = 'building_tutorials';
          else if (p.buildingType === 'examples') bldgKey = 'building_examples';
          else if (p.buildingType === 'whats_new') bldgKey = 'building_whats_new';
          else if (p.buildingType === 'guides') bldgKey = 'building_guides';
          else if (p.buildingType === 'faqs') bldgKey = 'building_faqs';
          else if (p.buildingType === 'dock') bldgKey = 'dock_portal';

          const buildingSprite = this.add.image(0, 0, bldgKey).setOrigin(0.5, 0.8);
          container.add(buildingSprite);

          const dpr = Math.max(2, window.devicePixelRatio || 2);
          const signY = p.buildingType === 'home' || p.buildingType === 'quad' ? -70 : -54;
          const titleLen = p.title.length;
          const signW = Math.max(130, Math.min(220, Math.round(titleLen * 8.8 + 28)));
          const signH = 26;

          // Drop Shadow for depth & pop
          const shadow = this.add.rectangle(0, signY + 2, signW, signH, 0x000000, 0.65);

          // Deep Obsidian Card Background with Vibrant Golden Amber Border
          const signBg = this.add.rectangle(0, signY, signW, signH, 0x09111a, 0.98);
          signBg.setStrokeStyle(1.8, 0xf59e0b);

          // Ultra-crisp high-DPI white text (12.5px bold font with Retina resolution)
          const signText = this.add
            .text(0, signY, p.title, {
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: '12.5px',
              fontStyle: 'bold',
              color: '#ffffff',
            })
            .setResolution(dpr)
            .setOrigin(0.5);

          // Rich drop shadow for maximum contrast
          signText.setShadow(0, 1, '#000000', 3, true, true);

          if (signText.width > signW - 16) {
            signText.setScale((signW - 16) / signText.width);
          }

          container.add([shadow, signBg, signText]);

          // Floating Badge Icon
          let badgeKey = 'badge_doc';
          if (p.badgeIcon === 'home') badgeKey = 'badge_home';
          else if (p.badgeIcon === 'campus') badgeKey = 'badge_campus';
          else if (p.badgeIcon === 'project') badgeKey = 'badge_project';
          else if (p.badgeIcon === 'landmark') badgeKey = 'badge_landmark';
          else if (p.badgeIcon === 'book') badgeKey = 'badge_book';
          else if (p.badgeIcon === 'gear') badgeKey = 'badge_gear';
          else if (p.badgeIcon === 'code') badgeKey = 'badge_code';
          else if (p.badgeIcon === 'bulb') badgeKey = 'badge_bulb';
          else if (p.badgeIcon === 'help') badgeKey = 'badge_help';
          else if (p.badgeIcon === 'external') badgeKey = 'badge_external';

          // Safe fallback if texture was not found
          if (!this.textures.exists(badgeKey)) badgeKey = 'badge_doc';

          // Floating Badge Icon (Positioned cleanly above the signboard with 4px margin)
          const badge = this.add.image(0, signY - 33, badgeKey);
          container.add(badge);

          this.tweens.add({
            targets: badge,
            y: signY - 37,
            duration: 1400 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          // Interactive Hover & Click Animations
          container.setSize(signW + 8, 80);
          container.setInteractive({ useHandCursor: true });

          container.on('pointerover', () => {
            this.tweens.add({
              targets: container,
              scale: 1.05,
              duration: 120,
              ease: 'Power1',
            });
            signBg.setStrokeStyle(2, 0x38c474);
            signText.setColor('#38c474');
          });

          container.on('pointerout', () => {
            this.tweens.add({
              targets: container,
              scale: 1.0,
              duration: 120,
              ease: 'Power1',
            });
            signBg.setStrokeStyle(1.5, 0xe5a93b);
            signText.setColor('#ffffff');
          });

          // Track pointer down position on container to prevent accidental selection during mouse drag
          let pDownX = 0;
          let pDownY = 0;
          container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            pDownX = pointer.x;
            pDownY = pointer.y;
          });

          container.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const moveDist = Phaser.Math.Distance.Between(pDownX, pDownY, pointer.x, pointer.y);
            if (moveDist < 6) {
              latest.current.onSelect(p);
            }
          });

          container.setDepth(p.y * 10 + 5);
          this.buildings.push(container);

          // Building Wall Collision (Player cannot walk through buildings!)
          const colW = p.buildingType === 'home' || p.buildingType === 'quad' ? 76 : 56;
          const colH = 34;
          const bldgCol = this.add.rectangle(bx, by - 12, colW, colH);
          this.physics.add.existing(bldgCol, true);
          this.obstacles.add(bldgCol);
        });

        // 6. NPCs
        const npcsToSpawn = [
          { x: homePage.x - 2, y: homePage.y + 1, type: 'npc_instructor' },
          { x: homePage.x + 2, y: homePage.y + 1, type: 'npc_scholar' },
        ];
        npcsToSpawn.forEach(n => {
          if (n.x > 3 && n.x < gridW - 3 && n.y > 2 && n.y < gridH - 2) {
            const npc = this.add.sprite(n.x * tile, n.y * tile, n.type).setDepth(n.y * 10 + 4);
            this.npcs.push(npc);
          }
        });

        // 7. PLAYER CHARACTER & LOCATOR BEACON
        const spawnX = (homePage.x + 0.5) * tile;
        const spawnY = (homePage.y + 2.5) * tile;

        // Glowing locator beacon ring beneath player (easily spot player at any zoom)
        this.playerBeacon = this.add.ellipse(spawnX, spawnY + 12, 28, 12, 0x38c474, 0.45);
        this.playerBeacon.setDepth(129);
        this.tweens.add({
          targets: this.playerBeacon,
          scaleX: 1.25,
          scaleY: 1.25,
          alpha: 0.15,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.player = this.physics.add.sprite(spawnX, spawnY, 'player_down_0');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(130);

        // Explorer Indicator Tag
        this.playerTag = this.add
          .text(spawnX, spawnY - 26, '▼ YOU', {
            fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#34d399',
            stroke: '#08131d',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(9998);

        const pbody = this.player.body as Phaser.Physics.Arcade.Body;
        pbody.setSize(18, 14);
        pbody.setOffset(7, 18);

        this.physics.world.setBounds(0, 0, gridW * tile, gridH * tile);
        this.physics.add.collider(this.player, this.obstacles);

        // Initialize camera zoom and centering
        this.updateZoom(latest.current.zoom || 1.15);

        // 8. MOUSE MOVEMENT DRAG PANNING (Pan the map smoothly with mouse drag)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.button === 0) {
            this.isDragging = false;
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
            this.camStartX = this.cameras.main.scrollX;
            this.camStartY = this.cameras.main.scrollY;
          }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          if (pointer.isDown && pointer.button === 0) {
            const dx = pointer.x - this.dragStartX;
            const dy = pointer.y - this.dragStartY;

            if (!this.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
              this.isDragging = true;
              this.cameras.main.stopFollow();
              if (this.game.canvas) {
                this.game.canvas.style.cursor = 'grabbing';
              }
            }

            if (this.isDragging) {
              const z = this.cameras.main.zoom;
              this.cameras.main.scrollX = this.camStartX - dx / z;
              this.cameras.main.scrollY = this.camStartY - dy / z;
            }
          }
        });

        this.input.on('pointerup', () => {
          if (this.isDragging) {
            this.isDragging = false;
            if (this.game.canvas) {
              this.game.canvas.style.cursor = 'grab';
            }
          }
        });

        // 9. TIGHT INTERACTION FLOATING PROMPT
        this.interactPrompt = this.add.container(0, 0);
        const promptBg = this.add.rectangle(0, 0, 110, 22, 0x16221c, 0.95);
        promptBg.setStrokeStyle(1.5, 0x38c474);
        this.promptTextObj = this.add
          .text(0, 0, '⌕ [E] / [SPACE]', {
            fontFamily: "'Space Grotesk', monospace",
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#38c474',
          })
          .setOrigin(0.5);
        this.interactPrompt.add([promptBg, this.promptTextObj]);
        this.interactPrompt.setDepth(9999);
        this.interactPrompt.setVisible(false);

        // Keyboard controls with capture to PREVENT browser scrolling!
        this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE');
        this.input.keyboard?.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);

        // Jump, Focus & Overview Event Listeners
        window.addEventListener('pixelworld:jump', this.jumpHandler as EventListener);
        window.addEventListener('pixelworld:export-png', this.exportFullMap);
        window.addEventListener('pixelworld:focus-character', this.recenterOnPlayer);
        window.addEventListener('pixelworld:view-whole-map', this.viewWholeMap);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
          window.removeEventListener('pixelworld:jump', this.jumpHandler as EventListener);
          window.removeEventListener('pixelworld:export-png', this.exportFullMap);
          window.removeEventListener('pixelworld:focus-character', this.recenterOnPlayer);
          window.removeEventListener('pixelworld:view-whole-map', this.viewWholeMap);
        });
      }

      // Smoothly update camera zoom:
      // When zoomed in (Adventure Mode >= 0.9): Camera follows player within world bounds.
      // When zoomed out (Overview Mode < 0.9): Camera stays locked to map center so WASD does NOT jerk map!
      updateZoom(zoom: number) {
        const cam = this.cameras?.main;
        if (!cam) return;
        cam.zoomTo(zoom, 220, 'Power2');

        const w = latest.current.world;
        const tile = 32;
        const gridW = Math.max(54, w.width || 54);
        const gridH = Math.max(48, w.height || 48);
        const worldW = gridW * tile;
        const worldH = gridH * tile;

        if (zoom < 0.9) {
          // Overview mode: Center the island and DO NOT follow player so map stays completely still and in the middle!
          cam.stopFollow();
          cam.removeBounds();
          cam.pan(worldW / 2, worldH / 2, 250, 'Power2');
        } else {
          // Adventure mode: Follow player within world boundaries
          cam.setBounds(0, 0, worldW, worldH);
          if (this.player && !this.isDragging) {
            cam.startFollow(this.player, true, 0.12, 0.12);
          }
        }
      }

      // 🎯 Focus Character: Zooms in to 115% showing the character and immediate surroundings
      recenterOnPlayer = () => {
        if (!this.player || !this.cameras?.main) return;
        const cam = this.cameras.main;
        const targetZoom = 1.15;

        const w = latest.current.world;
        const tile = 32;
        const gridW = Math.max(54, w.width || 54);
        const gridH = Math.max(48, w.height || 48);
        const worldW = gridW * tile;
        const worldH = gridH * tile;

        cam.setBounds(0, 0, worldW, worldH);
        cam.zoomTo(targetZoom, 280, 'Power2');
        cam.pan(this.player.x, this.player.y, 280, 'Power2');
        cam.startFollow(this.player, true, 0.12, 0.12);

        if (latest.current.onZoomChange) {
          latest.current.onZoomChange(targetZoom);
        }
      };

      // 🗺️ View Whole Map: Fits the whole island centered in the middle of canvas with balanced ocean margins
      viewWholeMap = () => {
        if (!this.cameras?.main) return;
        const cam = this.cameras.main;
        const w = latest.current.world;
        const tile = 32;
        const gridW = Math.max(54, w.width || 54);
        const gridH = Math.max(48, w.height || 48);
        const worldW = gridW * tile;
        const worldH = gridH * tile;

        // Calculate optimal zoom to fit entire map with balanced margins
        const zoomX = cam.width / worldW;
        const zoomY = cam.height / worldH;
        const optimalZoom = Math.max(0.45, Math.min(0.85, Math.round(Math.min(zoomX, zoomY) * 0.92 * 100) / 100));

        // Remove rigid bounds so Phaser does NOT push map to x=0; center island in middle
        cam.stopFollow();
        cam.removeBounds();
        cam.zoomTo(optimalZoom, 320, 'Power2');
        cam.pan(worldW / 2, worldH / 2, 320, 'Power2');

        if (latest.current.onZoomChange) {
          latest.current.onZoomChange(optimalZoom);
        }
      };

      jumpHandler = (event: Event) => {
        const id = (event as CustomEvent<string>).detail;
        const p = latest.current.world.pages.find(item => item.id === id);
        if (p) {
          const targetX = p.x * 32 + 16;
          const targetY = (p.y + 1.2) * 32;
          this.player.setPosition(targetX, targetY);
          this.cameras.main.pan(targetX, targetY, 500, 'Power2');
        }
      };

      update(time: number, delta: number) {
        if (!this.player || !this.keys) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        let isMoving = false;
        let vx = 0;
        let vy = 0;

        if (this.keys.A.isDown || this.keys.LEFT.isDown) {
          vx -= 170;
          this.currentDir = 'left';
          isMoving = true;
        }
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) {
          vx += 170;
          this.currentDir = 'right';
          isMoving = true;
        }
        if (this.keys.W.isDown || this.keys.UP.isDown) {
          vy -= 170;
          this.currentDir = 'up';
          isMoving = true;
        }
        if (this.keys.S.isDown || this.keys.DOWN.isDown) {
          vy += 170;
          this.currentDir = 'down';
          isMoving = true;
        }

        body.setVelocity(vx, vy);
        if (vx !== 0 && vy !== 0) {
          body.velocity.normalize().scale(170);
        }

        const isOverview = (latest.current.zoom || 1) < 0.9;

        // In Overview mode (zoomed out): camera stays centered on the map so WASD doesn't move/jerk the map!
        // In Adventure mode (zoomed in): camera follows player smoothly within boundaries
        if (isMoving && !this.isDragging && !isOverview) {
          if (!this.cameras.main.panEffect.isRunning && (this.cameras.main as any)._follow !== this.player) {
            this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
          }
        }

        // Animate walk frames
        if (isMoving) {
          this.stepTimer += delta;
          if (this.stepTimer > 180) {
            this.stepTimer = 0;
            this.stepFrame = (this.stepFrame + 1) % 3;
            this.player.setTexture(`player_${this.currentDir}_${this.stepFrame}`);
          }
        } else {
          this.player.setTexture(`player_${this.currentDir}_0`);
        }

        // Update locator beacon and tag to stick with player
        if (this.playerBeacon) {
          this.playerBeacon.setPosition(this.player.x, this.player.y + 12);
        }
        if (this.playerTag) {
          this.playerTag.setPosition(this.player.x, this.player.y - 26);
        }

        // Depth sorting
        this.player.setDepth(Math.floor((this.player.y * 10) / 32) + 2);

        // Proximity detection for [E] prompt: standing directly in front of the front door (within 36px)
        const tile = 32;
        const pages = latest.current.world.pages;
        let closest: Page | null = null;
        let minDist = 36;

        for (const p of pages) {
          const doorX = p.x * tile + 16;
          const doorY = (p.y + 0.8) * tile + 16;
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, doorX, doorY);
          if (d < minDist) {
            minDist = d;
            closest = p;
          }
        }

        this.nearestPage = closest;

        if (closest) {
          this.interactPrompt.setPosition(this.player.x, this.player.y - 32);
          this.interactPrompt.setVisible(true);
          if (this.promptTextObj) {
            this.promptTextObj.setText('⌕ [E] / [SPACE]');
          }

          if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
            latest.current.onSelect(closest);
          }
        } else {
          this.interactPrompt.setVisible(false);
          // Space recenters camera on player when not in front of a door
          if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
            this.recenterOnPlayer();
          }
        }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: '100%',
      height: 640,
      backgroundColor: '#1b4a68',
      pixelArt: false,
      antialias: true,
      roundPixels: true,
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: PixelScene,
    });

    gameRef.current = game;

    // Trackpad 2-Finger Pan & Pinch-to-Zoom handling
    const hostEl = host.current;
    let cleanupWheel: (() => void) | undefined;
    if (hostEl) {
      let lastDiscreteWheelTime = 0;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const cam = sceneRef.current?.cameras?.main;
        if (!cam) return;

        // 1. PINCH-TO-ZOOM on Mac Trackpad (Browser emits e.ctrlKey: true on pinch)
        if (e.ctrlKey || e.metaKey) {
          const currentZoom = latest.current.zoom || 1.15;
          const factor = Math.exp(-e.deltaY * 0.005);
          const nextZoom = Math.max(0.5, Math.min(1.85, Math.round(currentZoom * factor * 100) / 100));
          if (nextZoom !== currentZoom && latest.current.onZoomChange) {
            latest.current.onZoomChange(nextZoom);
          }
          return;
        }

        // 2. TWO-FINGER SWIPE / PAN ON MOUSEPAD (Smooth 2D scrolling without zoom oscillation)
        const isTrackpadPan = Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 35;
        if (isTrackpadPan) {
          cam.stopFollow();
          const z = cam.zoom || 1;
          cam.scrollX += e.deltaX / z;
          cam.scrollY += e.deltaY / z;
          return;
        }

        // 3. PHYSICAL MOUSE WHEEL (Discrete scroll steps throttled to prevent strobing)
        const now = performance.now();
        if (now - lastDiscreteWheelTime > 130) {
          lastDiscreteWheelTime = now;
          if (e.deltaY < 0 && latest.current.onZoomIn) {
            latest.current.onZoomIn();
          } else if (e.deltaY > 0 && latest.current.onZoomOut) {
            latest.current.onZoomOut();
          }
        }
      };

      hostEl.addEventListener('wheel', handleWheel, { passive: false });
      cleanupWheel = () => hostEl.removeEventListener('wheel', handleWheel);
    }

    return () => {
      if (cleanupWheel) cleanupWheel();
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [world]);

  return (
    <div className="game-container-relative">
      <div className="game-host" ref={host} aria-label="Interactive pixel world canvas" />
    </div>
  );
}
