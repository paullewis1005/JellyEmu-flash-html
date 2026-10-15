import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// In-memory sample games catalog with emphasis on Flash, HTML5, PICO-8, and retro systems
const sampleGames = [
  {
    id: 'space-rocks-flash',
    name: 'Space Rocks (Flash Edition)',
    system: 'Flash',
    platformTag: 'Flash',
    core: 'flash',
    romUrl: '/jellyemu/rom/space-rocks-flash/spacerocks.swf',
    description: 'Classic vector asteroid shooter running via the in-browser Ruffle WebAssembly Flash Player.',
    year: '2004',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80',
    tags: ['JellyEmu', 'Flash', 'Shooter']
  },
  {
    id: 'retro-arcade-html5',
    name: '2048 Retro Canvas Edition',
    system: 'HTML5',
    platformTag: 'HTML5',
    core: 'html5',
    romUrl: '/jellyemu/rom/retro-arcade-html5/game.html',
    description: 'Fast-paced number sliding puzzle running entirely inside an HTML5 Canvas container.',
    year: '2020',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80',
    tags: ['JellyEmu', 'HTML5', 'Puzzle']
  },
  {
    id: 'space-invaders-html5',
    name: 'Retro Space Defender',
    system: 'HTML5',
    platformTag: 'HTML5',
    core: 'html5',
    romUrl: '/jellyemu/rom/space-invaders-html5/game.html',
    description: 'Arcade space shooter built with HTML5 Canvas, responsive controls, sound, and particle effects.',
    year: '2021',
    thumbnail: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=500&q=80',
    tags: ['JellyEmu', 'HTML5', 'Arcade']
  },
  {
    id: 'celeste-pico8',
    name: 'Celeste Classic (PICO-8)',
    system: 'PICO-8',
    platformTag: 'PICO-8',
    core: 'pico8',
    cartUrl: 'https://www.lexaloffle.com/bbs/cposts/1/10455.p8.png',
    romUrl: '/jellyemu/rom/celeste-pico8/celeste.p8.png',
    description: 'The original Celeste created for the PICO-8 fantasy console by Maddy Thorson and Noel Berry.',
    year: '2015',
    thumbnail: 'https://www.lexaloffle.com/bbs/cposts/1/10455.p8.png',
    tags: ['JellyEmu', 'PICO-8', 'Platformer']
  },
  {
    id: 'micro-mage-nes',
    name: 'Micro Mages NES Demo',
    system: 'NES',
    platformTag: 'NES',
    core: 'nestopia',
    romUrl: '/jellyemu/rom/micro-mage-nes/micromages.nes',
    description: 'Award-winning 8-bit homebrew platformer built for original NES hardware.',
    year: '2019',
    thumbnail: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&q=80',
    tags: ['JellyEmu', 'NES', 'Platformer']
  },
  {
    id: 'classic-snes-demo',
    name: 'Classic 16-Bit Showcase',
    system: 'SNES',
    platformTag: 'SNES',
    core: 'snes9x',
    romUrl: '/jellyemu/rom/classic-snes-demo/demo.sfc',
    description: '16-bit Super Nintendo demonstration ROM with stereo sound and Mode 7 effects.',
    year: '1995',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&q=80',
    tags: ['JellyEmu', 'SNES', 'Action']
  },
  {
    id: 'gameboy-odyssey',
    name: 'Tobu Tobu Girl (Game Boy)',
    system: 'Game Boy',
    platformTag: 'Game Boy',
    core: 'gambatte',
    romUrl: '/jellyemu/rom/gameboy-odyssey/tobu.gb',
    description: 'Charming arcade homebrew platformer built specifically for the original Game Boy hardware.',
    year: '2017',
    thumbnail: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=500&q=80',
    tags: ['JellyEmu', 'Game Boy', 'Arcade']
  }
];

const providersDatabase = [
  {
    name: "Vimm's Lair",
    domain: "vimm.net",
    url: "https://vimm.net",
    isEnabled: true
  },
  {
    name: "Internet Archive Retro Vault",
    domain: "archive.org",
    url: "https://archive.org/download/retro-rom-vault",
    isEnabled: true
  },
  {
    name: "Libretro Homebrew Hub",
    domain: "homebrew.libretro.com",
    url: "https://homebrew.libretro.com",
    isEnabled: true
  }
];

const inMemorySaves = new Map();
const inMemorySram = new Map();
const inMemoryPrefs = new Map();
const inMemoryCheats = new Map();
const netplayRooms = [
  {
    id: 'room-101',
    name: 'Super Mario Kart Cup',
    system: 'SNES',
    core: 'snes9x',
    gameTitle: 'Super Mario Kart (SNES)',
    host: 'Gamer-Admin',
    currentPlayers: 1,
    maxPlayers: 2,
    hasPassword: false,
    ping: '24ms'
  }
];

// Helper to render {{ variable }} templates
function renderTemplate(content, vars) {
  let rendered = content;
  rendered = rendered.replace(/\{\{\s*if\s+(\w+)\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g, (_, key, block) => {
    return vars[key] === 'true' || vars[key] === true ? block : '';
  });

  rendered = rendered.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (key in vars) {
      return String(vars[key]);
    }
    return '';
  });

  return rendered;
}

// Middleware for cross-origin isolation on emulation routes
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Coi Service Worker
app.get(['/jellyemu/assets/coi-serviceworker.js', '/coi-serviceworker.js'], (req, res) => {
  const p = path.join(__dirname, 'Web', 'Injection', 'coi-serviceworker.js');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(p);
  }
  res.type('javascript').send(`
    if (typeof window === 'undefined') {
      self.addEventListener("install", () => self.skipWaiting());
      self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
      self.addEventListener("fetch", (event) => {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") return;
        event.respondWith(fetch(event.request));
      });
    }
  `);
});

// Serve Jellyfin Plugin Repository Manifest
app.get(['/manifest.json', '/jellyemu/manifest.json'], (req, res) => {
  const manifestPath = path.join(__dirname, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(manifestPath);
  }
  res.status(404).json({ error: 'manifest.json not found' });
});

// Serve plugin release packages (.zip)
app.use('/releases', express.static(path.join(__dirname, 'releases')));
app.get('/releases/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'releases', req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.download(filePath);
  }
  res.status(404).send('Release artifact not found');
});

// Static assets
app.use('/jellyemu/assets', express.static(path.join(__dirname, 'Web')));
app.use('/Web', express.static(path.join(__dirname, 'Web')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/Configuration', express.static(path.join(__dirname, 'Configuration'), { index: false, redirect: false }));

// Runtimes
app.get('/jellyemu/threejs/three.min.js', (req, res) => {
  res.redirect('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
});

app.get('/jellyemu/pico8/runtime.js', (req, res) => {
  res.redirect('https://www.lexaloffle.com/play/pico8_0207.js');
});

// HTML5 Sample Games
app.get('/jellyemu/rom/retro-arcade-html5/game.html', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>2048 Retro Canvas</title>
      <style>
        body { margin: 0; background: #0e0e1a; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; user-select: none; }
        #canvas { background: #16162e; border: 4px solid #00a4dc; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
        .hud { margin-top: 15px; font-size: 18px; color: #00a4dc; display: flex; gap: 24px; }
        .controls { margin-top: 10px; color: #aaa; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="hud">
        <div>SCORE: <span id="score">0</span></div>
        <div>BEST: 2048</div>
      </div>
      <canvas id="canvas" width="400" height="400"></canvas>
      <div class="controls">Arrow Keys or Touch to Slide &amp; Merge Tiles</div>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const size = 4;
        let score = 0;
        let grid = [[0, 2, 0, 0], [0, 0, 4, 0], [0, 0, 2, 0], [0, 0, 0, 0]];
        const colors = {
          2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
          32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
          512: '#edc850', 1024: '#edc53f', 2048: '#edc22e'
        };

        function draw() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const cell = 90;
          const pad = 8;
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const val = grid[r][c];
              const x = pad + c * (cell + pad);
              const y = pad + r * (cell + pad);
              ctx.fillStyle = val ? (colors[val] || '#3c3a32') : '#23233c';
              ctx.beginPath();
              ctx.roundRect(x, y, cell, cell, 8);
              ctx.fill();

              if (val) {
                ctx.fillStyle = val <= 4 ? '#222' : '#fff';
                ctx.font = 'bold 28px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val, x + cell / 2, y + cell / 2);
              }
            }
          }
          document.getElementById('score').innerText = score;
        }

        function slide(row) {
          let arr = row.filter(val => val);
          for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
              arr[i] *= 2;
              score += arr[i];
              arr.splice(i + 1, 1);
            }
          }
          while (arr.length < size) arr.push(0);
          return arr;
        }

        function moveLeft() { for (let i = 0; i < size; i++) grid[i] = slide(grid[i]); addRandom(); draw(); }
        function moveRight() { for (let i = 0; i < size; i++) grid[i] = slide(grid[i].reverse()).reverse(); addRandom(); draw(); }
        function rotate() { grid = grid[0].map((_, i) => grid.map(row => row[i]).reverse()); }
        function moveUp() { rotate(); rotate(); rotate(); for (let i = 0; i < size; i++) grid[i] = slide(grid[i]); rotate(); addRandom(); draw(); }
        function moveDown() { rotate(); for (let i = 0; i < size; i++) grid[i] = slide(grid[i]); rotate(); rotate(); rotate(); addRandom(); draw(); }

        function addRandom() {
          let empty = [];
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (grid[r][c] === 0) empty.push({ r, c });
            }
          }
          if (empty.length > 0) {
            const spot = empty[Math.floor(Math.random() * empty.length)];
            grid[spot.r][spot.c] = Math.random() > 0.1 ? 2 : 4;
          }
        }

        window.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') moveLeft();
          if (e.key === 'ArrowRight') moveRight();
          if (e.key === 'ArrowUp') moveUp();
          if (e.key === 'ArrowDown') moveDown();
        });

        draw();
      </script>
    </body>
    </html>
  `);
});

app.get('/jellyemu/rom/space-invaders-html5/game.html', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Retro Space Defender</title>
      <style>
        body { margin: 0; background: #050510; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
        #canvas { background: radial-gradient(circle at center, #101026 0%, #050510 100%); border: 3px solid #ff4444; border-radius: 8px; box-shadow: 0 0 25px rgba(255, 68, 68, 0.4); }
        .hud { margin-bottom: 8px; font-size: 18px; color: #ff6666; display: flex; gap: 30px; font-weight: bold; }
        .instructions { margin-top: 10px; color: #888; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="hud">
        <div>SCORE: <span id="score">0</span></div>
        <div>LIVES: <span id="lives">3</span></div>
      </div>
      <canvas id="canvas" width="480" height="420"></canvas>
      <div class="instructions">Arrow Keys: Move | Spacebar: Fire Lasers</div>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let score = 0, lives = 3, gameOver = false;
        let player = { x: 220, y: 380, width: 36, height: 18, speed: 6 };
        let bullets = [];
        let invaders = [];
        let invaderDirection = 1;
        let invaderSpeed = 1.2;

        function initInvaders() {
          invaders = [];
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 8; c++) {
              invaders.push({ x: 40 + c * 50, y: 30 + r * 35, width: 30, height: 20, alive: true, color: r === 0 ? '#ff4444' : r === 1 ? '#ffaa00' : '#44ff44' });
            }
          }
        }
        initInvaders();

        let keys = {};
        window.addEventListener('keydown', e => {
          keys[e.key] = true;
          if (e.key === ' ' && !gameOver) {
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 12 });
          }
        });
        window.addEventListener('keyup', e => { keys[e.key] = false; });

        function update() {
          if (gameOver) return;
          if (keys['ArrowLeft'] && player.x > 10) player.x -= player.speed;
          if (keys['ArrowRight'] && player.x < canvas.width - player.width - 10) player.x += player.speed;

          for (let b of bullets) b.y -= 8;
          bullets = bullets.filter(b => b.y > -20);

          let edgeReached = false;
          let livingInvaders = invaders.filter(i => i.alive);
          if (livingInvaders.length === 0) {
            initInvaders();
            invaderSpeed += 0.5;
          }

          for (let inv of livingInvaders) {
            inv.x += invaderSpeed * invaderDirection;
            if (inv.x > canvas.width - 40 || inv.x < 10) edgeReached = true;

            for (let b of bullets) {
              if (b.x < inv.x + inv.width && b.x + b.width > inv.x && b.y < inv.y + inv.height && b.y + b.height > inv.y) {
                inv.alive = false;
                b.y = -999;
                score += 100;
                document.getElementById('score').innerText = score;
              }
            }

            if (inv.y + inv.height >= player.y) {
              gameOver = true;
            }
          }

          if (edgeReached) {
            invaderDirection *= -1;
            for (let inv of livingInvaders) inv.y += 12;
          }
        }

        function draw() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Stars
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 20; i++) {
            ctx.fillRect((i * 37) % canvas.width, (i * 73 + Date.now() / 40) % canvas.height, 2, 2);
          }

          // Player
          ctx.fillStyle = '#00a4dc';
          ctx.beginPath();
          ctx.moveTo(player.x + player.width / 2, player.y);
          ctx.lineTo(player.x + player.width, player.y + player.height);
          ctx.lineTo(player.x, player.y + player.height);
          ctx.closePath();
          ctx.fill();

          // Bullets
          ctx.fillStyle = '#ffff00';
          for (let b of bullets) ctx.fillRect(b.x, b.y, b.width, b.height);

          // Invaders
          for (let inv of invaders) {
            if (!inv.alive) continue;
            ctx.fillStyle = inv.color;
            ctx.fillRect(inv.x, inv.y, inv.width, inv.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(inv.x + 6, inv.y + 6, 4, 4);
            ctx.fillRect(inv.x + inv.width - 10, inv.y + 6, 4, 4);
          }

          if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
          }
        }

        function loop() {
          update();
          draw();
          requestAnimationFrame(loop);
        }
        loop();
      </script>
    </body>
    </html>
  `);
});

// Flash sample SWF placeholder
app.get('/jellyemu/rom/space-rocks-flash/spacerocks.swf', (req, res) => {
  res.type('application/x-shockwave-flash').send(Buffer.from('FWS'));
});

// Partials for Configuration Tabs
app.get('/jellyemu/config/partial/:tabName', (req, res) => {
  const tabName = req.params.tabName;
  const filePath = path.join(__dirname, 'Configuration', 'tabs', `${tabName}.html`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).send(`<div style="color:red;padding:2em;">Tab ${tabName} not found</div>`);
});

// Mock Jellyfin API
app.get(['/Items', '/Users/:userId/Items'], (req, res) => {
  const items = sampleGames.map(g => ({
    Id: g.id,
    Name: g.name,
    Type: 'Book',
    Tags: g.tags,
    ProductionYear: parseInt(g.year),
    Overview: g.description,
    ImageTags: { Primary: 'tag' },
    PrimaryImageAspectRatio: 1.0
  }));
  res.json({ Items: items, TotalRecordCount: items.length });
});

// Card Meta Batch Endpoint
app.get('/jellyemu/cardmeta', (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  const result = {};
  ids.forEach(id => {
    const game = sampleGames.find(g => g.id === id);
    if (game) {
      result[id] = {
        tags: game.tags,
        system: game.system,
        core: game.core,
        hasSave: inMemorySaves.has(id),
        playCount: 24
      };
    }
  });
  res.json(result);
});

// Marketplace Providers
app.get(['/jellyemu/marketplace/providers', '/jellyemu/marketplace/feed-providers'], (req, res) => {
  if (req.path.includes('feed-providers')) {
    return res.json(providersDatabase);
  }
  res.json(providersDatabase.filter(p => p.isEnabled).map(p => p.url));
});

app.post('/jellyemu/marketplace/providers', (req, res) => {
  const { url } = req.body;
  const existing = providersDatabase.find(p => p.url === url);
  if (existing) existing.isEnabled = true;
  res.json({ success: true });
});

app.delete('/jellyemu/marketplace/providers', (req, res) => {
  const url = req.query.url;
  const existing = providersDatabase.find(p => p.url === url);
  if (existing) existing.isEnabled = false;
  res.json({ success: true });
});

// Marketplace Search and Browse
app.get(['/jellyemu/marketplace/search', '/jellyemu/marketplace/browse'], (req, res) => {
  const query = (req.query.query || req.query.q || '').toLowerCase();
  const system = (req.query.system || '').toLowerCase();
  const letter = (req.query.letter || '').toUpperCase();

  const marketplaceCatalog = [
    {
      title: "Space Defender Flash Edition",
      system: "Flash",
      providerName: "Flash Archive",
      detailUrl: "/jellyemu/play/space-rocks-flash",
      thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80",
      region: "World",
      version: "1.0",
      hasManual: true
    },
    {
      title: "2048 Retro Canvas Edition",
      system: "HTML5",
      providerName: "Web Homebrew",
      detailUrl: "/jellyemu/play/retro-arcade-html5",
      thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80",
      region: "World",
      version: "2.1",
      hasManual: true
    },
    {
      title: "Celeste Classic",
      system: "PICO-8",
      providerName: "Lexaloffle BBS",
      detailUrl: "/jellyemu/play/celeste-pico8",
      thumbnailUrl: "https://www.lexaloffle.com/bbs/cposts/1/10455.p8.png",
      region: "World",
      version: "1.0",
      hasManual: true
    },
    {
      title: "Micro Mages",
      system: "NES",
      providerName: "Morphcat Games",
      detailUrl: "/jellyemu/play/micro-mage-nes",
      thumbnailUrl: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&q=80",
      region: "USA",
      version: "1.2",
      hasManual: true
    },
    {
      title: "Super Mario World (Sample Demo)",
      system: "SNES",
      providerName: "Vimm's Lair",
      detailUrl: "/jellyemu/play/classic-snes-demo",
      thumbnailUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&q=80",
      region: "USA",
      version: "1.0",
      hasManual: true
    }
  ];

  let filtered = marketplaceCatalog;
  if (query) filtered = filtered.filter(item => item.title.toLowerCase().includes(query));
  if (system) filtered = filtered.filter(item => item.system.toLowerCase() === system);
  if (letter && letter !== 'ALL') {
    if (letter === '#') filtered = filtered.filter(item => /^[0-9]/.test(item.title));
    else filtered = filtered.filter(item => item.title.toUpperCase().startsWith(letter));
  }
  res.json(filtered);
});

app.post('/jellyemu/marketplace/download', (req, res) => {
  res.json({ success: true, message: `ROM downloaded to library.` });
});

// Saves
app.get('/jellyemu/save-slots/:itemId/:userId', (req, res) => {
  res.json([{ slot: 1, name: 'Quick Save 1', date: new Date().toISOString() }]);
});

app.get('/jellyemu/save/:itemId/:userId', (req, res) => {
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from('MOCK_STATE'));
});

app.post('/jellyemu/save/:itemId/:userId', (req, res) => {
  res.json({ success: true });
});

// Preferences
app.get('/jellyemu/prefs/:userId', (req, res) => {
  res.json({
    shader: 'disabled',
    scale: 'fit',
    volume: '1.0',
    mute: '0',
    ffrate: '3',
    smrate: '2',
    showFps: '0',
    virtualGamepad: '0'
  });
});

app.post('/jellyemu/prefs/:userId', (req, res) => {
  res.json({ success: true });
});

// Player Routes
app.get('/jellyemu/pico8/play/:itemId', (req, res) => {
  const game = sampleGames.find(g => g.id === req.params.itemId) || sampleGames[3];
  const templatePath = path.join(__dirname, 'Templates', 'pico8.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  const rendered = renderTemplate(templateHtml, {
    game_name: game.name,
    base_url: '',
    cart_url: game.cartUrl || 'https://www.lexaloffle.com/bbs/cposts/1/10455.p8.png',
    item_id: game.id,
    screenshots_to_library: 'false'
  });

  res.type('html').send(rendered);
});

app.get('/jellyemu/flash/play/:itemId', (req, res) => {
  const game = sampleGames.find(g => g.id === req.params.itemId) || sampleGames[0];
  const templatePath = path.join(__dirname, 'Templates', 'flash.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  const rendered = renderTemplate(templateHtml, {
    game_name: game.name,
    base_url: '',
    rom_url: game.romUrl,
    item_id: game.id
  });

  res.type('html').send(rendered);
});

app.get('/jellyemu/html5/play/:itemId', (req, res) => {
  const game = sampleGames.find(g => g.id === req.params.itemId) || sampleGames[1];
  const templatePath = path.join(__dirname, 'Templates', 'html5.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  const rendered = renderTemplate(templateHtml, {
    game_name: game.name,
    base_url: '',
    rom_url: game.romUrl,
    item_id: game.id
  });

  res.type('html').send(rendered);
});

app.get('/jellyemu/play/:itemId', (req, res) => {
  const itemId = req.params.itemId;
  const game = sampleGames.find(g => g.id === itemId) || sampleGames[0];

  if (game.core === 'pico8') return res.redirect(`/jellyemu/pico8/play/${itemId}`);
  if (game.core === 'flash') return res.redirect(`/jellyemu/flash/play/${itemId}`);
  if (game.core === 'html5') return res.redirect(`/jellyemu/html5/play/${itemId}`);

  const templatePath = path.join(__dirname, 'Templates', 'ejs.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const rendered = renderTemplate(templateHtml, {
    game_name: game.name,
    base_url: '',
    version: '0.10.0',
    item_id: game.id,
    user_id: 'user_default',
    save_post_url: `/jellyemu/save/${game.id}/user_default`,
    active_slot: 1,
    is_m3u: 'false',
    has_netplay: 'true',
    netplay_server: 'wss://netplay.emulatorjs.org',
    netplay_ice_servers_json: JSON.stringify([{ urls: 'stun:stun.l.google.com:19302' }]),
    game_id: '1001',
    virtual_gamepad: 'true',
    virtual_gamepad_lefty: 'false',
    platform_tag: game.platformTag,
    active_shader: 'disabled',
    video_rotation: 0,
    vsync: 'true',
    ffrate: '3',
    smrate: '2',
    show_fps: 'false',
    scale: 'fit',
    volume: '1.0',
    mute: 'false',
    core: game.core,
    bios_url: '',
    available_cores_json: JSON.stringify([game.core]),
    input_scheme_json: JSON.stringify({}),
    custom_bindings_json: JSON.stringify({})
  });

  res.type('html').send(rendered);
});

// Main Interactive Web Application (Runs inside the website seamlessly)
app.get(['/', '/configuration', '/configuration/'], (req, res) => {
  const configPagePath = path.join(__dirname, 'Configuration', 'configPage.html');
  const configHtml = fs.existsSync(configPagePath) ? fs.readFileSync(configPagePath, 'utf8') : '';

  const initialTab = req.path.includes('configuration') ? 'settings' : 'library';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JellyEmu - Retro Games &amp; Emulators (Flash &amp; HTML5)</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0d0f18;
          color: #eee;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* Top Navigation */
        .je-navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 28px;
          background: rgba(14, 18, 30, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .je-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #fff;
        }
        .je-brand svg {
          width: 32px;
          height: 32px;
          color: #00a4dc;
        }
        .je-brand-title {
          font-size: 1.25em;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .je-brand-sub {
          font-size: 0.75em;
          color: #00a4dc;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .je-nav-tabs {
          display: flex;
          gap: 6px;
          background: rgba(0, 0, 0, 0.35);
          padding: 4px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .je-nav-btn {
          background: none;
          border: none;
          color: #aaa;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.9em;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .je-nav-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.05); }
        .je-nav-btn.active {
          background: #00a4dc;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0, 164, 220, 0.35);
        }

        .je-quick-actions {
          display: flex;
          gap: 10px;
        }
        .je-action-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.88em;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .je-action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: #00a4dc;
        }

        /* Hero / Quick Bar */
        .je-banner {
          background: linear-gradient(180deg, rgba(0, 164, 220, 0.12) 0%, rgba(13, 15, 24, 0) 100%);
          padding: 30px 28px 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .je-banner-wrap {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        .je-banner-text h1 {
          font-size: 1.8em;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .je-banner-text p {
          color: #aaa;
          font-size: 0.95em;
        }
        .je-feature-tags {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .je-ftag {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .je-ftag.flash { background: rgba(255, 126, 0, 0.2); color: #ff9d3b; border: 1px solid rgba(255, 126, 0, 0.4); }
        .je-ftag.html5 { background: rgba(228, 77, 38, 0.2); color: #ff6d47; border: 1px solid rgba(228, 77, 38, 0.4); }
        .je-ftag.pico { background: rgba(0, 164, 220, 0.2); color: #00c3ff; border: 1px solid rgba(0, 164, 220, 0.4); }

        /* Main Container */
        .je-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 28px 80px;
        }

        /* Filter Chips */
        .je-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 14px;
        }
        .je-chips-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .je-chip {
          padding: 7px 16px;
          border-radius: 20px;
          font-size: 0.88em;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #aaa;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .je-chip:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
        .je-chip.active {
          background: #00a4dc;
          color: #fff;
          border-color: #00a4dc;
          box-shadow: 0 2px 8px rgba(0, 164, 220, 0.4);
        }
        .je-chip.flash.active { background: #ff7e00; border-color: #ff7e00; }
        .je-chip.html5.active { background: #e44d26; border-color: #e44d26; }

        .je-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 6px 14px;
          width: 280px;
        }
        .je-search-box input {
          background: none;
          border: none;
          color: #fff;
          outline: none;
          font-size: 0.9em;
          width: 100%;
        }

        /* Games Grid */
        .je-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 22px;
        }
        .je-card {
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .je-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 164, 220, 0.4);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
        }
        .je-card-thumb {
          position: relative;
          aspect-ratio: 16/10;
          background: #05060b;
          overflow: hidden;
        }
        .je-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .je-card:hover .je-card-img {
          transform: scale(1.05);
        }
        .je-card-overlay-btn {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
        }
        .je-card:hover .je-card-overlay-btn {
          opacity: 1;
        }
        .je-play-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #00a4dc;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0, 164, 220, 0.6);
          transform: scale(0.9);
          transition: transform 0.15s ease;
        }
        .je-card:hover .je-play-circle {
          transform: scale(1);
        }
        .je-play-circle svg {
          fill: #fff;
          width: 26px;
          height: 26px;
          margin-left: 2px;
        }

        .je-badge-system {
          position: absolute;
          top: 10px;
          left: 10px;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        }
        .je-badge-system.flash { background: #ff7e00; color: #fff; }
        .je-badge-system.html5 { background: #e44d26; color: #fff; }
        .je-badge-system.pico8 { background: #ff5277; color: #fff; }
        .je-badge-system.nes { background: #e60012; color: #fff; }
        .je-badge-system.snes { background: #8c52ff; color: #fff; }
        .je-badge-system.gameboy { background: #52B54B; color: #fff; }

        .je-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .je-card-title {
          font-size: 1.05em;
          font-weight: 700;
          color: #fff;
          margin-bottom: 6px;
          line-height: 1.3;
        }
        .je-card-desc {
          color: #8f96a3;
          font-size: 0.85em;
          line-height: 1.4;
          margin-bottom: 14px;
          flex: 1;
        }
        .je-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 10px;
        }
        .je-btn-play-card {
          background: #00a4dc;
          color: #fff;
          border: none;
          padding: 7px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .je-btn-play-card:hover {
          background: #008fbf;
        }
        .je-btn-play-card.flash { background: #ff7e00; }
        .je-btn-play-card.flash:hover { background: #e06e00; }
        .je-btn-play-card.html5 { background: #e44d26; }
        .je-btn-play-card.html5:hover { background: #c73e1b; }

        /* In-App Player Modal (Overlay) */
        #je-player-overlay {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 999999;
          display: none;
          flex-direction: column;
        }
        #je-player-overlay.je-open {
          display: flex;
        }
        #je-player-iframe {
          flex: 1;
          width: 100%;
          height: 100%;
          border: none;
          background: #000;
        }

        /* Dropzone / Upload Modal */
        #je-upload-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        #je-upload-modal.je-open {
          display: flex;
        }
        .je-modal-card {
          background: #141824;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          max-width: 520px;
          width: 100%;
          padding: 28px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }
        .je-drop-area {
          border: 2px dashed rgba(0, 164, 220, 0.5);
          background: rgba(0, 164, 220, 0.05);
          border-radius: 12px;
          padding: 36px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin: 18px 0;
        }
        .je-drop-area:hover, .je-drop-area.dragover {
          border-color: #00a4dc;
          background: rgba(0, 164, 220, 0.12);
        }

        /* Views */
        .je-view { display: none; }
        .je-view.active { display: block; }
      </style>
      <script>
        // Jellyfin Web Mock ApiClient for configuration tabs
        window.ApiClient = {
          getCurrentUserId: () => 'user_default',
          accessToken: () => 'mock_token_123',
          serverAddress: () => window.location.origin,
          getItems: (userId, options) => fetch('/Users/' + userId + '/Items').then(r => r.json()),
          getPluginConfiguration: (id) => Promise.resolve({ IgdbClientId: '', MarketplaceProviders: ['https://vimm.net'] }),
          updatePluginConfiguration: (id, cfg) => Promise.resolve({ success: true })
        };

        window.JellyEmu = {
          baseUrl: '',
          getUrl: (path) => '/' + path.replace(/^\\//, ''),
          fetch: (path, opts) => fetch('/' + path.replace(/^\\//, ''), opts),
          getAuthToken: () => 'mock_token'
        };
      </script>
    </head>
    <body>

      <!-- Top Navigation Bar -->
      <header class="je-navbar">
        <a href="javascript:void(0)" onclick="jeSwitchMainView('library')" class="je-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L3 18a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L12 2z" />
            <path d="M7.5 15.5h3M9 14v3" stroke="currentColor" stroke-width="1.5" />
            <circle cx="15.5" cy="14.5" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="17" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
          <div>
            <div class="je-brand-title">JellyEmu</div>
            <div class="je-brand-sub">Flash &amp; HTML5 Retro Player</div>
          </div>
        </a>

        <div class="je-nav-tabs">
          <button class="je-nav-btn ${initialTab === 'library' ? 'active' : ''}" id="tab-btn-library" onclick="jeSwitchMainView('library')">
            <span class="material-icons" style="font-size:18px;">sports_esports</span>
            <span>Game Library</span>
          </button>
          <button class="je-nav-btn ${initialTab === 'settings' ? 'active' : ''}" id="tab-btn-config" onclick="jeSwitchMainView('config')">
            <span class="material-icons" style="font-size:18px;">tune</span>
            <span>Configuration</span>
          </button>
        </div>

        <div class="je-quick-actions">
          <button class="je-action-btn" onclick="openUploadModal()">
            <span class="material-icons" style="font-size:18px; color:#ff7e00;">file_upload</span>
            <span>Play Local .SWF / .HTML</span>
          </button>
        </div>
      </header>

      <!-- Banner -->
      <section class="je-banner">
        <div class="je-banner-wrap">
          <div class="je-banner-text">
            <h1>In-Browser Emulation &amp; Gaming Library</h1>
            <p>Play Flash games, HTML5 canvas titles, PICO-8 carts, and retro consoles directly inside the website without external plugins.</p>
            <div class="je-feature-tags">
              <span class="je-ftag flash">⚡ Adobe Flash (SWF via Ruffle)</span>
              <span class="je-ftag html5">🌐 HTML5 &amp; Canvas Games</span>
              <span class="je-ftag pico">🎮 PICO-8 Virtual Console</span>
              <span class="je-ftag pico">🕹️ NES / SNES / Game Boy (EJS)</span>
            </div>
          </div>
        </div>
      </section>

      <main class="je-main">

        <!-- VIEW 1: Game Library -->
        <section id="view-library" class="je-view ${initialTab === 'library' ? 'active' : ''}">
          <div class="je-filter-bar">
            <div class="je-chips-scroll" id="systemChips">
              <button class="je-chip active" data-system="all" onclick="filterGames('all')">All Games (${sampleGames.length})</button>
              <button class="je-chip flash" data-system="Flash" onclick="filterGames('Flash')">⚡ Flash Games (.swf)</button>
              <button class="je-chip html5" data-system="HTML5" onclick="filterGames('HTML5')">🌐 HTML5 Games</button>
              <button class="je-chip" data-system="PICO-8" onclick="filterGames('PICO-8')">PICO-8</button>
              <button class="je-chip" data-system="NES" onclick="filterGames('NES')">NES</button>
              <button class="je-chip" data-system="SNES" onclick="filterGames('SNES')">SNES</button>
              <button class="je-chip" data-system="Game Boy" onclick="filterGames('Game Boy')">Game Boy</button>
            </div>

            <div class="je-search-box">
              <span class="material-icons" style="color:#aaa; font-size:18px;">search</span>
              <input type="text" id="gameSearch" placeholder="Search games or platform..." oninput="handleSearch(this.value)">
            </div>
          </div>

          <!-- Cards Grid -->
          <div class="je-grid" id="gamesGrid">
            ${sampleGames.map(game => {
              const sysClass = game.system.toLowerCase().replace(/[^a-z0-9]/g, '');
              const isFlash = game.system === 'Flash';
              const isHtml5 = game.system === 'HTML5';
              const btnClass = isFlash ? 'flash' : isHtml5 ? 'html5' : '';
              return `
                <div class="je-card" data-system="${game.system}" data-title="${game.name.toLowerCase()}">
                  <div class="je-card-thumb">
                    <img src="${game.thumbnail}" alt="${game.name}" class="je-card-img" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80'">
                    <span class="je-badge-system ${sysClass}">${game.system}</span>
                    <div class="je-card-overlay-btn" onclick="launchInAppGame('${game.id}', '${game.name.replace(/'/g, "\\'")}')">
                      <div class="je-play-circle">
                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  </div>
                  <div class="je-card-body">
                    <h3 class="je-card-title">${game.name}</h3>
                    <p class="je-card-desc">${game.description}</p>
                    <div class="je-card-footer">
                      <span style="font-size:11px; color:#aaa; font-weight:600;">Year: ${game.year}</span>
                      <button class="je-btn-play-card ${btnClass}" onclick="launchInAppGame('${game.id}', '${game.name.replace(/'/g, "\\'")}')">
                        <span class="material-icons" style="font-size:16px;">play_arrow</span>
                        <span>Play Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- VIEW 2: Configuration & Dashboard -->
        <section id="view-config" class="je-view ${initialTab === 'settings' ? 'active' : ''}">
          ${configHtml}
          <div id="je-tab-container"></div>
        </section>

      </main>

      <!-- IN-APP SEAMLESS PLAYER OVERLAY -->
      <div id="je-player-overlay">
        <iframe id="je-player-iframe" src="about:blank" allow="autoplay; fullscreen; gamepad"></iframe>
      </div>

      <!-- LOCAL ROM / FLASH / HTML5 DRAG & DROP MODAL -->
      <div id="je-upload-modal" onclick="if(event.target===this)closeUploadModal()">
        <div class="je-modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:1.3em; font-weight:700; color:#fff;">Play Local Game File</h2>
            <button onclick="closeUploadModal()" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:24px;">&times;</button>
          </div>
          <p style="color:#aaa; font-size:0.9em; margin-top:6px;">Select or drop any <strong>.swf (Flash)</strong>, <strong>.html</strong>, <strong>.zip (HTML5)</strong>, or <strong>.p8 (PICO-8)</strong> cartridge to play immediately inside the website!</p>

          <div class="je-drop-area" id="dropArea" onclick="document.getElementById('localGameFile').click()">
            <span class="material-icons" style="font-size:44px; color:#00a4dc;">cloud_upload</span>
            <div style="font-size:15px; font-weight:600; margin:10px 0 4px; color:#fff;">Click or Drop File Here</div>
            <div style="font-size:12px; color:#888;">Supports .swf (Flash via Ruffle), .html, .zip, .p8</div>
            <input type="file" id="localGameFile" style="display:none" accept=".swf,.html,.htm,.zip,.p8,.png" onchange="handleFileSelect(this.files[0])">
          </div>

          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button onclick="closeUploadModal()" class="je-action-btn">Cancel</button>
          </div>
        </div>
      </div>

      <script>
        // In-App Seamless Game Player
        function launchInAppGame(itemId, title) {
          const overlay = document.getElementById('je-player-overlay');
          const iframe = document.getElementById('je-player-iframe');
          iframe.src = '/jellyemu/play/' + itemId;
          overlay.classList.add('je-open');
          history.pushState({ playing: itemId }, title, '#play=' + itemId);
        }

        function closeInAppPlayer() {
          const overlay = document.getElementById('je-player-overlay');
          const iframe = document.getElementById('je-player-iframe');
          overlay.classList.remove('je-open');
          iframe.src = 'about:blank';
          if (window.location.hash.startsWith('#play=')) {
            history.replaceState(null, '', window.location.pathname);
          }
        }

        // Listen for exit messages from within player templates (Flash, HTML5, PICO-8, EJS)
        window.addEventListener('message', function(e) {
          if (e.data === 'close-jellyemu') {
            closeInAppPlayer();
          }
        });

        window.addEventListener('popstate', function(e) {
          if (!window.location.hash.startsWith('#play=')) {
            closeInAppPlayer();
          }
        });

        // Filter games
        function filterGames(system) {
          document.querySelectorAll('#systemChips .je-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-system') === system);
          });
          const query = (document.getElementById('gameSearch').value || '').toLowerCase();
          applyFilter(system, query);
        }

        function handleSearch(val) {
          const activeChip = document.querySelector('#systemChips .je-chip.active');
          const system = activeChip ? activeChip.getAttribute('data-system') : 'all';
          applyFilter(system, val.toLowerCase());
        }

        function applyFilter(system, query) {
          const cards = document.querySelectorAll('#gamesGrid .je-card');
          cards.forEach(card => {
            const cardSys = card.getAttribute('data-system');
            const cardTitle = card.getAttribute('data-title');
            const matchesSys = system === 'all' || cardSys === system;
            const matchesQuery = !query || cardTitle.includes(query) || cardSys.toLowerCase().includes(query);
            card.style.display = (matchesSys && matchesQuery) ? 'flex' : 'none';
          });
        }

        // View switching
        function jeSwitchMainView(view) {
          document.querySelectorAll('.je-view').forEach(v => v.classList.remove('active'));
          document.querySelectorAll('.je-nav-btn').forEach(b => b.classList.remove('active'));

          if (view === 'library') {
            document.getElementById('view-library').classList.add('active');
            document.getElementById('tab-btn-library').classList.add('active');
          } else {
            document.getElementById('view-config').classList.add('active');
            document.getElementById('tab-btn-config').classList.add('active');
            if (window.jeSwitchTab) window.jeSwitchTab('settings');
          }
        }

        // Dropzone & local file player
        function openUploadModal() {
          document.getElementById('je-upload-modal').classList.add('je-open');
        }
        function closeUploadModal() {
          document.getElementById('je-upload-modal').classList.remove('je-open');
        }

        const dropArea = document.getElementById('dropArea');
        ['dragenter', 'dragover'].forEach(eventName => {
          dropArea.addEventListener(eventName, e => { e.preventDefault(); dropArea.classList.add('dragover'); }, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
          dropArea.addEventListener(eventName, e => { e.preventDefault(); dropArea.classList.remove('dragover'); }, false);
        });
        dropArea.addEventListener('drop', e => {
          const files = e.dataTransfer.files;
          if (files.length) handleFileSelect(files[0]);
        });

        function handleFileSelect(file) {
          if (!file) return;
          closeUploadModal();
          const ext = file.name.split('.').pop().toLowerCase();
          const blobUrl = URL.createObjectURL(file);

          const overlay = document.getElementById('je-player-overlay');
          const iframe = document.getElementById('je-player-iframe');

          if (ext === 'swf') {
            // Flash game runner via Ruffle in-page
            iframe.srcdoc = \`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>html, body, #c { width:100%; height:100%; margin:0; background:#000; overflow:hidden; }</style>
                <script src="https://unpkg.com/@ruffle-rs/ruffle"><\\/script>
              </head>
              <body>
                <button onclick="window.parent.postMessage('close-jellyemu','*')" style="position:fixed;top:12px;left:12px;z-index:99999;background:rgba(0,0,0,0.8);color:#fff;border:1px solid #fff;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:bold;">&larr; Exit</button>
                <div id="c"></div>
                <script>
                  window.RufflePlayer = window.RufflePlayer || {};
                  window.addEventListener("load", async () => {
                    const ruffle = window.RufflePlayer.newest();
                    const player = ruffle.createPlayer();
                    player.style.width = "100%";
                    player.style.height = "100%";
                    document.getElementById("c").appendChild(player);
                    player.load("\${blobUrl}");
                  });
                <\\/script>
              </body>
              </html>
            \`;
            overlay.classList.add('je-open');
          } else if (ext === 'html' || ext === 'htm') {
            iframe.src = blobUrl;
            overlay.classList.add('je-open');
          } else {
            alert('File selected: ' + file.name + '. Loading into player.');
            iframe.src = blobUrl;
            overlay.classList.add('je-open');
          }
        }
      </script>

      <!-- Configuration scripts -->
      <script src="/Configuration/js/configRouter.js"></script>
      <script src="/Configuration/js/settings.js"></script>
      <script src="/Configuration/js/community.js"></script>
    </body>
    </html>
  `;

  res.type('html').send(html);
});

app.listen(PORT, HOST, () => {
  console.log(`[JellyEmu] Web Client & Emulator Server running at http://${HOST}:${PORT}`);
});
