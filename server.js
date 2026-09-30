require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { GoogleGenAI } = require('@google/genai');
const { sendLeaderGuidePdf, sendPosterPdf, sendSocialKitZip } = require('./materials');

const app = express();
const root = __dirname;
const dataDirectory = path.join(root, 'data');
const databasePath = process.env.DB_PATH || path.join(dataDirectory, 'acolher-ouvir.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.exec(`
    CREATE TABLE IF NOT EXISTS mural_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        likes INTEGER NOT NULL DEFAULT 0,
        time TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS health_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        UNIQUE(name, address)
    );
`);
const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

const initialMessages = [
    { text: 'Você merece ser ouvido. Procure alguém de confiança.', likes: 14 },
    { text: 'Pedir ajuda é um passo importante. Você não precisa passar por isso sozinho.', likes: 29 },
    { text: 'Um dia de cada vez. Sua vida importa.', likes: 8 }
];
const insertMessage = database.prepare(
    'INSERT INTO mural_messages (text, likes, time) VALUES (?, ?, ?)'
);
if (database.prepare('SELECT COUNT(*) AS count FROM mural_messages').get().count === 0) {
    const seedMessages = database.transaction(() => {
        initialMessages.forEach(message => insertMessage.run(message.text, message.likes, 'Mensagem de apoio'));
    });
    seedMessages();
}

let configuredHealthUnits = [];
try {
    configuredHealthUnits = JSON.parse(process.env.HEALTH_UNITS_JSON || '[]');
    if (!Array.isArray(configuredHealthUnits)) configuredHealthUnits = [];
} catch {
    console.error('HEALTH_UNITS_JSON precisa conter uma lista JSON válida.');
}
const insertUnit = database.prepare(`
    INSERT OR IGNORE INTO health_units (name, address, phone, type, city)
    VALUES (@name, @address, @phone, @type, @city)
`);
const seedUnits = database.transaction(() => {
    configuredHealthUnits.forEach(unit => {
        if (!unit || typeof unit.name !== 'string' || typeof unit.address !== 'string') return;
        insertUnit.run({
            name: unit.name.trim(),
            address: unit.address.trim(),
            phone: typeof unit.phone === 'string' ? unit.phone : '',
            type: typeof unit.type === 'string' ? unit.type : '',
            city: typeof unit.city === 'string' ? unit.city : ''
        });
    });
});
seedUnits();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"]
        }
    }
}));
const allowedOrigins = new Set((process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean));
app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && allowedOrigins.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
    return next();
});
app.use(express.json({ limit: '10kb' }));
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas solicitações. Aguarde alguns minutos ou ligue 188 para conversar com o CVV.' }
}));

function downloadMaterial(filename, generate) {
    return (req, res, next) => {
        const filePath = path.join(root, 'materials', 'downloads', filename);
        if (!fs.existsSync(filePath)) return generate(res);

        return res.download(filePath, filename, error => {
            if (error && !res.headersSent) next(error);
        });
    };
}

app.get('/', (req, res) => res.sendFile(path.join(root, 'Tela.html')));
app.get(['/css.tela', '/tela.css'], (req, res) => res.type('text/css').sendFile(path.join(root, 'tela.css')));
app.get(['/js.tela', '/tela.js'], (req, res) => res.type('application/javascript').sendFile(path.join(root, 'tela.js')));
app.get('/config.js', (req, res) => res.type('application/javascript').sendFile(path.join(root, 'config.js')));
app.use('/materiais', express.static(path.join(root, 'materials'), { dotfiles: 'deny', index: false }));
app.use('/materials', express.static(path.join(root, 'materials'), { dotfiles: 'deny', index: false }));
app.use('/downloads', express.static(path.join(root, 'materials', 'downloads'), { dotfiles: 'deny', index: false }));
app.get('/downloads/kit-redes-sociais.zip', downloadMaterial('Kit_Redes_Sociais_Acolher_e_Ouvir.zip', sendSocialKitZip));
app.get('/downloads/cartazes-a3-a4.pdf', downloadMaterial('Cartazes_A3_A4_Acolher_e_Ouvir.pdf', sendPosterPdf));
app.get('/downloads/guia-lideranca.pdf', downloadMaterial('Guia_Pratico_Acolhimento_Liderancas.pdf', sendLeaderGuidePdf));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/units', (req, res) => {
    const search = typeof req.query.search === 'string'
        ? req.query.search.trim().toLocaleLowerCase('pt-BR')
        : '';
    const allUnits = database.prepare('SELECT name, address, phone, city, type FROM health_units ORDER BY name').all();
    const units = search
        ? allUnits.filter(unit => `${unit.name} ${unit.address} ${unit.city} ${unit.type}`
            .toLocaleLowerCase('pt-BR').includes(search))
        : allUnits;

    res.json({
        units,
        message: units.length
            ? ''
            : 'Nenhuma unidade foi cadastrada para esta cidade. Consulte a Secretaria de Saúde do seu município ou procure uma UBS/CAPS.'
    });
});

app.get('/api/mural', (req, res) => {
    const messages = database.prepare('SELECT id, text, likes, time FROM mural_messages ORDER BY id DESC').all();
    res.json(messages);
});

app.post('/api/mural', async (req, res) => {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (text.length < 3 || text.length > 250) {
        return res.status(400).json({ error: 'A mensagem deve ter entre 3 e 250 caracteres.' });
    }

    if (!ai) {
        return res.status(503).json({ error: 'A publicação está temporariamente indisponível porque a moderação não está configurada.' });
    }

    try {
        const moderation = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text }] }],
            config: {
                systemInstruction: 'Modere uma mensagem para um mural público de apoio emocional. Reprove insultos, julgamentos, conteúdo de automutilação ou suicídio explícito e dados pessoais. Responda somente JSON: {"approved": boolean, "reason": string}.',
                responseMimeType: 'application/json'
            }
        });
        const result = JSON.parse(moderation.text);
        if (!result.approved) {
            return res.status(400).json({ error: result.reason || 'A mensagem não pode ser publicada.' });
        }
    } catch (error) {
        console.error('Falha na moderação do mural:', error.message);
        return res.status(503).json({ error: 'Não foi possível moderar a mensagem. Tente novamente mais tarde.' });
    }

    const result = insertMessage.run(text, 0, 'Agora');
    const message = database.prepare('SELECT id, text, likes, time FROM mural_messages WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json(message);
});

app.post('/api/mural/:id/like', (req, res) => {
    const id = Number(req.params.id);
    const result = database.prepare('UPDATE mural_messages SET likes = likes + 1 WHERE id = ?').run(id);
    if (!result.changes) return res.status(404).json({ error: 'Mensagem não encontrada.' });
    const message = database.prepare('SELECT id, text, likes, time FROM mural_messages WHERE id = ?').get(id);
    return res.json(message);
});

app.post('/api/chat', async (req, res) => {
    const userMessage = typeof req.body.userMessage === 'string' ? req.body.userMessage.trim() : '';
    if (!userMessage || userMessage.length > 2000) {
        return res.status(400).json({ error: 'Escreva uma mensagem com até 2.000 caracteres.' });
    }

    if (!ai) {
        return res.json({
            emergencyAlert: false,
            message: 'Obrigado por compartilhar. Este site não oferece atendimento psicológico. Converse com alguém de confiança e, se precisar de apoio emocional, ligue gratuitamente para o CVV no 188. Em risco imediato, ligue 192 ou vá a um pronto atendimento.'
        });
    }

    try {
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            config: {
                systemInstruction: 'Você é um assistente virtual de informação e acolhimento, não um psicólogo, terapeuta, serviço de emergência ou voluntário do CVV. Responda em português com empatia, sem diagnosticar nem prometer sigilo. Não conduza terapia. Se a pessoa mencionar risco de suicídio, automutilação ou perigo imediato, incentive-a a ligar 188 (CVV), 192 (SAMU) ou procurar um pronto atendimento e a ficar perto de alguém de confiança. Retorne somente JSON: {"isCrisis": boolean, "reply": string}.',
                responseMimeType: 'application/json'
            }
        });
        const result = JSON.parse(aiResponse.text);
        if (result.isCrisis) {
            return res.json({
                emergencyAlert: true,
                phone: '188',
                message: 'Sinto muito que esteja passando por isso. Este chat não é um serviço de emergência. Ligue gratuitamente para o CVV no 188, para o SAMU no 192, ou vá a um pronto atendimento. Se possível, fique agora perto de alguém de confiança.'
            });
        }
        return res.json({ emergencyAlert: false, message: result.reply });
    } catch (error) {
        console.error('Falha no assistente virtual:', error.message);
        return res.status(503).json({
            emergencyAlert: true,
            phone: '188',
            message: 'O assistente está indisponível. Para conversar com alguém, ligue gratuitamente para o CVV no 188. Em risco imediato, ligue 192 ou vá a um pronto atendimento.'
        });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Acolher & Ouvir disponível na porta ${port}`));
