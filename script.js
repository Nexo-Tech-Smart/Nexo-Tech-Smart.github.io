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
    generateOrder();
});

function generateOrder() {
    const items = Object.entries(cart).map(([id, qty]) => {
        const p = products.find(x => x.id === +id);
        return { ...p, qty };
    });

    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

    const subtotal = items.reduce((sum, item) => sum + (item.priceCRC || item.price) * item.qty, 0);

    const receiptHtml = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        + '<title>Orden ' + orderId + ' - Nexo Tech Smart</title>'
        + '<style>'
        + 'body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#333}'
        + '.header{text-align:center;border-bottom:2px solid #FF4747;padding-bottom:16px;margin-bottom:20px}'
        + '.header h1{color:#191919;font-size:1.5rem;margin:0}'
        + '.header span{color:#FF4747}'
        + '.order-info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;color:#666}'
        + 'table{width:100%;border-collapse:collapse;margin-bottom:16px}'
        + 'th{background:#f5f5f5;text-align:left;padding:8px 10px;font-size:0.85rem;border-bottom:2px solid #ddd}'
        + 'td{padding:8px 10px;border-bottom:1px solid #eee;font-size:0.9rem}'
        + 'td:last-child,th:last-child{text-align:right}'
        + '.total-row td{font-weight:700;font-size:1rem;border-top:2px solid #333;border-bottom:none;padding-top:10px}'
        + '.total-row td:last-child{color:#FF4747;font-size:1.2rem}'
        + '.footer{text-align:center;margin-top:24px;font-size:0.8rem;color:#999;border-top:1px solid #eee;padding-top:16px}'
        + '.dev-note{background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:12px;margin-top:16px;font-size:0.85rem}'
        + '</style></head><body>'
        + '<div class="header"><h1>Nexo<span>Tech</span> Smart</h1><p style="color:#666;font-size:0.9rem">Orden de Compra</p></div>'
        + '<div class="order-info"><span><strong>Orden:</strong> ' + orderId + '</span><span><strong>Fecha:</strong> ' + dateStr + ' ' + timeStr + '</span></div>'
        + '<table><tr><th>Producto</th><th>Código</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>'
        + items.map(item => {
            const price = item.priceCRC || item.price;
            return '<tr><td>' + item.name + '</td><td style="color:#999;font-size:0.8rem">' + (item.code || '—') + '</td><td>' + item.qty + '</td><td>' + formatPrice(price) + '</td><td>' + formatPrice(price * item.qty) + '</td></tr>';
        }).join('')
        + '<tr class="total-row"><td colspan="4">Total</td><td>' + formatPrice(subtotal) + '</td></tr>'
        + '</table>'
        + (isDevMode ? '<div class="dev-note"><strong>🔧 Copia para desarrollador</strong><br>Orden generada el ' + dateStr + ' a las ' + timeStr + '<br>Cliente: Vista previa modo desarrollador</div>' : '')
        + '<div class="footer"><p>Nexo Tech Smart - San José, Costa Rica</p><p>Gracias por tu compra</p></div>'
        + '</body></html>';

    const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orden-' + orderId.toLowerCase() + '.html';
    a.click();
    URL.revokeObjectURL(url);

    if (isDevMode) {
        console.log('=== ORDEN DE COMPRA (DESARROLLADOR) ===');
        console.log('Orden:', orderId);
        console.log('Fecha:', dateStr, timeStr);
        console.table(items.map(item => ({
            Producto: item.name,
            Codigo: item.code || '—',
            Cantidad: item.qty,
            Precio: '₡' + ((item.priceCRC || item.price)).toLocaleString('es-CR'),
            Subtotal: '₡' + ((item.priceCRC || item.price) * item.qty).toLocaleString('es-CR')
        })));
        console.log('Total: ₡' + subtotal.toLocaleString('es-CR'));
        window.open(url, '_blank');
    }

    cart = {};
    updateCartUI();
    closeCart();
}

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
