const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;

// Função para enviar logs para a janela
function sendLog(message, type = 'info') {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log', { message, type });
    }
}

// Função para iniciar o servidor Express (server.js)
function startServer() {
    if (serverProcess) return;

    sendLog('Iniciando servidor de impressão...', 'info');
    
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'] // Capturar stdout/stderr
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
        // Se o server.js enviar mensagens via process.send()
        if (typeof msg === 'object') {
            sendLog(JSON.stringify(msg), 'info');
        } else {
            sendLog(msg, 'info');
        }
    });

    serverProcess.on('error', (err) => {
        console.error('Erro no processo do servidor:', err);
        sendLog(`Erro fatal: ${err.message}`, 'error');
    });

    serverProcess.on('close', (code) => {
        sendLog(`Servidor parou com código ${code}`, 'error');
        serverProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-change', false);
        }
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status-change', true);
    }
}

function createMainWindow() {
    const iconPath = path.join(__dirname, 'icon.png');
    
    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        show: false, // Inicia oculto, mostraremos após 'ready-to-show' ou clique
        icon: iconPath,
        title: 'Agente de Impressão - KiCardápio',
        resizable: false,
        maximizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // Simplificado para este uso local
        }
    });

    mainWindow.loadFile('index.html');

    // Remove o menu padrão (File, Edit, etc)
    mainWindow.setMenu(null);

    // Quando o usuário tentar fechar, apenas esconde
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            new Notification({ 
                title: 'Executando em 2º Plano', 
                body: 'O agente de impressão continua ativo na bandeja do sistema.' 
            }).show();
        }
        return false;
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Se tentar abrir uma segunda instância, foca na primeira
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        const iconPath = path.join(__dirname, 'icon.png');
        const image = nativeImage.createFromPath(iconPath);
        
        tray = new Tray(image.resize({ width: 16, height: 16 }));

        const contextMenu = Menu.buildFromTemplate([
            { label: 'KiCardápio Impressão', enabled: false },
            { type: 'separator' },
            { label: 'Abrir Janela', click: () => mainWindow.show() },
            { label: 'Reiniciar Servidor', click: () => {
                if (serverProcess) serverProcess.kill();
                startServer();
                new Notification({ title: 'KiCardápio', body: 'Servidor reiniciado com sucesso!' }).show();
            }},
            { type: 'separator' },
            { label: 'Sair Completamente', click: () => {
                app.isQuitting = true;
                if (serverProcess) serverProcess.kill();
                app.quit();
            }}
        ]);

        tray.setToolTip('KiCardápio - Agente de Impressão');
        tray.setContextMenu(contextMenu);
        
        tray.on('double-click', () => {
            mainWindow.show();
        });

        createMainWindow();
        startServer();

        // Configura para iniciar com o Windows
        app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe')
        });
    });
}

// Impede que o app feche quando a janela for fechada (gerenciado pelo evento 'close' da janela)
app.on('window-all-closed', (e) => {
    e.preventDefault();
});
