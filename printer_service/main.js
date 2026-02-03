const { app, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let tray = null;
let serverProcess = null;

// Função para iniciar o servidor Express (server.js)
function startServer() {
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
        env: { ...process.env, NODE_ENV: 'production' }
    });

    serverProcess.on('message', (msg) => {
        console.log('Mensagem do Servidor:', msg);
    });

    serverProcess.on('error', (err) => {
        console.error('Erro no processo do servidor:', err);
    });
}

app.whenReady().then(() => {
    // Carrega a logo do sistema
    // Nota: O Electron prefere arquivos .ico ou .png quadrados para a bandeja
    const iconPath = path.join(__dirname, 'icon.png');
    const image = nativeImage.createFromPath(iconPath);
    
    tray = new Tray(image.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
        { label: 'KiCardápio Impressão', enabled: false },
        { type: 'separator' },
        { label: 'Status: Online', icon: image.resize({width: 10, height: 10}), enabled: false },
        { label: 'Reiniciar Servidor', click: () => {
            serverProcess.kill();
            startServer();
            new Notification({ title: 'KiCardápio', body: 'Servidor reiniciado com sucesso!' }).show();
        }},
        { type: 'separator' },
        { label: 'Sair', click: () => {
            serverProcess.kill();
            app.quit();
        }}
    ]);

    tray.setToolTip('KiCardápio - Agente de Impressão');
    tray.setContextMenu(contextMenu);

    // Inicia o servidor de impressão
    startServer();

    // Configura para iniciar com o Windows
    app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe')
    });

    // Notificação de início
    new Notification({ 
        title: 'Serviço de Impressão Ativo', 
        body: 'O KiCardápio está pronto para imprimir seus pedidos.',
        silent: false 
    }).show();
});

// Impede que o app feche quando a janela for fechada (já que nem temos janela)
app.on('window-all-closed', (e) => {
    e.preventDefault();
});
