import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDoc, doc, collection, addDoc, serverTimestamp, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { menuItems as staticMenuItems } from './menu-data.js';

// --- State ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let menuItems = staticMenuItems;

// --- Authentication & UI Setup ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "User", user.uid));
        if (userDoc.exists()) {
            const welcomeEl = document.getElementById('welcome-user');
            if (welcomeEl) {
                welcomeEl.textContent = `Welcome ${userDoc.data().Fullname}`;
            }
        }
        renderMenu();
        updateCartUI();
        if (document.getElementById('my-orders-list')) {
            listenForUserOrders(user.uid);
        }
    } else {
        window.location.href = 'login.html';
    }
});

// --- Menu & Cart UI Rendering ---
function renderMenu(category = 'all') {
    const grid = document.getElementById('food-grid');
    if (!grid) return; // Exit if not on a page with a food grid
    grid.innerHTML = '';

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
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="window.changeQuantity(${product.id}, -1)">-</button>
                        <span id="qty-${product.id}">0</span>
                        <button class="quantity-btn" onclick="window.changeQuantity(${product.id}, 1)">+</button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    updateCartUI(); // To set initial quantities on cards
}

function updateCartUI() {
    const cartItemsEl = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const checkoutOptions = document.getElementById('checkout-options');

    // Update quantities on menu cards first
    menuItems.forEach(menuItem => {
        const qtyEl = document.getElementById(`qty-${menuItem.id}`);
        if (qtyEl) {
            const cartItem = cart.find(item => item.id === menuItem.id);
            qtyEl.textContent = cartItem ? cartItem.qty : 0;
        }
    });

    if (!cartItemsEl) return; // Exit if not on a page with a cart

    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p>Your cart is empty.</p>';
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        if (checkoutOptions) checkoutOptions.style.display = 'none';
    } else {
        cartItemsEl.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <span>${item.name}</span>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="window.changeQuantity(${item.id}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="quantity-btn" onclick="window.changeQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <span class="cart-item-price">R${(item.price * item.qty).toFixed(2)}</span>
            </div>
        `).join('');
        if (placeOrderBtn) placeOrderBtn.disabled = false;
        if (checkoutOptions) checkoutOptions.style.display = 'block';
    }

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if (cartTotalEl) cartTotalEl.textContent = totalPrice.toFixed(2);
    localStorage.setItem('cart', JSON.stringify(cart));
}

// --- Cart & Order Logic ---
window.changeQuantity = (id, amount) => {
    const product = menuItems.find(p => p.id === id);
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.qty += amount;
        if (existingItem.qty <= 0) {
            cart = cart.filter(item => item.id !== id);
        }
    } else if (amount > 0 && product) {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
};

async function placeOrder() {
    const user = auth.currentUser;
    if (!user || cart.length === 0) return;

    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing Order...';

    const now = new Date();
    const orderNumber = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const orderData = {
        userId: user.uid,
        orderNumber: orderNumber,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        status: "pending",
        method: document.getElementById('orderType')?.value || 'pickup',
        notes: document.getElementById('orderNotes')?.value || '',
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("✅ Order placed successfully!");
        cart = [];
        updateCartUI();
    } catch (error) {
        console.error("Error placing order: ", error);
        alert("❌ There was an error placing your order.");
    } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
    }
}

// --- Real-time Order Tracking (The Slip) ---
function listenForUserOrders(userId) {
    const ordersRef = collection(db, "orders");
    // Query orders for this user
    const q = query(ordersRef, where("userId", "==", userId));

    onSnapshot(q, (snapshot) => {
        const ordersListEl = document.getElementById('my-orders-list');
        if (!ordersListEl) return;

        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        // Sort by date descending (newest first) - Client side sort to avoid index requirement
        orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (orders.length === 0) {
            ordersListEl.innerHTML = '<p style="font-size: 0.9rem; color: #666;">No active orders.</p>';
            return;
        }

        ordersListEl.innerHTML = orders.map(order => {
            const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
            const itemsList = order.items.map(i => `<div>${i.qty}x ${i.name}</div>`).join('');
            const displayId = order.orderNumber || order.id.slice(0, 6);

            return `
                <div class="order-card">
                    <div class="order-header">
                        <span>Order: ${displayId}</span>
                        <span class="order-status status-${order.status}">${order.status}</span>
                    </div>
                    <div class="order-items">${itemsList}</div>
                    <div class="order-footer">
                        <strong>Total: R${order.total.toFixed(2)}</strong>
                        <small>${date}</small>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error("Logout error", error));
        });
    }

    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => renderMenu(e.target.dataset.category));
    });
});