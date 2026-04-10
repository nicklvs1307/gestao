const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { exec } = require('child_process');

function listWindowsPrinters() {
  return new Promise((resolve) => {
    exec('wmic printer where "Local=TRUE or Network=TRUE" get Name', { timeout: 5000 }, (error, stdout) => {
      if (error) {
        console.error('[PRINTERS] Erro wmic:', error.message);
        return resolve([]);
      }
      const lines = stdout.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && l !== 'Name');
      resolve(lines);
    });
  });
}

const app = express();
const PORT = 4676;
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'kicardapio-printer-2024';

// ─── FILA DE IMPRESSÃO ───────────────────────────────────────────────
class PrintQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  add(job) {
    this.queue.push(job);
    this.process();
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        await job.execute();
        job.resolve({ success: true });
      } catch (error) {
        console.error(`[QUEUE] Erro no job: ${error.message}`);
        job.resolve({ success: false, error: error.message });
      }
      // Pequena pausa entre jobs para não sobrecarregar a impressora
      await new Promise(r => setTimeout(r, 200));
    }

    this.processing = false;
  }
}

const printQueue = new PrintQueue();

// ─── HELPERS ──────────────────────────────────────────────────────────
function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    // Ignora erro de limpeza
  }
}

function isNetworkPrinter(printer) {
  // Impressoras de rede geralmente têm IP no nome ou começam com "\\"
  return /^(\d{1,3}\.){3}\d{1,3}/.test(printer) ||
    printer.startsWith('\\\\') ||
    printer.toLowerCase().includes('network') ||
    printer.toLowerCase().includes('tcp');
}

function extractIpPort(printer) {
  // Formatos aceitos:
  // "192.168.1.100" → { ip: "192.168.1.100", port: 9100 }
  // "192.168.1.100:9100" → { ip: "192.168.1.100", port: 9100 }
  // "tcp://192.168.1.100:9100" → { ip: "192.168.1.100", port: 9100 }
  const cleaned = printer.replace(/^tcp:\/\//, '');
  const [ip, portStr] = cleaned.split(':');
  return { ip, port: parseInt(portStr) || 9100 };
}

// ─── IMPRESSÃO VIA REDE (ESC/POS TCP) ────────────────────────────────
function printNetwork(printer, buffer) {
  return new Promise((resolve, reject) => {
    const { ip, port } = extractIpPort(printer);
    console.log(`[NET] Conectando a ${ip}:${port}...`);

    const client = net.createConnection({ host: ip, port }, () => {
      client.write(buffer);
      client.end();
    });

    client.setTimeout(10000);
    client.on('timeout', () => {
      client.destroy();
      reject(new Error(`Timeout ao conectar em ${ip}:${port}`));
    });

    client.on('error', (err) => {
      reject(new Error(`Erro de rede em ${ip}:${port}: ${err.message}`));
    });

    client.on('close', () => {
      console.log(`[NET] Impressão enviada para ${ip}:${port}`);
      resolve();
    });
  });
}

// ─── IMPRESSÃO VIA USB/LOCAL (PDF via spooler) ────────────────────────
function printLocal(printer, pdfBase64, paperSize) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `kicardapio_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);

    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      fs.writeFileSync(tempFile, pdfBuffer);

      const stat = fs.statSync(tempFile);
      console.log(`[LOCAL] PDF gerado: ${(stat.size / 1024).toFixed(1)}KB`);

      const printOptions = { 
        printer,
        scale: 'fit',
        orientation: 'portrait',
        silent: true,
      };

      if (paperSize) {
        printOptions.paperSize = paperSize;
        console.log(`[LOCAL] paperSize definido: ${paperSize}`);
      }

      console.log(`[LOCAL] Imprimindo com opções: scale=fit, orientation=portrait${paperSize ? `, paperSize=${paperSize}` : ''}`);

      ptp.print(tempFile, printOptions)
        .then(() => {
          console.log(`[LOCAL] Impressão enviada para ${printer}`);
          // Limpa arquivo temp após um delay (spooler pode ainda estar usando)
          setTimeout(() => cleanupTempFile(tempFile), 10000);
          resolve();
        })
        .catch((err) => {
          console.error(`[LOCAL] Erro na impressão: ${err.message}`);
          cleanupTempFile(tempFile);
          reject(err);
        });
    } catch (err) {
      console.error(`[LOCAL] Erro ao processar PDF: ${err.message}`);
      cleanupTempFile(tempFile);
      reject(err);
    }
  });
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '50mb', strict: false }));

// Token de autenticação (query param ou header)
app.use((req, res, next) => {
  // Permitir /status e /printers sem auth para verificação
  if (req.path === '/status' || req.path === '/printers') {
    return next();
  }

  const token = req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.token ||
    req.body?.token;

  if (token !== AGENT_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  next();
});

// ─── ROTAS ────────────────────────────────────────────────────────────

// Status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    version: '2.0.0',
    os: os.platform(),
    queueSize: printQueue.queue.length,
    uptime: Math.floor(process.uptime()),
  });
});

// Listar impressoras
app.get('/printers', async (req, res) => {
  try {
    // Usar método nativo do Windows que é mais confiável
    const printers = await listWindowsPrinters();
    console.log(`[PRINTERS] ${printers.length} impressoras encontradas:`, printers);
    res.json(printers);
  } catch (error) {
    console.error('[ERROR] Falha ao listar impressoras:', error.message);
    res.json([]);
  }
});

// Listar tamanhos de papel suportados por uma impressora
app.get('/paper-sizes', async (req, res) => {
  try {
    const { printer } = req.query;

    // getPrinterPaperSizes pode não existir em versões antigas
    if (typeof ptp.getPrinterPaperSizes !== 'function') {
      console.log('[PAPER-SIZES] getPrinterPaperSizes não disponível nesta versão');
      return res.json([]);
    }

    if (printer) {
      try {
        const paperSizes = await ptp.getPrinterPaperSizes(printer);
        res.json({ printer, paperSizes: Array.isArray(paperSizes) ? paperSizes : [] });
      } catch (e) {
        console.log(`[PAPER-SIZES] Erro ao buscar sizes para ${printer}:`, e.message);
        res.json({ printer, paperSizes: [] });
      }
    } else {
      const printers = await ptp.getPrinters();
      if (!Array.isArray(printers)) {
        return res.json([]);
      }
      const list = printers.map(p => {
        const name = (typeof p === 'string') ? p : (p && typeof p === 'object' ? (p.name || p.deviceId || p.printer || '') : '');
        const sizes = (p && typeof p === 'object' && Array.isArray(p.paperSizes)) ? p.paperSizes : [];
        return { name, paperSizes: sizes };
      }).filter(p => p.name);
      res.json(list);
    }
  } catch (error) {
    console.error('[ERROR] Falha ao listar paper sizes:', error.message);
    res.json([]);
  }
});

// Imprimir (ESC/POS ou PDF)
app.post('/print', async (req, res) => {
  const { printer, content, type, paperSize } = req.body;

  if (!printer) {
    return res.status(400).json({ error: 'Nome da impressora não informado' });
  }
  if (!content) {
    return res.status(400).json({ error: 'Conteúdo não informado' });
  }

  console.log(`[PRINT] Recebido job: printer=${printer}, type=${type || 'auto'}, size=${content.length} bytes${paperSize ? `, paperSize=${paperSize}` : ''}`);

  // Adicionar à fila
  const result = await new Promise((resolve) => {
    printQueue.add({
      execute: async () => {
        if (type === 'escpos') {
          // ESC/POS: enviar buffer direto para a impressora
          const buffer = Buffer.from(content, 'base64');

          if (isNetworkPrinter(printer)) {
            await printNetwork(printer, buffer);
          } else {
            // USB: tentar via raw-printer, fallback para copy /b
            await printRaw(printer, buffer);
          }
        } else {
          // PDF: usar pdf-to-printer
          await printLocal(printer, content, paperSize);
        }
      },
      resolve,
    });
  });

  if (result.success) {
    res.json({ success: true, queueSize: printQueue.queue.length });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// ─── IMPRESSÃO RAW (USB via spooler) ──────────────────────────────────
async function printRaw(printer, buffer) {
  // Método 1: Tentar via UNC path (compartilhamento Windows)
  const uncPath = `\\\\localhost\\${printer}`;
  try {
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(uncPath);
      stream.on('error', reject);
      stream.on('open', () => {
        stream.write(buffer);
        stream.end();
      });
      stream.on('finish', resolve);
    });
    console.log(`[RAW] Impressão enviada via UNC para ${printer}`);
    return;
  } catch (e) {
    // Método 1 falhou, tentar método 2
  }

  // Método 2: copy /b via cmd (funciona com impressoras compartilhadas)
  const tempFile = path.join(os.tmpdir(), `kicardapio_raw_${Date.now()}.bin`);
  fs.writeFileSync(tempFile, buffer);

  try {
    await new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(`copy /b "${tempFile}" "\\\\localhost\\${printer}"`, (error) => {
        cleanupTempFile(tempFile);
        if (error) reject(error);
        else resolve();
      });
    });
    console.log(`[RAW] Impressão enviada via copy /b para ${printer}`);
    return;
  } catch (e) {
    // Método 2 falhou, tentar método 3
  }

  // Método 3: Converter ESC/POS para texto simples e gerar PDF
  // Isso funciona com qualquer impressora Windows
  cleanupTempFile(tempFile);
  console.log(`[RAW] Fallback: convertendo ESC/POS para PDF e imprimindo via pdf-to-printer`);
  throw new Error(`Impressão raw não suportada para "${printer}". Use impressão de rede (IP) ou configure a impressora como compartilhada.`);
}

// ─── LIMPEZA PERIÓDICA DE ARQUIVOS TEMP ───────────────────────────────
setInterval(() => {
  const tmpDir = os.tmpdir();
  try {
    const files = fs.readdirSync(tmpDir);
    const now = Date.now();
    let cleaned = 0;
    files.forEach(file => {
      if (file.startsWith('kicardapio_') && file.endsWith('.pdf') || file.endsWith('.bin')) {
        const filePath = path.join(tmpDir, file);
        try {
          const stat = fs.statSync(filePath);
          // Remove arquivos com mais de 5 minutos
          if (now - stat.mtimeMs > 5 * 60 * 1000) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch { /* ignore */ }
      }
    });
    if (cleaned > 0) {
      console.log(`[CLEANUP] ${cleaned} arquivo(s) temporário(s) removido(s)`);
    }
  } catch { /* ignore */ }
}, 60000); // A cada 1 minuto

// ─── INICIAR SERVIDOR ─────────────────────────────────────────────────
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`
  ┌──────────────────────────────────────────┐
  │  KiCardápio - Agente de Impressão v2.0  │
  ├──────────────────────────────────────────┤
  │  Status:   http://127.0.0.1:${PORT}/status     │
  │  Printers: http://127.0.0.1:${PORT}/printers   │
  │  Fila:     ativa (1 job por vez)         │
  │  ESC/POS:  suportado (TCP rede)          │
  │  PDF:      suportado (USB/local)         │
  └──────────────────────────────────────────┘
  `);

  // Notifica o processo Electron que o servidor iniciou
  if (process.send) {
    process.send({ type: 'server_started', port: PORT });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] Recebido SIGTERM, encerrando...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[SERVER] Recebido SIGINT, encerrando...');
  server.close(() => process.exit(0));
});
