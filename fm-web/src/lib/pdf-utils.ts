import { PDFDocument, PageSizes } from 'pdf-lib';

// Tamanho 10x15cm em pontos (1 polegada = 72 pontos, 1cm = 28.35 pontos)
const LABEL_WIDTH = 10 * 28.35; // ~283.5 pontos
const LABEL_HEIGHT = 15 * 28.35; // ~425.25 pontos

/**
 * Redimensiona um PDF para o formato 10x15cm
 * Mantém a proporcao e centraliza o conteudo
 */
export async function redimensionarPara10x15(pdfUrl: string): Promise<Blob> {
  // Baixa o PDF original
  const response = await fetch(pdfUrl);
  const pdfBytes = await response.arrayBuffer();

  // Carrega o PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error('PDF sem paginas');
  }

  // Cria novo documento com tamanho 10x15
  const novoPdf = await PDFDocument.create();

  for (const page of pages) {
    const { width: originalWidth, height: originalHeight } = page.getSize();

    // Cria nova pagina 10x15
    const novaPagina = novoPdf.addPage([LABEL_WIDTH, LABEL_HEIGHT]);

    // Copia a pagina original
    const [paginaCopiada] = await novoPdf.embedPages([page]);

    // Calcula escala para caber no 10x15 mantendo proporcao
    const escalaX = LABEL_WIDTH / originalWidth;
    const escalaY = LABEL_HEIGHT / originalHeight;
    const escala = Math.min(escalaX, escalaY) * 0.95; // 95% para margem

    // Calcula posicao para centralizar
    const novaLargura = originalWidth * escala;
    const novaAltura = originalHeight * escala;
    const x = (LABEL_WIDTH - novaLargura) / 2;
    const y = (LABEL_HEIGHT - novaAltura) / 2;

    // Desenha a pagina redimensionada
    novaPagina.drawPage(paginaCopiada, {
      x,
      y,
      width: novaLargura,
      height: novaAltura,
    });
  }

  // Salva o novo PDF
  const novoPdfBytes = await novoPdf.save();
  return new Blob([new Uint8Array(novoPdfBytes)], { type: 'application/pdf' });
}

/**
 * Abre o PDF redimensionado em nova aba para impressao
 */
export async function abrirEtiqueta10x15(pdfUrl: string): Promise<void> {
  try {
    const blob = await redimensionarPara10x15(pdfUrl);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Erro ao redimensionar PDF:', error);
    // Fallback: abre o PDF original
    window.open(pdfUrl, '_blank');
  }
}

/**
 * Baixa o PDF redimensionado
 */
export async function baixarEtiqueta10x15(pdfUrl: string, nomeArquivo: string): Promise<void> {
  try {
    const blob = await redimensionarPara10x15(pdfUrl);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo || 'etiqueta-10x15.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao baixar PDF:', error);
    throw error;
  }
}

/**
 * Processa multiplas etiquetas e combina em um unico PDF 10x15
 */
export async function combinarEtiquetas10x15(pdfUrls: string[]): Promise<Blob> {
  const novoPdf = await PDFDocument.create();

  for (const pdfUrl of pdfUrls) {
    try {
      const response = await fetch(pdfUrl);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width: originalWidth, height: originalHeight } = page.getSize();

        const novaPagina = novoPdf.addPage([LABEL_WIDTH, LABEL_HEIGHT]);
        const [paginaCopiada] = await novoPdf.embedPages([page]);

        const escalaX = LABEL_WIDTH / originalWidth;
        const escalaY = LABEL_HEIGHT / originalHeight;
        const escala = Math.min(escalaX, escalaY) * 0.95;

        const novaLargura = originalWidth * escala;
        const novaAltura = originalHeight * escala;
        const x = (LABEL_WIDTH - novaLargura) / 2;
        const y = (LABEL_HEIGHT - novaAltura) / 2;

        novaPagina.drawPage(paginaCopiada, {
          x,
          y,
          width: novaLargura,
          height: novaAltura,
        });
      }
    } catch (error) {
      console.error(`Erro ao processar ${pdfUrl}:`, error);
    }
  }

  const novoPdfBytes = await novoPdf.save();
  return new Blob([new Uint8Array(novoPdfBytes)], { type: 'application/pdf' });
}
