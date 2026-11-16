const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Candidate servers in priority order
const CANDIDATE_SERVERS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://ereuka-learn-connect.vercel.app',
  'https://eureka.inexiumus.com'
];

let mainWindow = null;
let activeServerUrl = null;

// Config file helper
function getConfigPath() {
  return path.join(app.getPath('userData'), 'eureka-server-config.json');
}

function getSavedServerUrl() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.serverUrl) return data.serverUrl;
    }
  } catch (e) {
    console.warn('Failed to read server config:', e);
  }
  return null;
}

function saveServerUrl(url) {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify({ serverUrl: url, lastUpdated: new Date().toISOString() }, null, 2));
    activeServerUrl = url;
  } catch (e) {
    console.warn('Failed to save server config:', e);
  }
}

// Fast ping check for a server (1.5s timeout)
function probeServer(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname || '/',
          method: 'HEAD',
          timeout: 1500,
        },
        (res) => {
          // Any response indicates server is alive
          resolve(true);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

// Automatically find best available server
async function findBestServer() {
  // 1. If explicit environment variable passed
  if (process.env.EUREKA_APP_URL) {
    return process.env.EUREKA_APP_URL;
  }

  // 2. Check saved user preference if valid
  const saved = getSavedServerUrl();
  if (saved) {
    const isAlive = await probeServer(saved);
    if (isAlive) return saved;
  }

  // 3. Check local servers first (e.g. localhost:8080, localhost:3000)
  for (const candidate of CANDIDATE_SERVERS) {
    const isAlive = await probeServer(candidate);
    if (isAlive) {
      console.log(`Auto-detected live server: ${candidate}`);
      saveServerUrl(candidate);
      return candidate;
    }
  }

  // 4. Default fallback to live Vercel cloud
  return 'https://ereuka-learn-connect.vercel.app';
}

function getIconPath() {
  if (process.platform === 'win32') {
    return path.join(__dirname, '..', 'public', 'favicon.ico');
  }
  return path.join(__dirname, '..', 'public', 'android-chrome-512x512.png');
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Eurêka ERP Scolaire & Universitaire',
    icon: getIconPath(),
    backgroundColor: '#0F291E',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links: open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isInternal =
      (activeServerUrl && url.startsWith(activeServerUrl)) ||
      url.includes('localhost') ||
      url.includes('vercel.app') ||
      url.includes('inexiumus.com');
    if (!isInternal && (url.startsWith('http:') || url.startsWith('https:'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // When loading fails, show offline server switcher
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // User aborted navigation
    console.warn(`Load failed for ${validatedURL} [${errorCode}]: ${errorDescription}`);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  loadInitialUrl();
  setupMenu();
}

async function loadInitialUrl() {
  const target = await findBestServer();
  activeServerUrl = target;
  loadTargetUrl(target);
}

function loadTargetUrl(url) {
  if (!mainWindow) return;
  activeServerUrl = url;
  saveServerUrl(url);

  console.log(`Connecting to Eurêka server: ${url}`);
  mainWindow.loadURL(url).catch((err) => {
    console.warn(`Could not connect to ${url}:`, err);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });
}

// IPC Handlers
ipcMain.on('connect-to-server', (event, url) => {
  if (url) {
    loadTargetUrl(url);
  }
});

ipcMain.on('retry-connection', () => {
  loadInitialUrl();
});

ipcMain.handle('get-active-server', () => {
  return activeServerUrl;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('prompt-custom-server', () => {
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  }
});

// Build Native Menu
function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'Eurêka',
            submenu: [
              {
                label: 'À propos d’Eurêka ERP',
                click: () => {
                  dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Eurêka ERP',
                    message: 'Eurêka ERP Scolaire & Universitaire',
                    detail: `Version : ${app.getVersion()}\nServeur actif : ${activeServerUrl || 'Non défini'}\n\nConçu pour les Groupes Scolaires et Universités d'Afrique.\n© ${new Date().getFullYear()} Inexiumus — inexiumus.com`,
                    icon: getIconPath(),
                  });
                },
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Masquer Eurêka' },
              { role: 'hideOthers', label: 'Masquer les autres' },
              { role: 'unhide', label: 'Tout afficher' },
              { type: 'separator' },
              { role: 'quit', label: 'Quitter Eurêka' },
            ],
          },
        ]
      : []),
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Imprimer (Bulletins, Reçus)...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Fermer la fenêtre' } : { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Serveur & Réseau',
      submenu: [
        {
          label: 'Serveur Local (Port 8080)',
          click: () => loadTargetUrl('http://localhost:8080'),
        },
        {
          label: 'Serveur Local (Port 3000)',
          click: () => loadTargetUrl('http://localhost:3000'),
        },
        {
          label: 'Serveur Local (Port 5173)',
          click: () => loadTargetUrl('http://localhost:5173'),
        },
        { type: 'separator' },
        {
          label: 'Serveur Cloud Vercel (Production)',
          click: () => loadTargetUrl('https://ereuka-learn-connect.vercel.app'),
        },
        {
          label: 'Domaine Personnalisé (eureka.inexiumus.com)',
          click: () => loadTargetUrl('https://eureka.inexiumus.com'),
        },
        { type: 'separator' },
        {
          label: 'Changer de serveur / Sélecteur...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            if (mainWindow) mainWindow.loadFile(path.join(__dirname, 'offline.html'));
          },
        },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Sélectionner tout' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        {
          label: 'Actualiser',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        {
          label: 'Forcer l’actualisation',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          },
        },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize', label: 'Réduire' },
        { role: 'zoom', label: 'Agrandir' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front', label: 'Tout ramener au premier plan' },
              { type: 'separator' },
              { role: 'window', label: 'Fenêtre' },
            ]
          : [{ role: 'close', label: 'Fermer' }]),
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Portail Eurêka Web',
          click: () => {
            shell.openExternal('https://ereuka-learn-connect.vercel.app');
          },
        },
        {
          label: 'Support & Assistance Technique',
          click: () => {
            shell.openExternal('https://inexiumus.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App Lifecycle
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
