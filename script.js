let products = [];
let cart = {};
let activeCategory = 'Todos';
let isDevMode = false;
let heroIndex = 0;
let heroTimer;

async function init() {
    try {
        const res = await fetch('products.json');
        products = await res.json();
    } catch {
        products = [
            { id: 1, name: 'Hub Smart Gateway', price: 8999, category: 'Hogar' },
            { id: 2, name: 'Bombilla WiFi RGB', price: 2499, category: 'Hogar' },
        ];
    }
    renderFilters();
    renderMegaMenu();
    renderProducts(document.getElementById('searchInput').value);
    initHero();
}

function formatPrice(price) {
    return '&#8353;' + Number(price).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOriginalPrice(p) {
    return Math.round((p.priceCRC || p.price) / 1.3 * 100) / 100;
}

function getDiscountPercent(p) {
    const orig = getOriginalPrice(p);
    const markup = p.priceCRC || p.price;
    return Math.round((1 - orig / markup) * 100);
}

function getRandomRating() {
    const stars = (3.5 + Math.random() * 1.5).toFixed(1);
    const reviews = Math.floor(Math.random() * 500) + 10;
    return { stars: parseFloat(stars), reviews };
}

function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let s = '';
    for (let i = 0; i < full; i++) s += '★';
    if (half) s += '☆';
    const empty = 5 - full - (half ? 1 : 0);
    for (let i = 0; i < empty; i++) s += '☆';
    return s;
}

function renderFilters() {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    const container = document.getElementById('categoryFilters');
    container.innerHTML = '<button class="filter-btn active" data-cat="Todos">Todos (' + products.length + ')</button>' +
        cats.map(c => {
            const count = products.filter(p => p.category === c).length;
            return '<button class="filter-btn" data-cat="' + c + '">' + c + ' (' + count + ')</button>';
        }).join('');
    container.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.cat;
        document.getElementById('sectionTitle').textContent = activeCategory === 'Todos' ? 'Todos los productos' : activeCategory;
        renderProducts(document.getElementById('searchInput').value);
        closeMegaMenu();
    });
}

function renderMegaMenu() {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    const container = document.getElementById('megaMenuList');
    container.innerHTML = '<div class="mega-menu-item all" data-cat="Todos">Todos los productos<span class="mega-count">' + products.length + '</span></div>' +
        cats.map(c => {
            const count = products.filter(p => p.category === c).length;
            return '<div class="mega-menu-item" data-cat="' + c + '">' + c + '<span class="mega-count">' + count + '</span></div>';
        }).join('');
    container.addEventListener('click', e => {
        const item = e.target.closest('.mega-menu-item');
        if (!item) return;
        const cat = item.dataset.cat;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === cat);
        });
        activeCategory = cat;
        document.getElementById('sectionTitle').textContent = cat === 'Todos' ? 'Todos los productos' : cat;
        renderProducts(document.getElementById('searchInput').value);
        closeMegaMenu();
    });
}

function renderProducts(search) {
    const grid = document.getElementById('productGrid');
    let list = products;
    if (activeCategory !== 'Todos') {
        list = list.filter(p => p.category === activeCategory);
    }
    if (search) {
        const f = search.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(f) || (p.category && p.category.toLowerCase().includes(f)));
    }
    if (list.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#999;padding:3rem">No se encontraron productos</p>';
        return;
    }
    grid.innerHTML = list.map(p => {
        const markup = p.priceCRC || p.price;
        const rating = getRandomRating();
        const priceHtml = isDevMode
            ? '<div class="price-dev"><span class="original">&#8353;' + getOriginalPrice(p).toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span> &rarr; <span class="markup">&#8353;' + markup.toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></div>'
            : '<div class="price-row"><span class="price">' + formatPrice(markup) + '</span></div>';
        return '<div class="product-card" onclick="openModal(' + p.id + ')">'
            + '<span class="badge-free-ship">Envío gratis</span>'
            + '<img src="' + p.img + '" alt="' + p.name.replace(/"/g, '&quot;') + '" loading="lazy">'
            + '<div class="info">'
            + '<h3>' + p.name + '</h3>'
            + '<div class="rating"><span class="stars">' + renderStars(rating.stars) + '</span><span class="reviews">(' + rating.reviews + ')</span></div>'
            + priceHtml
            + (p.code ? '<small>' + p.code + '</small>' : '')
            + (isDevMode && p.sourceUrl ? '<a href="' + p.sourceUrl + '" target="_blank" class="source-link" onclick="event.stopPropagation()">&#128279; Origen</a>' : '')
            + '<button class="btn-sm" onclick="event.stopPropagation();addToCart(' + p.id + ')">Agregar</button>'
            + '</div></div>';
    }).join('');
}

function openModal(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const markup = p.priceCRC || p.price;
    const original = getOriginalPrice(p);
    const rating = getRandomRating();
    const discount = getDiscountPercent(p);
    const body = document.getElementById('modalBody');
    body.innerHTML = '<img src="' + p.img + '" alt="' + p.name.replace(/"/g, '&quot;') + '">'
        + '<h2>' + p.name + '</h2>'
        + '<div class="modal-meta">'
        + '<span class="stars" style="color:#f90;font-size:1.1rem">' + renderStars(rating.stars) + '</span> <span style="color:#999;font-size:0.85rem">' + rating.stars + ' (' + rating.reviews + ' reseñas)</span><br>'
        + (p.brand ? '<span><strong>Marca:</strong> ' + p.brand + '</span><br>' : '')
        + (p.code ? '<span><strong>Código:</strong> ' + p.code + '</span><br>' : '')
        + '<span><strong>Categoría:</strong> ' + p.category + '</span>'
        + '</div>'
        + (isDevMode
            ? '<div class="modal-price-dev">'
                + '<p><span class="label">Precio PlanetGroupCR (original):</span><span class="value green">&#8353;' + original.toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></p>'
                + '<p><span class="label">Precio Nexo Tech Smart (+30%):</span><span class="value red">&#8353;' + markup.toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></p>'
                + '<p class="diff"><span class="label">Diferencia (+30%):</span><span class="value red">&#8353;' + (markup - original).toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></p>'
            + '</div>'
            : '<div class="modal-price">' + formatPrice(markup) + '</div>')
        + (isDevMode && p.sourceUrl
            ? '<a href="' + p.sourceUrl + '" target="_blank" class="btn-sm btn-source" style="display:inline-block;text-decoration:none;margin-bottom:10px;background:#28a745">&#128279; Abrir en PlanetGroupCR</a><br>'
            : '')
        + '<div class="modal-actions">'
        + '<button class="btn-sm" onclick="closeModal();addToCart(' + p.id + ')">Agregar al carrito</button>'
        + '</div>';
    document.getElementById('productModal').classList.add('open');
}

function closeModal() {
    document.getElementById('productModal').classList.remove('open');
}

function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    updateCartUI();
}

function removeFromCart(id) {
    if (cart[id]) {
        cart[id]--;
        if (cart[id] <= 0) delete cart[id];
    }
    updateCartUI();
}

function updateCartUI() {
    const count = Object.values(cart).reduce((a, b) => a + b, 0);
    document.getElementById('cartCount').textContent = count;
    const itemsDiv = document.getElementById('cartItems');
    if (count === 0) {
        itemsDiv.innerHTML = '<p class="cart-empty">El carrito esta vacio</p>';
    } else {
        itemsDiv.innerHTML = Object.entries(cart).map(([id, qty]) => {
            const p = products.find(x => x.id === +id);
            return '<div class="cart-item">'
                + '<div class="cart-item-info">'
                + '<h4>' + p.name + '</h4>'
                + '<p>' + formatPrice(p.priceCRC || p.price) + '</p>'
                + '</div>'
                + '<div class="cart-item-controls">'
                + '<button onclick="removeFromCart(' + id + ')">-</button>'
                + '<span>' + qty + '</span>'
                + '<button onclick="addToCart(' + id + ')">+</button>'
                + '</div></div>';
        }).join('');
    }
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        const p = products.find(x => x.id === +id);
        return sum + (p.priceCRC || p.price) * qty;
    }, 0);
    document.getElementById('cartTotal').innerHTML = formatPrice(total);
}

let searchTimeout;
document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => renderProducts(e.target.value), 300);
});

async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEV_USER_HASH = '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2';
const DEV_PASS_HASH = '66060a42a0fc966f9227ced4770722d86cc97fc1a89607c101d8fb11e0b79465';

document.getElementById('modeSwitch').addEventListener('change', async e => {
    if (!e.target.checked) {
        isDevMode = false;
        document.getElementById('modeLabel').textContent = 'Cliente';
        renderProducts(document.getElementById('searchInput').value);
        return;
    }
    const user = prompt('Usuario:');
    if (!user) { e.target.checked = false; return; }
    const userHash = await sha256(user);
    if (userHash !== DEV_USER_HASH) {
        alert('Credenciales incorrectas');
        e.target.checked = false;
        renderProducts(document.getElementById('searchInput').value);
        return;
    }
    const pass = prompt('Contraseña:');
    if (!pass) { e.target.checked = false; return; }
    const passHash = await sha256(pass);
    if (passHash === DEV_PASS_HASH) {
        isDevMode = true;
        document.getElementById('modeLabel').textContent = 'Desarrollador';
        renderProducts(document.getElementById('searchInput').value);
    } else {
        alert('Credenciales incorrectas');
        e.target.checked = false;
        isDevMode = false;
        document.getElementById('modeLabel').textContent = 'Cliente';
        renderProducts(document.getElementById('searchInput').value);
    }
});

document.getElementById('cartBtn').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
});

document.getElementById('closeCart').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
}

document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (Object.keys(cart).length === 0) return;
    alert('Gracias por tu compra! Te contactaremos para coordinar la entrega.');
    cart = {};
    updateCartUI();
    closeCart();
});

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', closeModal);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeCart(); closeMegaMenu(); }
});

document.querySelectorAll('.footer-col a[href^="#"], .btn-hero').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        closeCart();
    });
});

function openMegaMenu() {
    document.getElementById('catMegaMenu').classList.add('open');
    document.getElementById('megaOverlay').classList.add('open');
    document.body.classList.add('no-scroll');
}

function closeMegaMenu() {
    document.getElementById('catMegaMenu').classList.remove('open');
    document.getElementById('megaOverlay').classList.remove('open');
    document.body.classList.remove('no-scroll');
}

document.getElementById('catMenuBtn').addEventListener('click', openMegaMenu);
document.getElementById('megaClose').addEventListener('click', closeMegaMenu);
document.getElementById('megaOverlay').addEventListener('click', closeMegaMenu);

function goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    heroIndex = index;
}

function nextSlide() { goToSlide(heroIndex + 1); }
function prevSlide() { goToSlide(heroIndex - 1); }

function initHero() {
    const slides = document.querySelectorAll('.hero-slide');
    const dotsContainer = document.getElementById('heroDots');
    slides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    });
    document.getElementById('heroNext').addEventListener('click', () => { nextSlide(); resetHeroTimer(); });
    document.getElementById('heroPrev').addEventListener('click', () => { prevSlide(); resetHeroTimer(); });
    heroTimer = setInterval(nextSlide, 5000);
}

function resetHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(nextSlide, 5000);
}

init();
