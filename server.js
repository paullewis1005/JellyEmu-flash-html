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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory state
const sampleGames = [
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
    id: 'retro-arcade-html5',
    name: '2048 Retro Canvas Edition',
    system: 'HTML5',
    platformTag: 'HTML5',
    core: 'html5',
    romUrl: '/jellyemu/rom/retro-arcade-html5/game.html',
    description: 'Classic puzzle game running entirely in pure HTML5 canvas and JavaScript.',
    year: '2020',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
    tags: ['JellyEmu', 'HTML5', 'Puzzle']
  },
  {
    id: 'space-rocks-flash',
    name: 'Space Rocks (Flash Retro)',
    system: 'Flash',
    platformTag: 'Flash',
    core: 'flash',
    romUrl: '/jellyemu/rom/space-rocks-flash/spacerocks.swf',
    description: 'Vector-style asteroid shooter running via the Ruffle WebAssembly Flash Player.',
    year: '2004',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
    tags: ['JellyEmu', 'Flash', 'Shooter']
  },
  {
    id: 'micro-mage-nes',
    name: 'Micro Mages NES Demo',
    system: 'NES',
    platformTag: 'NES',
    core: 'nestopia',
    romUrl: '/jellyemu/rom/micro-mage-nes/micromages.nes',
    description: 'Homebrew platform game developed for the original 8-bit Nintendo Entertainment System.',
    year: '2019',
    thumbnail: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&q=80',
    tags: ['JellyEmu', 'Game Boy', 'Arcade']
  }
];

const pluginConfig = {
  IgdbClientId: '',
  IgdbClientSecret: '',
  RawgApiKey: '',
  ScreenScraperUser: '',
  ScreenScraperPass: '',
  RommUrl: 'http://localhost:8080',
  RommApiKey: '',
  RetroAchievementsUser: '',
  RetroAchievementsApiKey: '',
  MarketplaceConfigured: true,
  MarketplaceProviders: [
    'https://vimm.net',
    'https://archive.org/download/retro-rom-vault',
    'https://homebrew.libretro.com'
  ]
};

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
  },
  {
    id: 'room-102',
    name: 'Street Fighter II Championship',
    system: 'Arcade',
    core: 'fbneo',
    gameTitle: 'Street Fighter II Turbo',
    host: 'ChallengerX',
    currentPlayers: 2,
    maxPlayers: 2,
    hasPassword: false,
    ping: '38ms'
  }
];

// Helper to render Scriban-like {{ variable }} templates
function renderTemplate(content, vars) {
  let rendered = content;
  // Handle conditional {{ if is_m3u }} ... {{ end }}
  rendered = rendered.replace(/\{\{\s*if\s+(\w+)\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g, (_, key, block) => {
    return vars[key] ? block : '';
  });

  // Handle standard {{ key }} replacements
  rendered = rendered.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (key in vars) {
      return String(vars[key]);
    }
    return '';
  });

  return rendered;
}

// Serve Coi Service Worker at /jellyemu/assets/coi-serviceworker.js and root
app.get(['/jellyemu/assets/coi-serviceworker.js', '/coi-serviceworker.js'], (req, res) => {
  const p = path.join(__dirname, 'Web', 'Injection', 'coi-serviceworker.js');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(p);
  }
  res.type('javascript').send(`
    // Minimal COI worker fallback
    if (typeof window === 'undefined') {
      self.addEventListener("install", () => self.skipWaiting());
      self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
      self.addEventListener("fetch", (event) => {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") return;
        event.respondWith(
          fetch(event.request).then((response) => {
            if (response.status === 0) return response;
            const newHeaders = new Headers(response.headers);
            newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
            newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
            return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
          })
        );
      });
    }
  `);
});

// Middleware for cross-origin isolation on emulation routes
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Static assets
app.use('/jellyemu/assets', express.static(path.join(__dirname, 'Web')));
app.use('/Web', express.static(path.join(__dirname, 'Web')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/Configuration', express.static(path.join(__dirname, 'Configuration'), { index: false, redirect: false }));

// Three.js runtime redirect / proxy
app.get('/jellyemu/threejs/three.min.js', (req, res) => {
  res.redirect('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
});

// PICO-8 runtime redirect / proxy
app.get('/jellyemu/pico8/runtime.js', (req, res) => {
  res.redirect('https://www.lexaloffle.com/play/pico8_0207.js');
});

// Play / PS2 JS modules fallback
app.get('/jellyemu/assets/play.:name.js', (req, res, next) => {
  const filePath = path.join(__dirname, 'Web', `play.${req.params.name}.js`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

// HTML5 sample game
app.get('/jellyemu/rom/retro-arcade-html5/game.html', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>2048 Retro Canvas</title>
      <style>
        body { margin: 0; background: #0e0e1a; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
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
      <div class="controls">Use Arrow Keys (or Swipe) to Merge Tiles</div>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const size = 4;
        let score = 0;
        let grid = [
          [0, 2, 0, 0],
          [0, 0, 4, 0],
          [0, 0, 2, 0],
          [0, 0, 0, 0]
        ];

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

        function moveLeft() {
          for (let i = 0; i < size; i++) grid[i] = slide(grid[i]);
          addRandom();
          draw();
        }

        function moveRight() {
          for (let i = 0; i < size; i++) grid[i] = slide(grid[i].reverse()).reverse();
          addRandom();
          draw();
        }

        function rotate() {
          grid = grid[0].map((_, i) => grid.map(row => row[i]).reverse());
        }

        function moveUp() {
          rotate(); rotate(); rotate();
          for (let i = 0; i < size; i++) grid[i] = slide(grid[i]);
          rotate();
          addRandom();
          draw();
        }

        function moveDown() {
          rotate();
          for (let i = 0; i < size; i++) grid[i] = slide(grid[i]);
          rotate(); rotate(); rotate();
          addRandom();
          draw();
        }

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

// Flash demo placeholder SWF / message
app.get('/jellyemu/rom/space-rocks-flash/spacerocks.swf', (req, res) => {
  res.type('application/x-shockwave-flash').send(Buffer.from('FWS'));
});

// Configuration Tab Partials
app.get('/jellyemu/config/partial/:tabName', (req, res) => {
  const tabName = req.params.tabName;
  const filePath = path.join(__dirname, 'Configuration', 'tabs', `${tabName}.html`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).send(`<div style="color:red;padding:2em;">Tab ${tabName} not found</div>`);
});

// Jellyfin Mock ApiClient endpoints
app.get('/Items', (req, res) => {
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

app.get('/Users/:userId/Items', (req, res) => {
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
        playCount: 12
      };
    }
  });
  res.json(result);
});

// Marketplace Providers
app.get('/jellyemu/marketplace/providers', (req, res) => {
  res.json(providersDatabase.filter(p => p.isEnabled).map(p => p.url));
});

app.get('/jellyemu/marketplace/feed-providers', (req, res) => {
  res.json(providersDatabase);
});

app.post('/jellyemu/marketplace/providers', (req, res) => {
  const { url } = req.body;
  const existing = providersDatabase.find(p => p.url === url);
  if (existing) {
    existing.isEnabled = true;
  } else {
    providersDatabase.push({
      name: new URL(url).hostname,
      domain: new URL(url).hostname,
      url,
      isEnabled: true
    });
  }
  res.json({ success: true });
});

app.delete('/jellyemu/marketplace/providers', (req, res) => {
  const url = req.query.url;
  const existing = providersDatabase.find(p => p.url === url);
  if (existing) {
    existing.isEnabled = false;
  }
  res.json({ success: true });
});

// Marketplace Search and Browse
app.get(['/jellyemu/marketplace/search', '/jellyemu/marketplace/browse'], (req, res) => {
  const query = (req.query.query || req.query.q || '').toLowerCase();
  const system = (req.query.system || '').toLowerCase();
  const letter = (req.query.letter || '').toUpperCase();

  const marketplaceCatalog = [
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
      thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80",
      region: "USA",
      version: "1.2",
      hasManual: true
    },
    {
      title: "Super Mario World (Sample Demo)",
      system: "SNES",
      providerName: "Vimm's Lair",
      detailUrl: "/jellyemu/play/classic-snes-demo",
      thumbnailUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80",
      region: "USA",
      version: "1.0",
      hasManual: true
    },
    {
      title: "The Legend of Zelda: Ocarina of Time",
      system: "N64",
      providerName: "Vimm's Lair",
      detailUrl: "#",
      thumbnailUrl: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&q=80",
      region: "USA",
      version: "1.0",
      hasManual: true
    },
    {
      title: "Sonic The Hedgehog 2",
      system: "Sega Genesis",
      providerName: "Vimm's Lair",
      detailUrl: "#",
      thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
      region: "USA",
      version: "1.1",
      hasManual: true
    },
    {
      title: "Pokemon Emerald",
      system: "Game Boy Advance",
      providerName: "Vimm's Lair",
      detailUrl: "#",
      thumbnailUrl: "https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&q=80",
      region: "USA",
      version: "1.0",
      hasManual: false
    },
    {
      title: "Pokemon Gold & Silver",
      system: "Game Boy Color",
      providerName: "Vimm's Lair",
      detailUrl: "#",
      thumbnailUrl: "https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&q=80",
      region: "USA",
      version: "1.0",
      hasManual: true
    },
    {
      title: "Castlevania: Symphony of the Night",
      system: "PlayStation",
      providerName: "Vimm's Lair",
      detailUrl: "#",
      thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80",
      region: "USA",
      version: "1.0",
      hasManual: true
    },
    {
      title: "Chrono Trigger",
      system: "SNES",
      providerName: "Vimm's Lair",
      detailUrl: "#",
      thumbnailUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80",
      region: "USA",
      version: "1.0",
      hasManual: true
    }
  ];

  let filtered = marketplaceCatalog;
  if (query) {
    filtered = filtered.filter(item => item.title.toLowerCase().includes(query));
  }
  if (system) {
    filtered = filtered.filter(item => item.system.toLowerCase() === system);
  }
  if (letter && letter !== 'ALL') {
    if (letter === '#') {
      filtered = filtered.filter(item => /^[0-9]/.test(item.title));
    } else {
      filtered = filtered.filter(item => item.title.toUpperCase().startsWith(letter));
    }
  }

  res.json(filtered);
});

app.post('/jellyemu/marketplace/download', (req, res) => {
  const { detailUrl, system } = req.body;
  res.json({ success: true, message: `ROM for ${system} scheduled for library download.` });
});

// Saves & State endpoints
app.get('/jellyemu/save-slots/:itemId/:userId', (req, res) => {
  const { itemId, userId } = req.params;
  const key = `${itemId}:${userId}`;
  const slots = inMemorySaves.get(key) || [
    { slot: 1, name: 'Quick Save 1', date: new Date().toISOString() }
  ];
  res.json(slots);
});

app.get('/jellyemu/save/:itemId/:userId', (req, res) => {
  const { itemId, userId } = req.params;
  const slot = req.query.slot || '1';
  const data = inMemorySaves.get(`${itemId}:${userId}:${slot}`) || null;
  if (!data) {
    return res.status(404).send('No save found');
  }
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(data, 'base64'));
});

app.post('/jellyemu/save/:itemId/:userId', (req, res) => {
  const { itemId, userId } = req.params;
  const slot = req.query.slot || '1';
  inMemorySaves.set(`${itemId}:${userId}:${slot}`, 'MOCK_SAVE_STATE_DATA');
  res.json({ success: true });
});

app.get('/jellyemu/sram/:itemId/:userId', (req, res) => {
  const { itemId, userId } = req.params;
  const data = inMemorySram.get(`${itemId}:${userId}`) || null;
  if (!data) return res.status(404).send('No SRAM found');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(data, 'base64'));
});

app.post('/jellyemu/sram/:itemId/:userId', (req, res) => {
  const { itemId, userId } = req.params;
  inMemorySram.set(`${itemId}:${userId}`, 'MOCK_SRAM_BATTERY_DATA');
  res.json({ success: true });
});

// User Preferences
app.get('/jellyemu/prefs/:userId', (req, res) => {
  const userId = req.params.userId;
  const prefs = inMemoryPrefs.get(userId) || {
    shader: 'disabled',
    scale: 'fit',
    volume: '1.0',
    mute: '0',
    ffrate: '3',
    smrate: '2',
    showFps: '0',
    virtualGamepad: '0',
    virtualGamepadLefty: '0'
  };
  res.json(prefs);
});

app.post('/jellyemu/prefs/:userId', (req, res) => {
  const userId = req.params.userId;
  const current = inMemoryPrefs.get(userId) || {};
  inMemoryPrefs.set(userId, { ...current, ...req.body });
  res.json({ success: true });
});

// Cheats
app.get('/jellyemu/cheats/:itemId', (req, res) => {
  const cheats = inMemoryCheats.get(req.params.itemId) || [
    { id: 'c1', name: 'Infinite Lives', code: '00A1-01-09', enabled: false },
    { id: 'c2', name: 'Invincibility', code: '00B2-01-01', enabled: false }
  ];
  res.json(cheats);
});

app.post('/jellyemu/cheats/:itemId', (req, res) => {
  const list = inMemoryCheats.get(req.params.itemId) || [];
  list.push({ id: `c_${Date.now()}`, ...req.body, enabled: true });
  inMemoryCheats.set(req.params.itemId, list);
  res.json({ success: true });
});

// Netplay endpoints
app.get('/jellyemu/netplay/rooms', (req, res) => {
  res.json(netplayRooms);
});

app.post('/jellyemu/netplay/create', (req, res) => {
  const { roomName, maxPlayers, password, gameTitle } = req.body;
  const newRoom = {
    id: `room-${Date.now()}`,
    name: roomName || 'Custom Match',
    system: 'SNES',
    core: 'snes9x',
    gameTitle: gameTitle || 'Multiplayer Game',
    host: 'CurrentPlayer',
    currentPlayers: 1,
    maxPlayers: parseInt(maxPlayers) || 2,
    hasPassword: !!password,
    ping: '20ms'
  };
  netplayRooms.unshift(newRoom);
  res.json(newRoom);
});

// RetroArch Endpoints
app.get('/jellyemu/retroarch/playlist', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="JellyEmu.lpl"');
  res.json({
    version: "1.5",
    default_core_name: "DETECT",
    items: sampleGames.map(g => ({
      path: `http://${req.headers.host}${g.romUrl}`,
      label: g.name,
      core_path: "DETECT",
      core_name: "DETECT",
      crc32: "DETECT",
      db_name: `${g.system}.lpl`
    }))
  });
});

app.get('/jellyemu/retroarch/info', (req, res) => {
  res.json({
    totalGames: sampleGames.length,
    supportedSystems: ['NES', 'SNES', 'N64', 'Genesis', 'GBA', 'GBC', 'PICO-8', 'HTML5', 'Flash'],
    playlistUrl: `/jellyemu/retroarch/playlist`
  });
});

// Play route for PICO-8
app.get('/jellyemu/pico8/play/:itemId', (req, res) => {
  const game = sampleGames.find(g => g.id === req.params.itemId) || sampleGames[0];
  const templatePath = path.join(__dirname, 'Templates', 'pico8.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  const rendered = renderTemplate(templateHtml, {
    game_name: game.name,
    base_url: '',
    cart_url: game.cartUrl || `https://www.lexaloffle.com/bbs/cposts/1/10455.p8.png`,
    item_id: game.id,
    screenshots_to_library: 'false'
  });

  res.type('html').send(rendered);
});

// Play route for Flash
app.get('/jellyemu/flash/play/:itemId', (req, res) => {
  const game = sampleGames.find(g => g.id === req.params.itemId) || sampleGames[2];
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

// Play route for HTML5
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

// Universal Play route
app.get('/jellyemu/play/:itemId', (req, res) => {
  const itemId = req.params.itemId;
  const game = sampleGames.find(g => g.id === itemId) || sampleGames[0];

  if (game.core === 'pico8') {
    return res.redirect(`/jellyemu/pico8/play/${itemId}`);
  }
  if (game.core === 'flash') {
    return res.redirect(`/jellyemu/flash/play/${itemId}`);
  }
  if (game.core === 'html5') {
    return res.redirect(`/jellyemu/html5/play/${itemId}`);
  }

  // Libretro / EJS Template
  const templatePath = path.join(__dirname, 'Templates', 'ejs.html');
  if (!fs.existsSync(templatePath)) {
    return res.status(404).send('Template ejs.html not found');
  }

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

// Configuration / Dashboard Page
app.get(['/configuration', '/configuration/'], (req, res) => {
  const configPagePath = path.join(__dirname, 'Configuration', 'configPage.html');
  if (!fs.existsSync(configPagePath)) {
    return res.status(404).send('configPage.html not found');
  }

  const configHtml = fs.readFileSync(configPagePath, 'utf8');

  // Wrap in a sleek standalone dashboard layout that provides ApiClient mock and JellyEmu header
  const page = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JellyEmu - Configuration Dashboard</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
      <link rel="stylesheet" href="/Configuration/tabs/SettingsTab.html">
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          background: #0f111a;
          color: #eee;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          min-height: 100vh;
        }
        .app-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: rgba(16, 20, 34, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 1000;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #fff;
          font-weight: 700;
          font-size: 1.2em;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .nav-btn {
          color: #aaa;
          text-decoration: none;
          font-size: 0.9em;
          padding: 6px 14px;
          border-radius: 6px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .nav-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
        .nav-btn.primary {
          background: #00a4dc;
          color: #fff;
          font-weight: 600;
        }
        .nav-btn.primary:hover {
          background: #008fbf;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 20px 80px;
        }
        /* Emby / Jellyfin compatibility styles */
        .emby-input, input[type="text"], input[type="password"] {
          background: rgba(0, 0, 0, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #fff !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
          font-size: 14px !important;
        }
        .emby-button, button.raised {
          cursor: pointer !important;
        }
        .je-console-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .je-console-card {
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #ccc;
          cursor: pointer;
          font-size: 0.88em;
          transition: all 0.15s;
        }
        .je-console-card:hover, .je-console-card.active {
          background: #00a4dc;
          color: #fff;
          border-color: #00a4dc;
        }
        .je-letter-row {
          display: flex;
          gap: 4px;
        }
        .je-letter-btn {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #bbb;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8em;
        }
        .je-letter-btn:hover, .je-letter-btn.active {
          background: #00a4dc;
          color: #fff;
        }
        .je-rom-card {
          display: flex;
          gap: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 14px;
          align-items: center;
          margin-bottom: 10px;
        }
        .je-rom-thumb-container {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .je-rom-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .je-rom-info {
          flex: 1;
        }
        .je-rom-title {
          margin: 0 0 4px 0;
          font-size: 1.05em;
          color: #fff;
        }
        .je-rom-badge-row {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 8px;
        }
        .je-rom-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
        }
        .je-rom-badge.system { background: rgba(0, 164, 220, 0.2); color: #00a4dc; }
        .je-rom-badge.provider { background: rgba(82, 181, 75, 0.2); color: #52B54B; }
        .je-rom-dl-btn {
          background: #00a4dc;
          border: none;
          color: #fff;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }
        .je-api-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 12px;
        }
        .je-api-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .je-api-method {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .je-api-method.get { background: #2e7d32; color: #fff; }
        .je-api-path { font-family: monospace; color: #00a4dc; font-weight: 600; }
        .je-api-desc { margin: 0; color: #aaa; font-size: 0.9em; }
        .je-provider-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        .je-provider-url { font-family: monospace; font-size: 12px; color: #00a4dc; }
        .je-toggle-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
          color: #aaa;
        }
        .je-toggle-btn.je-on { background: #52B54B; color: #fff; border-color: #52B54B; }
      </style>
      <script>
        // Jellyfin Web Mock ApiClient for standalone operation
        window.ApiClient = {
          getCurrentUserId: () => 'user_default',
          accessToken: () => 'mock_token_123',
          serverAddress: () => window.location.origin,
          getItems: (userId, options) => {
            return fetch('/Users/' + userId + '/Items').then(r => r.json());
          },
          getPluginConfiguration: (id) => {
            return Promise.resolve({
              IgdbClientId: '',
              MarketplaceProviders: ['https://vimm.net']
            });
          },
          updatePluginConfiguration: (id, cfg) => {
            return Promise.resolve({ success: true });
          }
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
      <nav class="app-nav">
        <a href="/" class="nav-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00a4dc" stroke-width="2" style="width:24px;height:24px;">
            <path d="M12 2L3 18a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L12 2z" />
            <path d="M7.5 15.5h3M9 14v3" stroke="#00a4dc" stroke-width="1.5" />
            <circle cx="15.5" cy="14.5" r="0.8" fill="#00a4dc" stroke="none" />
            <circle cx="17" cy="16.5" r="0.8" fill="#00a4dc" stroke="none" />
          </svg>
          <span>JellyEmu</span>
        </a>
        <div class="nav-links">
          <a href="/" class="nav-btn">
            <span class="material-icons" style="font-size:18px;">home</span>
            <span>Home</span>
          </a>
          <a href="/jellyemu/play/celeste-pico8" class="nav-btn primary">
            <span class="material-icons" style="font-size:18px;">sports_esports</span>
            <span>Play Celeste</span>
          </a>
          <a href="/jellyemu/play/retro-arcade-html5" class="nav-btn">
            <span class="material-icons" style="font-size:18px;">videogame_asset</span>
            <span>Play 2048</span>
          </a>
        </div>
      </nav>

      <div class="container">
        ${configHtml}
        <div id="je-tab-container"></div>
      </div>

      <!-- Scripts for Configuration Router and Tab Modules -->
      <script src="/Configuration/js/configRouter.js"></script>
      <script src="/Configuration/js/settings.js"></script>
      <script src="/Configuration/js/community.js"></script>
    </body>
    </html>
  `;

  res.type('html').send(page);
});

// Landing Page: docs/index.html with interactive launcher additions
app.get(['/', '/docs', '/docs/index.html'], (req, res) => {
  const docsPath = path.join(__dirname, 'docs', 'index.html');
  if (!fs.existsSync(docsPath)) {
    return res.redirect('/configuration');
  }

  let html = fs.readFileSync(docsPath, 'utf8');

  // Insert Quick Play & Dashboard Launch Bar into header
  const launcherHero = `
    <div class="mt-8 flex flex-wrap justify-center gap-4">
        <a href="/jellyemu/play/celeste-pico8" class="btn-retro px-8 py-4 text-xl pixel-font inline-block" style="background:#52B54B;border-bottom-color:#388E3C;">
            ▶ Play Celeste (PICO-8)
        </a>
        <a href="/jellyemu/play/retro-arcade-html5" class="btn-retro px-8 py-4 text-xl pixel-font inline-block" style="background:#8c52ff;border-bottom-color:#6533c7;">
            ▶ Play 2048 (HTML5)
        </a>
        <a href="/configuration" class="btn-retro px-8 py-4 text-xl pixel-font inline-block">
            ⚙ Plugin Dashboard
        </a>
        <a href="/configuration#?tab=marketplace" class="btn-retro px-8 py-4 text-xl pixel-font inline-block" style="background:#ff7e00;border-bottom-color:#c76000;">
            🛒 ROM Marketplace
        </a>
    </div>
    <div style="margin-top:20px; font-size:18px; color:#88d6ff;">
      <span>Active Server Mode: Live In-Browser Web Emulation on Port ${PORT}</span>
    </div>
  `;

  html = html.replace(
    /<div class="mt-8 flex flex-wrap justify-center gap-4">[\s\S]*?<\/div>/,
    launcherHero
  );

  // Sync title and meta
  html = html.replace(/<title>.*?<\/title>/, '<title>JellyEmu - Play Your ROMs in Jellyfin</title>');

  res.type('html').send(html);
});

app.listen(PORT, HOST, () => {
  console.log(`[JellyEmu] Web Server successfully running at http://${HOST}:${PORT}`);
  console.log(`[JellyEmu] Landing Page: http://${HOST}:${PORT}/`);
  console.log(`[JellyEmu] Configuration Dashboard: http://${HOST}:${PORT}/configuration`);
  console.log(`[JellyEmu] Direct Game Play: http://${HOST}:${PORT}/jellyemu/play/celeste-pico8`);
});
