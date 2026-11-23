/*
 * SISTEMA DE GERENCIAMENTO BIBLIOTECÁRIO
 * Projeto da disciplina Laboratório de Simulação e Prototipagem.
 *
 * Este é um protótipo: os dados são fictícios e ficam no navegador.
 * O login é demonstrativo (não se conecta ao Google institucional).
 * O sistema não possui servidor, banco de dados externo ou envio de e-mails.
 *
 * Para facilitar a navegação, as telas são atualizadas via JavaScript
 * dentro da <div id="app"> que está no index.html.
 */

'use strict';
// PROTÓTIPO ACADÊMICO: sem autenticação real, banco de dados ou envio de emails.
// 1. REGRAS DE NEGÓCIO: valores revisados no PDF da AP2.
const RULES = {
    loanDays: 7,           // RF3: prazo de devolução
    maxLoans: 4,           // RF4: livros simultâneos por aluno
    maxRenewals: 2,        // RF9: renovações sem reserva ativa
    lateBase: 0,          // RF8: sem cobrança fixa
    latePerCalendarDay: 2 // RF8: R$ 2 por dia corrido de atraso
};
const STORE_KEY = 'ulbra_biblioteca_demo_as_datas_relativas_v3'; // Mantém os testes já salvos.
const $ = s => document.querySelector(s);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateOffset = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const formatDate = s => s ? new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR') : '—';
// Datas de exemplo calculadas a partir do dia em que o sistema é aberto,
// para que os prazos de demonstração nunca fiquem vencidos.
const brDate = n => formatDate(dateOffset(n));
const brShort = n => brDate(n).slice(0, 5);
const currentMonth = () => new Date().toLocaleDateString('pt-BR', { month: 'long' });
const shortDay = n => { const d = new Date(`${dateOffset(n)}T12:00:00`); return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}`; };
const monthYear = () => new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' ').toUpperCase();
const calendarUTC = iso => {
    const [year, month, day] = iso.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
};

const lateDays = due => Math.max(
    0,
    Math.round((calendarUTC(dateOffset(0)) - calendarUTC(due)) / 86400000)
);

const fineFor = due => lateDays(due) * RULES.latePerCalendarDay;

// 2. BASE DEMONSTRATIVA: livros, usuários e empréstimos fictícios.
const seed = () => ({
    books: [
        { id: 'b1', title: 'Dom Casmurro', author: 'Machado de Assis', publisher: 'Ática', year: 2019, isbn: '978-85-08-12345-6', genre: 'Literatura Brasileira', copies: 3, color: '#164e54' },
        { id: 'b2', title: 'Pedagogia da autonomia', author: 'Paulo Freire', publisher: 'Paz e Terra', year: 2011, isbn: '978-85-7753-035-0', genre: 'Educação', copies: 2, color: '#24475e' },
        { id: 'b3', title: 'A estrutura das revoluções científicas', author: 'Thomas S. Kuhn', publisher: 'Perspectiva', year: 2017, isbn: '978-85-273-0113-9', genre: 'Ciências', copies: 1, color: '#292b32' },
        { id: 'b4', title: 'Fundamentos de metodologia científica', author: 'Marconi e Lakatos', publisher: 'Atlas', year: 2021, isbn: '978-85-970-2011-7', genre: 'Metodologia', copies: 3, color: '#3f6a8e' },
        { id: 'b5', title: 'O capital — Livro I', author: 'Karl Marx', publisher: 'Boitempo', year: 2020, isbn: '978-85-7559-321-0', genre: 'Economia', copies: 1, color: '#8c2728' },
        { id: 'b6', title: 'Código Limpo', author: 'Robert C. Martin', publisher: 'Alta Books', year: 2009, isbn: '978-85-7608-267-5', genre: 'Tecnologia', copies: 2, color: '#063b4c' },
        { id: 'b7', title: 'Metodologia de Pesquisa', author: 'Antônio Carlos Gil', publisher: 'Atlas', year: 2018, isbn: '978-85-970-1742-1', genre: 'Metodologia', copies: 2, color: '#506a3c' }
    ],
    users: [
        { id: 'u1', name: 'Mariana Costa', email: 'mariana.costa@rede.ulbra.br', registration: '20240182', role: 'aluno', fine: 0 },
        { id: 'u2', name: 'Lucas Almeida', email: 'lucas.almeida@rede.ulbra.br', registration: '20240191', role: 'aluno', fine: 0 },
        { id: 'u3', name: 'Camila Ferreira', email: 'camila.ferreira@rede.ulbra.br', registration: '20240207', role: 'aluno', fine: 0 },
        { id: 'u4', name: 'Fernanda Borges', email: 'fernanda.borges@ulbra.br', registration: 'F0007', role: 'bibliotecario', fine: 0 },
        { id: 'u5', name: 'Patrícia Souza', email: 'patricia.souza@ulbra.br', registration: 'A0001', role: 'administrador', fine: 0 }
    ],
    loans: [
        { id: 'l1', bookId: 'b2', userId: 'u1', start: dateOffset(-5), due: dateOffset(2), renewals: 0, status: 'ativo' },
        { id: 'l2', bookId: 'b4', userId: 'u1', start: dateOffset(-7), due: dateOffset(0), renewals: 0, status: 'ativo' },
        { id: 'l3', bookId: 'b3', userId: 'u2', start: dateOffset(-3), due: dateOffset(4), renewals: 0, status: 'ativo' },
        { id: 'l4', bookId: 'b5', userId: 'u3', start: dateOffset(-10), due: dateOffset(-3), renewals: 0, status: 'ativo' }
    ],
    reservations: [{ id: 'r1', bookId: 'b3', userId: 'u1', created: dateOffset(-2), status: 'fila' }],
    notices: [{ id: 'n1', userId: 'u1', message: 'Sua solicitação para A estrutura das revoluções científicas está na fila de espera.', date: dateOffset(0) }],
    categories: ['Literatura Brasileira', 'Educação', 'Ciências', 'Metodologia', 'Economia', 'Tecnologia'],
    movements: []
});
function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY));
        if (saved && Array.isArray(saved.books) && Array.isArray(saved.users))
            return saved;
    }
    catch (e) { } return seed();
}
let db = loadData();
let dialogPreviousDue = null;
// Guarda as operações feitas nos registros de exemplo, mantendo o painel consistente após atualizar.
const SAMPLE_DATE = brDate(0);
// Devoluções de exemplo: cada botão Devolver abre os dados do empréstimo correspondente.
const RETURN_SAMPLES = {
    '0':  { book: 0, title: 'Dom Casmurro (Machado de Assis)', tombo: 'TB-00642-3', shelf: 'Estante B · Prateleira 4', reader: 'Mariana Costa', reg: '20240182 · Análise e Desenvolvimento de Sistemas', due: 6, late: 0 },
    'b1': { book: 0, title: 'Dom Casmurro (Machado de Assis)', tombo: 'TB-00642-3', shelf: 'Estante B · Prateleira 4', reader: 'Mariana Costa', reg: '20240182 · Análise e Desenvolvimento de Sistemas', due: 3, late: 0 },
    '1':  { book: 1, title: 'Pedagogia da autonomia (Paulo Freire)', tombo: 'TB-00318-1', shelf: 'Estante E · Prateleira 2', reader: 'Lucas Almeida', reg: '20230245 · Pedagogia', due: 6, late: 0 },
    '2':  { book: 4, title: 'O capital — Livro I (Karl Marx)', tombo: 'TB-00264', shelf: 'Estante F · Prateleira 3', reader: 'Rafael Oliveira', reg: '20220376 · Economia', due: -3, late: 3, queue: true },
    '3':  { book: -1, cover: { title: 'Ética a Nicômaco', color: '#5b4636' }, title: 'Ética a Nicômaco (Aristóteles)', tombo: 'TB-00071', shelf: 'Estante A · Prateleira 2', reader: 'Beatriz Santos', reg: '20250109 · Docente', due: 7, late: 0 }
};
const returnSample = id => RETURN_SAMPLES[id] || RETURN_SAMPLES['2'];

const sampleReservations = [
    { id:'0', book:'Dom Casmurro', user:'Mariana Costa', registration:'20240182', reserved:brDate(-2), until:`${brDate(0)} às 18h`, copy:'TB-00642-1', state:'pronta' },
    { id:'1', book:'Pedagogia da autonomia', user:'Lucas Almeida', registration:'20230245', reserved:brDate(-1), until:`${brDate(1)} às 18h`, copy:'TB-00318', state:'pronta' },
    { id:'2', book:'Ética a Nicômaco', user:'Beatriz Santos', registration:'20250109', reserved:brDate(0), until:`${brDate(2)} às 18h`, copy:'TB-00871', state:'pronta' },
    { id:'3', book:'O capital — Livro I', user:'Rafael Oliveira', registration:'20220376', reserved:brDate(-2), until:'Aguardando disponibilidade', copy:'TB-00264', state:'fila' },
    { id:'4', book:'O capital — Livro I', user:'Camila Ferreira', registration:'20240058', reserved:brDate(-1), until:'Aguardando disponibilidade', copy:'TB-00265', state:'fila' }
];
const exampleRecord = id => sampleReservations.find(item=>item.id===String(id));
function exampleOperations() {
    db.exampleOperations ||= { pickups:{}, returns:{} };
    db.exampleOperations.pickups ||= {};
    db.exampleOperations.returns ||= {};
    return db.exampleOperations;
}
function exampleQueue(bookName) {
    return sampleReservations.filter(item=>item.book===bookName && item.state==='fila' && !exampleOperations().pickups[item.id]);
}

let role = null, currentUser = 'u1', page = 'dashboard', query = '', genreFilter = '', statusFilter = '', sortFilter = 'titulo', banner = '', dialog = null, lastFocus = null;
const $book = id => db.books.find(b => b.id === id);
const $user = id => db.users.find(u => u.id === id);
const activeLoans = (bookId, userId) => db.loans.filter(l => l.status === 'ativo' && (!bookId || l.bookId === bookId) && (!userId || l.userId === userId));
const available = b => Math.max(0, b.copies - activeLoans(b.id).length - db.reservations.filter(r => r.bookId === b.id && r.status === 'pronta').length - (b.outOfService || 0));
const countQueue = bookId => db.reservations.filter(r => r.bookId === bookId && r.status === 'fila').length;
// O armazenamento é local: cada navegador mantém sua própria simulação.
const save = () => {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(db));
    } catch (error) {
        console.warn('Não foi possível salvar a demonstração no navegador.', error);
    }
};
const pushNotice = (userId, message) => db.notices.unshift({ id: `n${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, userId, message, date: dateOffset(0) });
const nextId = prefix => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
const status = (label, type = 'neutral') => `<span class="badge-status status-${type}">${safe(label)}</span>`;
const bookVisual = b => `<span class="book-avatar" style="background:${safe(b.color)}" aria-hidden="true">${safe(b.title.split(' ').slice(0, 2).join(' '))}</span>`;
const bookName = b => `<div class="book-name">${bookVisual(b)}<div><strong>${safe(b.title)}</strong><span class="subline">${safe(b.author)} · ${safe(b.genre)}</span></div></div>`;
const linkBtn = (action, label, id = '', className = 'btn-outline') => `<button type="button" class="btn btn-sm ${className}" data-action="${action}" ${id ? `data-id="${safe(id)}"` : ''}>${label}</button>`;
// Itens do menu por perfil. O aluno não visualiza páginas administrativas.
// Ícones simples sem bibliotecas externas, semelhantes aos do protótipo.
const menuIcons = {
    dashboard: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    catalogo: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6c-3.5-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-5.5-1-9 1Z"/><path d="M12 6v14"/></svg>',
    reservas: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>'
};

const uiIcons = {
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/><path d="m7.5 4.5 9 5"/></svg>',
  reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20V13m5 7V8m5 12V4m5 16v-9"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h8"/></svg>',
  loans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16l-4-4m4 4-4 4M20 17H4l4 4m-4-4 4-4"/></svg>',
  reserve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>',
  userAdd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a5 5 0 0 1 10 0v2M19 8v8m-4-4h8"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></svg>'
};

menuIcons.emprestimos = uiIcons.loans;
menuIcons.usuarios = uiIcons.users;
menuIcons.inventario = uiIcons.inventory;
menuIcons.relatorios = uiIcons.reports;
menuIcons.categorias = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>';
menuIcons.multas = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v5M18 10v5"/></svg>';
menuIcons.notificacoes = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z"/><path d="M10.5 20a1.8 1.8 0 0 0 3 0"/></svg>';


const menus = {
    aluno: [
        ['dashboard', '▦', 'Dashboard'],
        ['catalogo', '▤', 'Catálogo'],
        ['reservas', uiIcons.reserve, 'Reservas'],
        ['multas', '¤', 'Multas'],
        ['notificacoes', '◉', 'Notificações']
    ],
    bibliotecario: [
        ['dashboard', '▦', 'Dashboard'],
        ['catalogo', '▤', 'Catálogo'],
        ['emprestimos', '⇄', 'Empréstimos'],
        ['reservas', uiIcons.reserve, 'Reservas'],
        ['usuarios', '♙', 'Usuários'],
        ['inventario', '▦', 'Inventário']
    ],
    administrador: [
        ['dashboard', '▦', 'Dashboard'],
        ['catalogo', '▤', 'Catálogo'],
        ['emprestimos', '⇄', 'Empréstimos'],
        ['reservas', uiIcons.reserve, 'Reservas'],
        ['usuarios', '♙', 'Usuários'],
        ['inventario', '▦', 'Inventário'],
        ['categorias', '▧', 'Categorias'],
        ['relatorios', '▥', 'Relatórios']
    ]
};

// O menu lateral apresenta as opções de cada perfil.
// Outras telas continuam acessíveis pelos botões do sistema.
const visibleMenus = {
    aluno: ['dashboard', 'catalogo', 'reservas', 'multas', 'notificacoes'],
    bibliotecario: ['dashboard', 'catalogo', 'emprestimos', 'reservas', 'usuarios', 'inventario'],
    administrador: ['dashboard', 'catalogo', 'emprestimos', 'reservas', 'usuarios', 'inventario', 'categorias', 'relatorios']
};

const pageNames = {
    dashboard: 'Dashboard',
    catalogo: 'Catálogo',
    emprestimos: 'Empréstimos ativos',
    reservas: 'Reservas',
    usuarios: 'Usuários',
    inventario: 'Inventário',
    categorias: 'Categorias e gêneros',
    relatorios: 'Relatórios',
    ficha: 'Ficha da obra',
    multas: 'Consultar multas',
    notificacoes: 'Notificações'
};

// Indicadores apresentados nos painéis de acompanhamento.
// Os cadastros operáveis continuam sendo os dados locais do protótipo.
const LIBRARY_STATS = Object.freeze({
    books: 1248,
    loans: 186,
    reservations: 5,
    users: 842,
    totalUsers: 876,
    newUsers: 18,
    pendingUsers: 8,
    weeklyLoans: 156,
    weeklyReturns: 128,
    todaysReturns: 12,
    waitingPickup: 3,
    overdueReturns: 8,
    newBooks: 24
});

// Pesquisa e paginação são aplicadas aos usuários demonstrativos cadastrados no navegador.
let selectedBookId = 'b1';
let userSearch = '';
let userStatusFilter = 'todos';
let userPage = 1;
const USERS_PER_PAGE = 5;

// 3. ESTRUTURA: os três perfis usam o mesmo cabeçalho e menu lateral.
function render() {
    if (!role) {
        renderLogin();
        return;
    }

    // Evita a exibição de páginas que não pertencem ao perfil selecionado.
    if (page !== 'ficha' && !menus[role].some(([key]) => key === page)) {
        page = 'dashboard';
    }

    const who = $user(currentUser);
    const roleDisplay = {
        aluno: 'Aluno / Leitor',
        bibliotecario: 'Bibliotecário',
        administrador: 'Gestor / Administrador'
    }[role];

    const navigation = menus[role].filter(([key]) => visibleMenus[role].includes(key)).map(([key, icon, label]) => `
        <button
            type="button"
            class="nav-button ${key === page ? 'active' : ''}"
            data-action="go"
            data-page="${key}"
            ${key === page ? 'aria-current="page"' : ''}
        >
            <span class="nav-icon" aria-hidden="true">${menuIcons[key] || safe(icon)}</span>
            <span>${safe(label)}</span>
        </button>
    `).join('');

    // Notificações do usuário aparecem diretamente no menu do seu nome.
    const userNotices = db.notices
        .filter(item => item.userId === currentUser)
        .slice(0, 4);

    const noticePanel = userNotices.length
        ? userNotices.map(item => `
            <div class="account-notice">
                <time>${formatDate(item.date)}</time>
                <p>${safe(item.message)}</p>
            </div>
        `).join('')
        : '<p class="account-empty">Nenhuma notificação no momento.</p>';

    const headerTitle = {
        aluno: page === 'dashboard' ? 'Portal do Aluno — Área do Leitor' : (page === 'catalogo' ? 'Catálogo' : safe(pageNames[page])),
        bibliotecario: page === 'dashboard' ? 'Dashboard' : (page === 'catalogo' ? 'Catálogo — Gestão de Acervo' : safe(pageNames[page])),
        administrador: page === 'dashboard' ? 'Dashboard' : (page === 'catalogo' ? 'Catálogo — Gestão de Acervo' : safe(pageNames[page]))
    }[role];

    document.querySelector('#app').innerHTML = `
        <div class="layout staff-layout ${role === 'aluno' ? 'student-layout' : 'employee-layout'}">
            <aside class="sidebar" aria-label="Menu principal">
                <div class="sidebar-head">
                    <img
                        class="logo-sidebar"
                        src="imagens/logo-ulbra-palmas.png"
                        alt="Logotipo da Ulbra"
                    >
                    <div class="ub-detail">BIBLIOTECA ACADÊMICA</div>
                </div>

                <nav class="sidebar-nav" aria-label="Navegação principal">
                    ${navigation}
                </nav>

                <div class="sidebar-bottom">
                    <strong>Biblioteca Acadêmica</strong>
                    <span>GESTÃO DO ACERVO</span>
                </div>
            </aside>

            <div class="app-frame">
                <header class="topbar">
                    <span class="topbar-label">${safe(headerTitle)}</span>

                    <!-- Somente o nome aparece no cabeçalho. O menu abre ao clicar. -->
                    <details class="account-menu">
                        <summary class="topbar-user" aria-label="Abrir opções de ${safe(who?.name || 'Usuário')}">
                            <span>${safe(who?.name || 'Usuário')}</span>
                            <span class="account-chevron" aria-hidden="true">▾</span>
                        </summary>
                        <div class="account-dropdown">
                            <div class="account-dropdown-heading">Notificações</div>
                            <div class="account-notices" aria-label="Notificações recentes">
                                ${noticePanel}
                            </div>
                            ${role === 'aluno' ? `
                                <button type="button" class="account-action" data-action="go" data-page="notificacoes">
                                    Ver todas as notificações
                                </button>
                                <button type="button" class="account-action" data-action="go" data-page="multas">
                                    Consultar multas
                                </button>
                            ` : ''}
                            <button type="button" class="account-action account-logout" data-action="logout">
                                Sair
                            </button>
                        </div>
                    </details>
                </header>

                <main id="main" class="content" tabindex="-1">
                    ${banner ? `<div class="banner ${banner.startsWith('Erro:') ? 'error' : 'ok'}" role="status">${safe(banner)}</div>` : ''}
                    ${renderPage()}
                </main>
            </div>
        </div>
    `;

    if (dialog) {
        openDialog(dialog.kind, dialog.id, true);
    }
}

// Tela de entrada: o perfil é selecionado apenas para testar as três visões.
function renderLogin() {
    document.querySelector('#app').innerHTML = `
        <main class="login-shell">
            <section class="login-card" aria-labelledby="login-heading">
                <div class="brand-block">
                    <img
                        class="logo-login"
                        src="imagens/logo-ulbra-palmas.png"
                        alt="Logotipo Ulbra Palmas"
                    >
                    <div class="brand-title">BIBLIOTECA ACADÊMICA</div>
                    <div class="brand-sub">Sistema de Gerenciamento Bibliotecário</div>
                </div>

                <h1 id="login-heading">Acesse sua conta</h1>
                <p class="muted">Digite seu e-mail institucional para prosseguir.</p>

                <form id="login-form">
                    <div class="field">
                        <label for="login-email">E-mail institucional</label>
                        <input
                            id="login-email"
                            type="email"
                            value="mariana.costa@rede.ulbra.br"
                            placeholder="nome@rede.ulbra.br"
                            autocomplete="username"
                            required
                        >
                    </div>
                    <div class="field">
                        <label for="login-role">Perfil para demonstração</label>
                        <select id="login-role">
                            <option value="aluno">Aluno / Leitor</option>
                            <option value="bibliotecario">Bibliotecário</option>
                            <option value="administrador">Gestor / Administrador</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        Entrar no protótipo
                    </button>
                </form>

                <!-- Orientações de acesso conforme o protótipo de alta fidelidade. -->
                <div class="notice">
                    <div><strong>Alunos:</strong> utilize sua credencial @rede.ulbra.br.</div>
                    <div><strong>Professores e técnicos:</strong> acesse via @ulbra.br.</div>
                </div>
            </section>
        </main>
    `;
}

// Componentes reutilizáveis: títulos, indicadores e tabelas.
function titleBlock(title, description, actions = '') {
    return `
        <div class="section-head">
            <div>
                <div class="eyebrow">Sistema de Gerenciamento Bibliotecário</div>
                <h1>${safe(title)}</h1>
                <p class="muted">${safe(description)}</p>
            </div>
            ${actions}
        </div>
    `;
}

function stat(label, value, footer = '', warm = false) {
    return `
        <div class="stat ${warm ? 'warm' : ''}">
            <div class="stat-label">${safe(label)}</div>
            <div class="stat-number">${safe(value)}</div>
            <small>${safe(footer)}</small>
        </div>
    `;
}

function table(headings, rows) {
    return `
        <div class="table-scroll">
            <table class="data-table">
                <thead>
                    <tr>${headings.map(heading => `<th scope="col">${safe(heading)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="${headings.length}" class="muted">Nenhum registro encontrado.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

function renderPage() {
    switch (page) {
        case 'ficha': return bookDetailsPage();
        case 'dashboard': return dashboard();
        case 'catalogo': return catalog();
        case 'emprestimos': return loansPage();
        case 'reservas': return reservationsPage();
        case 'usuarios': return usersPage();
        case 'inventario': return inventoryPage();
        // Categorias e gêneros: exclusivo do administrador (chefe da biblioteca).
        case 'categorias': return role === 'administrador' ? categoriesPage() : dashboard();
        case 'relatorios': return reportsPage();
        case 'multas': return finesPage();
        case 'notificacoes': return notificationsPage();
        default: return '';
    }
}
// 4. PÁGINAS: dashboard, catálogo, reservas, usuários e relatórios.
function dashboard() {
    if (role === 'aluno') {
        const student = $user(currentUser);
        const myLoans = activeLoans(null, currentUser);
        const myReservations = db.reservations.filter(
            item => item.userId === currentUser && ['fila', 'pronta'].includes(item.status)
        );

        const nearestDue = myLoans.length
            ? myLoans.map(item => item.due).sort()[0]
            : null;
        const queueReservation = myReservations.find(item => item.status === 'fila');
        const queuePosition = queueReservation
            ? db.reservations.filter(item => item.bookId === queueReservation.bookId && item.status === 'fila')
                .findIndex(item => item.id === queueReservation.id) + 1
            : 0;

        const reservationCards = myReservations.length
            ? myReservations.map(item => {
                const book = $book(item.bookId);
                const waiting = db.reservations.filter(entry => entry.bookId === item.bookId && entry.status === 'fila');
                const position = waiting.findIndex(entry => entry.id === item.id) + 1;
                return `
                    <div class="student-reservation-row">
                        <div class="student-reservation-book">
                            <strong>${safe(book?.title || 'Obra não encontrada')}</strong>
                            <small>${safe(book?.author || '')} · Solicitado em ${formatDate(item.created)}</small>
                        </div>
                        <div class="student-reservation-state">
                            ${item.status === 'fila'
                                ? status(`${position}º na fila de espera`, 'warn')
                                : status('Pronta para retirada', 'ok')}
                        </div>
                        ${linkBtn('cancel-res', 'Cancelar', item.id, 'btn-outline')}
                    </div>
                `;
            }).join('')
            : '<div class="empty">Você não possui reservas em andamento.</div>';

        return `
            <section class="student-dashboard card">
                <div class="student-dashboard-heading">
                    <h1>Olá, ${safe(student.name)}</h1>
                    <p class="muted">
                        Matrícula: ${safe(student.registration)} · Curso: Análise e Desenvolvimento de Sistemas ·
                        Situação: ${student.fine > 0 ? 'Com pendências' : 'Regular'}
                    </p>
                </div>

                <div class="stat-grid student-stat-grid">
                    ${stat('Livros em posse', `${myLoans.length} exemplares`,
                        nearestDue ? `Devolução mais próxima: ${formatDate(nearestDue)}` : 'Nenhum livro em posse')}
                    ${stat('Reservas em andamento', `${myReservations.length} ativa(s)`,
                        queueReservation ? `${queuePosition}º lugar na fila de espera` : 'Nenhuma fila de espera', true)}
                    ${stat('Débitos e multas', money(student.fine),
                        student.fine ? 'Possui pendência financeira' : 'Nenhuma pendência financeira')}
                </div>

                <section class="student-dashboard-section">
                    <h2>Meus Empréstimos Ativos</h2>
                    ${loanTable(myLoans, true)}
                </section>

                <section class="student-dashboard-section">
                    <h2>Minhas Reservas Solicitadas</h2>
                    <div class="student-reservation-list">
                        ${reservationCards}
                    </div>
                </section>
            </section>
        `;
    }

    // Dashboard do Funcionário e Administrador — tela 4.2.2 da AP2.
    // Indicadores exibidos no painel principal.
    // Abaixo, as ações permanecem vinculadas ao banco demonstrativo local.
    const circulationValues = [[63, 46], [84, 70], [92, 73], [86, 79], [52, 43], [23, 18], [58, 37]];
    const circulation = circulationValues.map(([loans, returns], i) => [shortDay(i - 6), loans, returns]);

    const shortcuts = [
        ['emprestimos', uiIcons.loans, 'Empréstimos', 'Registrar nova saída'],
        ['emprestimos', uiIcons.loans, 'Devoluções', `${LIBRARY_STATS.todaysReturns} previstas para hoje`],
        ['reservas', uiIcons.reserve, 'Reservas', `${LIBRARY_STATS.waitingPickup} prontas para retirada`],
        ['catalogo', uiIcons.book, 'Catálogo', `Consultar ${LIBRARY_STATS.books.toLocaleString('pt-BR')} obras`],
        ['usuarios', uiIcons.users, 'Usuários', 'Gerenciar cadastros'],
        ['emprestimos', uiIcons.alert, 'Pendências', `${LIBRARY_STATS.overdueReturns} empréstimos em atraso`]
    ];

    return `
        <div class="staff-dashboard">
            <div class="staff-stats">
                <button type="button" class="staff-stat" data-action="go" data-page="inventario" aria-label="Abrir Obras no acervo">
                    <div class="staff-stat-top"><strong>Obras no acervo</strong><span class="metric-icon">${uiIcons.book}</span></div>
                    <div class="staff-stat-value">${LIBRARY_STATS.books.toLocaleString('pt-BR')}</div>
                    <small>+${LIBRARY_STATS.newBooks} neste mês</small>
                </button>
                <button type="button" class="staff-stat" data-action="go" data-page="emprestimos" aria-label="Abrir Empréstimos ativos">
                    <div class="staff-stat-top"><strong>Empréstimos ativos</strong><span class="metric-icon">${uiIcons.loans}</span></div>
                    <div class="staff-stat-value">${LIBRARY_STATS.loans}</div>
                    <small>${LIBRARY_STATS.todaysReturns} devoluções hoje</small>
                </button>
                <button type="button" class="staff-stat staff-stat-warm" data-action="go" data-page="reservas" aria-label="Abrir Reservas ativas">
                    <div class="staff-stat-top"><strong>Reservas ativas</strong><span class="metric-icon">${uiIcons.reserve}</span></div>
                    <div class="staff-stat-value">${String(LIBRARY_STATS.reservations).padStart(2, '0')}</div>
                    <small>${LIBRARY_STATS.waitingPickup} prontas · 2 em espera</small>
                </button>
                <button type="button" class="staff-stat" data-action="go" data-page="usuarios" aria-label="Abrir Usuários ativos">
                    <div class="staff-stat-top"><strong>Usuários ativos</strong><span class="metric-icon">${uiIcons.users}</span></div>
                    <div class="staff-stat-value">${LIBRARY_STATS.users}</div>
                    <small>+${LIBRARY_STATS.newUsers} neste mês</small>
                </button>
            </div>

            <section class="staff-analytics">
                <div class="staff-analytics-title">
                    <h2>Informações Detalhadas</h2>
                    <span>${shortDay(-6)} – ${shortDay(0)} ${new Date().getFullYear()}</span>
                </div>
                <div class="staff-analysis-body">
                    <div class="staff-chart">
                        <div class="staff-chart-caption">
                            <strong>Circulação nos últimos 7 dias</strong>
                            <div class="staff-chart-key">
                                <span class="key-blue"></span> Empréstimos
                                <span class="key-orange"></span> Devoluções
                            </div>
                        </div>
                        <div class="staff-bars" role="img" aria-label="Gráfico da circulação semanal, com barras de empréstimos e devoluções">
                            ${circulation.map(([label, taken, returned]) => `
                                <div class="staff-bar-day">
                                    <div class="staff-bar-values">
                                        <span class="staff-bar-taken" style="height:${taken}%"></span>
                                        <span class="staff-bar-returned" style="height:${returned}%"></span>
                                    </div>
                                    <small>${label}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="staff-weekly">
                        <strong>Balanço da semana</strong>
                        <div class="staff-weekly-figures">
                            <div><b>${LIBRARY_STATS.weeklyLoans}</b><small>empréstimos</small></div>
                            <div><b>${LIBRARY_STATS.weeklyReturns}</b><small>devoluções</small></div>
                        </div>
                        <p>+12% de circulação vs. semana anterior</p>
                    </div>
                </div>
            </section>

            <div class="staff-panels">
                <section class="staff-routine">
                    <div class="staff-section-head">
                        <h2>Rotina da biblioteca</h2>
                        <small>ACESSO RÁPIDO</small>
                    </div>
                    <div class="staff-quick-grid">
                        ${shortcuts.map(([key, icon, label, note]) => `
                            <button class="staff-quick" type="button" data-action="go" data-page="${key}">
                                <strong><span aria-hidden="true">${icon}</span> ${label}<span class="staff-chevron">›</span></strong>
                                <small>${safe(note)}</small>
                            </button>
                        `).join('')}
                    </div>
                </section>
                <section class="staff-notices">
                    <div class="staff-notices-head"><h2>Notificações</h2><span>3</span></div>
                    <div class="staff-notices-body">
                        <div class="staff-notice"><strong>Retirada vence hoje</strong><p>Dom Casmurro · Mariana Costa · 18h</p></div>
                        <div class="staff-notice alert"><strong>${LIBRARY_STATS.overdueReturns} devoluções em atraso</strong><p>Confira os prazos e notifique os leitores.</p></div>
                        <div class="staff-notice info"><strong>${LIBRARY_STATS.newBooks} novas obras no acervo</strong><p>Títulos catalogados em ${currentMonth()}.</p></div>
                    </div>
                </section>
            </div>
        </div>
    `;
}

// Catálogo: busca, filtros, ordenação e ações conforme o perfil.
function catalog() {
    // A tela do aluno foi aprovada e não é alterada nesta revisão.
    if (role !== 'aluno') return staffCatalog();
    return studentCatalog();
}

function studentCatalog() {
    const categories = [...new Set(db.books.map(book => book.genre))].sort();
    const search = query.trim().toLocaleLowerCase('pt-BR');
    const books = db.books.filter(book => {
        const fields = [book.title, book.author, book.isbn, book.genre, book.year];
        const matchesText = fields.some(value => String(value).toLocaleLowerCase('pt-BR').includes(search));
        const matchesGenre = !genreFilter || book.genre === genreFilter;
        const matchesStatus = !statusFilter || (statusFilter === 'disponivel' ? available(book) > 0 : available(book) === 0);
        return matchesText && matchesGenre && matchesStatus;
    });
    books.sort((a,b) => sortFilter === 'autor' ? a.author.localeCompare(b.author,'pt-BR')
        : sortFilter === 'ano' ? b.year-a.year : a.title.localeCompare(b.title,'pt-BR'));

    // Localização e identificação dos exemplares no acervo.
    const locations = {
        b1: ['Literatura / 869.3 AB48d', 'Estante B · Prat. 4', 'Setor de Humanas'],
        b2: ['Educação / 370.1 F866p', 'Estante E · Prat. 2', 'Setor Pedagógico'],
        b3: ['Filosofia / 501 K96e', 'Estante A · Prat. 1', 'Setor de Ciências'],
        b4: ['Metodologia / 001.42 M321f', 'Estante C · Prat. 3', 'Acervo Geral'],
        b5: ['Economia / 335.4 M392c', 'Estante F · Prat. 3', 'Setor de Humanas'],
        b6: ['Informática / 005.1 M382c', 'Estante D · Prat. 1', 'Setor de Tecnologia'],
        b7: ['Metodologia / 001.42 G463m', 'Estante C · Prat. 2', 'Acervo Geral']
    };
    const student = role === 'aluno';
    const rows = books.map(book => {
        const [categoryInfo, shelf, department] = locations[book.id] || [book.genre, 'Localização a cadastrar', 'Acervo Geral'];
        const [category, cdd] = categoryInfo.split(' / ');
        const free = available(book);
        return `<tr>
            <td><div class="catalog-book">${bookVisual(book)}<div><strong>${safe(book.title)}</strong>
                <small>${safe(book.author)} · ${safe(book.publisher)} · ${book.year}</small></div></div></td>
            <td>${safe(category)}<small>${safe(cdd || '')}</small></td>
            <td><strong class="shelf-name">${safe(shelf)}</strong><small>${safe(department)}</small></td>
            <td><span class="stock-flag ${free ? 'stock-free' : 'stock-out'}">● ${free ? 'Disponível' : 'Emprestado'}</span>
                <small>${free} de ${book.copies} exemplares</small></td>
            <td class="catalog-actions">
                ${student ? (free ? linkBtn('reserve','Reservar ›',book.id,'btn-primary') : linkBtn('queue','Entrar na Fila ›',book.id,'btn-green')) :
                    `<button type="button" class="action-link" data-action="book-detail" data-id="${safe(book.id)}">Ver ficha ›</button>`}
            </td>
        </tr>`;
    }).join('');

    return `<section class="library-panel">
        <div class="panel-heading">
            <div><h1>${student ? 'Livros' : 'Livros Cadastrados'}</h1>
                <p>${student ? 'Consulte obras e verifique a disponibilidade dos exemplares.' : 'Consulte exemplares, prateleiras e acesse as fichas detalhadas de circulação.'}</p></div>
            <div class="panel-summary"><strong>${LIBRARY_STATS.books.toLocaleString('pt-BR')}</strong><small>OBRAS NO ACERVO</small></div>
        </div>
        <div class="catalog-filters">
            <input id="search-books" type="search" aria-label="Buscar no catálogo" placeholder="Buscar" value="${safe(query)}">
            <select id="filter-genre" aria-label="Filtrar por categoria">
                <option value="">Categorias</option>
                ${categories.map(item=>`<option value="${safe(item)}" ${genreFilter===item?'selected':''}>${safe(item)}</option>`).join('')}
            </select>
            <select id="filter-status" aria-label="Filtrar por disponibilidade">
                <option value="">Status</option>
                <option value="disponivel" ${statusFilter==='disponivel'?'selected':''}>Disponível</option>
                <option value="emprestado" ${statusFilter==='emprestado'?'selected':''}>Emprestado</option>
            </select>
            <select id="sort-books" aria-label="Ordenar obras" title="Ordenar obras">
                <option value="titulo" ${sortFilter==='titulo'?'selected':''}>Título</option>
                <option value="autor" ${sortFilter==='autor'?'selected':''}>Autor</option>
                <option value="ano" ${sortFilter==='ano'?'selected':''}>Ano</option>
            </select>
        </div>
        <div class="table-scroll"><table class="data-table">
            <thead><tr><th>Título e autoria</th><th>Categoria / CDD</th><th>Localização Física</th><th>Disponibilidade</th><th>Ações</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5">Nenhuma obra encontrada.</td></tr>'}</tbody>
        </table></div>
        <div class="panel-footer"><span>Exibindo ${books.length ? 1 : 0}–${books.length} de ${LIBRARY_STATS.books.toLocaleString('pt-BR')} livros catalogados</span>
            <div class="pagination-summary" aria-label="Paginação do acervo">‹ &nbsp; <b>1</b> &nbsp; 2 &nbsp; 3 &nbsp; … &nbsp; 178 ›</div></div>
        ${student ? '' : `<div class="catalog-actions"><button type="button" class="btn btn-primary" data-action="new-book">+ Cadastrar livro</button><button type="button" class="btn btn-outline" data-action="go" data-page="categorias">Gerenciar categorias</button></div>`}
    </section>`;
}


// Catálogo do Funcionário / Administrador — tabela e filtros do protótipo.
function staffCatalog() {
    const search = query.trim().toLocaleLowerCase('pt-BR');
    const categories = [...new Set(db.books.map(book => book.genre))].sort();
    const books = db.books.filter(book => {
        const matchesText = [book.title, book.author, book.isbn, book.genre, book.year]
            .some(value => String(value).toLocaleLowerCase('pt-BR').includes(search));
        const matchesGenre = !genreFilter || book.genre === genreFilter;
        const matchesStatus = !statusFilter ||
            (statusFilter === 'disponivel' ? available(book) > 0 : available(book) === 0);
        return matchesText && matchesGenre && matchesStatus;
    });
    // A sequência inicial segue a ordem da tabela de alta fidelidade.
    const order = ['b1', 'b2', 'b3', 'b4', 'b7', 'b6', 'b5'];
    books.sort((a, b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        if (ai === -1 && bi === -1) return a.title.localeCompare(b.title, 'pt-BR');
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    const locations = {
        b1: ['Literatura', '869.3 AB48d', 'Estante B · Prat. 4', 'Setor de Humanas'],
        b2: ['Educação', '370.1 F866p', 'Estante E · Prat. 2', 'Setor Pedagógico'],
        b3: ['Filosofia', '501 K96e', 'Estante A · Prat. 1', 'Setor de Ciências'],
        b4: ['Metodologia', '001.42 M321f', 'Estante C · Prat. 3', 'Acervo Geral'],
        b5: ['Economia', '335.4 M392c', 'Estante F · Prat. 3', 'Setor de Humanas'],
        b6: ['Informática', '005.1 M382c', 'Estante D · Prat. 1', 'Setor de Tecnologia'],
        b7: ['Metodologia', '001.42 G463m', 'Estante C · Prat. 2', 'Acervo Geral']
    };
    const rows = books.map(book => {
        const [category, cdd, shelf, department] = locations[book.id] ||
            [book.genre, 'A classificar', 'Localização a cadastrar', 'Acervo Geral'];
        const free = available(book);
        return `
            <tr>
                <td>
                    <div class="catalog-book">
                        ${bookVisual(book)}
                        <div>
                            <strong>${safe(book.title)}</strong>
                            <small>${safe(book.author)} · ${safe(book.publisher)} · ${book.year}</small>
                        </div>
                    </div>
                </td>
                <td>${safe(category)}<small>${safe(cdd)}</small></td>
                <td><strong class="shelf-name">${safe(shelf)}</strong><small>${safe(department)}</small></td>
                <td>
                    <span class="stock-flag ${free ? 'stock-free' : 'stock-out'}">● ${free ? 'Disponível' : 'Emprestado'}</span>
                    <small>${free} de ${book.copies} exemplares</small>
                </td>
                <td class="catalog-actions">
                    <button type="button" class="action-link" data-action="book-detail" data-id="${safe(book.id)}">
                        Ver ficha ›
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <section class="library-panel staff-catalog">
            <div class="panel-heading">
                <div>
                    <h1>Livros Cadastrados</h1>
                    <p>Consulte exemplares, prateleiras e acesse as fichas detalhadas de circulação.</p>
                </div>
                <div class="panel-summary">
                    <strong>${LIBRARY_STATS.books.toLocaleString('pt-BR')}</strong>
                    <small>OBRAS NO ACERVO</small>
                </div>
            </div>
            <div class="catalog-filters">
                <input id="search-books" type="search" aria-label="Buscar no catálogo"
                    placeholder="Buscar por título, autor, tombo ou ISBN..." value="${safe(query)}">
                <select id="filter-genre" aria-label="Categorias">
                    <option value="">Categorias</option>
                    ${categories.map(category => `
                        <option value="${safe(category)}" ${genreFilter === category ? 'selected' : ''}>
                            ${safe(category)}
                        </option>
                    `).join('')}
                </select>
                <select id="filter-status" aria-label="Disponibilidade">
                    <option value="">Disponibilidade</option>
                    <option value="disponivel" ${statusFilter === 'disponivel' ? 'selected' : ''}>Disponíveis</option>
                    <option value="emprestado" ${statusFilter === 'emprestado' ? 'selected' : ''}>Indisponíveis</option>
                </select>
            </div>
            <div class="table-scroll">
                <table class="data-table">
                    <thead><tr>
                        <th>Título e autoria</th><th>Categoria / CDD</th><th>Localização Física</th>
                        <th>Disponibilidade</th><th>Ações</th>
                    </tr></thead>
                    <tbody>${rows || '<tr><td colspan="5">Nenhum livro encontrado.</td></tr>'}</tbody>
                </table>
            </div>
            <div class="panel-footer">
                <span>Exibindo ${books.length > 0 ? '1–' + books.length : '0'} de ${LIBRARY_STATS.books.toLocaleString('pt-BR')} livros catalogados</span>
                <span class="pagination-summary" aria-label="Paginação do acervo">‹ &nbsp; <b>1</b> &nbsp; 2 &nbsp; 3 &nbsp; … &nbsp; 178 ›</span>
            </div>
        </section>
    `;
}

// Ficha dedicada do exemplar
function bookDetailsPage() {
    const book = $book(selectedBookId) || db.books[0];
    if (!book) return '<p>Nenhuma obra cadastrada.</p>';
    const isDom = book.id === 'b1';
    const illustrative = [
        ['TB-00642-1','Circulação Livre','Estante B · Prat. 4','Disponível','— Na prateleira','new-loan','Emprestar'],
        ['TB-00642-2','Circulação Livre','Estante B · Prat. 4','Disponível','— Na prateleira','new-loan','Emprestar'],
        ['TB-00642-3','Circulação Livre','Em trânsito','Emprestado',`Mariana Costa (Dev. ${brShort(3)})`,'record-return','Devolver'],
        ['TB-00642-4','Reserva Balcão','Armário Balcão A','Retirada 48h',`Lucas Almeida (Até ${brShort(1)})`,'confirm-pickup','Confirmar'],
        ['TB-00642-5','Consulta Local','Mesa de Referência 1','Sala Leitura','Uso exclusivo no recinto','none','Bloqueado']
    ];
    const normalRows = Array.from({length:book.copies}, (_,i) => {
        const active = activeLoans(book.id)[i];
        return [`TB-${safe(book.id.toUpperCase())}-${String(i+1).padStart(2,'0')}`, 'Circulação Livre',
          'Estante de circulação', active ? 'Emprestado':'Disponível', active ? safe($user(active.userId)?.name||'Leitor') : '— Na prateleira',
          active ? 'return' : 'new-loan', active ? 'Devolver' : 'Emprestar', active?.id || book.id];
    });
    const rows=(isDom?illustrative:normalRows).map(([code,type,location,state,person,act,label,id])=>{
        const kind = state==='Disponível'?'ok':state==='Emprestado'?'warn':'info';
        return `<tr><td><strong>${safe(code)}</strong></td><td>${safe(type)}</td><td>${safe(location)}</td>
          <td>${status('● '+state,kind)}</td><td>${safe(person)}</td>
          <td>${act==='none'?'<span class="detail-disabled">Bloqueado</span>':`<button type="button" class="detail-action ${act==='return'||act==='record-return'?'dark':''}" data-action="${act}" data-id="${safe(id||book.id)}">${safe(label)}</button>`}</td></tr>`;
    }).join('');
    return `<section class="library-panel detail-screen faithful-detail">
       <button class="action-link detail-back" type="button" data-action="go" data-page="catalogo">‹ Voltar para a lista de livros</button>
       <div class="detail-book-hero"><div class="detail-cover">${bookVisual(book)}</div>
       <div class="detail-book-text"><h1>${safe(book.title)}</h1>
         <p>Autoria: ${safe(book.author)} | Editora: ${safe(book.publisher)} | Ano: ${book.year} | 3ª Edição</p>
         <p>ISBN: ${safe(book.isbn)} | Classificação CDD: 869.3 AB48d (Literatura Brasileira)</p>
         <p><strong>Localização Base: Estante B · Prateleira 4 · Setor de Ciências Humanas</strong></p></div>
       <div class="detail-hero-actions"><button type="button" class="btn btn-green" data-action="staff-reserve" data-id="${safe(book.id)}">Reservar Livro</button>
         <button type="button" class="btn btn-primary" data-action="new-loan" data-id="${safe(book.id)}">+ Novo Empréstimo</button></div></div>
       <section class="detail-exemplar-panel"><div class="detail-section-title"><h2>Exemplares Físicos Registrados (${isDom?'6':book.copies} no total)</h2>
       <small>${isDom?'3 disponíveis no acervo · 2 emprestados':`${available(book)} disponíveis · ${activeLoans(book.id).length} emprestados`}</small></div>
       <div class="table-scroll"><table class="data-table"><thead><tr><th>Código Tombo</th><th>Tipo do Exemplar</th>
       <th>Localização Exata</th><th>Situação Atual</th><th>Emprestado Para / Posição</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div></section>
       </section>`;
}

// Empréstimos: a mesma tabela serve ao aluno e à equipe da biblioteca.
function loanTable(loans, isStudent) {
    const rows = loans.map(loan => {
        const book = $book(loan.bookId);
        const overdue = lateDays(loan.due);
        const button = isStudent
            ? linkBtn('renew', `Renovar +${RULES.loanDays} dias`, loan.id, 'btn-primary')
            : linkBtn('return', 'Devolver', loan.id, 'btn-green');

        return `
            <tr>
                <td>
                    <strong>${safe(book?.title || 'Obra removida')}</strong>
                    <span class="subline">
                        ${safe(book?.author || '')} · ${loan.renewals}/${RULES.maxRenewals} renovações
                    </span>
                </td>
                <td>${formatDate(loan.start)}</td>
                <td>${formatDate(loan.due)}</td>
                <td>${overdue ? status(`${overdue} dia(s) de atraso`, 'bad') : status('No prazo', 'ok')}</td>
                <td><div class="btn-group">${button}</div></td>
            </tr>
        `;
    }).join('');

    return table(
        isStudent
            ? ['Título da Obra', 'Data Retirada', 'Data Limite Devolução', 'Status', 'Ação']
            : ['Obra', 'Data de retirada', 'Devolução prevista', 'Situação', 'Ações'],
        rows
    );
}

function loansPage() {
    const sample = [
        ['Dom Casmurro','Machado de Assis · Ex. 00642','Mariana Costa','20240182 · Aluno',brDate(6),'Regular','Devolver','record-return'],
        ['Pedagogia da autonomia','Paulo Freire · Ex. 00318','Lucas Almeida','20230245 · Aluno',brDate(6),'Regular','Devolver','record-return'],
        ['O capital — Livro I','Karl Marx · Ex. 0264','Rafael Oliveira','Multa: R$ 6,00 (3 dias)',brDate(-3),'Em Atraso','Baixa / Multa','record-return'],
        ['Ética a Nicômaco','Aristóteles · Ex. 00071','Beatriz Santos','20250109 · Docente',brDate(7),'Regular','Devolver','record-return']
    ];
    const rows=sample.map(([title,meta,name,reg,due,state,label,act],i)=>`<tr>
        <td><strong>${safe(title)}</strong><small>${safe(meta)}</small></td>
        <td>${safe(name)}<small class="${state==='Em Atraso'?'user-late':''}">${safe(reg)}</small></td>
        <td class="${state==='Em Atraso'?'user-late':''}">${due}</td>
        <td>${status(state==='Regular'?'● Regular':'● Em Atraso',state==='Regular'?'ok':'bad')}</td>
        <td><button class="action-link" type="button" data-action="${act}" data-id="${i}">${safe(label)} ›</button></td></tr>`).join('');
    return `<section class="library-panel workflow-panel faithful-workflow faithful-loans">
      <div class="panel-heading"><div><h1>Empréstimos Ativos</h1>
      <p>Acompanhe retiradas, prazos e registre devoluções ou cobrança de multas.</p></div>
      <div class="panel-summary"><strong>186</strong><small>EM CIRCULAÇÃO</small></div></div>
      <div class="workflow-toolbar"><input type="search" id="search-staff-loans" placeholder="Buscar por obra, usuário ou matrícula..." aria-label="Buscar empréstimos">
      <button type="button" class="btn btn-primary" data-action="new-loan">+ Novo Empréstimo</button>
      <select id="loan-status-select" aria-label="Filtrar empréstimos"><option value="">Todos os estados</option><option value="regular">Regular</option><option value="atraso">Em Atraso</option></select></div>
      <div class="table-scroll"><table class="data-table" id="staff-loans-table"><thead><tr>
      <th>Obra / Tombo</th><th>Usuário / Matrícula</th><th>Devolução Prevista</th><th>Estado</th><th>Ações</th></tr></thead>
      <tbody>${rows}</tbody></table></div><div class="panel-footer"><span>Exibindo 4 de 186 empréstimos registrados</span>
      <div class="pagination-summary"><b>1</b> &nbsp; 2</div></div>
      </section>`;
}

function reservationTable(items, isStudent) {
    const rows = items.map(reservation => {
        const book = $book(reservation.bookId);
        const user = $user(reservation.userId);
        const queue = db.reservations.filter(item => item.bookId === reservation.bookId && item.status === 'fila');
        const position = queue.findIndex(item => item.id === reservation.id) + 1;

        const statuses = {
            fila: status(`Fila · posição ${position}`, 'warn'),
            pronta: status('Pronta para retirada', 'ok'),
            retirada: status('Retirada', 'info'),
            cancelada: status('Cancelada', 'neutral')
        };

        const canCancel = ['fila', 'pronta'].includes(reservation.status);
        const canPickup = !isStudent && reservation.status === 'pronta';

        return `
            <tr>
                <td><strong>${safe(book?.title || 'Obra removida')}</strong></td>
                <td>${safe(user?.name || '—')}</td>
                <td>${formatDate(reservation.created)}</td>
                <td>${statuses[reservation.status] || status('Indefinido')}</td>
                <td>
                    <div class="btn-group">
                        ${canCancel ? linkBtn('cancel-res', 'Cancelar', reservation.id, 'btn-danger') : ''}
                        ${canPickup ? linkBtn('pickup', 'Confirmar retirada', reservation.id, 'btn-primary') : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return table(['Obra', 'Solicitante', 'Data', 'Status', 'Ações'], rows);
}

function reservationsPage() {
    if (role === 'aluno') {
        const items = db.reservations.filter(r => r.userId===currentUser && r.status!=='cancelada');
        return titleBlock('Minhas reservas','Acompanhe suas solicitações e posição na fila.')+`<section class="card">${reservationTable(items,true)}</section>`;
    }
    const records = [
      ['Dom Casmurro','Machado de Assis · R-0261','Mariana Costa','20240182',brDate(-2),`Até ${brShort(0)} · 18h`,'Retirar hoje','Exemplar: 00642','Retirar','confirm-pickup','0'],
      ['Pedagogia da autonomia','Paulo Freire · R-0262','Lucas Almeida','20230245',brDate(-1),`Até ${brShort(1)} · 18h`,'Pronta para retirada','Exemplar: 00318','Retirar','confirm-pickup','1'],
      ['Ética a Nicômaco','Aristóteles · R-0263','Beatriz Santos','20250109',brDate(0),`Até ${brShort(2)} · 18h`,'Pronta para retirada','Exemplar: 00871','Retirar','confirm-pickup','2'],
      ['O capital — Livro I','Karl Marx · R-0264','Rafael Oliveira','20220376',brDate(-2),'Aguardando obra','Em espera','1º na fila de espera','Ver fila','waiting-list','3'],
      ['O capital — Livro I','Karl Marx · R-0265','Camila Ferreira','20240058',brDate(-1),'Aguardando obra','Em espera','2º na fila de espera','Ver fila','waiting-list','4']
    ];
    const rows = records.map(([title,bookmeta,user,registration,date,until,state,detail,button,act,id],i)=>{
      const done=Boolean(exampleOperations().pickups[id]);
      return `<tr>
      <td><strong class="reservation-work-title">${safe(title)}</strong><small>${safe(bookmeta)}</small></td>
      <td>${safe(user)}<small>${safe(registration)}</small></td>
      <td>${safe(date)}<small class="${i===0?'reservation-important':''}">${safe(until)}</small></td>
      <td>${status(done?'● Retirada confirmada':'● '+state,done?'ok':i<3?(i===0?'warn':'ok'):'info')}<small>${safe(detail)}</small></td>
      <td>${done?'<span class="green-text">Concluída</span>':`<button class="action-link" type="button" data-action="${act}" data-id="${id}">${safe(button)} ›</button>`}</td></tr>`;
    }).join('');
    return `<section class="library-panel workflow-panel faithful-workflow faithful-reservations">
      <div class="panel-heading"><div><h1>Reservas Ativas</h1><p>Acompanhe as retiradas e a fila de espera do acervo acadêmico.</p></div>
      <div class="panel-summary"><strong>05</strong><small>3 PRONTAS · 2 EM ESPERA</small></div></div>
      <div class="workflow-toolbar"><input type="search" id="search-staff-reservations" placeholder="Buscar por obra, usuário ou matrícula" aria-label="Buscar reservas">
      <button type="button" class="btn btn-primary" data-action="staff-new-reserve">Nova Reserva +</button>
      <select id="reservation-status-select" aria-label="Filtrar reservas"><option value="">Todos os status</option><option value="pronta">Prontas</option><option value="espera">Em espera</option></select></div>
      <div class="table-scroll"><table class="data-table" id="staff-reservations-table"><thead><tr>
      <th>Obra / reserva</th><th>Usuário / matrícula</th><th>Reserva / retirada</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${rows}</tbody></table></div><div class="panel-footer"><span>Exibindo 5 de 5 reservas ativas</span>
      <span>${shortDay(0)} ${new Date().getFullYear()} · BIBLIOTECA CENTRAL</span></div></section>`;
}

function usersPage() {
    // A tabela lista os usuários cadastrados no navegador. Os totais nos
    // Indicadores resumidos dos usuários cadastrados.
    const filtered = db.users.filter(user => {
        const text = `${user.name} ${user.email} ${user.registration}`.toLocaleLowerCase('pt-BR');
        const matchesSearch = text.includes(userSearch.trim().toLocaleLowerCase('pt-BR'));
        const hasPending = user.fine > 0 || activeLoans(null, user.id).some(loan => lateDays(loan.due) > 0);
        const matchesStatus = userStatusFilter === 'todos' ||
            (userStatusFilter === 'pendente' ? hasPending : !hasPending);
        return matchesSearch && matchesStatus;
    });
    const pages = Math.max(1, Math.ceil(filtered.length / USERS_PER_PAGE));
    userPage = Math.min(userPage, pages);
    const start = (userPage - 1) * USERS_PER_PAGE;
    const visible = filtered.slice(start, start + USERS_PER_PAGE);

    const rows = visible.map(user => {
        const isStudent = user.role === 'aluno';
        const loans = activeLoans(null, user.id);
        const overdue = loans.filter(loan => lateDays(loan.due) > 0).length;
        const pending = overdue > 0 || user.fine > 0;
        const type = isStudent ? 'Estudante' : (user.role === 'bibliotecario' ? 'Técnico-administrativo' : 'Gestão / Administração');
        const subType = isStudent ? 'Comunidade acadêmica' : (user.role === 'bibliotecario' ? 'Secretaria acadêmica' : 'Gestão do acervo');
        return `
            <tr>
                <td><strong class="user-table-name">${safe(user.name)}</strong><small>${safe(user.email)}</small></td>
                <td class="user-reg">${safe(user.registration)}</td>
                <td>${safe(type)}<small>${safe(subType)}</small></td>
                <td>
                    <span class="user-status ${pending ? 'user-suspended' : 'user-active'}">● ${pending ? 'Suspenso' : 'Ativo'}</span>
                    <small class="${pending ? 'user-late' : ''}">${pending ? `${overdue} devolução(ões) em atraso${user.fine ? ' · multa registrada' : ''}` : `${loans.length} empréstimo(s)`}</small>
                </td>
                <td class="user-action-cell">
                    <button type="button" class="action-link" data-action="edit-user" data-id="${safe(user.id)}">Ver ficha ❯</button>
                </td>
            </tr>
        `;
    }).join('');

    const stats = [
        ['Usuários cadastrados', LIBRARY_STATS.totalUsers, 'Comunidade acadêmica', uiIcons.users, false],
        ['Usuários ativos', LIBRARY_STATS.users, '96,1% dos cadastros', uiIcons.users, false],
        ['Novos neste mês', LIBRARY_STATS.newUsers, `Cadastros em ${currentMonth()}`, uiIcons.userAdd, false],
        ['Com pendências', String(LIBRARY_STATS.pendingUsers).padStart(2, '0'), 'Devoluções em atraso', uiIcons.alert, true]
    ];

    return `
        <div class="staff-users-page">
            <div class="staff-user-stats">
                ${stats.map(([label, number, detail, icon, warn]) => `
                    <div class="staff-user-stat ${warn ? 'staff-user-stat-warn' : ''}">
                        <div class="staff-user-stat-head"><strong>${label}</strong><span aria-hidden="true">${icon}</span></div>
                        <div class="staff-user-stat-number">${safe(number)}</div>
                        <small>${safe(detail)}</small>
                    </div>
                `).join('')}
            </div>

            <section class="staff-users-panel">
                <div class="staff-users-heading">
                    <h1>Lista de Usuários</h1>
                    <span>BIBLIOTECA ACADÊMICA · ${monthYear()}</span>
                </div>
                <div class="staff-users-filters">
                    <div class="staff-search-wrap">
                        <span aria-hidden="true">⌕</span>
                        <label for="search-users">Buscar</label>
                        <input type="search" id="search-users" placeholder="por nome, email ou matrícula" value="${safe(userSearch)}">
                    </div>
                    <select id="filter-users-status" aria-label="Filtrar status de usuário">
                        <option value="todos" ${userStatusFilter === 'todos' ? 'selected' : ''}>Todos os status</option>
                        <option value="ativo" ${userStatusFilter === 'ativo' ? 'selected' : ''}>Ativos</option>
                        <option value="pendente" ${userStatusFilter === 'pendente' ? 'selected' : ''}>Com pendências</option>
                    </select>
                </div>
                <div class="table-scroll">
                    <table class="staff-users-table">
                        <thead><tr><th>Nome / email</th><th>Matrícula</th><th>Tipo de Usuário</th><th>Status / circulação</th><th>Ações</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="5">Nenhum usuário encontrado.</td></tr>'}</tbody>
                    </table>
                </div>
                <div class="staff-users-bottom">
                    <span>Exibindo ${visible.length ? start + 1 : 0}–${start + visible.length} de ${filtered.length} cadastros editáveis
                        <small>· ${LIBRARY_STATS.totalUsers} cadastrados</small></span>
                    <div class="staff-users-bottom-actions">
                        <button type="button" class="staff-pager" data-action="user-page" data-page="${Math.max(1, userPage - 1)}" ${userPage === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>
                        <span class="staff-current-page">${userPage}</span>
                        <button type="button" class="staff-pager" data-action="user-page" data-page="${Math.min(pages, userPage + 1)}" ${userPage === pages ? 'disabled' : ''} aria-label="Próxima página">›</button>
                        <span class="staff-users-hint">Cadastros integrados ao e-mail institucional</span>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function inventoryPage() {
    // As linhas de patrimônio fictício também permitem abrir a ficha de operações.
    const sample = [
        ['TCC-2026-0042', 'TCC / Monografia', 'Sistema de Gerenciamento Bibliotecário', 'Mariana Costa · Profª Helena Martins', 'Arquivo TCC · Gaveta B', 'Consulta local', 'info', 'tcc-record'],
        ['TB-00642-1', 'Livro', 'Dom Casmurro (3ª Edição)', 'Machado de Assis', 'Estante B · Prat. 4', 'Disponível', 'ok', 'b1'],
        ['TB-01244-2', 'Livro', 'Código Limpo (Clean Code)', 'Robert C. Martin', 'Estante D · Prat. 1', 'Disponível', 'ok', 'b6'],
        ['TB-00318-3', 'Livro', 'Pedagogia da autonomia', 'Paulo Freire', 'Bancada de Restauro', 'Em reparo', 'warn', 'b2'],
        ['TB-00109-2', 'Livro', 'Cálculo com Geometria Analítica', 'Patrimônio em baixa', 'Fora da estante', 'Baixa contábil', 'bad', 'other-record'],
        ['PER-2026-0018', 'Periódico', 'Revista Brasileira de Computação Aplicada', 'Periódico acadêmico', 'Estante P · Prat. 2', 'Disponível', 'ok', 'periodical-record']
    ];
    const extraBooks = db.books.filter(book => !['b1','b2','b6'].includes(book.id))
        .map(book => [`TB-${String(400 + Number(book.id.slice(1) || 0) * 37).padStart(5, '0')}-1`, 'Livro', book.title, book.author, 'Acervo geral', available(book) ? 'Disponível':'Emprestado', available(book) ? 'ok':'bad', book.id]);
    const extraWorks = (db.academicWorks || []).map(work => [work.id, 'TCC / Monografia',work.title,work.author,work.location || 'Arquivo acadêmico','Consulta local','info',work.id]);
    const records = [...sample, ...extraBooks, ...extraWorks];
    const rows = records.map(([id,type,title,author,place,state,tone,recordId]) => `
        <tr>
            <td><strong class="inventory-code">${safe(id)}</strong></td>
            <td><span class="inventory-type">${safe(type)}</span></td>
            <td><strong>${safe(title)}</strong><small>${safe(author)}</small></td>
            <td>${safe(place)}</td><td>${status(state,tone)}</td>
            <td><button class="action-link" type="button" data-action="inventory-options" data-id="${safe(recordId)}">Opções ▾</button></td>
        </tr>`).join('');
    return `<section class="library-panel inventory-panel">
        <div class="panel-heading"><div><h1>Gestão e Auditoria de Patrimônio do Acervo</h1>
        <p>Controle de cadastro, restauração, localização e baixa patrimonial do acervo.</p></div></div>
        <div class="inventory-action-grid">
          <button type="button" data-action="new-book" class="inventory-action accent-orange"><strong>+ Cadastrar Livro</strong><small>Livros, ISBN e edições</small><b>Abrir cadastro ›</b></button>
          <button type="button" data-action="new-academic" class="inventory-action"><strong>+ Cadastrar TCC / Artigo</strong><small>Trabalhos acadêmicos e orientadores</small><b>Abrir cadastro ›</b></button>
          <button type="button" data-action="inventory-low" class="inventory-action accent-red"><strong>Dar Baixa Patrimonial</strong><small>Perda, extravio ou descarte</small><b>Registrar baixa ›</b></button>
          <button type="button" data-action="inventory-audit" class="inventory-action"><strong>Restauração e Auditoria</strong><small>Conferência do acervo físico</small><b>Iniciar auditoria ›</b></button>
        </div>
        <div class="inventory-toolbar"><input id="search-inventory" type="search" placeholder="Buscar por código, título ou autor" aria-label="Pesquisar patrimônio">
          <select id="inventory-type"><option value="">Tipo: Todos</option><option>Livro</option><option>TCC / Monografia</option><option>Periódico</option></select>
          <select id="inventory-state"><option value="">Situação: Todas</option><option>Disponível</option><option>Em reparo</option><option>Baixa contábil</option></select>
          <button class="btn btn-green" type="button" data-action="export-report">Gerar relatório</button></div>
        <div class="table-scroll"><table class="data-table inventory-table" id="inventory-data-table"><thead>
          <tr><th>Tombo Patrimonial</th><th>Tipo de Material</th><th>Título e Autoria</th><th>Localização Física</th><th>Situação Atual</th><th>Ações</th></tr>
        </thead><tbody>${rows}</tbody></table></div>
        <div class="panel-footer"><span>Exibindo ${records.length} registros · 3.840 itens no inventário</span>
          <button class="action-link" data-action="export-report">Exportar Relatório Geral (CSV) ›</button></div>
        </section>`;
}

function categoriesPage() {
    const rows = db.categories.map((category, index) => `
        <tr>
            <td><strong>${safe(category)}</strong></td>
            <td>${db.books.filter(book => book.genre === category).length}</td>
            <td>
                ${linkBtn('edit-category', 'Renomear', String(index))}
                ${linkBtn('delete-category', 'Excluir', String(index), 'btn-danger')}
            </td>
        </tr>
    `).join('');

    const addButton = '<button type="button" class="btn btn-primary" data-action="new-category">+ Nova categoria</button>';
    return titleBlock('Gerenciar categorias e gêneros', 'Organize as classificações utilizadas no cadastro de obras.', addButton) + `
        <section class="card">
            ${table(['Categoria / gênero', 'Obras cadastradas', 'Ações'], rows)}
        </section>
    `;
}

function reportsPage() {
    const books = [
        ['Dom Casmurro','Machado de Assis',84,12,'Adquirir +3 ex.'],
        ['O capital — Livro I','Karl Marx',67,8,'Adquirir +2 ex.'],
        ['Pedagogia da autonomia','Paulo Freire',59,5,'Acervo suficiente'],
        ['Código Limpo (Clean Code)','Robert C. Martin',52,7,'Adquirir +2 ex.'],
        ['Metodologia Científica','Marconi e Lakatos',48,2,'Acervo suficiente']
    ];
    const rows = books.map(([title,author,loans,queue,advice]) => `<tr><td><strong>${safe(title)}</strong><small>${safe(author)}</small></td>
        <td>${loans} vezes</td><td>${queue} alunos</td><td class="${advice.startsWith('Adquirir')?'report-orange':'report-green'}">${safe(advice)}</td></tr>`).join('');
    const bars = [
        ['Exemplares nas Estantes (Disponíveis)','3.210 ex.',84,'#10b981'],
        ['Empréstimos Ativos com Leitores','542 ex.',14,'#e77823'],
        ['Em Reparo / Restauração (Danos)','64 ex.',7,'#6b7280'],
        ['Consulta Local (Não Circulantes)','18 ex.',3,'#0284c7'],
        ['Perdas / Extravio Pendentes','6 ex.',2,'#dc2626']
    ];
    return `<section class="library-panel reports-panel"><div class="report-heading"><div><h1>Visão Estratégica do Acervo e Finanças</h1>
        <p>Indicadores analíticos de circulação, receita de multas e auditoria de estoque físico de exemplares.</p></div>
        <div class="btn-group"><select id="report-period" aria-label="Período"><option>Período: Novembro/2026</option></select>
        <button class="btn btn-primary" data-action="export-report">Exportar Relatório</button></div></div>
        <div class="report-stats">
        <div class="report-stat"><strong>TOTAL DE EMPRÉSTIMOS (MÊS)</strong><b>542</b><small>+14% vs. mês anterior</small></div>
        <div class="report-stat"><strong>RECEITA DE MULTAS ARRECADADAS</strong><b class="report-orange">R$ 486,00</b><small>81 infrações quitadas no balcão</small></div>
        <div class="report-stat"><strong>ROTATIVIDADE DO ACERVO</strong><b>72,4%</b><small>Alta utilização acadêmica</small></div>
        <div class="report-stat"><strong>TOTAL DE EXEMPLARES NO ACERVO</strong><b>3.840</b><small>1.248 títulos catalogados</small></div></div>
        <div class="report-columns"><section><h2>Obras Mais Procuradas e Fila de Espera (Demanda Reprimida)</h2>
        <div class="table-scroll"><table class="data-table"><thead><tr><th>Título da Obra</th><th>Empréstimos</th><th>Fila Atual</th><th>Recomendação</th></tr></thead><tbody>${rows}</tbody></table></div></section>
        <section><h2>Balanço do Inventário Físico (Auditoria)</h2><div class="report-audit">
        ${bars.map(([label,value,pct,color])=>`<div class="report-audit-row"><div><strong>${label}</strong><b style="color:${color}">${value}</b></div>
        <div class="report-track"><span style="width:${pct}%;background:${color}"></span></div></div>`).join('')}
        </div></section></div>
        <div class="report-actions"><strong>Ações de Fechamento Operacional e Inventário:</strong><p>Emita relatórios fiscais para auditoria universitária ou inicie a conferência semestral de estantes físicas.</p>
        <div class="btn-group"><button class="btn btn-outline" data-action="export-report">Relatório de Inadimplência</button>
        <button class="btn btn-outline" data-action="export-report">Exportar Dados para CSV</button>
        <button class="btn btn-green" data-action="inventory-audit">Iniciar Auditoria de Acervo</button>
        <button class="btn btn-primary" data-action="new-book">+ Entrada de Novo Lote</button></div></div>
        <p class="report-description">Relatórios de movimentação e inventário da biblioteca.</p>
    </section>`;
}

function finesPage() {
    const student = $user(currentUser);
    const overdue = activeLoans(null, currentUser).filter(loan => lateDays(loan.due) > 0);
    const rows = overdue.map(loan => `
        <tr>
            <td>${safe($book(loan.bookId)?.title || 'Obra removida')}</td>
            <td>${formatDate(loan.due)}</td>
            <td>${lateDays(loan.due)}</td>
            <td>${money(fineFor(loan.due))}</td>
        </tr>
    `).join('');

    return titleBlock('Consultar multas', 'Acompanhe cobranças por atraso na devolução.') + `
        <div class="stat-grid">
            ${stat('Multas registradas', money(student.fine), 'Pendências em aberto', student.fine > 0)}
            ${stat('Empréstimos vencidos', overdue.length, 'Atrasos em andamento')}
        </div>
        <section class="card">
            <h2>Detalhamento de atrasos</h2>
            <p class="muted">
                Regra: ${money(RULES.latePerCalendarDay)} por dia corrido de atraso, sem taxa fixa.
                A multa é registrada após a confirmação da devolução.
            </p>
            ${table(['Obra', 'Vencimento', 'Dias de atraso', 'Valor estimado'], rows)}
        </section>
    `;
}

function notificationsPage() {
    const notices = db.notices.filter(notice => notice.userId === currentUser);
    const items = notices.length ? notices.map(notice => `
        <div class="notice-item">
            <strong>${formatDate(notice.date)}</strong>
            <p>${safe(notice.message)}</p>
        </div>
    `).join('') : '<div class="empty">Você não tem notificações no momento.</div>';

    return titleBlock('Notificações', 'Avisos de reservas, devoluções e renovações.') + `
        <section class="card"><div class="notice-list">${items}</div></section>
    `;
}

// 5. MODAIS: formulários e caixas de confirmação.
function openDialog(kind, id, refresh = false) {
    if (!refresh)
        lastFocus = document.activeElement;
    dialog = { kind, id };
    const b = $book(id), u = $user(id), l = db.loans.find(x => x.id === id), r = db.reservations.find(x => x.id === id);
    let html = '', heading = '', desc = '', submit = '', cls = '';
    const opts = (arr, key, label, selected = '') => arr.map(x => `<option value="${safe(x[key])}" ${x[key] === selected ? 'selected' : ''}>${safe(label(x))}</option>`).join('');
    if (kind === 'book-detail') {
        heading = 'Ficha da obra';
        desc = 'Detalhes bibliográficos e exemplares físicos.';
        submit = 'Fechar';
        html = `<div class="book-name">${bookVisual(b)}<div>
            <h3>${safe(b.title)}</h3>
            <span class="muted">${safe(b.author)}</span>
            </div>
            </div>
            <div class="detail">
            <dl>
            <dt>Editora</dt>
            <dd>${safe(b.publisher)}</dd>
            <dt>Ano</dt>
            <dd>${b.year}</dd>
            <dt>ISBN</dt>
            <dd>${safe(b.isbn)}</dd>
            <dt>Categoria</dt>
            <dd>${safe(b.genre)}</dd>
            <dt>Patrimônio</dt>
            <dd>${b.copies} exemplar(es)</dd>
            <dt>Disponibilidade</dt>
            <dd>${available(b)} disponível(is)</dd>
            <dt>Fila de espera</dt>
            <dd>${countQueue(b.id)} pessoa(s)</dd>
            </dl>
            </div>
            <div class="btn-group">
                ${role === 'aluno'
                    ? (available(b) > 0
                        ? linkBtn('reserve', 'Reservar obra', b.id, 'btn-primary')
                        : linkBtn('queue', 'Entrar na fila', b.id, 'btn-green'))
                    : linkBtn('new-loan', 'Novo empréstimo', b.id, 'btn-primary')}
            </div>`;
    }
    else if (kind === 'reserve' || kind === 'queue') {
        const isQueue=kind==='queue';
        cls='faithful-modal '+(isQueue?'modal-queue':'modal-reserve');
        heading=isQueue?'Entrar na Fila de Espera':'Confirmar Reserva de Exemplar';
        desc=isQueue?'Todos os exemplares desta obra encontram-se atualmente emprestados.':
            'Verifique os dados da obra e as condições de retirada no balcão.';
        submit=isQueue?'Entrar na Fila':'Confirmar Reserva';
        const pos=countQueue(b.id)+1;
        html=`<div class="library-book-summary faithful-book-block">${bookVisual(b)}<div>
          <strong>${safe(b.title)}</strong><p>${safe(b.author)} · ${safe(b.publisher)} · ${b.year}</p>
          <p>${isQueue?'Total de exemplares: '+b.copies+' (disponíveis no momento: 0)':'Exemplar atribuído: TB-00642-1 (Circulação Livre)'}</p>
          <strong class="${isQueue?'red-text':'green-text'}">${isQueue?`● Emprestados até ${brDate(3)}`:'Status: Disponível imediatamente para separação'}</strong>
          </div></div>
          <div class="faithful-rules">${isQueue?`
          <div class="queue-position-box"><strong>Sua posição na fila de espera:</strong><b>${pos}º Lugar</b></div>
          <h3>Condições e Notificação da Fila:</h3><p>• Próxima Devolução Estimada: <strong>${brDate(3)} às 18:00</strong></p>
          <p>• Aviso de Liberação: <strong>Disparo automático via e-mail e portal</strong></p>
          <p>• Tempo de Garantia: <strong class="green-text">24 horas reservado no balcão</strong></p>
          <small>Caso o 1º aluno não retire no prazo, a vez passa automaticamente para você.</small>`:`
          <h3>Informações de Retirada e Prazos:</h3>
          <p>• Local de Retirada: <strong>Balcão da Biblioteca Central (Térreo)</strong></p>
          <p>• Prazo para Retirada: <strong class="orange-text">Até 48 horas após a reserva</strong></p>
          <p>• Prazo de Empréstimo: <strong>${RULES.loanDays} dias corridos a partir da retirada</strong></p>
          <p>• Notificação: <strong>Enviada para mariana.costa@rede.ulbra.br</strong></p>
          <small>Nota: Caso não retire no prazo, a reserva expira e a obra retorna ao acervo geral.</small>`}</div>`;
    }
    else if (kind === 'renew-success') {
        const renewedLoan=db.loans.find(item=>item.id===id);
        const previous=dialogPreviousDue||addDays(renewedLoan.due,-RULES.loanDays);
        cls='faithful-modal modal-renew-success';
        heading='Renovação Confirmada com Sucesso';
        desc='O prazo para devolução foi estendido por mais 7 dias.';
        html=`<div class="faithful-renew-data"><dl>
          <dt>Obra Renovada:</dt><dd>${safe($book(renewedLoan.bookId)?.title)}</dd>
          <dt>Código do Exemplar:</dt><dd>TB-00318 (Ex. 3)</dd>
          <dt>Prazo Anterior:</dt><dd>${formatDate(previous)}</dd>
          <dt>Nova Data Limite:</dt><dd><mark>${formatDate(renewedLoan.due)}</mark></dd>
          <dt>Renovações Utilizadas:</dt><dd>${renewedLoan.renewals} de ${RULES.maxRenewals} permitidas</dd>
          </dl></div><div class="faithful-renew-notes">
          <p>• Você ainda tem direito a ${Math.max(0,RULES.maxRenewals-renewedLoan.renewals)} renovação consecutiva desta obra.</p>
          <p>• A renovação futura depende da ausência de reserva por outros alunos.</p></div>`;
    }
    else if (kind === 'renew') {
        heading = 'Renovação de Empréstimo';
        desc = 'Renovação sujeita às regras da biblioteca.';
        submit = 'Confirmar renovação';
        const book = $book(l.bookId);
        html = `<div class="detail">
            <h3>${safe(book.title)}</h3>
            <dl>
            <dt>Prazo atual</dt>
            <dd>${formatDate(l.due)}</dd>
            <dt>Novo prazo</dt>
            <dd>${formatDate(addDays(l.due, RULES.loanDays))}</dd>
            <dt>Renovações usadas</dt>
            <dd>${l.renewals} de ${RULES.maxRenewals}</dd>
            </dl>
            </div>`;
    }
    else if (kind === 'new-loan') {
        heading = 'Novo Empréstimo / Agendamento de Retirada';
        desc = 'Selecione o leitor acadêmico e confirme os dados para liberação do exemplar.';
        cls = 'faithful-modal modal-new-loan';
        submit = 'Confirmar Empréstimo';
        const chosen = b || db.books.find(book=>available(book)>0);
        const chosenReader = db.users.find(user=>user.role==='aluno');
        html = `<div class="faithful-book-block library-book-summary">
          ${chosen?bookVisual(chosen):''}<div class="faithful-book-info">
          <strong>${safe(chosen?.title||'Selecione uma obra')}</strong>
          <p>Exemplar Alocado: TB-00642-1 · Circulação Livre</p>
          <p><b>Localização: Estante B · Prateleira 4 (Setor de Humanas)</b></p></div>
          <span class="loan-availability">● Disponível</span></div>
          <div class="field"><label for="loan-user">Pesquisar e Selecionar Usuário (Aluno / Docente) *</label>
          <div class="loan-person-line"><select id="loan-user" required>${opts(db.users.filter(item=>item.role==='aluno'),'id',item=>`${item.registration} — ${item.name}`)}</select>
          <button type="button" class="btn btn-green" data-action="lookup-student">Buscar »</button></div></div>
          <div class="faithful-student-info" id="loan-student-info">
          <strong>${safe(chosenReader?.name||'Mariana Costa e Silva')} (Matrícula: ${safe(chosenReader?.registration||'20240182')})</strong>
          <p>Curso: Análise e Desenvolvimento de Sistemas · Vínculo: Graduação Ativa</p>
          <p>E-mail: ${safe(chosenReader?.email||'mariana.costa@rede.ulbra.br')}</p>
          <b>✓ Cadastro Regular. Sem débitos e ${activeLoans(null,chosenReader?.id).length} empréstimos em posse (Limite: ${RULES.maxLoans})</b></div>
          <div class="library-loan-grid"><div><small>Data de Saída (Hoje)</small><strong>${formatDate(dateOffset(0))}</strong></div>
          <div><small>Data Prevista de Devolução *</small><strong class="green-text">${formatDate(dateOffset(RULES.loanDays))} (+${RULES.loanDays} dias)</strong></div>
          <div><small>Tipo de Circulação</small><strong>Empréstimo Domiciliar</strong></div></div>
          <div class="faithful-loan-note"><p>• O acadêmico receberá comprovante digital e aviso de vencimento por e-mail.</p>
          <p>• Prazo sujeito ao limite de renovações automáticas, exceto havendo fila de espera.</p></div>`;
    }
    else if (kind === 'return') {
        heading = 'Registrar devolução de exemplar';
        desc = 'Confirme o estado físico do exemplar e os débitos, se houver.';
        submit = 'Confirmar devolução';
        const book = $book(l.bookId), fee = fineFor(l.due), queue = countQueue(book.id);
        html = `<div class="detail">
            <h3>${safe(book.title)}</h3>
            <dl>
            <dt>Aluno</dt>
            <dd>${safe($user(l.userId).name)}</dd>
            <dt>Data prevista</dt>
            <dd>${formatDate(l.due)}</dd>
            <dt>Dias corridos de atraso</dt>
            <dd>${lateDays(l.due)}</dd>
            <dt>Multa</dt>
            <dd>${money(fee)}</dd>
            <dt>Pessoas na fila</dt>
            <dd>${queue}</dd>
            </dl>
            </div>
            ${fee ? `<div class="banner error">Será registrada multa de ${money(fee)} (${lateDays(l.due)} dia(s) × ${money(RULES.latePerCalendarDay)}).</div>` : ''}
            ${queue ? '<div class="banner">Após a devolução, o exemplar será reservado ao primeiro aluno da fila.</div>' : ''}
            ${fee > 0 ? `<fieldset class="fine-payment"><legend>Pagamento da multa</legend>
                <label><input type="radio" name="fine-payment" value="paid" checked> Quitado agora no balcão</label>
                <label><input type="radio" name="fine-payment" value="pending"> Lançar débito pendente no portal</label>
            </fieldset>` : ''}
            <div class="field">
            <label for="condition">Estado do exemplar</label>
            <select id="condition">
            <option value="Perfeito estado">Em perfeito estado</option>
            <option value="Avariado">Avariado / danificado</option>
            <option value="Extraviado">Extraviado / perdido</option>
            </select>
            </div>`;
    }
    else if (kind === 'new-book' || kind === 'edit-book') {
        heading = kind === 'edit-book' ? 'Editar livro' : 'Cadastrar novo livro';
        desc = 'Preencha os campos bibliográficos do acervo.';
        submit = kind === 'edit-book' ? 'Salvar alterações' : 'Cadastrar livro';
        cls = 'large';
        const x = b || { title: '', author: '', publisher: '', year: new Date().getFullYear(), isbn: '', genre: db.categories[0], copies: 1 };
        html = `<div class="form-grid">
            <div class="field span2">
            <label for="book-title">Título *</label>
            <input id="book-title" required maxlength="120" value="${safe(x.title)}">
            </div>
            <div class="field">
            <label for="book-author">Autor *</label>
            <input id="book-author" required maxlength="100" value="${safe(x.author)}">
            </div>
            <div class="field">
            <label for="book-publisher">Editora *</label>
            <input id="book-publisher" required maxlength="100" value="${safe(x.publisher)}">
            </div>
            <div class="field">
            <label for="book-year">Ano de publicação *</label>
            <input id="book-year" type="number" min="1450" max="2100" required value="${x.year}">
            </div>
            <div class="field">
            <label for="book-isbn">ISBN *</label>
            <input id="book-isbn" required maxlength="25" value="${safe(x.isbn)}">
            </div>
            <div class="field">
            <label for="book-genre">Categoria / gênero *</label>
            <select id="book-genre">${db.categories.map(g => `<option ${g === x.genre ? 'selected' : ''}>${safe(g)}</option>`).join('')}</select>
            </div>
            <div class="field">
            <label for="book-copies">Exemplares físicos *</label>
            <input id="book-copies" type="number" min="1" max="1000" required value="${x.copies}">
            </div>
            </div>`;
    }
    else if (kind === 'new-user' || kind === 'edit-user') {
        heading = kind === 'edit-user' ? 'Editar usuário' : 'Cadastrar novo usuário';
        desc = 'Utilize apenas e-mails institucionais.';
        submit = kind === 'edit-user' ? 'Salvar usuário' : 'Cadastrar usuário';
        const x = u || { name: '', email: '', registration: '', role: 'aluno', fine: 0 };
        html = `<div class="field">
            <label for="user-name">Nome *</label>
            <input id="user-name" required value="${safe(x.name)}">
            </div>
            <div class="field">
            <label for="user-email">E-mail institucional *</label>
            <input id="user-email" type="email" required value="${safe(x.email)}">
            </div>
            <div class="field">
            <label for="user-registration">Matrícula *</label>
            <input id="user-registration" required value="${safe(x.registration)}">
            </div>${role === 'administrador' ? `<div class="field">
            <label for="user-role">Perfil de acesso</label>
            <select id="user-role">${[['aluno', 'Aluno / Leitor'], ['bibliotecario', 'Bibliotecário'], ['administrador', 'Gestor / Administrador']].map(([v, label]) => `<option value="${v}" ${x.role === v ? 'selected' : ''}>${label}</option>`).join('')}</select>
            </div>` : ''}${x.fine > 0 ? `<p>Multa pendente: ${money(x.fine)}.</p>
            <label class="help">
            <input type="checkbox" id="pay-fine"> Registrar quitação da multa</label>` : ''}`;
    }
    else if (kind === 'edit-role') {
        heading = 'Alterar perfil de acesso';
        desc = `Usuário: ${u.name}`;
        submit = 'Salvar perfil';
        html = `<div class="field">
            <label for="change-role">Novo perfil</label>
            <select id="change-role">${['aluno', 'bibliotecario', 'administrador'].map(v => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
            </div>`;
    }
    else if (kind === 'new-category' || kind === 'edit-category') {
        heading = kind === 'edit-category' ? 'Renomear categoria' : 'Nova categoria';
        desc = 'Atualize os gêneros literários disponíveis no catálogo.';
        submit = 'Salvar categoria';
        html = `<div class="field"><label for="category-name">Nome da categoria</label><input id="category-name" required value="${safe(kind === 'edit-category' ? db.categories[Number(id)] : '')}"></div>`;
    }
    else if (kind === 'delete-book') {
        heading = 'Baixar título do inventário';
        desc = 'A remoção só é permitida quando não existirem empréstimos ou reservas ativas.';
        submit = 'Confirmar baixa';
        html = `<div class="banner error">Deseja retirar <strong>${safe(b.title)}</strong> do catálogo?</div>`;
    }
    else if (kind === 'delete-category') {
        heading = 'Excluir categoria';
        desc = 'A categoria só poderá ser excluída se não tiver obras vinculadas.';
        submit = 'Excluir categoria';
        html = `<p>Categoria: <strong>${safe(db.categories[Number(id)])}</strong>.</p>`;
    }
    else if (kind === 'cancel-res') {
        heading = 'Cancelar reserva';
        desc = 'A reserva será retirada da lista de espera ou da fila de retirada.';
        submit = 'Confirmar cancelamento';
        html = `<p>Obra: <strong>${safe($book(r.bookId).title)}</strong></p>`;
    }
    else if (kind === 'pickup') {
        heading = 'Confirmar retirada';
        desc = 'Converta a reserva em empréstimo para o leitor.';
        submit = 'Confirmar retirada';
        html = `<div class="detail"><p><strong>${safe($book(r.bookId).title)}</strong></p><p>Solicitante: ${safe($user(r.userId).name)}</p><p>Vencimento do empréstimo: ${formatDate(dateOffset(RULES.loanDays))}</p></div>`;
    }
    else if (kind === 'record-return') {
        cls='faithful-modal modal-return'; heading='Registrar Devolução de Exemplar';
        desc='Confirme o retorno da obra ao acervo, vistorie o estado de conservação e liquide eventuais multas.';
        submit='Confirmar Devolução';
        const rs=returnSample(id), fee=rs.late*RULES.latePerCalendarDay;
        html=`<div class="faithful-book-block library-book-summary">${bookVisual(rs.cover || db.books[rs.book])}<div>
          <strong>${safe(rs.title)}</strong><p>Tombo: ${safe(rs.tombo)} · ${safe(rs.shelf)}</p>
          <p>Leitor: ${safe(rs.reader)} (Matrícula: ${safe(rs.reg)})</p></div></div>
          ${rs.late ? `<div class="faithful-overdue"><strong>Atenção: Devolução com Prazo Expirado (Atraso Detectado)</strong>
          <p>Data Prevista de Entrega: <b>${brDate(rs.due)}</b></p><p>Data Efetiva da Devolução: <b>${brDate(0)} (${rs.late} dias corridos de atraso)</b></p>
          <p>Valor Total da Multa Calculada: <b>${money(fee)} (${money(RULES.latePerCalendarDay)} / dia corrido)</b></p>
          <fieldset class="fine-payment"><legend>Pagamento da multa</legend>
             <label><input type="radio" name="fine-payment" value="paid" checked> Quitado agora no balcão</label>
             <label><input type="radio" name="fine-payment" value="pending"> Lançar débito pendente no portal</label>
          </fieldset></div>` : `<div class="banner ok"><strong>Devolução dentro do prazo</strong>
          <p style="font-size:0.85rem;margin:0.35rem 0 0">Data Prevista de Entrega: <b>${brDate(rs.due)}</b> · Data Efetiva da Devolução: <b>${brDate(0)}</b>. Nenhuma multa será gerada.</p></div>`}
          <label class="faithful-label">Vistoria e Estado Físico do Exemplar *</label>
          <div class="faithful-condition"><label><input type="radio" name="return-condition" value="Perfeito estado" checked> ✓ Em Perfeito Estado</label>
          <label><input type="radio" name="return-condition" value="Avariado"> Avariado / Danificado</label>
          <label><input type="radio" name="return-condition" value="Extraviado"> Extraviado / Perda</label></div>
          <div class="faithful-rules"><strong class="orange-text">A Próxima Ação do Sistema para este Exemplar:</strong>
          <p>${rs.queue ? 'Há leitores na fila de espera desta obra. Ao confirmar a devolução, o exemplar ficará reservado para o primeiro da fila, que será notificado.' : 'Não há fila de espera para esta obra. Ao confirmar a devolução, o exemplar volta para a estante de origem.'}</p></div>
`;
    }
    else if (kind === 'confirm-pickup') {
        cls='faithful-modal modal-new-loan modal-pickup';
        const record=exampleRecord(id) || sampleReservations[0];
        heading='Confirmar Retirada de Exemplar';
        desc='Confira a reserva, o exemplar separado e os dados do leitor antes de liberar a retirada.';
        submit='Confirmar Retirada';
        html=`<div class="faithful-book-block library-book-summary">
          ${bookVisual(db.books.find(item=>item.title===record.book) || db.books[0])}
          <div class="faithful-book-info"><strong>${safe(record.book)}</strong>
          <p>Exemplar reservado: ${safe(record.copy)}</p>
          <p><b>Local de retirada: Balcão da Biblioteca Acadêmica</b></p></div>
          <span class="loan-availability">● Pronta para retirada</span></div>
          <div class="faithful-student-info"><strong>${safe(record.user)} (Matrícula: ${safe(record.registration)})</strong>
          <p>Reserva realizada em: ${safe(record.reserved)}</p>
          <p>Prazo para retirada: ${safe(record.until)}</p>
          <b>✓ Reserva confirmada e exemplar separado para o leitor</b></div>
          <div class="library-loan-grid"><div><small>Data de retirada</small><strong>${SAMPLE_DATE}</strong></div>
          <div><small>Devolução prevista</small><strong class="green-text">${brDate(7)} (+7 dias)</strong></div>
          <div><small>Tipo de circulação</small><strong>Empréstimo Domiciliar</strong></div></div>
          <div class="faithful-loan-note"><p>• A retirada transformará a reserva em empréstimo ativo.</p>
          <p>• O prazo de devolução será de ${RULES.loanDays} dias corridos.</p></div>`;
    }
    else if (kind === 'waiting-list') {
        cls='faithful-modal modal-queue-list';
        heading='Fila de Espera';
        desc='Leitores que aguardam a disponibilidade desta obra, em ordem de solicitação.';
        const selected=exampleRecord(id) || sampleReservations[3];
        const queueItems=exampleQueue(selected.book);
        html=`<div class="faithful-book-block library-book-summary">
           ${bookVisual(db.books.find(item=>item.title===selected.book) || db.books[4])}
           <div><strong>${safe(selected.book)}</strong><p>${queueItems.length} pessoa(s) aguardando</p></div></div>
           <div class="table-scroll"><table class="data-table"><thead><tr><th>Posição</th><th>Aluno / matrícula</th><th>Solicitação</th><th>Situação</th></tr></thead><tbody>
           ${queueItems.length ? queueItems.map((item,index)=>`<tr><td><strong>${index+1}º lugar</strong></td>
           <td>${safe(item.user)}<small>${safe(item.registration)}</small></td><td>${safe(item.reserved)}</td>
           <td>${status('● Em espera','info')}</td></tr>`).join('') : '<tr><td colspan="4">Nenhum aluno aguardando.</td></tr>'}
           </tbody></table></div>`;
    }
    else if (kind === 'staff-reserve') {
        cls='faithful-modal'; heading='Nova Reserva';
        desc='Selecione a obra e o leitor para registrar a reserva.';
        submit='Registrar Reserva';
        html=`<div class="field"><label for="staff-res-book">Livro disponível</label><select id="staff-res-book" required>${opts(db.books.filter(x=>available(x)>0),'id',x=>x.title,id || '')}</select></div>
          <div class="field"><label for="staff-res-user">Leitor</label><select id="staff-res-user" required>${opts(db.users.filter(x=>x.role==='aluno'),'id',x=>x.name)}</select></div>`;
    }
    // Operações patrimoniais próprias, conforme a ficha de correções.
    else if (kind === 'inventory-options') {
        const work = (db.academicWorks || []).find(w => w.id === id);
        const record = $book(id) || work;
        heading = 'Opções do patrimônio';
        desc = 'Escolha o procedimento que deseja realizar.';
        html = `<div class="detail"><strong>${safe(record?.title || 'Registro do inventário')}</strong>
           <p>${safe(record?.author || 'Patrimônio cadastrado')}</p></div>
           <div class="inventory-choice-buttons">
              <button class="btn btn-green" type="button" data-action="inventory-edit" data-id="${safe(id)}">Alterar dados</button>
              <button class="btn btn-danger" type="button" data-action="inventory-delete" data-id="${safe(id)}">Baixa patrimonial</button>
           </div>`;
    }
    else if (kind === 'new-academic' || kind === 'edit-academic') {
        const work = (db.academicWorks || []).find(w => w.id === id);
        heading = kind === 'edit-academic' ? 'Alterar dados do TCC / Artigo' : 'Cadastrar TCC / Artigo';
        desc = 'Registro de trabalhos acadêmicos para consulta no acervo.';
        submit = 'Salvar trabalho acadêmico';
        html = `<div class="field"><label for="academic-title">Título do trabalho *</label><input id="academic-title" required maxlength="150" value="${safe(work?.title || '')}"></div>
           <div class="field"><label for="academic-author">Autor *</label><input id="academic-author" required value="${safe(work?.author || '')}"></div>
           <div class="field"><label for="academic-advisor">Orientador *</label><input id="academic-advisor" required value="${safe(work?.advisor || '')}"></div>
           <div class="form-grid"><div class="field"><label for="academic-type">Tipo</label><select id="academic-type"><option>TCC</option><option>Artigo</option><option>Monografia</option></select></div>
           <div class="field"><label for="academic-year">Ano</label><input id="academic-year" type="number" min="1950" max="2100" value="${safe(work?.year || new Date().getFullYear())}"></div></div>
           <div class="field"><label for="academic-location">Localização física</label><input id="academic-location" value="${safe(work?.location || 'Arquivo Acadêmico · Gaveta B')}"></div>`;
    }
    else if (kind === 'inventory-low' || kind === 'inventory-delete') {
        heading = 'Dar baixa patrimonial';
        desc = 'Registre o motivo da retirada do acervo. A movimentação ficará registrada no inventário.';
        submit = 'Confirmar baixa';
        html = `<div class="field"><label for="low-book">Obra / Registro patrimonial</label>
          <select id="low-book" required>${opts(db.books,'id', x => x.title, id || '')}</select></div>
          <div class="field"><label for="low-reason">Motivo</label><select id="low-reason"><option>Extravio</option><option>Descarte</option><option>Dano irreversível</option></select></div>
          <div class="field"><label for="low-notes">Observações</label><textarea id="low-notes" placeholder="Descreva a justificativa da baixa"></textarea></div>
          <div class="banner error">A baixa só poderá ser concluída quando não houver empréstimos ou reservas ativos.</div>`;
    }
    else if (kind === 'inventory-audit') {
        heading = 'Restauração e Auditoria';
        desc = 'Registre a conferência ou encaminhamento para restauração.';
        submit = 'Registrar movimentação';
        html = `<div class="field"><label for="audit-book">Obra</label><select id="audit-book" required>${opts(db.books,'id',x=>x.title)}</select></div>
           <div class="field"><label for="audit-type">Tipo de procedimento</label><select id="audit-type"><option value="conferencia">Conferência física / Auditoria</option><option value="restauracao">Enviar exemplar para restauração</option><option value="conclusao">Concluir restauração</option></select></div>
           <div class="field"><label for="audit-notes">Anotações</label><textarea id="audit-notes" placeholder="Estado do exemplar, prateleira e outras observações"></textarea></div>`;
    }
    $('#modal-root').innerHTML = `<div class="modal-backdrop" id="dialog-backdrop">
            <section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
            <h2 id="modal-heading">${heading}</h2>
            <p class="modal-sub">${desc}</p>
            <form id="modal-form">${html}<div class="modal-actions">
            <button type="button" class="btn ${kind === 'renew-success' ? 'btn-primary faithful-close' : 'btn-outline'}" data-action="close-modal">${kind === 'book-detail' ? 'Voltar' : kind === 'renew-success' ? 'Entendido / Fechar' : kind === 'waiting-list' ? 'Fechar' : 'Cancelar'}</button>${!['book-detail','renew-success','inventory-options','waiting-list'].includes(kind) ? `<button type="submit" class="btn btn-primary">${submit}</button>` : ''}</div>
            </form>
            </section>
            </div>`;
    const first = $('#modal-root input, #modal-root select, #modal-root button');
    if (first)
        first.focus();
}
function closeModal() {
    dialog = null; $('#modal-root').innerHTML = ''; if (lastFocus?.isConnected)
        lastFocus.focus();
}
function notify(msg, error = false) { banner = (error ? 'Erro: ' : '') + msg; render(); document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' }); }
// 6. AÇÕES: navegação, abertura de formulários e relatórios.
function action(action, id = '', target = null) {
    banner = '';
    if (action === 'go') {
        page = target?.dataset.page || 'dashboard';
        query = '';
        genreFilter = '';
        statusFilter = '';
        sortFilter = 'titulo';
        closeModal();
        render();
        return;
    }
    if (action === 'renew') {
        performRenewal(id);
        return;
    }
    if (action === 'book-detail' && role !== 'aluno') {
        selectedBookId = id;
        page = 'ficha';
        closeModal();
        render();
        return;
    }
    if (action === 'lookup-student') {
        document.querySelector('#loan-user')?.dispatchEvent(new Event('change',{bubbles:true}));
        return;
    }
    if (action === 'record-return') { openDialog('record-return', id); return; }
    if (action === 'confirm-pickup') { const rid=exampleRecord(id) ? id : '0'; if (exampleOperations().pickups[rid]) { notify('Esta retirada já foi confirmada.'); return; } openDialog('confirm-pickup', rid); return; }
    if (action === 'waiting-list') { openDialog('waiting-list', id); return; }
    if (action === 'staff-reserve' || action === 'staff-new-reserve') { openDialog('staff-reserve', id); return; }
    if (action === 'inventory-options') {
        openDialog('inventory-options', id);
        return;
    }
    if (action === 'inventory-audit') { openDialog('inventory-audit'); return; }
    if (action === 'inventory-low') { openDialog('inventory-low'); return; }
    if (action === 'new-academic') { openDialog('new-academic'); return; }
    if (action === 'inventory-edit') {
        if ($book(id)) openDialog('edit-book', id);
        else if ((db.academicWorks || []).some(item => item.id === id)) openDialog('edit-academic', id);
        else notify('Este patrimônio não está disponível para edição.',true);
        return;
    }
    if (action === 'inventory-delete') {
        if ($book(id)) openDialog('inventory-delete', id);
        else notify('Este patrimônio não está disponível para baixa.',true);
        return;
    }
    if (action === 'new-user') { notify('O cadastro de usuários ocorre pelo acesso institucional.', true); return; }
    if (action === 'user-page') {
        userPage = Math.max(1, Number(target?.dataset.page || 1));
        render();
        return;
    }
    if (action === 'logout') {
        closeModal();
        role = null;
        render();
        return;
    }
    if (action === 'restore-book') {
        const b = $book(id);
        if (b?.outOfService > 0) {
            b.outOfService--;
            save();
            notify('Exemplar retornou da restauração.');
        }
        return;
    }
    if (action === 'reset') {
        if (confirm('Restaurar os registros originais do sistema?')) {
            db = seed();
            save();
            notify('Dados restaurados.');
        }
        return;
    }
    const modalActions = ['book-detail', 'reserve', 'queue', 'renew', 'new-loan', 'return', 'new-book', 'edit-book', 'edit-user', 'edit-role', 'new-category', 'edit-category', 'delete-book', 'delete-category', 'cancel-res', 'pickup'];
    if (modalActions.includes(action)) {
        openDialog(action, id);
        return;
    }
    if (action === 'close-modal') {
        closeModal();
        return;
    }
    if (action === 'export-report') {
        const headers = [
            'Titulo', 'Autor', 'ISBN', 'Categoria',
            'Exemplares', 'Disponiveis', 'Emprestimos ativos', 'Fila'
        ];
        const rows = [
            headers,
            ...db.books.map(book => [
                book.title, book.author, book.isbn, book.genre,
                book.copies, available(book), activeLoans(book.id).length, countQueue(book.id)
            ])
        ];
        const csv = '\uFEFF' + rows.map(row => row.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'relatorio_biblioteca.csv';
        link.click();
        URL.revokeObjectURL(url);
        notify('Relatório CSV exportado.');
        return;
    }
}
// Renovação direta com comprovante da operação.
function performRenewal(id) {
    const loan=db.loans.find(item=>item.id===id);
    if(!loan || loan.status!=='ativo') return alert('Empréstimo não encontrado.');
    if(loan.renewals>=RULES.maxRenewals) return alert('Limite de duas renovações atingido.');
    if(lateDays(loan.due)>0) return alert('Não é possível renovar empréstimo em atraso.');
    if(db.reservations.some(r=>r.bookId===loan.bookId && r.userId!==loan.userId && ['fila','pronta'].includes(r.status)))
        return alert('Não é possível renovar: há reserva ativa para a obra.');
    dialogPreviousDue=loan.due;
    loan.due=addDays(loan.due,RULES.loanDays);
    loan.renewals++;
    pushNotice(loan.userId,`Renovação confirmada: ${$book(loan.bookId).title}. Novo prazo: ${formatDate(loan.due)}.`);
    save(); render(); openDialog('renew-success',id);
}

// 7. REGRAS DAS OPERAÇÕES: empréstimos, renovações e devoluções.
function submitDialog(e) {
    e.preventDefault();
    const { kind, id } = dialog, val = selector => $(selector)?.value?.trim() || '';
    const failure = msg => { alert(msg); return false; };
    if (kind === 'waiting-list') { closeModal(); return; }
    if (kind === 'confirm-pickup') {
        const record=exampleRecord(id);
        if (!record) return failure('Reserva não encontrada.');
        if (exampleOperations().pickups[id]) return failure('Esta retirada já foi confirmada.');
        exampleOperations().pickups[id] = { date: SAMPLE_DATE, due:brDate(7), user:record.user, book:record.book };
        save(); closeModal(); notify(`Retirada confirmada: ${record.book}, para ${record.user}. Devolução em ${brDate(7)}.`);
        return;
    }
    if (kind === 'record-return') {
        if (exampleOperations().returns[id || 'exemplo']) return failure('Esta devolução já foi registrada.');
        const payment=document.querySelector('input[name="fine-payment"]:checked')?.value || 'pending';
        const condition=document.querySelector('input[name="return-condition"]:checked')?.value || 'Perfeito estado';
        const rs=returnSample(id), fee=rs.late*RULES.latePerCalendarDay;
        exampleOperations().returns[id || 'exemplo']={ date:SAMPLE_DATE, amount:fee, payment, condition };
        db.movements ||= [];
        db.movements.push({id:nextId('mov'),type:'devolucao',bookId:db.books[rs.book]?.id,date:dateOffset(0),fine:fee,payment,condition});
        if (fee > 0 && payment === 'pending') {
            // Registra a pendência no leitor correspondente à devolução.
            db.exampleFines ||= [];
            db.exampleFines.push({user:rs.reader,registration:rs.reg.split(' ')[0],amount:fee,date:SAMPLE_DATE,status:'pendente'});
        }
        save(); closeModal(); notify(fee > 0 ? `Devolução confirmada. Multa de ${money(fee)} ${payment==='paid'?'quitada no balcão':'lançada como pendente'}.` : `Devolução de ${rs.title} confirmada, sem multa.`);
        return;
    }
    if (kind==='staff-reserve') {
        const bookId=val('#staff-res-book'),userId=val('#staff-res-user');
        const book=$book(bookId);
        if(!book||!$user(userId)||available(book)<1) return failure('Selecione obra e leitor válidos.');
        if(db.reservations.some(r=>r.bookId===bookId&&r.userId===userId&&['fila','pronta'].includes(r.status)))
            return failure('Já existe reserva ativa deste leitor para esta obra.');
        db.reservations.push({id:nextId('r'),bookId,userId,created:dateOffset(0),status:'pronta'});
        pushNotice(userId,`Reserva confirmada: ${book.title}.`);
        closeModal(); save(); notify('Reserva registrada na simulação.');return;
    }
    if (kind === 'new-academic' || kind === 'edit-academic') {
        const title = val('#academic-title');
        const author = val('#academic-author');
        const advisor = val('#academic-advisor');
        if (!title || !author || !advisor) return failure('Preencha título, autor e orientador.');
        db.academicWorks ||= [];
        const data = {title,author,advisor,year:Number(val('#academic-year')),type:val('#academic-type'),location:val('#academic-location')};
        if (kind === 'edit-academic') Object.assign(db.academicWorks.find(item => item.id === id),data);
        else db.academicWorks.push({id:nextId('tcc'),...data});
        page = 'inventario'; closeModal(); save(); notify('Trabalho acadêmico salvo no inventário.'); return;
    }
    if (kind === 'inventory-low' || kind === 'inventory-delete') {
        const book = $book(val('#low-book'));
        if (!book) return failure('Selecione uma obra válida.');
        if (activeLoans(book.id).length || db.reservations.some(r => r.bookId === book.id && ['fila','pronta'].includes(r.status)))
            return failure('Baixa bloqueada: existem empréstimos ou reservas ativos.');
        db.movements ||= [];
        db.movements.push({id:nextId('m'),bookId:book.id,reason:val('#low-reason'),notes:val('#low-notes'),date:dateOffset(0),type:'baixa'});
        db.books = db.books.filter(item => item.id !== book.id);
        page='inventario';closeModal();save();notify('Baixa patrimonial registrada.');return;
    }
    if (kind === 'inventory-audit') {
        const book=$book(val('#audit-book'));
        if(!book) return failure('Selecione uma obra.');
        const kindOfAudit=val('#audit-type');
        if(kindOfAudit==='restauracao') {
            if (available(book)<1) return failure('Sem exemplar disponível para restauração.');
            book.outOfService=(book.outOfService||0)+1;
        }
        if(kindOfAudit==='conclusao') {
            if(!(book.outOfService>0)) return failure('Nenhum exemplar em restauração.');
            book.outOfService--;
        }
        db.movements ||= [];
        db.movements.push({id:nextId('a'),bookId:book.id,type:kindOfAudit,notes:val('#audit-notes'),date:dateOffset(0)});
        page='inventario';closeModal();save();notify('Movimentação patrimonial registrada.');return;
    }
    if (kind === 'reserve' || kind === 'queue') {
        const b = $book(id), existing = db.reservations.some(r => r.bookId === id && r.userId === currentUser && r.status !== 'cancelada');
        if (existing)
            return failure('Você já tem reserva ou posição ativa na fila para essa obra.');
        if (kind === 'reserve' && available(b) === 0)
            return failure('Não há exemplares disponíveis. Use a fila de espera.');
        db.reservations.push({ id: nextId('r'), bookId: id, userId: currentUser, created: dateOffset(0), status: kind === 'reserve' ? 'pronta' : 'fila' });
        pushNotice(currentUser, `${kind === 'reserve' ? 'Reserva confirmada' : 'Entrada na fila confirmada'}: ${b.title}.`);
        page = 'reservas';
        closeModal();
        save();
        notify(kind === 'reserve' ? 'Reserva confirmada. Você tem 48 horas para retirada no balcão.' : 'Você entrou na fila de espera.');
        return;
    }
    if (kind === 'renew') {
        const l = db.loans.find(x => x.id === id);
        if (l.renewals >= RULES.maxRenewals)
            return failure('Limite de renovações atingido.');
        if (lateDays(l.due) > 0)
            return failure('Empréstimo em atraso: regularize a situação antes de renovar.');
        if (db.reservations.some(r => r.bookId === l.bookId && r.userId !== l.userId && ['fila', 'pronta'].includes(r.status)))
            return failure('Não é possível renovar: existe reserva ou fila ativa para esta obra.');
        l.due = addDays(l.due, RULES.loanDays);
        l.renewals++;
        pushNotice(l.userId, `Renovação confirmada: ${$book(l.bookId).title}. Novo prazo: ${formatDate(l.due)}.`);
        closeModal();
        save();
        render();
        openDialog('renew-success', id);
        return;
    }
    if (kind === 'new-loan' || kind === 'pickup') {
        if (kind === 'pickup' && !db.reservations.some(r => r.id === id && r.status === 'pronta')) {
            return failure('Esta reserva não está pronta para retirada.');
        }
        const bookId = kind === 'pickup' ? db.reservations.find(r => r.id === id).bookId : (id || db.books.find(book => available(book) > 0)?.id);
        const userId = kind === 'pickup' ? db.reservations.find(r => r.id === id).userId : val('#loan-user');
        const u = $user(userId), b = $book(bookId);
        if (!u || !b)
            return failure('Selecione aluno e obra válidos.');
        if ((kind === 'pickup' ? b.copies - activeLoans(b.id).length - (b.outOfService || 0) : available(b)) < 1)
            return failure('Não há exemplares disponíveis.');
        if (activeLoans(null, userId).length >= RULES.maxLoans)
            return failure(`O aluno atingiu o limite de ${RULES.maxLoans} empréstimos ativos.`);
        if (u.fine > 0)
            return failure('Empréstimo bloqueado: há multa financeira pendente.');
        if (activeLoans(bookId, userId).length > 0)
            return failure('Este aluno já possui um exemplar dessa obra emprestado.');
        if (kind === 'new-loan' && db.reservations.some(r => r.bookId === bookId && r.userId !== userId && ['fila', 'pronta'].includes(r.status)))
            return failure('Este exemplar está reservado para outro leitor na fila.');
        db.loans.push({ id: nextId('l'), bookId, userId, start: dateOffset(0), due: dateOffset(RULES.loanDays), renewals: 0, status: 'ativo' });
        if (kind === 'pickup')
            db.reservations.find(r => r.id === id).status = 'retirada';
        pushNotice(userId, `Empréstimo confirmado: ${b.title}. Devolução até ${formatDate(dateOffset(RULES.loanDays))}.`);
        page = 'emprestimos';
        closeModal();
        save();
        notify('Empréstimo registrado. Data de devolução: ' + formatDate(dateOffset(RULES.loanDays)) + '.');
        return;
    }
    if (kind === 'return') {
        const l = db.loans.find(x => x.id === id), u = $user(l.userId), b = $book(l.bookId), fee = fineFor(l.due);
        l.status = 'devolvido';
        l.returned = dateOffset(0);
        l.condition = val('#condition');
        const finePayment = document.querySelector('input[name="fine-payment"]:checked')?.value || 'pending';
        l.fine = fee;
        l.fineStatus = fee === 0 ? 'sem multa' : finePayment === 'paid' ? 'quitada' : 'pendente';
        if (fee > 0 && finePayment === 'pending') u.fine += fee;
        if (l.condition === 'Extraviado')
            b.copies = Math.max(0, b.copies - 1);
        else if (l.condition === 'Avariado')
            b.outOfService = (b.outOfService || 0) + 1;
        const next = available(b) > 0 ? db.reservations.find(r => r.bookId === b.id && r.status === 'fila') : null;
        if (next) {
            next.status = 'pronta';
            pushNotice(next.userId, `O livro ${b.title} está disponível. Retire no balcão em até 48 horas.`);
        }
        pushNotice(l.userId, `Devolução registrada: ${b.title}.${fee ? ' Multa: ' + money(fee) + ' (' + l.fineStatus + ').' : ''}`);
        closeModal();
        save();
        notify(`Devolução confirmada.${fee ? ' Multa ' + l.fineStatus + ': ' + money(fee) + '.' : ''}${next ? ' Próximo leitor da fila notificado.' : ''}`);
        return;
    }
    if (kind === 'new-book' || kind === 'edit-book') {
        const title = val('#book-title'), author = val('#book-author'), publisher = val('#book-publisher'), isbn = val('#book-isbn'), year = Number(val('#book-year')), copies = Number(val('#book-copies'));
        if (!title || !author || !publisher || !isbn || !Number.isInteger(year) || year < 1450 || !Number.isInteger(copies) || copies < 1)
            return failure('Preencha os campos obrigatórios corretamente.');
        const inUse = kind === 'edit-book' ? activeLoans(id).length : 0;
        const held = kind === 'edit-book' ? db.reservations.filter(r => r.bookId === id && r.status === 'pronta').length : 0;
        const repair = kind === 'edit-book' ? ($book(id).outOfService || 0) : 0;
        if (copies < inUse + held + repair)
            return failure(`Há ${inUse} empréstimo(s), ${held} reserva(s) pronta(s) e ${repair} exemplar(es) em restauração. O total cadastrado não pode ser menor.`);
        if (db.books.some(b => b.isbn === isbn && b.id !== id))
            return failure('Já há outra obra cadastrada com esse ISBN.');
        const data = { title, author, publisher, isbn, year, copies, genre: val('#book-genre') };
        if (kind === 'edit-book')
            Object.assign($book(id), data);
        else
            db.books.push({ id: nextId('b'), ...data, color: '#145264' });
        page = 'inventario';
        closeModal();
        save();
        notify('Cadastro do livro salvo com sucesso.');
        return;
    }
    if (kind === 'new-user' || kind === 'edit-user') {
        const name = val('#user-name'), email = val('#user-email').toLowerCase(), registration = val('#user-registration');
        if (!name || !registration || !/^\S+@(rede\.)?ulbra\.br$/.test(email))
            return failure('Informe nome, matrícula e e-mail institucional (@ulbra.br ou @rede.ulbra.br).');
        if (db.users.some(u => u.email === email && u.id !== id))
            return failure('E-mail já cadastrado.');
        const requestedRole = role === 'administrador' ? (val('#user-role') || 'aluno') : (kind === 'edit-user' ? $user(id).role : 'aluno');
        if (kind === 'edit-user') {
            Object.assign($user(id), { name, email, registration, role: requestedRole });
            if ($('#pay-fine')?.checked)
                $user(id).fine = 0;
        }
        else
            db.users.push({ id: nextId('u'), name, email, registration, role: requestedRole, fine: 0 });
        page = 'usuarios';
        closeModal();
        save();
        notify('Cadastro do usuário salvo.');
        return;
    }
    if (kind === 'edit-role') {
        const user = $user(id);
        user.role = val('#change-role');
        if (user.id === currentUser && role !== user.role) {
            role = user.role;
        }
        closeModal();
        save();
        notify('Perfil de acesso atualizado.');
        return;
    }
    if (kind === 'new-category' || kind === 'edit-category') {
        const name = val('#category-name');
        if (!name)
            return failure('Digite o nome da categoria.');
        const old = kind === 'edit-category' ? db.categories[Number(id)] : null;
        if (db.categories.some(x => x.toLowerCase() === name.toLowerCase() && x !== old))
            return failure('Categoria já cadastrada.');
        if (old) {
            db.categories[Number(id)] = name;
            db.books.filter(b => b.genre === old).forEach(b => b.genre = name);
        }
        else
            db.categories.push(name);
        closeModal();
        save();
        notify('Categoria salva com sucesso.');
        return;
    }
    if (kind === 'delete-book') {
        if (activeLoans(id).length || db.reservations.some(r => r.bookId === id && ['fila', 'pronta'].includes(r.status)))
            return failure('Há empréstimos ou reservas ativos. A baixa patrimonial está bloqueada.');
        db.books = db.books.filter(b => b.id !== id);
        closeModal();
        save();
        notify('Obra retirada do inventário.');
        return;
    }
    if (kind === 'delete-category') {
        const name = db.categories[Number(id)];
        if (db.books.some(b => b.genre === name))
            return failure('Há livros vinculados. Reclassifique-os antes de excluir a categoria.');
        db.categories.splice(Number(id), 1);
        closeModal();
        save();
        notify('Categoria excluída.');
        return;
    }
    if (kind === 'cancel-res') {
        const r = db.reservations.find(r => r.id === id);
        const wasReady = r.status === 'pronta';
        r.status = 'cancelada';
        const book = $book(r.bookId);
        pushNotice(r.userId, `Reserva cancelada: ${book.title}.`);

        // Ao liberar um exemplar separado, chamamos o próximo leitor da fila.
        if (wasReady && available(book) > 0) {
            const next = db.reservations.find(item => item.bookId === book.id && item.status === 'fila');
            if (next) {
                next.status = 'pronta';
                pushNotice(next.userId, `O livro ${book.title} está disponível para retirada em até 48 horas.`);
            }
        }
        closeModal();
        save();
        notify('Reserva cancelada.');
        return;
    }
}
// 8. EVENTOS: conectam os botões e formulários às funções.
document.addEventListener('click', e => {
    // Fecha o menu do usuário quando o clique acontece fora dele.
    const openedAccountMenu = document.querySelector('.account-menu[open]');
    if (openedAccountMenu && !openedAccountMenu.contains(e.target)) {
        openedAccountMenu.open = false;
    }
    const el = e.target.closest('[data-action]'); if (el) {
        e.preventDefault();
        action(el.dataset.action, el.dataset.id || '', el);
    }
    else if (e.target.id === 'dialog-backdrop')
        closeModal();
});
document.addEventListener('submit', e => {
    if (e.target.id === 'login-form') {
        e.preventDefault();
        const input = $('#login-email').value.trim().toLowerCase();
        if (!/^\S+@(rede\.)?ulbra\.br$/.test(input)) {
            alert('Informe e-mail institucional @rede.ulbra.br ou @ulbra.br.');
            return;
        }
        role = $('#login-role').value;
        currentUser = role === 'aluno' ? 'u1' : role === 'bibliotecario' ? 'u4' : 'u5';
        page = 'dashboard';
        render();
        return;
    }
    if (e.target.id === 'modal-form')
        submitDialog(e);
});
document.addEventListener('change', e => {
    if (e.target.id === 'loan-user') {
        const user=$user(e.target.value);
        const box=document.querySelector('#loan-student-info');
        if(box&&user){
            const count=activeLoans(null,user.id).length;
            box.innerHTML=`<strong>${safe(user.name)} (Matrícula: ${safe(user.registration)})</strong>
              <p>Vínculo: ${user.role==='aluno'?'Graduação Ativa':'Biblioteca'}</p>
              <p>E-mail: ${safe(user.email)}</p>
              <b>${user.fine?'⚠ Pendência financeira: '+money(user.fine):'✓ Cadastro Regular. Sem débitos'} · ${count} empréstimos em posse (Limite: ${RULES.maxLoans})</b>`;
        }
    }

    if (e.target.id === 'login-role') {
        const examples = { aluno: 'mariana.costa@rede.ulbra.br', bibliotecario: 'fernanda.borges@ulbra.br', administrador: 'patricia.souza@ulbra.br' };
        $('#login-email').value = examples[e.target.value];
    }     if (e.target.id === 'filter-users-status') {
        userStatusFilter = e.target.value;
        userPage = 1;
        render();
    }
    if (e.target.id === 'filter-genre') {
        genreFilter = e.target.value;
        render();
    } if (e.target.id === 'filter-status') {
        statusFilter = e.target.value;
        render();
    } if (e.target.id === 'sort-books') {
        sortFilter = e.target.value;
        render();
    }
});
document.addEventListener('input', e => {
    if (e.target.id === 'search-users') {
        const position = e.target.selectionStart;
        userSearch = e.target.value;
        userPage = 1;
        render();
        const input = document.querySelector('#search-users');
        if (input) {
            input.focus();
            input.setSelectionRange(position, position);
        }
        return;
    }
    if (e.target.id === 'search-books') {
        const pos = e.target.selectionStart;
        query = e.target.value;
        render();
        const s = $('#search-books');
        s.focus();
        s.setSelectionRange(pos, pos);
    }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const openedAccountMenu = document.querySelector('.account-menu[open]');
        if (openedAccountMenu) {
            openedAccountMenu.open = false;
            openedAccountMenu.querySelector('summary')?.focus();
        }
    }
    if (e.key === 'Escape' && dialog)
        closeModal(); if (e.key === 'Tab' && dialog) {
            const els = [...$('#modal-root').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
            if (els.length) {
                const a = els[0], z = els[els.length - 1];
                if (e.shiftKey && document.activeElement === a) {
                    e.preventDefault();
                    z.focus();
                }
                else if (!e.shiftKey && document.activeElement === z) {
                    e.preventDefault();
                    a.focus();
                }
            }
        }
});
render();
