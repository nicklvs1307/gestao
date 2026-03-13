const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

class PDFService {
  async generateChecklistExecutionPDF(execution) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `checklist_${execution.id}.pdf`;
        const filePath = path.join(os.tmpdir(), fileName);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('Relatório de Auditoria (Checklist)', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Checklist: ${execution.checklist.title}`);
        doc.text(`Setor: ${execution.checklist.sector.name}`);
        doc.text(`Data/Hora: ${new Date(execution.completedAt).toLocaleString('pt-BR')}`);
        doc.text(`Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}`);
        doc.moveDown();

        // Conformidade
        const okTasks = execution.responses.filter(r => r.isOk).length;
        const totalTasks = execution.responses.length;
        const rate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : 0;
        doc.fontSize(14).text(`Taxa de Conformidade: ${rate}%`, { stroke: true });
        doc.moveDown();

        if (execution.notes) {
          doc.fontSize(10).text(`Observações do Turno: ${execution.notes}`);
          doc.moveDown();
        }

        doc.text('------------------------------------------------------------');
        doc.moveDown();

        // Detalhamento de Itens
        execution.responses.forEach((resp, index) => {
          const task = resp.task || execution.checklist.tasks.find(t => t.id === resp.taskId);
          
          doc.fontSize(11).text(`${index + 1}. ${task?.content || 'Tarefa'}`);
          doc.fontSize(10).text(`Status: ${resp.isOk ? 'CONFORME' : 'IRREGULAR'}`, {
            color: resp.isOk ? 'green' : 'red'
          });
          
          if (resp.notes) {
            doc.text(`Nota: ${resp.notes}`);
          }

          // Se tiver fotos
          if (task?.type === 'PHOTO' && resp.value) {
            try {
              const photos = JSON.parse(resp.value);
              if (Array.isArray(photos)) {
                doc.text(`Fotos: ${photos.length} anexada(s)`);
                // No Node, precisamos do caminho absoluto da imagem no disco
                // As imagens estão em public/uploads/
                photos.forEach(photoUrl => {
                    const relativePath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
                    const absolutePath = path.join(process.cwd(), 'public', relativePath);
                    if (fs.existsSync(absolutePath)) {
                        // Opcional: Adicionar a imagem ao PDF (cuidado com o tamanho/memória)
                        // doc.image(absolutePath, { width: 100 });
                    }
                });
              }
            } catch (e) {
                // Não era JSON
            }
          }
          doc.moveDown(0.5);
        });

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
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `resumo_geral_${Date.now()}.pdf`;
        const filePath = path.join(os.tmpdir(), fileName);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        doc.fontSize(20).text('Resumo Geral de Conformidade', { align: 'center' });
        doc.fontSize(12).text(data.dateStr, { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).text('Resumo Estatístico:');
        doc.fontSize(11).text(`• Checklists Ativos: ${data.totalChecklists}`);
        doc.fontSize(11).text(`• Execuções Realizadas: ${data.executedToday}`);
        doc.fontSize(11).text(`• Taxa de Conformidade Geral: ${data.conformityRate}%`);
        doc.moveDown();

        doc.text('Detalhamento por Execução:');
        doc.moveDown();

        data.executions.forEach((exe, index) => {
          const exeOk = exe.responses.filter(r => r.isOk).length;
          const exeTotal = exe.responses.length;
          const exeRate = exeTotal > 0 ? ((exeOk / exeTotal) * 100).toFixed(0) : 0;
          
          doc.fontSize(12).text(`${index + 1}. ${exe.checklist.title} (${exe.checklist.sector.name})`);
          doc.fontSize(10).text(`   Concluído em: ${new Date(exe.completedAt).toLocaleTimeString('pt-BR')}`);
          doc.text(`   Conformidade: ${exeRate}%`);
          doc.text(`   Executor: ${exe.user?.name || exe.externalUserName || 'N/A'}`);
          if (exe.notes) doc.text(`   Obs: ${exe.notes}`);
          doc.moveDown(0.5);
        });

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
