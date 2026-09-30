const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const staticFiles = ['Tela.html', 'tela.css', 'tela.js'];
const indexSource = 'Tela.html';
const indexDestination = 'index.html';
const materialsDirectory = 'materials';
const defaultDestination = 'site';

function resolveApiOrigin() {
    const apiBaseUrl = process.env.API_BASE_URL;

    if (!apiBaseUrl) {
        throw new Error('Configure a variável de repositório API_BASE_URL com a URL do backend Render.');
    }

    const apiUrl = new URL(apiBaseUrl);

    if (apiUrl.protocol !== 'https:' || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
        throw new Error('API_BASE_URL deve ser uma origem HTTPS, por exemplo https://acolher-ouvir-api.onrender.com');
    }

    return apiUrl.origin;
}

function copyStaticFiles(destinationDirectory) {
    for (const file of staticFiles) {
        const destinationName = file === indexSource ? indexDestination : file;
        fs.copyFileSync(path.join(projectRoot, file), path.join(destinationDirectory, destinationName));
    }
}

function writeSiteConfig(destinationDirectory, apiOrigin) {
    const contents = `window.APP_CONFIG = Object.freeze({ apiBaseUrl: ${JSON.stringify(apiOrigin)} });\n`;
    fs.writeFileSync(path.join(destinationDirectory, 'config.js'), contents);
}

function buildSite(destinationDirectory, apiOrigin) {
    fs.rmSync(destinationDirectory, { recursive: true, force: true });
    fs.mkdirSync(destinationDirectory, { recursive: true });

    copyStaticFiles(destinationDirectory);
    writeSiteConfig(destinationDirectory, apiOrigin);
    fs.cpSync(path.join(projectRoot, materialsDirectory), path.join(destinationDirectory, materialsDirectory), { recursive: true });
    fs.writeFileSync(path.join(destinationDirectory, '.nojekyll'), '');
}

function main() {
    const requestedDestination = process.argv[2] || defaultDestination;
    const destinationDirectory = path.resolve(projectRoot, requestedDestination);
    const apiOrigin = resolveApiOrigin();

    buildSite(destinationDirectory, apiOrigin);
    console.log(`Site gerado em ${path.relative(projectRoot, destinationDirectory)} apontando para ${apiOrigin}`);
}

try {
    main();
} catch (error) {
    console.error('Falha ao gerar o site:', error.message);
    process.exitCode = 1;
}
