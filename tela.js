/* --- CLIENTE DA API --- */
class BackendAPI {
    constructor() {
        this.healthUnits = [];
        this.wallMessages = [];
    }

    async request(url, options) {
        if (window.location.protocol === 'file:') {
            throw new Error('Para conectar ao backend, inicie o servidor com npm start e abra http://localhost:3000/.');
        }

        const apiBaseUrl = String(window.APP_CONFIG?.apiBaseUrl || '').replace(/\/+$/, '');
        if (window.location.hostname.endsWith('github.io') && !apiBaseUrl) {
            throw new Error('Esta publicação está no modo estático. Chat, mural e busca precisam de um backend. Para apoio emocional, ligue 188 (CVV); em emergência, ligue 192 (SAMU).');
        }
        const apiUrl = `${apiBaseUrl}${url}`;
        const response = await fetch(apiUrl, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Não foi possível concluir a solicitação.');
        return data;
    }

    async getUnitsByCep(cep) {
        const result = await this.request(`/api/units?search=${encodeURIComponent(cep)}`);
        this.healthUnits = result.units;
        return result;
    }

    async getWallMessages() {
        this.wallMessages = await this.request('/api/mural');
        return this.wallMessages;
    }

    async postWallMessage(text) {
        const message = await this.request('/api/mural', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        this.wallMessages.unshift(message);
        return message;
    }

    async likeMessage(id) {
        const message = await this.request(`/api/mural/${id}/like`, { method: 'POST' });
        this.wallMessages = this.wallMessages.map(item => item.id === message.id ? message : item);
        return message;
    }
}

const api = new BackendAPI();

/* --- RENDERIZADORES E CONTROLADORES DA INTERFACE --- */

// Rolagem Suave para Seções
function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
    const menu = document.getElementById('navMenu');
    const button = document.getElementById('mobileMenuToggle');
    const isOpen = menu.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(isOpen));
}

// Alternador de Abas (Sinais de Alerta)
function switchTab(tabId, button = document.querySelector(`[data-tab-id="${tabId}"]`)) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Accordion (Mitos e Verdades)
function toggleAccordion(header) {
    const item = header.parentElement;
    item.classList.toggle('active');
    const icon = header.querySelector('span');
    const isOpen = item.classList.contains('active');
    icon.textContent = isOpen ? '-' : '+';
    header.setAttribute('aria-expanded', String(isOpen));
}

// Simulador de Chat do CVV
function toggleChatSimulator() {
    const chat = document.getElementById('chatSimulator');
    chat.style.display = chat.style.display === 'none' ? 'block' : 'none';
}

function openChatSimulator() {
    const chat = document.getElementById('chatSimulator');
    chat.style.display = 'block';
    chat.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('chatInput').focus({ preventScroll: true });
}

const SITE_ACTION_TARGETS = {
    ajuda: 'ajuda',
    respiracao: 'breathBtn',
    sinais: 'sinais',
    mural: 'comunidade',
    materiais: 'materiais'
};

function runSiteAction(action) {
    const targetId = SITE_ACTION_TARGETS[action];
    const target = targetId && document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: action === 'respiracao' ? 'center' : 'start' });
    if (action === 'respiracao' && !isBreathing) {
        setTimeout(() => {
            if (!isBreathing) toggleBreathing();
        }, 500);
    }
    const box = target.closest('.card') || target;
    box.style.transition = 'box-shadow 0.4s';
    box.style.boxShadow = '0 0 0 4px #f5c518';
    setTimeout(() => { box.style.boxShadow = ''; }, 3000);
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chatMessages');
    const text = input.value.trim();

    if (!text) return;
    const status = document.getElementById('chatStatus');
    if (!document.getElementById('chatConsent').checked) {
        status.textContent = 'Leia o aviso de privacidade e autorize o envio antes de conversar com a IA.';
        document.getElementById('chatConsent').focus();
        return;
    }
    const sendButton = document.querySelector('[data-action="send-chat"]');
    if (sendButton.disabled) return;
    const clearButton = document.querySelector('[data-action="clear-chat"]');
    sendButton.disabled = true;
    clearButton.disabled = true;
    status.textContent = 'A IA está preparando uma resposta...';

    // Mensagem do Usuário
    const userMsg = document.createElement('div');
    userMsg.className = 'message msg-user';
    userMsg.textContent = text;
    container.appendChild(userMsg);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    try {
        const response = await api.request('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: text })
        });
        const botMsg = document.createElement('div');
        botMsg.className = 'message msg-bot';
        botMsg.textContent = response.message;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
        runSiteAction(response.action);
        status.textContent = 'Resposta recebida. Para apoio humano, ligue 188.';
    } catch (error) {
        const botMsg = document.createElement('div');
        botMsg.className = 'message msg-bot';
        botMsg.textContent = `${error.message} Se precisar, ligue 188 (CVV).`;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
        status.textContent = 'Não foi possível obter uma resposta da IA. Para apoio humano, ligue 188.';
    } finally {
        sendButton.disabled = false;
        clearButton.disabled = false;
    }
}

function clearChat() {
    if (document.querySelector('[data-action="clear-chat"]').disabled) return;
    document.getElementById('chatMessages').replaceChildren();
    document.getElementById('chatInput').value = '';
    document.getElementById('chatConsent').checked = false;
    document.getElementById('chatStatus').textContent = 'Conversa removida desta aba. Isso não apaga eventuais registros dos provedores.';
}

// Exercício de Respiração Guiada (4-4-4)
let breathingInterval = null;
let isBreathing = false;

function toggleBreathing() {
    const btn = document.getElementById('breathBtn');
    const circle = document.getElementById('breathCircle');
    const text = document.getElementById('breathText');

    if (isBreathing) {
        clearInterval(breathingInterval);
        circle.className = 'breathing-circle';
        text.textContent = "Pronto?";
        btn.textContent = "Iniciar Respiração (4-4-4)";
        btn.style.backgroundColor = 'var(--primary)';
        isBreathing = false;
        return;
    }

    isBreathing = true;
    btn.textContent = "Parar Exercício";
    btn.style.backgroundColor = 'var(--emergency)';

    function cycle() {
        // Inspire (4s)
        text.textContent = "Inspire...";
        circle.className = 'breathing-circle inhale';

        setTimeout(() => {
            if (!isBreathing) return;
            // Segure (4s)
            text.textContent = "Segure o ar...";
            circle.className = 'breathing-circle inhale hold';

            setTimeout(() => {
                if (!isBreathing) return;
                // Expire (4s)
                text.textContent = "Expire devagar...";
                circle.className = 'breathing-circle';
            }, 4000);
        }, 4000);
    }

    cycle();
    breathingInterval = setInterval(cycle, 12000);
}

// Busca de Unidades de Saúde
async function searchHealthUnits() {
    const input = document.getElementById('cepInput').value;
    const list = document.getElementById('unitsList');

    if (!input) {
        list.textContent = 'Digite seu CEP ou cidade para localizar unidades.';
        return;
    }

    if (searchHealthUnits.running) return;
    searchHealthUnits.running = true;
    const button = document.querySelector('[data-action="search-units"]');
    const originalLabel = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Buscando...'; }
    list.innerHTML = "<p style='font-size:0.85rem;'>⏳ Buscando unidades públicas próximas... pode levar até 30 segundos.</p>";
    list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    let units = [];
    let center = null;
    try {
        const normalized = input.trim().toLowerCase();
        const digits = normalized.replace(/\D/g, '');
        const cacheKey = 'units:' + (digits.length === 8 ? digits : normalized);
        let cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(cacheKey)); } catch (e) { cached = null; }
        if (cached && cached.center && cached.units && cached.units.length) {
            center = cached.center;
            units = cached.units;
            ensureMap().setView([center.lat, center.lng], 13);
        } else {
            center = await geocodeQuery(input);
            if (center) {
                ensureMap().setView([center.lat, center.lng], 13);
                list.innerHTML = "<p style='font-size:0.85rem;'>📍 Local encontrado. Procurando CAPS e UBS...</p>";
                units = await fetchNearbyUnits(center);
                if (units.length) {
                    try {
                        sessionStorage.setItem(cacheKey, JSON.stringify({
                            center,
                            units: units.map(({ marker, ...rest }) => rest)
                        }));
                    } catch (e) { /* cache é opcional */ }
                }
            }
        }
    } catch (error) {
        console.warn('Busca no mapa falhou:', error);
        list.textContent = 'A busca complementar está indisponível. Consulte o CNES ou a Secretaria Municipal de Saúde para localizar CAPS e UBS.';
        return;
    } finally {
        searchHealthUnits.running = false;
        if (button) { button.disabled = false; button.textContent = originalLabel; }
    }

    if (!center) {
        list.textContent = 'Não encontramos esse CEP ou cidade. Confira e tente novamente.';
        return;
    }

    list.innerHTML = '';
    renderUnitMarkers(center, units);
    if (units.length === 0) {
        list.textContent = 'Nenhuma unidade encontrada no mapa por aqui. Ligue 188 (CVV), 192 (SAMU) ou 136 (Disque Saúde).';
        return;
    }
    units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit-item';
        const name = document.createElement('h5');
        name.textContent = unit.name;
        const address = document.createElement('p');
        address.textContent = `📍 ${unit.address} · ${unit.distance.toFixed(1)} km`;
        div.append(name, address);
        const source = document.createElement('small');
        source.textContent = 'Fonte: OpenStreetMap (colaborativa). Confirme no CNES e com a unidade.';
        div.appendChild(source);
        if (unit.phone) {
            const phone = document.createElement('p');
            phone.textContent = `📞 ${unit.phone}`;
            div.appendChild(phone);
        }
        div.addEventListener('click', () => {
            if (unit.marker) {
                healthMap.setView([unit.lat, unit.lng], 16);
                unit.marker.openPopup();
            }
        });
        list.appendChild(div);
    });
}

let healthMap = null;
let healthLayer = null;

function ensureMap() {
    if (healthMap) return healthMap;
    const el = document.getElementById('unitsMap');
    el.classList.remove('map-placeholder');
    el.classList.add('health-map');
    el.innerHTML = '';
    healthMap = L.map(el).setView([-14.235, -51.925], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; Contribuidores do OpenStreetMap'
    }).addTo(healthMap);
    healthLayer = L.layerGroup().addTo(healthMap);
    return healthMap;
}

async function geocodeQuery(input) {
    const digits = input.replace(/\D/g, '');
    let q = input;
    if (digits.length === 8) {
        const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const d = await r.json();
        if (d.erro) return null;
        q = `${d.logradouro || ''} ${d.bairro || ''}, ${d.localidade}, ${d.uf}`.trim();
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
    let res = await (await fetch(url)).json();
    if (!res.length && digits.length === 8) {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&postalcode=${digits}`);
        res = await r.json();
    }
    return res.length ? { lat: parseFloat(res[0].lat), lng: parseFloat(res[0].lon) } : null;
}

function haversineKm(a, b) {
    const rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
}

async function fetchNearbyUnits(center) {
    const around = `(around:5000,${center.lat},${center.lng})`;
    const query = `[out:json][timeout:25];nwr["amenity"~"clinic|hospital|doctors"]${around};out center 150;`;
    const publicRe = /CAPS|UBS|Unidade B[aá]sica|Posto de Sa[uú]de|Centro de Sa[uú]de|UPA|Psicossocial|Hospital Municipal|SUS/i;
    const endpoints = [
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
    ];
    let data = null;
    for (const endpoint of endpoints) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                body: 'data=' + encodeURIComponent(query),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            if (!res.ok) continue;
            const json = await res.json();
            if (!json.elements || !json.elements.length) continue;
            data = json;
            break;
        } catch (e) { /* tenta o próximo servidor */ }
    }
    if (!data) return [];
    const seen = new Set();
    const all = data.elements.filter(el => el.tags && el.tags.name);
    const preferred = all.filter(el => publicRe.test(el.tags.name));
    return (preferred.length ? preferred : all).map(el => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        const t = el.tags || {};
        const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ');
        return {
            name: t.name || 'Unidade de saúde',
            address: [street, t['addr:suburb'] || t['addr:city']].filter(Boolean).join(' - ') || 'Endereço não informado',
            phone: t.phone || t['contact:phone'] || '',
            lat, lng,
            distance: lat == null ? Infinity : haversineKm(center, { lat, lng })
        };
    }).filter(u => u.lat != null && !seen.has(u.name + u.lat) && seen.add(u.name + u.lat))
        .sort((a, b) => a.distance - b.distance).slice(0, 20);
}

function renderUnitMarkers(center, units) {
    ensureMap();
    healthLayer.clearLayers();
    L.circleMarker([center.lat, center.lng], { radius: 8, color: '#F59E0B', fillOpacity: 0.8 })
        .bindPopup('Sua localização aproximada').addTo(healthLayer);
    units.forEach(unit => {
        const popup = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = unit.name;
        popup.append(strong, document.createElement('br'), document.createTextNode(unit.address));
        unit.marker = L.marker([unit.lat, unit.lng]).bindPopup(popup).addTo(healthLayer);
    });
}

// Renderização do Mural de Mensagens
function renderWall() {
    const grid = document.getElementById('wallGrid');
    grid.innerHTML = "";

    api.wallMessages.forEach(msg => {
        const card = document.createElement('div');
        card.className = 'wall-card';
        const text = document.createElement('p');
        text.textContent = `“${msg.text}”`;
        const footer = document.createElement('div');
        footer.className = 'wall-card-footer';
        const time = document.createElement('span');
        time.textContent = `Anônimo • ${msg.time}`;
        const like = document.createElement('button');
        like.className = 'like-btn';
        like.type = 'button';
        like.textContent = `💛 ${msg.likes} Acolher`;
        like.addEventListener('click', () => likeWallMsg(msg.id));
        footer.append(time, like);
        card.append(text, footer);
        grid.appendChild(card);
    });
}

async function publishWallMessage() {
    const input = document.getElementById('wallMessageInput');
    const text = input.value.trim();

    if (!text) {
        alert("Escreva uma mensagem antes de publicar.");
        return;
    }
    if (!document.getElementById('wallConsent').checked) {
        alert('Autorize a publicação e envie apenas uma mensagem geral, sem dados ou relatos pessoais.');
        document.getElementById('wallConsent').focus();
        return;
    }

    try {
        await api.postWallMessage(text);
        input.value = "";
        document.getElementById('wallConsent').checked = false;
        renderWall();
    } catch (error) {
        alert(error.message);
    }
}

async function likeWallMsg(id) {
    try {
        await api.likeMessage(id);
        renderWall();
    } catch (error) {
        alert(error.message);
    }
}

const isFilePage = window.location.protocol === 'file:';
const isGitHubPages = window.location.hostname.endsWith('github.io');
const materialAssetsBase = isFilePage
    ? 'materials'
    : isGitHubPages
        ? new URL('materials/', document.baseURI).pathname.replace(/\/$/, '')
        : '/materiais';
const materialDownloads = isFilePage
    ? {
        socialKit: 'materials/downloads/Kit_Redes_Sociais_Acolher_e_Ouvir.zip',
        poster: 'materials/downloads/Cartazes_A3_A4_Acolher_e_Ouvir.pdf',
        leaderGuide: 'materials/downloads/Guia_Pratico_Acolhimento_Liderancas.pdf'
    }
    : isGitHubPages
        ? {
            socialKit: new URL('materials/downloads/Kit_Redes_Sociais_Acolher_e_Ouvir.zip', document.baseURI).pathname,
            poster: new URL('materials/downloads/Cartazes_A3_A4_Acolher_e_Ouvir.pdf', document.baseURI).pathname,
            leaderGuide: new URL('materials/downloads/Guia_Pratico_Acolhimento_Liderancas.pdf', document.baseURI).pathname
        }
        : {
        socialKit: '/downloads/kit-redes-sociais.zip',
        poster: '/downloads/cartazes-a3-a4.pdf',
        leaderGuide: '/downloads/guia-lideranca.pdf'
    };

const materialPreviews = {
    'social-kit': {
        title: 'Kit Redes Sociais',
        content: `
            <div class="material-preview-gallery">
                <figure><img src="${materialAssetsBase}/social/post-01.svg" alt="Arte: Você não precisa passar por tudo sozinho"><figcaption>Acolha sem julgamento</figcaption></figure>
                <figure><img src="${materialAssetsBase}/social/post-02.svg" alt="Arte: Escute sem tentar consertar"><figcaption>Escuta acolhedora</figcaption></figure>
                <figure><img src="${materialAssetsBase}/social/post-03.svg" alt="Arte: Pedir ajuda também é coragem"><figcaption>Incentivo para buscar ajuda</figcaption></figure>
            </div>
            <p class="material-preview-note">Três artes vetoriais quadradas, em 1080 × 1080 px, prontas para compartilhar.</p>
            <a class="btn btn-primary btn-sm" href="${materialDownloads.socialKit}" download>Baixar kit .ZIP</a>
        `
    },
    poster: {
        title: 'Cartazes A3 e A4',
        content: `
            <img class="material-poster-preview" src="${materialAssetsBase}/cartaz-preview.svg" alt="Prévia do cartaz de acolhimento">
            <p class="material-preview-note">O PDF inclui duas páginas prontas para impressão: uma em A3 e outra em A4.</p>
            <a class="btn btn-primary btn-sm" href="${materialDownloads.poster}" download>Baixar cartazes .PDF</a>
        `
    },
    'leader-guide': {
        title: 'Guia Prático para Lideranças',
        content: `
            <div class="material-guide-preview">
                <p>Guia educativo de quatro páginas para educadores, equipes e lideranças.</p>
                <ul>
                    <li>Como iniciar uma conversa e ouvir sem julgamento.</li>
                    <li>Mudanças de comportamento que merecem atenção.</li>
                    <li>Como buscar apoio profissional e agir em risco imediato.</li>
                </ul>
                <p>Inclui contatos do CVV 188 e do SAMU 192 e orienta a não substituir atendimento profissional.</p>
            </div>
            <a class="btn btn-primary btn-sm" href="${materialDownloads.leaderGuide}" download>Baixar guia .PDF</a>
        `
    }
};

// Modal de Pré-visualização de Materiais
function openPreviewModal(previewId) {
    const preview = materialPreviews[previewId];
    if (!preview) return;

    const modal = document.getElementById('materialModal');
    document.getElementById('modalTitle').textContent = preview.title;
    document.getElementById('modalContent').innerHTML = preview.content;
    modal.classList.add('active');
}

function closeMaterialModal() {
    document.getElementById('materialModal').classList.remove('active');
}

function downloadMaterial(button) {
    const link = document.createElement('a');
    link.href = isFilePage
        ? button.dataset.localFile
        : isGitHubPages
            ? button.dataset.pagesFile
            : button.dataset.downloadUrl;
    link.download = button.dataset.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

/* --- INICIALIZAÇÃO AO CARREGAR A PÁGINA --- */
document.addEventListener('DOMContentLoaded', () => {
    // Carrega mensagens do mural
    api.getWallMessages().then(renderWall).catch(error => {
        document.getElementById('wallGrid').textContent = error.message;
    });

    document.getElementById('mobileMenuToggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('navMenu').addEventListener('click', event => {
        if (event.target.closest('a')) {
            document.getElementById('navMenu').classList.remove('is-open');
            document.getElementById('mobileMenuToggle').setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('click', event => {
        const target = event.target.closest('[data-action], [data-scroll-target]');
        if (!target) return;

        if (target.dataset.scrollTarget) {
            scrollToSection(target.dataset.scrollTarget);
            return;
        }

        switch (target.dataset.action) {
            case 'open-chat':
                event.preventDefault();
                openChatSimulator();
                break;
            case 'toggle-chat':
                toggleChatSimulator();
                break;
            case 'send-chat':
                sendChatMessage();
                break;
            case 'clear-chat':
                clearChat();
                break;
            case 'toggle-breathing':
                toggleBreathing();
                break;
            case 'search-units':
                searchHealthUnits();
                break;
            case 'switch-tab':
                switchTab(target.dataset.tabId, target);
                break;
            case 'toggle-accordion':
                toggleAccordion(target);
                break;
            case 'publish-message':
                publishWallMessage();
                break;
            case 'preview-material':
                openPreviewModal(target.dataset.previewId);
                break;
            case 'download-material':
                downloadMaterial(target);
                break;
            case 'close-modal':
                closeMaterialModal();
                break;
            default:
                break;
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        if (event.target.id === 'chatInput') {
            event.preventDefault();
            sendChatMessage();
        } else if (event.target.id === 'cepInput') {
            searchHealthUnits();
        }
    });

    // Destaque do Link Ativo da Navegação no Scroll
    window.addEventListener('scroll', () => {
        let current = '';
        const sections = document.querySelectorAll('section');

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', () => { if (window.L && document.getElementById('unitsMap')) ensureMap(); });

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const load = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
    const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* opcional */ } };
    const savedZoom = Number(load('a11y-zoom', '1'));
    let zoom = Number.isFinite(savedZoom) ? Math.min(1.5, Math.max(0.9, savedZoom)) : 1;
    let contrast = load('a11y-contrast', '0') === '1';
    const apply = () => {
        document.documentElement.style.fontSize = `${zoom * 100}%`;
        body.classList.toggle('high-contrast', contrast);
        cbtn.setAttribute('aria-pressed', String(contrast));
    };
    const bar = document.createElement('div');
    bar.className = 'a11y-bar';
    bar.id = 'accessibilityOptions';
    bar.hidden = true;
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Opções de acessibilidade');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'a11y-toggle';
    toggle.textContent = 'Acessibilidade';
    toggle.setAttribute('aria-controls', bar.id);
    toggle.setAttribute('aria-expanded', 'false');
    const setPanelOpen = open => {
        bar.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => {
        const open = bar.hidden;
        setPanelOpen(open);
        if (open) minus.focus();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !bar.hidden) {
            setPanelOpen(false);
            toggle.focus();
        }
    });
    document.addEventListener('click', event => {
        if (!bar.hidden && !bar.contains(event.target) && !toggle.contains(event.target)) {
            const restoreFocus = bar.contains(document.activeElement);
            setPanelOpen(false);
            if (restoreFocus) toggle.focus();
        }
    });
    const mk = (txt, label) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', label); b.title = label;
        bar.appendChild(b); return b;
    };
    const minus = mk('A-', 'Diminuir texto');
    const plus = mk('A+', 'Aumentar texto');
    const cbtn = mk('◐', 'Alto contraste');
    const readingSelect = document.createElement('select');
    readingSelect.setAttribute('aria-label', 'Conteúdo para leitura em voz alta');
    for (const [value, text] of [['home', 'Início'], ['sinais', 'Sinais e orientações'], ['materiais', 'Biblioteca'], ['privacidade', 'Privacidade']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        readingSelect.appendChild(option);
    }
    bar.appendChild(readingSelect);
    const reader = mk('Ouvir', 'Ler conteúdo educativo em voz alta');
    reader.setAttribute('aria-pressed', 'false');
    const readingStatus = document.createElement('span');
    readingStatus.className = 'reading-status';
    readingStatus.setAttribute('role', 'status');
    bar.appendChild(readingStatus);
    let reading = false;
    let currentUtterance = null;
    const stopReading = () => {
        reading = false;
        if (currentUtterance) {
            currentUtterance.onend = null;
            currentUtterance.onerror = null;
            currentUtterance = null;
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        reader.textContent = 'Ouvir';
        reader.setAttribute('aria-pressed', 'false');
        reader.setAttribute('aria-label', 'Ler conteúdo educativo em voz alta');
    };
    reader.addEventListener('click', () => {
        if (reading) {
            stopReading();
            readingStatus.textContent = 'Leitura interrompida.';
            return;
        }
        if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
            readingStatus.textContent = 'Leitura em voz alta indisponível neste navegador.';
            return;
        }
        const section = document.getElementById(readingSelect.value);
        const text = Array.from(section.querySelectorAll('h1, h2, h3, h4, p, li'))
            .filter(element => !element.closest('.tab-content:not(.active)') && element.getClientRects().length)
            .map(element => element.textContent.trim()).join('. ');
        const chunks = text.match(/[\s\S]{1,220}(?:\s|$)|[\s\S]{1,220}/g) || [];
        if (!chunks.length) {
            readingStatus.textContent = 'Não há conteúdo educativo disponível para leitura.';
            return;
        }
        reading = true;
        reader.textContent = 'Parar';
        reader.setAttribute('aria-pressed', 'true');
        reader.setAttribute('aria-label', 'Parar leitura em voz alta');
        readingStatus.textContent = 'Lendo conteúdo educativo.';
        const speakNext = () => {
            if (!reading) return;
            const chunk = chunks.shift();
            if (!chunk) {
                stopReading();
                readingStatus.textContent = 'Leitura concluída.';
                return;
            }
            currentUtterance = new SpeechSynthesisUtterance(chunk);
            currentUtterance.lang = 'pt-BR';
            currentUtterance.onend = speakNext;
            currentUtterance.onerror = () => {
                stopReading();
                readingStatus.textContent = 'Não foi possível reproduzir a leitura. Verifique as vozes do navegador.';
            };
            window.speechSynthesis.speak(currentUtterance);
        };
        speakNext();
    });
    readingSelect.addEventListener('change', () => {
        stopReading();
        readingStatus.textContent = '';
    });
    window.addEventListener('pagehide', stopReading);
    minus.addEventListener('click', () => { zoom = Math.max(0.9, +(zoom - 0.1).toFixed(1)); save('a11y-zoom', zoom); apply(); });
    plus.addEventListener('click', () => { zoom = Math.min(1.5, +(zoom + 0.1).toFixed(1)); save('a11y-zoom', zoom); apply(); });
    cbtn.addEventListener('click', () => { contrast = !contrast; save('a11y-contrast', contrast ? '1' : '0'); apply(); });
    body.appendChild(bar);
    body.appendChild(toggle);
    const skip = document.createElement('a');
    skip.href = '#home'; skip.className = 'skip-link'; skip.textContent = 'Pular para o conteúdo';
    body.insertBefore(skip, body.firstChild);
    apply();
});
