const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');

class PDFService {
  // Cores do Tema Pedify
  colors = {
    primary: '#0F172A', // Slate 900
    secondary: '#64748B', // Slate 500
    success: '#10B981', // Emerald 500
    danger: '#F43F5E', // Rose 500
    accent: '#F1F5F9', // Slate 100
    white: '#FFFFFF'
  };

  async generateChecklistExecutionPDF(execution) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
        const fileName = `checklist_${execution.id}.pdf`;
        const filePath = path.join(os.tmpdir(), fileName);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // --- CABEÇALHO ESTILIZADO ---
        doc.rect(0, 0, 600, 100).fill(this.colors.primary);
        
        // Logo do Restaurante (Esquerda)
        let hasRestaurantLogo = false;
        if (execution.checklist.restaurant.logoUrl) {
            const logoPath = execution.checklist.restaurant.logoUrl.startsWith('/') 
                ? execution.checklist.restaurant.logoUrl.substring(1) 
                : execution.checklist.restaurant.logoUrl;
            const absoluteLogoPath = path.join(process.cwd(), 'public', logoPath);
            
            if (fs.existsSync(absoluteLogoPath)) {
                doc.image(absoluteLogoPath, 40, 25, { height: 50 });
                hasRestaurantLogo = true;
            }
        }

        // Título (Centralizado ou deslocado se tiver logo)
        const titleX = hasRestaurantLogo ? 150 : 40;
        doc.fillColor(this.colors.white).fontSize(20).font('Helvetica-Bold').text('CHECKLIST OPERACIONAL', titleX, 35);
        doc.fontSize(10).font('Helvetica').text(`ID: #${execution.id.toUpperCase()}`, titleX, 60, { opacity: 0.7 });
        
        // Logo KiCardapio (Direita)
        const kiCardapioLogoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(kiCardapioLogoPath)) {
            doc.image(kiCardapioLogoPath, 480, 25, { height: 40 });
        } else {
            doc.fillColor(this.colors.white).fontSize(14).font('Helvetica-Bold').text('KiCardapio', 480, 40);
        }

        doc.moveDown(4);

        // --- RESUMO DA EXECUÇÃO ---
        const okTasks = execution.responses.filter(r => r.isOk).length;
        const totalTasks = execution.responses.length;
        const rate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : 0;

        doc.fillColor(this.colors.primary).fontSize(14).font('Helvetica-Bold').text('RESUMO DO CHECKLIST');
        doc.rect(40, doc.y + 5, 515, 2).fill(this.colors.accent);
        doc.moveDown(1.5);

        // Grid de informações
        const startY = doc.y;
        doc.fontSize(10).fillColor(this.colors.secondary).text('CHECKLIST:', 40, startY);
        doc.fillColor(this.colors.primary).font('Helvetica-Bold').text(execution.checklist.title, 120, startY);

        doc.fillColor(this.colors.secondary).font('Helvetica').text('SETOR:', 40, startY + 15);
        doc.fillColor(this.colors.primary).font('Helvetica-Bold').text(execution.checklist.sector.name, 120, startY + 15);

        doc.fillColor(this.colors.secondary).font('Helvetica').text('EXECUTOR:', 40, startY + 30);
        doc.fillColor(this.colors.primary).font('Helvetica-Bold').text(execution.user?.name || execution.externalUserName || 'N/A', 120, startY + 30);

        // Card de Pontuação (Score) no canto
        doc.rect(400, startY - 5, 150, 50).fill(this.colors.accent);
        doc.fillColor(this.colors.primary).fontSize(8).font('Helvetica-Bold').text('SCORE DE CONFORMIDADE', 410, startY + 5);
        doc.fillColor(rate >= 80 ? this.colors.success : this.colors.danger).fontSize(20).text(`${rate}%`, 410, startY + 20);

        doc.moveDown(4);

        // --- LISTAGEM DE ITENS ---
        doc.fillColor(this.colors.primary).fontSize(12).font('Helvetica-Bold').text('VERIFICAÇÃO DETALHADA');
        doc.moveDown(1);

        for (const [index, resp] of execution.responses.entries()) {
          const task = resp.task || execution.checklist.tasks.find(t => t.id === resp.taskId);
          
          // Container do Item - Verificar espaço ANTES de desenhar
          if (doc.y > 650) doc.addPage();

          const itemTop = doc.y;
          doc.rect(40, itemTop, 515, 45).fill(this.colors.accent);
          
          // Status Indicator
          doc.rect(40, itemTop, 5, 45).fill(resp.isOk ? this.colors.success : this.colors.danger);

          doc.fillColor(this.colors.primary).fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${task?.content || 'Tarefa'}`, 55, itemTop + 10);
          
          const statusText = resp.isOk ? '✅ CONFORME' : '❌ IRREGULAR';
          doc.fillColor(resp.isOk ? this.colors.success : this.colors.danger).fontSize(8).text(statusText, 55, itemTop + 25);

          if (resp.notes) {
            doc.fillColor(this.colors.secondary).fontSize(8).font('Helvetica-Oblique').text(`Nota: ${resp.notes}`, 200, itemTop + 25);
          }

          doc.moveDown(3);

          // RENDERIZAR FOTOS DO ITEM (Muito Maiores e Sem Sobreposição)
          if (task?.type === 'PHOTO' && resp.value) {
            try {
              const photos = JSON.parse(resp.value);
              if (Array.isArray(photos) && photos.length > 0) {
                doc.moveDown(1);
                const imgWidth = 480; // Quase a largura total da página
                const imgHeight = 320; // Proporção maior

                for (const photoUrl of photos) {
                  const relativePath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
                  const absolutePath = path.join(process.cwd(), 'public', relativePath);
                  
                  if (fs.existsSync(absolutePath)) {
                    // Se a imagem for ultrapassar o limite inferior da página, pula ANTES
                    if (doc.y + imgHeight > 740) {
                        doc.addPage();
                    }
                    
                    try {
                      const optimizedBuffer = await sharp(absolutePath)
                        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 85 })
                        .toBuffer();

                      // Desenha a imagem centralizada (x=55)
                      doc.image(optimizedBuffer, 55, doc.y, { width: imgWidth, height: imgHeight });
                      
                      // FORÇA o cursor do PDF a ir para baixo da imagem (Altura da imagem + margem)
                      doc.y += imgHeight + 15;
                    } catch (sharpError) {
                      console.error("Erro ao otimizar imagem:", sharpError);
                    }
                  }
                }
                doc.moveDown(2); // Espaço extra após o bloco de fotos do item
              }
            } catch (e) {
              console.error("Erro ao processar JSON de fotos:", e);
            }
          }
        }

        // Rodapé
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fillColor(this.colors.secondary).fontSize(8).text(`Página ${i + 1} de ${pages.count} | Gerado por KiCardapio`, 40, 800, { align: 'center' });
        }

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  async generateDailyGeneralPDF(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
        const fileName = `resumo_geral_${Date.now()}.pdf`;
        const filePath = path.join(os.tmpdir(), fileName);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.rect(0, 0, 600, 100).fill(this.colors.primary);
        doc.fillColor(this.colors.white).fontSize(20).font('Helvetica-Bold').text('RESUMO GERAL DE CONFORMIDADE', 40, 40);
        doc.fontSize(10).font('Helvetica').text(data.dateStr, 40, 65);

        doc.moveDown(5);

        // Estatísticas
        doc.fillColor(this.colors.primary).fontSize(14).font('Helvetica-Bold').text('PANORAMA DO DIA');
        doc.rect(40, doc.y + 5, 515, 2).fill(this.colors.accent);
        doc.moveDown(1.5);

        const gridY = doc.y;
        doc.rect(40, gridY, 160, 60).fill(this.colors.accent);
        doc.fillColor(this.colors.primary).fontSize(8).text('CHECKLISTS ATIVOS', 50, gridY + 15);
        doc.fontSize(18).text(data.totalChecklists, 50, gridY + 30);

        doc.rect(215, gridY, 160, 60).fill(this.colors.accent);
        doc.fillColor(this.colors.primary).fontSize(8).text('REALIZADOS HOJE', 225, gridY + 15);
        doc.fontSize(18).text(data.executedToday, 225, gridY + 30);

        doc.rect(395, gridY, 160, 60).fill(this.colors.accent);
        doc.fillColor(this.colors.primary).fontSize(8).text('MÉDIA CONFORMIDADE', 405, gridY + 15);
        doc.fillColor(parseFloat(data.conformityRate) >= 80 ? this.colors.success : this.colors.danger).fontSize(18).text(`${data.conformityRate}%`, 405, gridY + 30);

        doc.moveDown(5);

        // Tabela de Execuções
        doc.fillColor(this.colors.primary).fontSize(12).font('Helvetica-Bold').text('DETALHAMENTO POR SETOR');
        doc.moveDown(1);

        data.executions.forEach((exe, index) => {
          if (doc.y > 700) doc.addPage();

          const exeOk = exe.responses.filter(r => r.isOk).length;
          const exeTotal = exe.responses.length;
          const exeRate = exeTotal > 0 ? ((exeOk / exeTotal) * 100).toFixed(0) : 0;
          
          const rowY = doc.y;
          doc.rect(40, rowY, 515, 35).fill(index % 2 === 0 ? this.colors.accent : this.colors.white);
          
          doc.fillColor(this.colors.primary).fontSize(9).font('Helvetica-Bold').text(exe.checklist.title, 50, rowY + 12);
          doc.fillColor(this.colors.secondary).font('Helvetica').text(exe.checklist.sector.name, 200, rowY + 12);
          doc.text(new Date(exe.completedAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }), 320, rowY + 12);
          
          doc.fillColor(parseFloat(exeRate) >= 80 ? this.colors.success : this.colors.danger)
             .font('Helvetica-Bold').text(`${exeRate}% Score`, 450, rowY + 12, { align: 'right', width: 80 });

          doc.moveDown(1.5);
        });

        // Rodapé
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fillColor(this.colors.secondary).fontSize(8).text(`Página ${i + 1} de ${pages.count} | Gerado por KiCardapio`, 40, 800, { align: 'center' });
        }

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();
