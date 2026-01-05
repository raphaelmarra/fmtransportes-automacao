import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import * as bwipjs from 'bwip-js';

export interface ItemDeclaracao {
  sku: string;
  descricao: string;
  quantidade: number;
  valor: number;
}

export interface DadosDeclaracao {
  trackingCode: string;
  numeroPedido: string;
  destinatario: {
    nome: string;
    cpfCnpj: string;
    endereco: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  itens: ItemDeclaracao[];
  valorTotal: number;
  volumes?: number;
}

// Dados fixos do remetente (Setor da Embalagem)
const REMETENTE = {
  nome: 'Setor da Embalagem',
  cnpj: '27.367.445/0001-60',
  endereco: 'Av. Claudio Franchi, 748, Jd Monte Kemel, Sao Paulo/SP',
};

// Tamanho 10x15cm em PAISAGEM (15cm largura x 10cm altura)
// 1 cm = 28.35 pontos
const PAGE_WIDTH = 15 * 28.35; // ~425.25 pontos
const PAGE_HEIGHT = 10 * 28.35; // ~283.5 pontos

@Injectable()
export class DeclaracaoService {
  private readonly logger = new Logger(DeclaracaoService.name);

  // Gera multiplas declaracoes em um unico PDF (uma pagina por declaracao)
  async gerarMultiplasDeclaracoes(declaracoes: DadosDeclaracao[]): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const dados of declaracoes) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      await this.desenharPaginaDeclaracao(pdfDoc, page, fontBold, fontRegular, dados);
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // Gera uma unica declaracao
  async gerarDeclaracao(dados: DadosDeclaracao): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    await this.desenharPaginaDeclaracao(pdfDoc, page, fontBold, fontRegular, dados);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // Metodo compartilhado que desenha uma pagina de declaracao
  private async desenharPaginaDeclaracao(
    pdfDoc: PDFDocument,
    page: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    dados: DadosDeclaracao,
  ): Promise<void> {
    // Gerar codigo de barras
    const barcodeBuffer = await this.gerarCodigoBarras(dados.trackingCode);
    const barcodeImage = await pdfDoc.embedPng(barcodeBuffer);

    const marginLeft = 15;
    const marginRight = PAGE_WIDTH - 15;
    let y = PAGE_HEIGHT - 15;

    const barcodeWidth = 120;
    const barcodeHeight = 35;

    // Dois codigos de barras no topo
    page.drawImage(barcodeImage, {
      x: marginLeft,
      y: y - barcodeHeight,
      width: barcodeWidth,
      height: barcodeHeight,
    });

    page.drawImage(barcodeImage, {
      x: PAGE_WIDTH - marginLeft - barcodeWidth,
      y: y - barcodeHeight,
      width: barcodeWidth,
      height: barcodeHeight,
    });

    // Tracking code abaixo dos codigos de barras
    page.drawText(dados.trackingCode, {
      x: marginLeft,
      y: y - barcodeHeight - 10,
      size: 6,
      font: fontRegular,
    });

    page.drawText(dados.trackingCode, {
      x: PAGE_WIDTH - marginLeft - barcodeWidth,
      y: y - barcodeHeight - 10,
      size: 6,
      font: fontRegular,
    });

    y -= barcodeHeight + 18;

    // Titulo centralizado
    const titulo = 'DECLARACAO DE NAO CONTRIBUINTE DO ICMS';
    const tituloWidth = fontBold.widthOfTextAtSize(titulo, 8);
    page.drawText(titulo, {
      x: (PAGE_WIDTH - tituloWidth) / 2,
      y,
      size: 8,
      font: fontBold,
    });

    y -= 14;

    // Texto principal compacto
    const textoDeclaracao = `DECLARAMOS QUE ${REMETENTE.nome}, CNPJ ${REMETENTE.cnpj}, ${REMETENTE.endereco}, NAO E CONTRIBUINTE DO ICMS:`;
    page.drawText(textoDeclaracao, {
      x: marginLeft,
      y,
      size: 5,
      font: fontRegular,
    });

    y -= 12;

    // Linha separadora
    page.drawLine({
      start: { x: marginLeft, y },
      end: { x: marginRight, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    y -= 3;

    // Cabecalho tabela
    page.drawText('Produtos', {
      x: marginLeft,
      y: y - 8,
      size: 6,
      font: fontBold,
    });
    page.drawText('Vol', {
      x: 280,
      y: y - 8,
      size: 6,
      font: fontBold,
    });
    page.drawText('Valor', {
      x: 330,
      y: y - 8,
      size: 6,
      font: fontBold,
    });

    y -= 14;

    // Linha separadora
    page.drawLine({
      start: { x: marginLeft, y },
      end: { x: marginRight, y },
      thickness: 0.3,
      color: rgb(0, 0, 0),
    });

    y -= 3;

    // Produtos formatados como [qty]x[SKU] + [qty]x[SKU]
    const produtosFormatados = dados.itens
      .map((item) => {
        const identificador = item.sku || item.descricao?.substring(0, 10) || 'ITEM';
        return `${item.quantidade}x${identificador}`;
      })
      .join(' + ');

    // Usa o campo volumes explicitamente ou default para 1
    const totalVolumes = dados.volumes ?? 1;

    // Truncar se muito longo
    const produtosTruncados =
      produtosFormatados.length > 45
        ? produtosFormatados.substring(0, 42) + '...'
        : produtosFormatados;

    page.drawText(produtosTruncados, {
      x: marginLeft,
      y: y - 8,
      size: 7,
      font: fontRegular,
    });
    page.drawText(totalVolumes.toString(), {
      x: 285,
      y: y - 8,
      size: 7,
      font: fontRegular,
    });
    page.drawText(this.formatarMoeda(dados.valorTotal), {
      x: 330,
      y: y - 8,
      size: 7,
      font: fontRegular,
    });

    y -= 14;

    // Linha separadora
    page.drawLine({
      start: { x: marginLeft, y },
      end: { x: marginRight, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    y -= 6;

    // Destinatario
    page.drawText('DESTINATARIO:', {
      x: marginLeft,
      y: y - 8,
      size: 6,
      font: fontBold,
    });

    y -= 12;

    const dest = dados.destinatario;
    const cpfFormatado = this.formatarCpfCnpj(dest.cpfCnpj);

    // Nome e CPF na mesma linha
    page.drawText(`${dest.nome} - ${cpfFormatado}`, {
      x: marginLeft,
      y: y - 8,
      size: 6,
      font: fontRegular,
    });

    y -= 10;

    // Endereco completo - quebra em linhas de ate 70 caracteres
    const enderecoCompleto = `${dest.endereco}, ${dest.numero}, ${dest.bairro}, ${dest.cidade}/${dest.uf}`;
    const linhasEndereco = this.quebrarTexto(enderecoCompleto, 70);

    for (const linha of linhasEndereco) {
      page.drawText(linha, {
        x: marginLeft,
        y: y - 8,
        size: 6,
        font: fontRegular,
      });
      y -= 9;
    }

    y -= 1;

    // Pedido
    page.drawText(`Pedido: ${dados.numeroPedido}`, {
      x: marginLeft,
      y: y - 8,
      size: 6,
      font: fontBold,
    });
  }

  private async gerarCodigoBarras(texto: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: 'code128',
          text: texto,
          scale: 2,
          height: 8,
          includetext: false,
        },
        (err: string | Error, png: Buffer) => {
          if (err) {
            reject(typeof err === 'string' ? new Error(err) : err);
          } else {
            resolve(png);
          }
        },
      );
    });
  }

  private formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatarCpfCnpj(valor: string): string {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length === 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numeros.length === 14) {
      return numeros.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5',
      );
    }
    return valor;
  }

  private quebrarTexto(texto: string, maxCaracteres: number): string[] {
    if (texto.length <= maxCaracteres) {
      return [texto];
    }

    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let linhaAtual = '';

    for (const palavra of palavras) {
      if (linhaAtual.length + palavra.length + 1 <= maxCaracteres) {
        linhaAtual += (linhaAtual ? ' ' : '') + palavra;
      } else {
        if (linhaAtual) {
          linhas.push(linhaAtual);
        }
        linhaAtual = palavra;
      }
    }

    if (linhaAtual) {
      linhas.push(linhaAtual);
    }

    return linhas;
  }
}
