const products = [
    { id: 1, name: 'Hub Smart Gateway', price: 89.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Smart+Hub' },
    { id: 2, name: 'Bombilla WiFi RGB', price: 24.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Bombilla+RGB' },
    { id: 3, name: 'Enchufe Inteligente', price: 19.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Enchufe+WiFi' },
    { id: 4, name: 'Sensor de Movimiento', price: 29.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Sensor+Mov' },
    { id: 5, name: 'Camara Seguridad HD', price: 59.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Camara+HD' },
    { id: 6, name: 'Termostato Inteligente', price: 79.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Termostato' },
    { id: 7, name: 'Cerradura Digital', price: 129.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Cerradura' },
    { id: 8, name: 'Sensor Puerta/Ventana', price: 15.99, img: 'https://placehold.co/400x300/1a1a2e/e94560?text=Sensor+P/V' },
];

let cart = {};

function renderProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.img}" alt="${p.name}">
            <div class="info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price.toFixed(2)}</p>
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
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${p.name}</h4>
                        <p>$${p.price.toFixed(2)}</p>
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
        return sum + p.price * qty;
    }, 0);
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
}

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

renderProducts();
