const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 4676;

// Configuração avançada de CORS para permitir acesso da Nuvem -> Local
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Em produção, idealmente coloque 'https://kicardapio.towersfy.com'
    res.header("Access-Control-Allow-Private-Network", "true"); // CRÍTICO: Permite que o Chrome deixe o site público acessar o localhost
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    next();
});

app.use(cors({
    origin: true, // Reflete a origem da requisição
    credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));

// Rota de Status
app.get('/status', (req, res) => {
    res.json({ status: 'online', version: '1.0.0', os: os.platform() });
});

// Listar Impressoras
app.get('/printers', async (req, res) => {
    try {
        const printers = await ptp.getPrinters();
        res.json(printers);
    } catch (error) {
        console.error('Erro ao listar impressoras:', error);
        res.status(500).json({ error: 'Erro ao listar impressoras' });
    }
});

// Imprimir
app.post('/print', async (req, res) => {
    const { printer, content, type } = req.body;
    // content pode ser um base64 de PDF ou Texto simples (futuro)
    
    if (!printer) {
        return res.status(400).json({ error: 'Nome da impressora não informado' });
    }

    try {
        console.log(`Recebendo pedido de impressão para: ${printer}`);

        // Salvar o conteúdo em um arquivo temporário
        const tempFile = path.join(os.tmpdir(), `print_job_${Date.now()}.pdf`);
        
        // Assumindo que 'content' é um base64 de um PDF gerado no frontend
        const pdfBuffer = Buffer.from(content, 'base64');
        fs.writeFileSync(tempFile, pdfBuffer);

        // Enviar para impressora
        await ptp.print(tempFile, { printer: printer });

        console.log('Impressão enviada com sucesso!');
        
        // Limpeza (opcional, pode deixar para o SO ou deletar depois de um tempo)
        // setTimeout(() => fs.unlinkSync(tempFile), 5000);

        res.json({ success: true });
    } catch (error) {
        console.error('Erro na impressão:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`
    🚀 Agente de Impressão Iniciado!
    ----------------------------------
    Status:   http://localhost:${PORT}/status
    Printers: http://localhost:${PORT}/printers
    
    Mantenha essa janela aberta para imprimir.
    `);
});
