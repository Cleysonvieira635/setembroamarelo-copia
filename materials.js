const path = require('path');
const { ZipArchive } = require('archiver');
const { PDFDocument } = require('pdfkit');

const materialsDirectory = path.join(__dirname, 'materials');

function drawPoster(document, format) {
    const { width, height } = document.page;
    const scale = width / 595;
    const margin = width * 0.1;

    document.rect(0, 0, width, height).fill('#F3F6F1');
    document.rect(0, 0, width, height * 0.38).fill('#173F3B');
    document.circle(width * 0.86, height * 0.105, width * 0.075).fill('#F1B45B');

    document.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12 * scale)
        .text('ACOLHER & OUVIR', margin, height * 0.07, { characterSpacing: 1.2 * scale });
    document.font('Helvetica-Bold').fontSize(39 * scale)
        .text('Você não precisa\npassar por tudo sozinho.', margin, height * 0.13, {
            width: width - margin * 2,
            lineGap: 4 * scale
        });

    document.fillColor('#E0EBE5').font('Helvetica').fontSize(15 * scale)
        .text('Uma conversa acolhedora pode ser um primeiro passo.', margin, height * 0.34, {
            width: width - margin * 2
        });

    const panelTop = height * 0.47;
    const panelHeight = height * 0.22;
    document.roundedRect(margin, panelTop, width - margin * 2, panelHeight, 18 * scale).fill('#FFFFFF');
    document.fillColor('#173F3B').font('Helvetica-Bold').fontSize(48 * scale)
        .text('CVV 188', margin * 1.35, panelTop + panelHeight * 0.12, {
            width: width - margin * 2.7,
            align: 'center'
        });
    document.fillColor('#405651').font('Helvetica').fontSize(15 * scale)
        .text('Apoio emocional gratuito, 24 horas.', margin * 1.35, panelTop + panelHeight * 0.62, {
            width: width - margin * 2.7,
            align: 'center'
        });

    document.fillColor('#173F3B').font('Helvetica-Bold').fontSize(16 * scale)
        .text('Escute sem julgar. Ofereça companhia para buscar ajuda.', margin, height * 0.75, {
            width: width - margin * 2,
            align: 'center'
        });
    document.fillColor('#495B55').font('Helvetica').fontSize(12 * scale)
        .text('Em risco imediato, ligue 192 (SAMU) ou procure um pronto atendimento.', margin, height * 0.82, {
            width: width - margin * 2,
            align: 'center'
        });
    document.fillColor('#718079').fontSize(10 * scale)
        .text(`Material educativo • ${format} • Não substitui atendimento profissional`, margin, height * 0.93, {
            width: width - margin * 2,
            align: 'center'
        });
}

function sendPosterPdf(response) {
    const document = new PDFDocument({
        size: 'A3',
        margin: 0,
        info: {
            Title: 'Cartazes de acolhimento A3 e A4',
            Author: 'Acolher & Ouvir',
            Subject: 'Material educativo de apoio emocional'
        }
    });
    response.attachment('Cartazes_A3_A4_Acolher_e_Ouvir.pdf');
    document.on('error', error => response.destroy(error));
    document.pipe(response);
    drawPoster(document, 'A3');
    document.addPage({ size: 'A4', margin: 0 });
    drawPoster(document, 'A4');
    document.end();
}

function addGuidePage(document, pageNumber, title, introduction, sections) {
    if (pageNumber > 1) document.addPage({ size: 'A4', margin: 56 });
    const { width, height } = document.page;
    const margin = 56;
    const contentWidth = width - margin * 2;

    document.fillColor('#173F3B').font('Helvetica-Bold').fontSize(9)
        .text('ACOLHER & OUVIR  /  GUIA DE APOIO', margin, 42, { characterSpacing: 0.8 });
    const titleFontSize = pageNumber === 1 ? 31 : 25;
    const titleOptions = { width: contentWidth, font: 'Helvetica-Bold', fontSize: titleFontSize, lineGap: 3 };
    const titleTop = pageNumber === 1 ? 100 : 82;
    const titleHeight = document.heightOfString(title, titleOptions);
    document.fillColor('#173F3B').font('Helvetica-Bold').fontSize(titleFontSize)
        .text(title, margin, titleTop, titleOptions);

    const introductionOptions = { width: contentWidth, font: 'Helvetica', fontSize: 12, lineGap: 3 };
    const introductionTop = titleTop + titleHeight + 18;
    const introductionHeight = document.heightOfString(introduction, introductionOptions);
    document.fillColor('#405651').font('Helvetica').fontSize(12)
        .text(introduction, margin, introductionTop, introductionOptions);

    let contentTop = introductionTop + introductionHeight + 28;
    for (const section of sections) {
        const headingOptions = { width: contentWidth, font: 'Helvetica-Bold', fontSize: 14 };
        const headingHeight = document.heightOfString(section.title, headingOptions);
        document.fillColor('#C45D42').font('Helvetica-Bold').fontSize(14)
            .text(section.title, margin, contentTop, headingOptions);
        contentTop += headingHeight + 6;

        const bodyOptions = { width: contentWidth, font: 'Helvetica', fontSize: 11.5, lineGap: 3 };
        const bodyHeight = document.heightOfString(section.body, bodyOptions);
        document.fillColor('#293C38').font('Helvetica').fontSize(11.5)
            .text(section.body, margin, contentTop, bodyOptions);
        contentTop += bodyHeight + 24;
    }

    const footerRuleY = height - 86;
    const footerTextY = height - 74;
    document.moveTo(margin, footerRuleY).lineTo(width - margin, footerRuleY)
        .lineWidth(0.6).strokeColor('#D7E0D9').stroke();
    document.fillColor('#718079').font('Helvetica').fontSize(9)
        .text('Material educativo. Não substitui avaliação ou atendimento profissional.', margin, footerTextY, {
            width: width - margin * 2 - 36
        });
    document.text(String(pageNumber), width - margin - 24, footerTextY, { width: 24, align: 'right' });
}

function sendLeaderGuidePdf(response) {
    const document = new PDFDocument({
        size: 'A4',
        margin: 56,
        info: {
            Title: 'Guia prático de acolhimento para lideranças',
            Author: 'Acolher & Ouvir',
            Subject: 'Orientações para acolher e encaminhar alguém em sofrimento'
        }
    });
    response.attachment('Guia_Pratico_Acolhimento_Liderancas.pdf');
    document.on('error', error => response.destroy(error));
    document.pipe(response);

    addGuidePage(document, 1, 'Como acolher alguém em sofrimento',
        'Um guia breve para educadores, equipes e lideranças. O objetivo é oferecer presença e facilitar o acesso a apoio, não diagnosticar nem substituir profissionais.', []);
    addGuidePage(document, 2, 'Comece pela escuta',
        'Uma conversa respeitosa pode ajudar a pessoa a não se sentir sozinha. Escolha um lugar reservado, com tempo e sem interrupções.', [
            { title: 'Abra espaço', body: 'Use perguntas simples e abertas, como “Você quer me contar como tem se sentido?”. Ouça com calma e sem tentar corrigir ou minimizar o que a pessoa sente.' },
            { title: 'Reconheça a dor', body: 'Agradeça por ela ter compartilhado. Demonstre cuidado sem julgamento e sem comparar a situação com a de outras pessoas.' },
            { title: 'Ofereça ajuda concreta', body: 'Pergunte o que seria útil agora. Você pode oferecer companhia para conversar com alguém de confiança ou procurar um serviço de saúde.' }
        ]);
    addGuidePage(document, 3, 'Perceba mudanças e mantenha contato',
        'Um sinal isolado não permite concluir o que alguém está vivendo. Observe mudanças persistentes em relação ao comportamento habitual e pergunte com cuidado.', [
            { title: 'Mudanças que merecem atenção', body: 'Afastamento de pessoas, desesperança, sofrimento intenso, perda de interesse ou dificuldade para manter atividades cotidianas podem indicar que a pessoa precisa de apoio.' },
            { title: 'Não prometa segredo', body: 'Explique com respeito que, se houver risco à segurança, será necessário envolver ajuda confiável. Compartilhe apenas o necessário com quem pode apoiar.' },
            { title: 'Continue presente', body: 'Combine um próximo contato e cumpra o combinado. Acolher não significa assumir sozinho a responsabilidade pelo cuidado.' }
        ]);
    addGuidePage(document, 4, 'Quando a segurança está em risco',
        'Leve a sério falas ou situações que indiquem perigo imediato. Não deixe a pessoa sozinha se isso puder ser feito com segurança.', [
            { title: 'Acione apoio presencial', body: 'Chame alguém de confiança e procure um pronto atendimento ou serviço de saúde. Se houver emergência médica ou risco imediato, ligue 192 (SAMU).' },
            { title: 'Para conversar e buscar apoio emocional', body: 'O CVV atende pelo telefone 188, gratuitamente, 24 horas. O CVV oferece escuta e não substitui atendimento de emergência.' },
            { title: 'Após a crise', body: 'Ajude a pessoa a combinar acompanhamento com profissionais e serviços de saúde da região. Também procure apoio para você e respeite seus próprios limites.' }
        ]);
    document.end();
}

function sendSocialKitZip(response) {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('warning', warning => {
        if (warning.code === 'ENOENT') console.warn('Arquivo ausente no kit social:', warning.message);
        else archive.emit('error', warning);
    });
    archive.on('error', error => {
        if (response.headersSent) response.destroy(error);
        else response.status(500).end('Não foi possível montar o kit de redes sociais.');
    });

    response.attachment('Kit_Redes_Sociais_Acolher_e_Ouvir.zip');
    archive.pipe(response);
    archive.directory(path.join(materialsDirectory, 'social'), false);
    archive.finalize().catch(error => archive.emit('error', error));
}

module.exports = { sendLeaderGuidePdf, sendPosterPdf, sendSocialKitZip };