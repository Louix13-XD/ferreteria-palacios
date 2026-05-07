// --- BASE DE DATOS TEMPORAL (LocalStorage) ---

// Variables Globales Sincronizadas con la "Base de Datos"
let storeProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// --- FUNCIONES DE RENDERIZADO ---

function renderProducts(products, containerId = 'featured-products') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-box-seam fs-1 text-muted opacity-25"></i>
                <p class="text-muted mt-3">No hay productos disponibles por ahora.</p>
            </div>
        `;
        return;
    }

    products.forEach((product, index) => {
        const isFav = favorites.some(p => p.id === product.id);
        const isOutStock = product.stock <= 0;
        
        const productHTML = `
            <div class="col fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="card h-100 product-card hover-effect ${isOutStock ? 'opacity-75' : ''}">
                    <div class="product-img-wrapper">
                        <a href="/producto/${product.id}">
                            <img src="${product.img}" alt="${product.name}" style="${isOutStock ? 'filter: grayscale(1);' : ''}">
                        </a>
                        ${isOutStock ? '<span class="badge bg-danger position-absolute top-0 start-0 m-2 shadow">AGOTADO</span>' : ''}
                        <button class="btn btn-light position-absolute top-0 end-0 m-2 rounded-circle shadow-sm btn-wishlist" onclick="toggleWishlist(${product.id})">
                            <i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        <small class="text-muted">${product.category}</small>
                        <a href="/producto/${product.id}" class="text-decoration-none text-dark">
                            <h5 class="card-title fw-bold">${product.name}</h5>
                        </a>
                        <p class="card-text text-warning fw-bold fs-5">S/ ${product.price.toFixed(2)}</p>
                    </div>
                    <div class="card-footer bg-transparent border-0 pb-3">
                        ${isOutStock ? `
                            <button class="btn btn-secondary w-100 fw-bold disabled" disabled>
                                <i class="bi bi-x-circle me-2"></i>Sin Stock
                            </button>
                        ` : `
                            <button class="btn btn-warning w-100 fw-bold shadow-sm" onclick="addToCart(${product.id})">
                                <i class="bi bi-cart-plus me-2"></i>Al Carrito
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += productHTML;
    });
}

// --- FUNCIONES DE CARRITO ---

function addToCart(productId, quantity = 1) {
    const product = storeProducts.find(p => p.id == productId);
    if (!product) return;

    // Buscar si el producto ya está en el carrito
    const cartItem = cart.find(item => item.id == productId);

    if (cartItem) {
        // Verificar que no exceda el stock total
        if (cartItem.quantity + quantity > product.stock) {
            showToast(`Solo quedan ${product.stock} unidades en stock`, "warning", "bi-exclamation-circle");
            cartItem.quantity = product.stock;
        } else {
            cartItem.quantity += quantity;
            showToast(`Se sumaron ${quantity} unidades más`, "success");
        }
    } else {
        // Añadir nuevo item con cantidad
        cart.push({ ...product, quantity: quantity });
        showToast("Producto añadido al carrito", "success");
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        badge.innerText = totalItems;
    }
}

function toggleWishlist(productId) {
    const product = storeProducts.find(p => p.id == productId);
    if (!product) return;

    const index = favorites.findIndex(p => p.id == productId);
    if (index === -1) {
        favorites.push(product);
        showToast("Añadido a favoritos", "danger", "bi-heart-fill");
    } else {
        favorites.splice(index, 1);
        showToast("Eliminado de favoritos", "secondary", "bi-heart");
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateWishlistUI();
    
    // Only update icon if it was triggered by a specific button, otherwise reload UI if needed
    const eventTarget = window.event ? window.event.target : null;
    if (eventTarget) {
        const btn = eventTarget.closest('.btn-wishlist');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-heart');
                icon.classList.toggle('bi-heart-fill');
                icon.classList.toggle('text-danger');
            }
        }
    }
}

function updateWishlistUI() {
    const badge = document.getElementById('wishlist-badge');
    if (badge) badge.innerText = favorites.length;
}

function showToast(message, color = "success", icon = "bi-check-circle") {
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '1100';
    toast.innerHTML = `
        <div class="toast show align-items-center text-white bg-${color} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body"><i class="bi ${icon} me-2"></i>${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/productos');
        const data = await res.json();
        if (data.success) {
            storeProducts = data.products.map(p => ({
                id: p.id,
                name: p.nombre,
                category: p.category_name,
                price: parseFloat(p.precio_final),
                stock: p.stock,
                img: p.imagen_url || '/img/default_product.png'
            }));
        }
    } catch (e) {
        console.error('Error cargando productos', e);
    }
    
    updateCartUI();
    updateWishlistUI();
    
    if (typeof currentCategory !== 'undefined') {
        const filtered = storeProducts.filter(p => p.category.toLowerCase() === currentCategory.toLowerCase());
        renderProducts(filtered, 'products-container');
    } else {
        renderProducts(storeProducts, 'featured-products');
    }
});
