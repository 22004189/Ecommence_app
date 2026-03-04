import { menuItems as staticMenuItems } from './menu-data.js';

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentFilter = 'all';
let menuItems = staticMenuItems;

// Render Menu
function renderMenu(category = 'all') {
    currentFilter = category;
    const grid = document.getElementById('food-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!menuItems || menuItems.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No menu items available.</p>';
        return;
    }

    const filtered = category === 'all' ? menuItems : menuItems.filter(p => p.category === category);

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No items found in this category.</p>';
        return;
    }

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
            <img src="${product.img}" alt="${product.name}" class="food-img">
            <div class="food-info">
                <h3>${product.name}</h3>
                <p>${product.desc}</p>
                <div class="price-row">
                    <span class="price">R${product.price.toFixed(2)}</span>
                    <button class="add-btn" onclick="addToCart(${product.id})">Add to Cart</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
}

// Cart Logic
window.addToCart = (id) => {
    const product = menuItems.find(p => p.id === id);
    const existing = cart.find(item => item.id === id);

    if (!product && !existing) return;

    if (existing) {
        existing.qty++;
    } else if (product) {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
}

function updateCartUI() {
    localStorage.setItem('cart', JSON.stringify(cart));
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (cartCount) cartCount.textContent = totalQty;
    if (cartTotal) cartTotal.textContent = totalPrice.toFixed(2);

    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty.</p>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <span>${item.name} x${item.qty}</span>
                    <span>R${(item.price * item.qty).toFixed(2)}</span>
                </div>
            `).join('');
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('cart-overlay').classList.toggle('open');
        });
    }
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            alert('Please log in or register to complete your order.');
            window.location.href = 'login.html';
        });
    }
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            renderMenu(category);
        });
    });
    renderMenu(currentFilter);
    updateCartUI();
});