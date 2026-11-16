const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');

// Determine environment & target URLs
const PRIMARY_URL = process.env.EUREKA_APP_URL || 'https://eureka.inexiumus.com';
const FALLBACK_URL = 'https://ereuka-learn-connect.vercel.app';
const IS_DEV = !app.isPackaged;

let mainWindow = null;
let currentTargetUrl = PRIMARY_URL;

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
      spellcheck: true
    }
  });

  // Smooth appearance when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isInternal = url.startsWith(PRIMARY_URL) || 
                       url.startsWith(FALLBACK_URL) || 
                       url.includes('vercel.app');
    if (!isInternal && (url.startsWith('http:') || url.startsWith('https:'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Network / Load failure handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted loads (e.g. user navigation)
    if (errorCode === -3) return;

    console.warn(`Load failed for ${validatedURL} [${errorCode}]: ${errorDescription}`);

    // If primary custom domain failed, try fallback vercel domain
    if (currentTargetUrl === PRIMARY_URL) {
      console.log(`Retrying with fallback production URL: ${FALLBACK_URL}`);
      currentTargetUrl = FALLBACK_URL;
      mainWindow.loadURL(FALLBACK_URL).catch(() => {
        mainWindow.loadFile(path.join(__dirname, 'offline.html'));
      });
    } else {
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  loadApp();
  setupMenu();
}

function loadApp() {
  if (!mainWindow) return;
  mainWindow.loadURL(currentTargetUrl).catch((err) => {
    console.error('Failed to load URL:', err);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });
}

// IPC handler for offline reload button
ipcMain.on('retry-connection', () => {
  currentTargetUrl = PRIMARY_URL;
  loadApp();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Build Native Menu
function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: 'Eurêka',
      submenu: [
        {
          label: 'À propos d’Eurêka',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Eurêka ERP',
              message: 'Eurêka ERP Scolaire & Universitaire',
              detail: `Version : ${app.getVersion()}\nDéveloppé pour les Groupes Scolaires et Universités d'Afrique.\n© ${new Date().getFullYear()} Inexiumus - inexiumus.com`,
              icon: getIconPath()
            });
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Masquer Eurêka' },
        { role: 'hideOthers', label: 'Masquer les autres' },
        { role: 'unhide', label: 'Tout afficher' },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter Eurêka' }
      ]
    }] : []),
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Imprimer...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Fermer la fenêtre' } : { role: 'quit', label: 'Quitter' }
      ]
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
        { role: 'selectAll', label: 'Sélectionner tout' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        {
          label: 'Actualiser',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Forcer l’actualisation',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' }
      ]
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize', label: 'Réduire' },
        { role: 'zoom', label: 'Agrandir' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: 'Tout ramener au premier plan' },
          { type: 'separator' },
          { role: 'window', label: 'Fenêtre' }
        ] : [
          { role: 'close', label: 'Fermer' }
        ])
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Portail Eurêka Web',
          click: () => {
            shell.openExternal('https://eureka.inexiumus.com');
          }
        },
        {
          label: 'Support & Assistance',
          click: () => {
            shell.openExternal('https://inexiumus.com');
          }
        }
      ]
    }
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
