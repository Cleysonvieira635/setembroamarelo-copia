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
        const apiUrl = `${apiBaseUrl}${url}`;
        const response = await fetch(apiUrl, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
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

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chatMessages');
    const text = input.value.trim();

    if (!text) return;

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
    } catch (error) {
        const botMsg = document.createElement('div');
        botMsg.className = 'message msg-bot';
        botMsg.textContent = `${error.message} Se precisar, ligue 188 (CVV).`;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
    }
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

    list.innerHTML = "<p style='font-size:0.85rem;'>Buscando unidades públicas próximas...</p>";
    let result;
    try {
        result = await api.getUnitsByCep(input);
    } catch (error) {
        list.textContent = error.message;
        return;
    }

    list.innerHTML = "";
    if (result.units.length === 0) {
        list.textContent = result.message;
    }
    result.units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit-item';
        const name = document.createElement('h5');
        name.textContent = unit.name;
        const address = document.createElement('p');
        address.textContent = `📍 ${unit.address}`;
        const phone = document.createElement('p');
        phone.textContent = `📞 ${unit.phone}`;
        div.append(name, address, phone);
        list.appendChild(div);
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

    try {
        await api.postWallMessage(text);
        input.value = "";
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
            case 'toggle-chat':
                toggleChatSimulator();
                break;
            case 'send-chat':
                sendChatMessage();
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
