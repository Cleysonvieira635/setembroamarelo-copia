const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const { sendLeaderGuidePdf, sendPosterPdf, sendSocialKitZip } = require('../materials');

const downloadsDirectory = path.join(__dirname, '..', 'materials', 'downloads');
const downloads = [
    ['Kit_Redes_Sociais_Acolher_e_Ouvir.zip', sendSocialKitZip],
    ['Cartazes_A3_A4_Acolher_e_Ouvir.pdf', sendPosterPdf],
    ['Guia_Pratico_Acolhimento_Liderancas.pdf', sendLeaderGuidePdf]
];

function generateFile(filename, generate) {
    const destinationPath = path.join(downloadsDirectory, filename);

    return new Promise((resolve, reject) => {
        const response = new PassThrough();
        const destination = fs.createWriteStream(destinationPath);
        let settled = false;

        const fail = error => {
            if (settled) return;
            settled = true;
            response.destroy();
            destination.destroy();
            reject(error);
        };

        response.attachment = () => response;
        response.headersSent = true;
        response.on('error', fail);
        destination.on('error', fail);
        destination.on('finish', () => {
            if (settled) return;
            settled = true;
            resolve(fs.statSync(destinationPath).size);
        });
        response.pipe(destination);

        try {
            generate(response);
        } catch (error) {
            fail(error);
        }
    });
}

async function main() {
    fs.mkdirSync(downloadsDirectory, { recursive: true });

    for (const [filename, generate] of downloads) {
        const size = await generateFile(filename, generate);
        console.log(`Gerado ${filename} (${size} bytes)`);
    }
}

main().catch(error => {
    console.error('Falha ao gerar os materiais:', error.message);
    process.exitCode = 1;
});