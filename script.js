let products = [];
let cart = {};
let activeCategory = 'Todos';

async function init() {
    try {
        const res = await fetch('products.json');
        products = await res.json();
    } catch {
        products = [
            { id: 1, name: 'Hub Smart Gateway', price: 89.99, priceCRC: 8999, category: 'Hogar' },
            { id: 2, name: 'Bombilla WiFi RGB', price: 24.99, category: 'Hogar' },
        ];
    }
    renderFilters();
    renderProducts();
}

function formatPrice(price) {
    return '&#8353;' + Number(price).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        renderProducts(document.getElementById('searchInput').value);
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
    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.img}" alt="${p.name}" loading="lazy">
            <div class="info">
                <h3>${p.name}</h3>
                <p class="price">${formatPrice(p.priceCRC || p.price)}</p>
                ${p.code ? '<small style="display:block;color:#888;font-size:0.8rem">' + p.code + '</small>' : ''}
                <button class="btn btn-sm" onclick="addToCart(${p.id})">Agregar</button>
            </div>
        </div>
    `).join('');
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
            const price = p.priceCRC || p.price;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${p.name}</h4>
                        <p>${formatPrice(price)}</p>
                    </div>
                    <div class="cart-item-controls">
                        <button onclick="removeFromCart(${id})">-</button>
                        <span>${qty}</span>
                        <button onclick="addToCart(${id})">+</button>
                    </div>
                </div>
            `;
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

document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelector(link.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
        closeCart();
    });
});

document.getElementById('contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = document.getElementById('formMessage');
    msg.textContent = 'Gracias por contactarnos. Te responderemos pronto.';
    msg.style.color = '#28a745';
    e.target.reset();
});

init();
