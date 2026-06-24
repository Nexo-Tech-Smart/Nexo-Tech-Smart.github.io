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
            { id: 1, name: 'Hub Smart Gateway', priceCRC: 8999, price: calculateSellingPrice(8999), category: 'Hogar' },
            { id: 2, name: 'Bombilla WiFi RGB', priceCRC: 2499, price: calculateSellingPrice(2499), category: 'Hogar' },
        ];
    }
    renderFilters();
    renderMegaMenu();
    renderProducts(document.getElementById('searchInput').value);
    initHero();
}

function calculateSellingPrice(costCRC) {
    if (!costCRC || costCRC <= 0) throw new Error('Invalid product cost');
    let minProfit, minMargin;
    if (costCRC <= 5000) { minProfit = 1500; minMargin = 0.30; }
    else if (costCRC <= 20000) { minProfit = 3000; minMargin = 0.25; }
    else if (costCRC <= 100000) { minProfit = 5000; minMargin = 0.20; }
    else { minProfit = 10000; minMargin = 0.15; }
    const margin = Math.max(minMargin, minProfit / costCRC);
    const sellingPrice = costCRC * (1 + margin);
    return Math.round(sellingPrice / 100) * 100;
}

function formatPrice(price) {
    return '&#8353;' + Number(price).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOriginalPrice(p) {
    return p.priceCRC;
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
        const rating = getRandomRating();
        const priceHtml = isDevMode
            ? '<div class="price-dev"><span class="original">&#8353;' + getOriginalPrice(p).toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span> &rarr; <span class="markup">&#8353;' + p.price.toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></div>'
            : '<div class="price-row"><span class="price">' + formatPrice(p.price) + '</span></div>';
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
    const rating = getRandomRating();
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
                + '<p><span class="label">Costo PlanetGroupCR:</span><span class="value green">&#8353;' + getOriginalPrice(p).toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></p>'
                + '<p><span class="label">Precio Nexo Tech Smart:</span><span class="value red">&#8353;' + p.price.toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></p>'
                + '<p class="diff"><span class="label">Margen:</span><span class="value red">&#8353;' + (p.price - getOriginalPrice(p)).toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span></p>'
            + '</div>'
            : '<div class="modal-price">' + formatPrice(p.price) + '</div>')
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

function deleteFromCart(id) {
    delete cart[id];
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
                + '<button class="cart-item-del" onclick="deleteFromCart(' + id + ')" title="Eliminar">&times;</button>'
                + '<div class="cart-item-info">'
                + '<h4>' + p.name + '</h4>'
                + (p.code ? '<small class="cart-item-code">' + p.code + '</small>' : '')
                + '<p>' + formatPrice(p.price) + '</p>'
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
        return sum + p.price * qty;
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
        document.getElementById('ordersBtn').classList.remove('dev-visible');
        document.getElementById('orderAllBtn').classList.remove('dev-visible');
        closeOrdersPanel();
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
        document.getElementById('ordersBtn').classList.add('dev-visible');
        document.getElementById('orderAllBtn').classList.add('dev-visible');
        updateOrdersBadge();
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

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    const receiptHtml = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        + '<title>Orden ' + orderId + ' - Nexo Tech Smart</title>'
        + '<style>'
        + '*{margin:0;padding:0;box-sizing:border-box}'
        + 'body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#333}'
        + '.print-bar{text-align:center;padding:12px;margin-bottom:16px;background:#f5f5f5;border-radius:8px}'
        + '.print-bar button{padding:10px 28px;background:#FF4747;color:#fff;border:none;border-radius:6px;font-size:1rem;font-weight:700;cursor:pointer;margin:0 6px}'
        + '.print-bar button:hover{background:#e63e3e}'
        + '.print-bar button.btn-secondary{background:#333}'
        + '.print-bar button.btn-secondary:hover{background:#555}'
        + '.header{text-align:center;border-bottom:2px solid #FF4747;padding-bottom:16px;margin-bottom:20px}'
        + '.header h1{color:#191919;font-size:1.5rem;margin:0}'
        + '.header span{color:#FF4747}'
        + '.order-info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.9rem;color:#666;flex-wrap:wrap;gap:4px}'
        + 'table{width:100%;border-collapse:collapse;margin-bottom:16px}'
        + 'th{background:#f5f5f5;text-align:left;padding:8px 10px;font-size:0.85rem;border-bottom:2px solid #ddd}'
        + 'td{padding:8px 10px;border-bottom:1px solid #eee;font-size:0.9rem}'
        + 'td:last-child,th:last-child{text-align:right}'
        + '.total-row td{font-weight:700;font-size:1rem;border-top:2px solid #333;border-bottom:none;padding-top:10px}'
        + '.total-row td:last-child{color:#FF4747;font-size:1.2rem}'
        + '.footer{text-align:center;margin-top:24px;font-size:0.8rem;color:#999;border-top:1px solid #eee;padding-top:16px}'
        + '.dev-note{background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:12px;margin:16px 0;font-size:0.85rem}'
        + '@media print{.print-bar{display:none}}'
        + '</style></head><body>'
        + '<div class="print-bar"><button onclick="window.print()">&#128196; Descargar PDF</button><button class="btn-secondary" onclick="window.close()">Cerrar</button></div>'
        + '<div class="header"><h1>Nexo<span>Tech</span> Smart</h1><p style="color:#666;font-size:0.9rem">Orden de Compra</p></div>'
        + '<div class="order-info"><span><strong>Orden:</strong> ' + orderId + '</span><span><strong>Fecha:</strong> ' + dateStr + ' ' + timeStr + '</span></div>'
        + '<table><tr><th>Producto</th><th>Código</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>'
        + items.map(item => {
            return '<tr><td>' + item.name + '</td><td style="color:#999;font-size:0.8rem">' + (item.code || '—') + '</td><td>' + item.qty + '</td><td>' + formatPrice(item.price) + '</td><td>' + formatPrice(item.price * item.qty) + '</td></tr>';
        }).join('')
        + '<tr class="total-row"><td colspan="4">Total</td><td>' + formatPrice(subtotal) + '</td></tr>'
        + '</table>'
        + '<div style="background:#f0faf0;border:1px solid #c8e6c9;border-radius:8px;padding:14px;margin-bottom:12px;text-align:center">'
        + '<p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">M&eacute;todo de pago</p>'
        + '<p style="font-size:1rem;color:#333;font-weight:600;margin-top:4px">&#128179; Sinpe M&oacute;vil</p>'
        + '<p style="font-size:1.5rem;color:#28a745;font-weight:800;letter-spacing:3px;margin-top:4px">1234-5678</p>'
        + '<p style="font-size:0.8rem;color:#666;margin-top:6px">Realizar transferencia con el monto total de la orden.</p>'
        + '<p style="margin-top:8px"><a href="https://wa.me/50612345678?text=Hola%2C%20mi%20orden%20es%20' + orderId + '" target="_blank" style="color:#25D366;text-decoration:none;font-weight:600;font-size:0.9rem">&#128172; Contactar por WhatsApp</a></p>'
        + '</div>'
        + (isDevMode ? '<div class="dev-note"><strong>Copia para desarrollador</strong><br>Orden generada el ' + dateStr + ' a las ' + timeStr + '<br>Cliente: Vista previa modo desarrollador</div>' : '')
        + '<div class="footer"><p>Nexo Tech Smart - San Jos&eacute;, Costa Rica</p><p>Gracias por tu compra</p></div>'
        + '</body></html>';

    const w = window.open('', '_blank');
    if (w) {
        w.document.write(receiptHtml);
        w.document.close();
    }

    if (isDevMode) {
        console.log('=== ORDEN DE COMPRA (DESARROLLADOR) ===');
        console.log('Orden:', orderId);
        console.log('Fecha:', dateStr, timeStr);
        console.table(items.map(item => ({
            Producto: item.name,
            Codigo: item.code || '—',
            Cantidad: item.qty,
            Precio: '₡' + item.price.toLocaleString('es-CR'),
            Subtotal: '₡' + (item.price * item.qty).toLocaleString('es-CR')
        })));
        console.log('Total: ₡' + subtotal.toLocaleString('es-CR'));
    }

    saveOrder(orderId, dateStr + ' ' + timeStr, items, subtotal, receiptHtml);

    cart = {};
    updateCartUI();
    closeCart();
}

function saveOrder(orderId, dateStr, items, subtotal, receiptHtml) {
    const orders = JSON.parse(localStorage.getItem('nexoOrders') || '[]');
    orders.unshift({
        id: orderId,
        date: dateStr,
        items: items.map(item => ({ id: item.id, name: item.name, code: item.code, qty: item.qty, price: item.price, sourceUrl: item.sourceUrl })),
        subtotal: subtotal,
        receiptHtml: receiptHtml,
        status: 'pending',
        createdAt: Date.now()
    });
    localStorage.setItem('nexoOrders', JSON.stringify(orders));
    updateOrdersBadge();
}

function getOrders() {
    return JSON.parse(localStorage.getItem('nexoOrders') || '[]');
}

function updateOrdersBadge() {
    const orders = getOrders();
    const pending = orders.filter(o => o.status === 'pending').length;
    const badge = document.getElementById('ordersCount');
    badge.textContent = pending;
}

function renderOrders() {
    const orders = getOrders();
    const container = document.getElementById('ordersList');
    const summary = document.getElementById('ordersSummary');
    summary.textContent = orders.length + ' órdenes' + (orders.length > 0 ? ' (' + orders.filter(o => o.status === 'pending').length + ' pendientes)' : '');
    if (orders.length === 0) {
        container.innerHTML = '<p class="orders-empty">No hay órdenes registradas</p>';
        return;
    }
    container.innerHTML = orders.map((o, idx) => {
        const total = o.items.reduce((s, item) => s + item.price * item.qty, 0);
        const itemCount = o.items.reduce((s, item) => s + item.qty, 0);
        return '<div class="order-card ' + o.status + '" data-index="' + idx + '">'
            + '<div class="order-card-header">'
            + '<span class="order-card-id">' + o.id + '</span>'
            + '<span class="order-card-date">' + o.date + '</span>'
            + '</div>'
            + '<div class="order-card-info">'
            + '<span>&#128722; ' + itemCount + ' artículos</span>'
            + '<span>&#8353;' + total.toLocaleString('es-CR', {minimumFractionDigits:2}) + '</span>'
            + '<span>' + (o.status === 'pending' ? '&#9203; Pendiente' : '&#9989; Procesada') + '</span>'
            + '</div>'
            + '<div class="order-card-actions">'
            + '<button class="btn-view" data-action="view" data-idx="' + idx + '">&#128065; Ver</button>'
            + '<button class="btn-pdf" data-action="pdf" data-idx="' + idx + '">&#128196; PDF</button>'
            + (o.status === 'pending' ? '<button class="btn-process" data-action="process" data-idx="' + idx + '">&#9989; Procesar</button>' : '')
            + (isDevMode && o.status === 'pending' ? '<button class="btn-supplier" data-action="supplier-order" data-idx="' + idx + '">&#128666; Ordenar pedido</button>' : '')
            + '</div></div>';
    }).join('');

    container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', e => {
            const action = btn.dataset.action;
            const idx = parseInt(btn.dataset.idx);
            const orders = getOrders();
            const order = orders[idx];
            if (!order) return;
            if (action === 'view') {
                const w = window.open('', '_blank');
                if (w) { w.document.write(order.receiptHtml); w.document.close(); }
            } else if (action === 'pdf') {
                const w = window.open('', '_blank');
                if (w) { w.document.write(order.receiptHtml); w.document.close(); }
            } else if (action === 'supplier-order') {
                orderFromSupplier(order);
            } else if (action === 'process') {
                if (confirm('Marcar orden ' + order.id + ' como procesada?')) {
                    orders[idx].status = 'processed';
                    localStorage.setItem('nexoOrders', JSON.stringify(orders));
                    renderOrders();
                    updateOrdersBadge();
                }
            }
        });
    });
}

function openOrdersPanel() {
    renderOrders();
    document.getElementById('ordersPanel').classList.add('open');
    document.getElementById('ordersOverlay').classList.add('open');
    document.body.classList.add('no-scroll');
}

function closeOrdersPanel() {
    document.getElementById('ordersPanel').classList.remove('open');
    document.getElementById('ordersOverlay').classList.remove('open');
    document.body.classList.remove('no-scroll');
}

document.getElementById('ordersBtn').addEventListener('click', openOrdersPanel);
document.getElementById('closeOrders').addEventListener('click', closeOrdersPanel);
document.getElementById('ordersOverlay').addEventListener('click', closeOrdersPanel);
document.getElementById('clearOrdersBtn').addEventListener('click', () => {
    if (confirm('Eliminar todas las órdenes de compra?')) {
        localStorage.removeItem('nexoOrders');
        renderOrders();
        updateOrdersBadge();
    }
});

document.getElementById('orderAllBtn').addEventListener('click', orderAllFromSupplier);

const SUPPLIER_CREDS_KEY = 'planetSupplierCreds';
const SUPPLIER_CONFIG_KEY = 'planetSupplierConfig';

function getSupplierConfig() {
    return JSON.parse(localStorage.getItem(SUPPLIER_CONFIG_KEY) || '{}');
}

function submitFormToPopup(action, method, params, target) {
    const form = document.createElement('form');
    form.action = action;
    form.method = method || 'POST';
    form.target = target;
    form.style.display = 'none';
    Object.entries(params).forEach(([k, v]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = String(v);
        form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

function orderFromSupplier(order) {
    if (!order || !order.items || order.items.length === 0) return;
    const validItems = order.items.filter(item => item.sourceUrl);
    if (validItems.length === 0) {
        alert('Esta orden no contiene productos con origen PlanetGroupCR.');
        return;
    }

    let creds = JSON.parse(localStorage.getItem(SUPPLIER_CREDS_KEY) || 'null');
    if (!creds || !creds.username || !creds.password) {
        const username = prompt('Ingrese el usuario de PlanetGroupCR:');
        if (!username) return;
        const password = prompt('Ingrese la contrase\u00f1a de PlanetGroupCR:');
        if (!password) return;
        creds = { username, password };
        if (confirm('Guardar credenciales para pr\u00f3ximas \u00f3rdenes?')) {
            localStorage.setItem(SUPPLIER_CREDS_KEY, JSON.stringify(creds));
        }
    }

    const popupName = 'planetPopup_' + Date.now();
    const popup = window.open('about:blank', popupName, 'width=1200,height=800,scrollbars=yes');
    if (!popup) {
        alert('El navegador bloque\u00f3 la ventana emergente. Permita popups para este sitio.');
        return;
    }

    const statusEl = document.createElement('div');
    statusEl.id = 'supplierStatus';
    statusEl.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#191919;color:#fff;padding:16px 24px;border-radius:8px;z-index:9999;font-size:14px;max-width:450px;box-shadow:0 4px 12px rgba(0,0,0,0.3);line-height:1.5';
    statusEl.innerHTML = '<strong>&#128666; Ordenando pedido...</strong><br><span id="supplierStatusText">Iniciando sesi\u00f3n en PlanetGroupCR...</span>';
    document.body.appendChild(statusEl);

    function updateStatus(text) {
        const el = document.getElementById('supplierStatusText');
        if (el) el.textContent = text;
    }

    function removeStatus() {
        const el = document.getElementById('supplierStatus');
        if (el) el.remove();
    }

    // Step 1: Login
    updateStatus('Iniciando sesi\u00f3n como ' + creds.username + '...');
    submitFormToPopup('https://planetgroupcr.com/login.php', 'POST', {
        login_userid: creds.username,
        login_passwd: creds.password,
        go: '1'
    }, popupName);

    // Step 2: Add items with delays
    validItems.forEach((item, i) => {
        const delay = (i + 1) * 3500;
        setTimeout(() => {
            updateStatus('(' + (i + 1) + '/' + validItems.length + ') ' + item.name.substring(0, 50) + '...');
            try {
                const url = new URL(item.sourceUrl);
                const itemId = url.searchParams.get('item_id');
                submitFormToPopup('https://planetgroupcr.com/carrito.php', 'POST', {
                    item_id: itemId,
                    cantidad: item.qty
                }, popupName);
            } catch (e) {
                submitFormToPopup(item.sourceUrl, 'GET', {}, popupName);
            }
        }, delay);
    });

    // Step 3: After all items, show cart
    const totalDelay = (validItems.length + 1) * 3500;
    setTimeout(() => {
        updateStatus('Orden procesada. Mostrando carrito...');
        submitFormToPopup('https://planetgroupcr.com/carrito.php', 'GET', {}, popupName);
        setTimeout(removeStatus, 3000);
    }, totalDelay);
}

function orderAllFromSupplier() {
    if (!isDevMode) return;
    const orders = getOrders();
    const pending = orders.filter(o => o.status === 'pending');
    if (pending.length === 0) {
        alert('No hay \u00f3rdenes pendientes.');
        return;
    }

    const allItems = {};
    pending.forEach(o => {
        (o.items || []).forEach(item => {
            if (!item.sourceUrl) return;
            const key = item.id || item.code || item.name;
            if (allItems[key]) {
                allItems[key].qty += item.qty;
            } else {
                allItems[key] = { ...item };
            }
        });
    });

    const combined = Object.values(allItems);
    if (combined.length === 0) {
        alert('Ninguna orden pendiente contiene productos con origen PlanetGroupCR.');
        return;
    }

    if (!confirm('Procesar ' + combined.reduce((s, i) => s + i.qty, 0) + ' art\u00edculos de ' + pending.length + ' orden(es) pendientes en PlanetGroupCR?')) return;

    const virtualOrder = {
        id: 'ALL-' + Date.now().toString(36).toUpperCase(),
        date: new Date().toLocaleString('es-CR'),
        items: combined,
        subtotal: combined.reduce((s, i) => s + i.price * i.qty, 0)
    };
    orderFromSupplier(virtualOrder);
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', closeModal);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeCart(); closeMegaMenu(); closeOrdersPanel(); }
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
