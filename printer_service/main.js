const { app, BrowserWindow, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;
let serverPort = 4676;

function sendLog(message, type = 'info') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', { message, type });
  }
}

function startServer() {
  if (serverProcess) {
    sendLog('Servidor já está em execução.', 'info');
    return;
  }

  sendLog('Iniciando servidor de impressão...', 'info');

  const serverPath = path.join(__dirname, 'server.js');

  serverProcess = fork(serverPath, [], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    silent: true,
  });

  serverProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) {
      console.log(`[Server] ${msg}`);
      sendLog(msg, 'info');
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) {
      console.error(`[Server Error] ${msg}`);
      sendLog(msg, 'error');
    }
  });

  serverProcess.on('message', (msg) => {
    if (msg && msg.type === 'server_started') {
      serverPort = msg.port || 4676;
      sendLog(`Servidor iniciado na porta ${serverPort}`, 'success');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status-change', true);
      }
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Erro no processo do servidor:', err);
    sendLog(`Erro fatal: ${err.message}`, 'error');
  });

  serverProcess.on('close', (code) => {
    sendLog(`Servidor parou (código ${code}). Reiniciando em 3s...`, 'error');
    serverProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-change', false);
    }
    // Auto-restart após crash
    setTimeout(() => {
      if (!serverProcess) {
        sendLog('Tentando reiniciar servidor...', 'info');
        startServer();
      }
    }, 3000);
  });
}

function createMainWindow() {
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    show: false,
    icon: iconPath,
    title: 'KiCardápio - Agente de Impressão',
    resizable: false,
    maximizable: false,
    minimizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenu(null);

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      new Notification({
        title: 'KiCardápio Impressão',
        body: 'Executando em segundo plano. Clique na bandeja para reabrir.',
      }).show();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // System Tray
    const iconPath = path.join(__dirname, 'icon.png');
    const image = nativeImage.createFromPath(iconPath);
    const trayIcon = image.resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);
    tray.setToolTip('KiCardápio - Agente de Impressão');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'KiCardápio Impressão v2.0', enabled: false },
      { type: 'separator' },
      {
        label: 'Abrir Janela',
        click: () => mainWindow && mainWindow.show(),
      },
      {
        label: 'Reiniciar Servidor',
        click: () => {
          if (serverProcess) serverProcess.kill();
          serverProcess = null;
          startServer();
          new Notification({
            title: 'KiCardápio',
            body: 'Servidor reiniciado!',
          }).show();
        },
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.isQuitting = true;
          if (serverProcess) serverProcess.kill();
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow && mainWindow.show());

    createMainWindow();
    startServer();

    // Auto-start com Windows
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
    });
  });
}

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
