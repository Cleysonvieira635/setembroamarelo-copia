const DEFAULT_ORIGINS = [
    'https://setembroamarelo.github.io',
    'http://localhost:3000'
];

const CHAT_FALLBACK = 'Obrigado por compartilhar. Este site não oferece atendimento psicológico. Converse com alguém de confiança e, se precisar de apoio emocional, ligue gratuitamente para o CVV no 188. Em risco imediato, ligue 192 ou vá a um pronto atendimento.';
const CHAT_CRISIS = 'Sinto muito que esteja passando por isso. Este chat não é um serviço de emergência. Ligue gratuitamente para o CVV no 188, para o SAMU no 192, ou vá a um pronto atendimento. Se possível, fique agora perto de alguém de confiança.';
const CHAT_SYSTEM_INSTRUCTION = 'Você é um assistente virtual de informação e acolhimento, não um psicólogo, terapeuta, serviço de emergência ou voluntário do CVV. Responda em português com empatia, sem diagnosticar nem prometer sigilo. Não conduza terapia. Se a pessoa mencionar risco de suicídio, automutilação ou perigo imediato, incentive-a a ligar 188 (CVV), 192 (SAMU) ou procurar um pronto atendimento e a ficar perto de alguém de confiança. Retorne somente JSON: {"isCrisis": boolean, "reply": string}.';
const MODERATION_INSTRUCTION = 'Modere uma mensagem para um mural público de apoio emocional. Reprove insultos, julgamentos, conteúdo de automutilação ou suicídio explícito e dados pessoais. Responda somente JSON: {"approved": boolean, "reason": string}.';

function allowedOrigins(env) {
    const configured = String(env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    return new Set([...DEFAULT_ORIGINS, ...configured]);
}

function responseHeaders(request, env) {
    const headers = new Headers({
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Cache-Control': 'no-store',
        Vary: 'Origin'
    });
    const origin = request.headers.get('Origin');
    if (origin && allowedOrigins(env).has(origin)) headers.set('Access-Control-Allow-Origin', origin);
    return headers;
}

function json(request, env, value, status = 200) {
    const headers = responseHeaders(request, env);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(value), { status, headers });
}

function errorMessage(error, fallback) {
    return error instanceof Error ? error.message : fallback;
}

async function parseBody(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

async function generateGeminiJson(env, instruction, text) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY
        },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: instruction }] },
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Gemini respondeu HTTP ${response.status}.`);

    const output = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!output) throw new Error('Gemini não retornou conteúdo.');
    return JSON.parse(output);
}

async function listUnits(request, env, url) {
    const search = (url.searchParams.get('search') || '').trim().toLocaleLowerCase('pt-BR');
    const query = search
        ? env.DB.prepare(`
            SELECT name, address, phone, city, type
            FROM health_units
            WHERE lower(name || ' ' || address || ' ' || city || ' ' || type) LIKE ?
            ORDER BY name
            LIMIT 100
        `).bind(`%${search}%`)
        : env.DB.prepare('SELECT name, address, phone, city, type FROM health_units ORDER BY name LIMIT 100');
    const result = await query.all();
    const units = result.results || [];
    return json(request, env, {
        units,
        message: units.length
            ? ''
            : 'Nenhuma unidade foi cadastrada para esta cidade. Consulte a Secretaria de Saúde do seu município ou procure uma UBS/CAPS.'
    });
}

async function listMessages(request, env) {
    const result = await env.DB.prepare(
        'SELECT id, text, likes, time FROM mural_messages ORDER BY id DESC LIMIT 100'
    ).all();
    return json(request, env, result.results || []);
}

async function createMessage(request, env) {
    const body = await parseBody(request);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (text.length < 3 || text.length > 250) {
        return json(request, env, { error: 'A mensagem deve ter entre 3 e 250 caracteres.' }, 400);
    }
    if (!env.GEMINI_API_KEY) {
        return json(request, env, { error: 'A publicação está indisponível porque a moderação não está configurada.' }, 503);
    }

    try {
        const moderation = await generateGeminiJson(env, MODERATION_INSTRUCTION, text);
        if (!moderation.approved) {
            return json(request, env, { error: moderation.reason || 'A mensagem não pode ser publicada.' }, 400);
        }
    } catch (error) {
        console.error('Falha na moderação do mural:', errorMessage(error, 'Erro desconhecido.'));
        return json(request, env, { error: 'Não foi possível moderar a mensagem. Tente novamente mais tarde.' }, 503);
    }

    const inserted = await env.DB.prepare(
        'INSERT INTO mural_messages (text, likes, time) VALUES (?, 0, ?)'
    ).bind(text, 'Agora').run();
    const message = await env.DB.prepare(
        'SELECT id, text, likes, time FROM mural_messages WHERE id = ?'
    ).bind(inserted.meta.last_row_id).first();
    return json(request, env, message, 201);
}

async function likeMessage(request, env, idValue) {
    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id < 1) {
        return json(request, env, { error: 'Mensagem não encontrada.' }, 404);
    }

    const updated = await env.DB.prepare(
        'UPDATE mural_messages SET likes = likes + 1 WHERE id = ?'
    ).bind(id).run();
    if (!updated.meta.changes) return json(request, env, { error: 'Mensagem não encontrada.' }, 404);

    const message = await env.DB.prepare(
        'SELECT id, text, likes, time FROM mural_messages WHERE id = ?'
    ).bind(id).first();
    return json(request, env, message);
}

async function chat(request, env) {
    const body = await parseBody(request);
    const userMessage = typeof body?.userMessage === 'string' ? body.userMessage.trim() : '';
    if (!userMessage || userMessage.length > 2000) {
        return json(request, env, { error: 'Escreva uma mensagem com até 2.000 caracteres.' }, 400);
    }
    if (!env.GEMINI_API_KEY) {
        return json(request, env, { emergencyAlert: false, message: CHAT_FALLBACK });
    }

    try {
        const result = await generateGeminiJson(env, CHAT_SYSTEM_INSTRUCTION, userMessage);
        if (result.isCrisis) return json(request, env, { emergencyAlert: true, phone: '188', message: CHAT_CRISIS });
        if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('Gemini não retornou uma resposta válida.');
        return json(request, env, { emergencyAlert: false, message: result.reply });
    } catch (error) {
        console.error('Falha no assistente virtual:', errorMessage(error, 'Erro desconhecido.'));
        return json(request, env, {
            emergencyAlert: true,
            phone: '188',
            message: 'O assistente está indisponível. Para conversar com alguém, ligue gratuitamente para o CVV no 188. Em risco imediato, ligue 192 ou vá a um pronto atendimento.'
        }, 503);
    }
}

async function route(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'GET' && url.pathname === '/api/health') return json(request, env, { status: 'ok' });
    if (method === 'GET' && url.pathname === '/api/units') return listUnits(request, env, url);
    if (method === 'GET' && url.pathname === '/api/mural') return listMessages(request, env);
    if (method === 'POST' && url.pathname === '/api/mural') return createMessage(request, env);
    if (method === 'POST' && /^\/api\/mural\/[^/]+\/like$/.test(url.pathname)) {
        const id = url.pathname.split('/')[3];
        return likeMessage(request, env, id);
    }
    if (method === 'POST' && url.pathname === '/api/chat') return chat(request, env);
    return json(request, env, { error: 'Rota não encontrada.' }, 404);
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin');
        const isAllowedOrigin = !origin || allowedOrigins(env).has(origin);
        if (!isAllowedOrigin) return json(request, env, { error: 'Origem não permitida.' }, 403);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(request, env) });

        try {
            return await route(request, env);
        } catch (error) {
            console.error('Falha na API:', errorMessage(error, 'Erro desconhecido.'));
            return json(request, env, { error: 'Não foi possível concluir a solicitação.' }, 500);
        }
    }
};