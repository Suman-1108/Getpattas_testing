/* ==========================================================================
   Get Pattas - MULTI-BRAND SIVAKASI FIREWORKS WEB APPLICATION
   References: kannancrackers.net & jallikattucrackers.in
   Features:
   - 4-Brand Instant Switcher (Get pattas Crackers, Get pattas  Crackers, Get pattas , Get Pattas)
   - Clean Full-Width Wholesale Pricelist Table (No sidebar filters, No photo grid)
   - One-touch fast increment/decrement quantity steppers with live row & sticky totals
   - Category Jump Pills & Real-time English/Tamil Search
   - Sticky Bottom Order Summary Bar with minimum order validation
   - Bilingual WhatsApp Wholesale Order Message Formatter
   - Multi-Step Checkout Modal, Saved Addresses & Customer Authentication
   - Works 100% standalone locally via file:/// & synced via HTTP API / BroadcastChannel
   ========================================================================== */

// Global Application State
let currentBrand = 'muthu';
let currentSearchQuery = '';
let currentCategoryFilter = 'all';
let cart = []; // Array of { id, brand, code, name, tamilName, packInfo, mrp, price, qty }
let qtyMap = {}; // { [id]: qty }
let currentCustomer = null;

// API Base calculation
const API_BASE = (window.location.protocol && window.location.protocol.startsWith('http'))
  ? (window.location.port === '5000' || !window.location.port ? window.location.origin : 'http://localhost:5000')
  : 'http://localhost:5000';

// Real-time BroadcastChannel for cross-tab sync
const syncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('get_pattasu_sync_channel') : null;

// Detect Current Brand from Page / Body / URL
function detectCurrentBrand() {
  if (document.body && document.body.dataset && document.body.dataset.brand) {
    return document.body.dataset.brand;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const bParam = urlParams.get('brand');
  if (bParam && window.BRANDS_CONFIG && window.BRANDS_CONFIG[bParam]) {
    return bParam;
  }
  const path = window.location.pathname.toLowerCase();
  if (path.includes('shopno001') || path.includes('muthu')) return 'muthu';
  if (path.includes('shopno002') || path.includes('Get pattas ')) return 'Get pattas ';
  if (path.includes('shopno003') || path.includes('red')) return 'red';
  if (path.includes('shopno004')) return 'getpattasu';
  return 'getpattasu';
}

// Storage key helper ensuring 100% complete isolation for each shop (accounts, sessions, addresses, carts)
function getShopStorageKey(keyName) {
  const b = (typeof currentBrand !== 'undefined' && currentBrand) ? currentBrand : (detectCurrentBrand() || 'muthu');
  return `${keyName}_${b}`;
}

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
  // 1. Determine active brand for this dedicated website/page
  currentBrand = detectCurrentBrand();

  // 2. Load saved cart & customer state
  loadCartFromStorage();
  initCustomerState();

  // 3. Render brand switcher & active brand price list
  updateBrandUI(currentBrand);
  renderPriceListTable();
  updateStickySummaryBar();

  // 4. Setup visual components & animations
  initSparksCanvas();
  initReviewsSlider();
  initCheckoutAutoSave();
  initNavScrollSpy();

  // 5. BroadcastChannel real-time event listener
  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'PRODUCTS_UPDATED') {
        renderPriceListTable();
      }
    };
  }

  // 6. Escape key to clear search inputs
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeId = document.activeElement ? document.activeElement.id : '';
      if (activeId === 'headerGlobalSearch' || activeId === 'catalogSearch') {
        clearTableSearch();
      }
    }
  });
});

// ==========================================
// BRAND SWITCHING & PAGE NAVIGATION LOGIC
// ==========================================
function selectBrand(brandSlug, event) {
  const brandUrls = {
    'muthu': '/getpattas/shopno001',
    'Get pattas ': '/getpattas/shopno002',
    'red': '/getpattas/shopno003',
    'getpattasu': '/getpattas/shopno004'
  };

  const targetUrl = brandUrls[brandSlug] || '/getpattas/shopno004';
  const currentPath = window.location.pathname.toLowerCase();
  const isCurrentPage = currentPath.endsWith(targetUrl) ||
    (brandSlug === 'getpattasu' && (currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath.includes('shopno004')));

  if (!isCurrentPage) {
    // Navigate directly to the dedicated full website URL
    window.location.href = targetUrl;
    return;
  }

  if (event) {
    event.preventDefault();
  }

  const productsSection = document.getElementById('products');
  if (productsSection) {
    productsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function switchBrand(brandSlug) {
  selectBrand(brandSlug);
}

function updateBrandUI(brandSlug, isSwitch = false) {
  const brand = window.BRANDS_CONFIG[brandSlug] || window.BRANDS_CONFIG['getpattasu'] || window.BRANDS_CONFIG['muthu'];
  document.body.dataset.brand = brandSlug;

  // 1. Dynamic Hero Section Updates
  const heroTag = document.getElementById('heroBrandTag');
  const heroTitle = document.getElementById('heroBrandTitle');
  const heroTagline = document.getElementById('heroBrandTagline');
  const heroPhone = document.getElementById('heroBrandPhone');
  const heroMinOrder = document.getElementById('heroBrandMinOrder');
  const heroLoc = document.getElementById('heroMetaLocation');
  const heroLink = document.getElementById('heroDedicatedSiteLink');

  const heroBrandDetails = {
    'Get pattas ': {
      tag: '💥 SPECIAL PYRO TECHNICS & NOVELTY DEPOT',
      title: "Get pattas 's Special Crackers",
      tagline: 'World-Famous Get pattas  Special Fountains, Popcorn Crackers, Kungfu Panda 2-Step & High-Altitude Pyro Sky Shells',
      loc: '📍 Bypass Road, Sivakasi Factory Zone',
      phone: '+91 94431 22889',
      min: '₹3,000',
      page: '/getpattas/shopno002',
      siteName: "Get pattas 's Store"
    },
    'muthu': {
      tag: '🎆 100% DIRECT SIVAKASI FACTORY WHOLESALE',
      title: 'Get pattas Crackers',
      tagline: 'Direct Wholesale from Sivakasi Factory • Flat 80% Discount • Over 218 Genuine Varieties',
      loc: '📍 258, Get pattas Crackers, Sivakasi',
      phone: '+91 86104 51118',
      min: '₹3,000',
      page: '/getpattas/shopno001',
      siteName: "Get pattas Store"
    },
    'red': {
      tag: '🧨 SIVAKASI DIRECT WHOLESALE HUB',
      title: 'The Get pattas  Sivakasi',
      tagline: 'Celebrate Bigger, Save More! Direct Sivakasi Up to 90% Off • Complete 127 Items Order Table',
      loc: '📍 Sivakasi Wholesale Hub, Tamil Nadu',
      phone: '+91 95661 59113',
      min: '₹3,000',
      page: '/getpattas/shopno003',
      siteName: "Get pattas Store"
    },
    'getpattasu': {
      tag: '⭐ ALL SIVAKASI BRANDS MEGA STORE',
      title: 'Get Pattas Kadai',
      tagline: 'Single Window for Muthu, Get pattas  & Get pattas  • Curated Family Hampers • Flat 80% Off Direct Factory Rates',
      loc: '📍 12/4B Sivakasi Factory Zone, Tamil Nadu',
      phone: '+91 86104 51118',
      min: '₹3,000',
      page: '/getpattas/shopno004',
      siteName: "Get Pattas Master Store"
    }
  };

  const h = heroBrandDetails[brandSlug] || heroBrandDetails['getpattasu'];

  if (heroTag) heroTag.innerText = h.tag;
  if (heroTitle) heroTitle.innerText = h.title;
  if (heroTagline) heroTagline.innerText = h.tagline;
  if (heroPhone) heroPhone.innerText = h.phone;
  if (heroMinOrder) heroMinOrder.innerText = h.min;
  if (heroLoc) heroLoc.innerText = h.loc;

  if (heroLink) {
    if (brandSlug !== 'getpattasu') {
      heroLink.style.display = 'inline-flex';
      heroLink.href = h.page;
      heroLink.innerText = `🌐 Open ${h.siteName} ➔`;
    } else {
      heroLink.style.display = 'none';
    }
  }

  // 2. Active Brand Banner Strip in Wholesale Table Section
  // Preserve custom HTML written in index.html (shop number, custom title, badge, phone, tagline)
  // Only overwrite if dynamic brand switch is explicitly triggered or if DOM element is empty
  const badgeEl = document.getElementById('currentBrandBadge');
  const titleEl = document.getElementById('currentBrandTitle');
  const taglineEl = document.getElementById('currentBrandTagline');
  const phoneEl = document.getElementById('currentBrandPhone');

  if (badgeEl && (isSwitch || !badgeEl.textContent.trim())) {
    const icon = brandSlug === 'red' ? 'fa-fire-flame-curved' : (brandSlug === 'Get pattas ' ? 'fa-burst' : 'fa-wand-magic-sparkles');
    badgeEl.innerHTML = `<i class="fa-solid ${icon}"></i> ${brand.badge}`;
  }
  if (titleEl && (isSwitch || !titleEl.textContent.trim())) {
    titleEl.innerText = brand.wholesaleTitle || `${brand.name} - Wholesale Price List`;
  }
  if (taglineEl && (isSwitch || !taglineEl.textContent.trim())) {
    taglineEl.innerText = brand.tagline || `${brand.name} • Single-Touch Quantity Order Table`;
  }
  if (phoneEl && (isSwitch || !phoneEl.textContent.trim())) {
    phoneEl.innerText = brand.phone;
  }
}

// ==========================================
// PRICE LIST TABLE RENDERING & CATEGORY JUMP
// ==========================================
function getBrandProducts(brandSlug) {
  if (!window.ALL_BRANDS_PRODUCTS) return [];
  return window.ALL_BRANDS_PRODUCTS[brandSlug] || [];
}

// Mobile category accordion state
const mobileOpenCategories = new Set();

function toggleCategoryAccordion(catSlug) {
  // Accordion toggle is active on mobile screens (≤768px)
  if (window.innerWidth > 768) return;

  const blockEl = document.getElementById(catSlug);
  if (!blockEl) return;

  const headerEl = blockEl.querySelector('.category-table-header');
  const wasOpen = blockEl.classList.contains('is-open');

  if (wasOpen) {
    blockEl.classList.remove('is-open');
    blockEl.classList.add('is-collapsed');
    mobileOpenCategories.delete(catSlug);
    if (headerEl) headerEl.setAttribute('aria-expanded', 'false');
  } else {
    blockEl.classList.remove('is-collapsed');
    blockEl.classList.add('is-open');
    mobileOpenCategories.add(catSlug);
    if (headerEl) headerEl.setAttribute('aria-expanded', 'true');

    // Smooth scroll into view if header is near top edge or offscreen
    setTimeout(() => {
      const rect = blockEl.getBoundingClientRect();
      if (rect.top < 60 || rect.top > window.innerHeight - 100) {
        const yOffset = -75;
        const y = rect.top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 60);
  }
}

function renderPriceListTable() {
  const container = document.getElementById('priceListContainer');
  const pillsContainer = document.getElementById('categoryPillsScroll');
  const jumpSelect = document.getElementById('categoryJumpSelect');

  if (!container) return;

  const products = getBrandProducts(currentBrand);
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="table-empty-state">
        <div class="empty-icon">🎆</div>
        <h3>Loading Crackers Price List...</h3>
        <p>Direct wholesale items for ${currentBrand} will appear here.</p>
      </div>`;
    return;
  }

  // Filter products by search query if any
  let filteredProducts = products;
  if (currentSearchQuery.trim()) {
    const q = currentSearchQuery.toLowerCase().trim();
    filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tamilName && p.tamilName.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }


  // Group products by category
  const categoriesMap = {};
  filteredProducts.forEach(p => {
    if (!categoriesMap[p.category]) {
      categoriesMap[p.category] = [];
    }
    categoriesMap[p.category].push(p);
  });

  const categoryNames = Object.keys(categoriesMap);

  // 1. Render Category Jump Select & Pills
  if (jumpSelect) {
    let selectHTML = `<option value="all">⚡ Jump to All Categories (${categoryNames.length})</option>`;
    categoryNames.forEach((catName, idx) => {
      const catSlug = `cat-${currentBrand}-${idx}`;
      selectHTML += `<option value="${catSlug}">${catName} (${categoriesMap[catName].length})</option>`;
    });
    jumpSelect.innerHTML = selectHTML;
  }

  if (pillsContainer) {
    let pillsHTML = `
      <button type="button" class="category-pill-btn ${currentCategoryFilter === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">
        <span>✨ All Categories</span>
        <span class="pill-badge">${filteredProducts.length}</span>
      </button>`;

    categoryNames.forEach((catName, idx) => {
      const catSlug = `cat-${currentBrand}-${idx}`;
      const isActive = currentCategoryFilter === catSlug;
      pillsHTML += `
        <button type="button" class="category-pill-btn ${isActive ? 'active' : ''}" onclick="filterByCategory('${catSlug}')">
          <span>${catName}</span>
          <span class="pill-badge">${categoriesMap[catName].length}</span>
        </button>`;
    });
    pillsContainer.innerHTML = pillsHTML;
  }

  // 2. Render Full-Width Wholesale Price List Table
  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="table-empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No Crackers Found</h3>
        <p>No products match "<strong>${escapeHtml(currentSearchQuery)}</strong>". Please try another search term.</p>
        <button type="button" class="btn btn-primary" onclick="clearTableSearch()">Clear Search</button>
      </div>`;
    return;
  }

  let tableHTML = '';
  let globalIndex = 1;
  const isSearching = currentSearchQuery.trim().length > 0;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  categoryNames.forEach((catName, catIdx) => {
    const catSlug = `cat-${currentBrand}-${catIdx}`;
    const items = categoriesMap[catName];

    // Check if category is filtered out
    if (currentCategoryFilter !== 'all' && currentCategoryFilter !== catSlug) {
      return;
    }

    // Determine initial accordion open state:
    // On desktop (>768px) CSS keeps everything visible.
    // On mobile: if searching, expand all; otherwise first category is open, others toggle.
    let isOpen = true;
    if (isMobile && !isSearching) {
      if (mobileOpenCategories.size > 0) {
        isOpen = mobileOpenCategories.has(catSlug);
      } else {
        isOpen = (catIdx === 0);
        if (isOpen) mobileOpenCategories.add(catSlug);
      }
    } else if (isSearching) {
      mobileOpenCategories.add(catSlug);
      isOpen = true;
    }

    tableHTML += `
      <div class="category-table-block ${isOpen ? 'is-open' : 'is-collapsed'}" id="${catSlug}">
        <div class="category-table-header" onclick="toggleCategoryAccordion('${catSlug}')" onkeydown="if(event.key==='Enter'||event.key===' '){toggleCategoryAccordion('${catSlug}');event.preventDefault();}" role="button" tabindex="0" aria-expanded="${isOpen}">
          <div class="cat-header-title">
            <span class="cat-header-icon"><i class="fa-solid fa-burst"></i></span>
            <h3>${catName}</h3>
          </div>
          <div class="cat-header-right">
            <span class="cat-header-count">${items.length} Items</span>
            <span class="cat-accordion-arrow" title="Toggle products dropdown">
              <i class="fa-solid fa-chevron-down"></i>
            </span>
          </div>
        </div>

        <div class="category-body-collapse" id="collapse-${catSlug}">
          <div class="table-scroll-container">
            <table class="wholesale-price-table">
              <thead>
                <tr>
                  <th class="th-sno">S.No</th>
                  <th class="th-name">Product Name (பொருளின் பெயர்)</th>
                  <th class="th-pack">Content / Size</th>
                  <th class="th-mrp">Rate (₹)</th>
                  <th class="th-net">Our Price (80% Off)</th>
                  <th class="th-qty">Quantity</th>
                  <th class="th-total">Total (₹)</th>
                </tr>
              </thead>
              <tbody>`;

    items.forEach(item => {
      const qty = qtyMap[item.id] || 0;
      const rowTotal = item.price * qty;
      const isSelected = qty > 0;

      tableHTML += `
        <tr class="product-row ${isSelected ? 'row-selected' : ''}" id="row-${item.id}">
          <td class="td-sno">
            <span class="sno-num">${globalIndex++}</span>
            <span class="item-code-badge">${item.code || ''}</span>
          </td>
          <td class="td-name">
            <div class="prod-name-box">
              <strong class="prod-eng-name">${item.name}</strong>
              <span class="prod-tamil-name">${item.tamilName || ''}</span>
            </div>
          </td>
          <td class="td-pack">
            <span class="pack-badge">${item.packInfo}</span>
          </td>
          <td class="td-mrp">
            <span class="mrp-strikethrough">₹${item.mrp.toLocaleString('en-IN')}</span>
          </td>
          <td class="td-net">
            <span class="mobile-mrp-strike">₹${item.mrp.toLocaleString('en-IN')}</span>
            <strong class="net-price-highlight">₹${item.price.toLocaleString('en-IN')}</strong>
            <span class="discount-micro-badge">80% OFF</span>
          </td>
          <td class="td-qty">
            <div class="qty-touch-stepper">
              <button type="button" class="btn-qty-minus" onclick="changeQty('${item.id}', -1)" aria-label="Decrease quantity">
                <i class="fa-solid fa-minus"></i>
              </button>
              <input type="number" 
                class="qty-numeric-input" 
                id="qtyInput-${item.id}" 
                value="${qty}" 
                min="0" 
                max="999" 
                onchange="setQtyDirect('${item.id}', this.value)" 
                oninput="setQtyDirect('${item.id}', this.value)"
                aria-label="Quantity for ${item.name}">
              <button type="button" class="btn-qty-plus" onclick="changeQty('${item.id}', 1)" aria-label="Increase quantity">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
          </td>
          <td class="td-total">
            <strong class="row-total-val" id="rowTotal-${item.id}">₹${rowTotal.toLocaleString('en-IN')}</strong>
          </td>
        </tr>`;
    });

    tableHTML += `
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = tableHTML;
}

// ==========================================
// FAST QUANTITY ADJUSTMENT & LIVE CALCULATION
// ==========================================
function changeQty(productId, delta) {
  const current = qtyMap[productId] || 0;
  const newQty = Math.max(0, current + delta);
  setQtyDirect(productId, newQty);
}

function setQtyDirect(productId, val) {
  let qty = parseInt(val, 10);
  if (isNaN(qty) || qty < 0) qty = 0;
  if (qty > 999) qty = 999;

  qtyMap[productId] = qty;

  // Find product details across all brands
  let product = null;
  for (const bSlug in window.ALL_BRANDS_PRODUCTS) {
    const p = window.ALL_BRANDS_PRODUCTS[bSlug].find(item => item.id === productId);
    if (p) { product = p; break; }
  }

  if (!product) return;

  // 1. Update Input element if value doesn't match
  const inputEl = document.getElementById(`qtyInput-${productId}`);
  if (inputEl && parseInt(inputEl.value, 10) !== qty) {
    inputEl.value = qty;
  }

  // 2. Update Row Total & Selected Class
  const rowEl = document.getElementById(`row-${productId}`);
  const rowTotalEl = document.getElementById(`rowTotal-${productId}`);
  const rowTotal = product.price * qty;

  if (rowTotalEl) {
    rowTotalEl.innerText = `₹${rowTotal.toLocaleString('en-IN')}`;
  }

  if (rowEl) {
    if (qty > 0) {
      rowEl.classList.add('row-selected');
    } else {
      rowEl.classList.remove('row-selected');
    }
  }

  // 3. Synchronize Cart Array
  const existingIndex = cart.findIndex(item => item.id === productId);
  if (qty > 0) {
    if (existingIndex > -1) {
      cart[existingIndex].qty = qty;
    } else {
      cart.push({
        id: product.id,
        brand: product.brand,
        code: product.code,
        name: product.name,
        tamilName: product.tamilName || '',
        packInfo: product.packInfo,
        mrp: product.mrp,
        price: product.price,
        qty: qty
      });
    }
  } else {
    if (existingIndex > -1) {
      cart.splice(existingIndex, 1);
    }
  }

  // 4. Save to Local Storage & Update Totals
  saveCartToStorage();
  updateStickySummaryBar();
  updateCartDrawerUI();

  const coModal = document.getElementById('checkoutModalOverlay');
  if (coModal && coModal.classList.contains('active')) {
    populateCheckoutSummary();
  }
}

function updateStickySummaryBar() {
  let totalItems = 0;
  let totalBoxes = 0;
  let netTotal = 0;
  let totalMrp = 0;

  cart.forEach(item => {
    totalItems++;
    totalBoxes += item.qty;
    netTotal += item.price * item.qty;
    totalMrp += item.mrp * item.qty;
  });

  const savings = Math.max(0, totalMrp - netTotal);

  // Update Sticky Bar Elements
  const stickyItemsEl = document.getElementById('stickyTotalItems');
  const stickyBoxesEl = document.getElementById('stickyTotalBoxes');
  const stickyNetEl = document.getElementById('stickyNetTotal');
  const stickySavingsEl = document.getElementById('stickyMrpSavings');
  const minStatusEl = document.getElementById('stickyMinOrderStatus');
  const cartBadgeEl = document.getElementById('cartCountBadge');

  if (stickyItemsEl) stickyItemsEl.innerText = totalItems;
  if (stickyBoxesEl) stickyBoxesEl.innerText = totalBoxes;
  if (stickyNetEl) stickyNetEl.innerText = `₹${netTotal.toLocaleString('en-IN')}`;
  if (cartBadgeEl) cartBadgeEl.innerText = totalBoxes;

  if (stickySavingsEl) {
    if (savings > 0) {
      stickySavingsEl.style.display = 'inline';
      stickySavingsEl.innerText = `(You Save: ₹${savings.toLocaleString('en-IN')})`;
    } else {
      stickySavingsEl.style.display = 'none';
    }
  }

  // Minimum Order Tracker (₹3,000 Flat)
  if (minStatusEl) {
    if (netTotal === 0) {
      minStatusEl.innerHTML = `<span class="min-order-tag">⚠️ Minimum order value: ₹3,000</span>`;
    } else if (netTotal < 3000) {
      const remaining = 3000 - netTotal;
      minStatusEl.innerHTML = `<span class="min-order-progress">Add ₹${remaining.toLocaleString('en-IN')} more to reach Minimum Order (₹3,000)</span>`;
    } else {
      minStatusEl.innerHTML = `<span class="min-order-success">🎉 Minimum Order Met! Ready for Direct Sivakasi Dispatch</span>`;
    }
  }
}

function clearAllCartItems() {
  if (cart.length === 0) {
    showToast('Your cart is already empty!');
    return;
  }
  if (confirm('Are you sure you want to reset all selected quantities?')) {
    cart = [];
    qtyMap = {};
    saveCartToStorage();
    renderPriceListTable();
    updateStickySummaryBar();
    updateCartDrawerUI();
    showToast('All quantities have been reset.');
  }
}

// ==========================================
// SEARCH & CATEGORY NAVIGATION
// ==========================================
function handleTableSearch(val) {
  currentSearchQuery = val || '';
  const isNotEmpty = Boolean(val && val.trim());
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) {
    clearBtn.style.display = isNotEmpty ? 'flex' : 'none';
  }
  const headerClearBtn = document.getElementById('headerSearchClear');
  if (headerClearBtn) {
    headerClearBtn.style.display = isNotEmpty ? 'flex' : 'none';
  }
  const headerInput = document.getElementById('headerGlobalSearch');
  if (headerInput && headerInput.value !== val) {
    headerInput.value = val;
  }
  renderPriceListTable();
}

function handleHeaderSearch(val) {
  const tableSearchInput = document.getElementById('catalogSearch');
  if (tableSearchInput && tableSearchInput.value !== val) {
    tableSearchInput.value = val;
  }
  handleTableSearch(val);
  if (val && val.trim()) {
    const productsEl = document.getElementById('products');
    if (productsEl) {
      const topOffset = productsEl.getBoundingClientRect().top + window.pageYOffset - 120;
      if (window.pageYOffset < topOffset - 250) {
        window.scrollTo({ top: topOffset, behavior: 'smooth' });
      }
    }
  }
}

function clearTableSearch() {
  currentSearchQuery = '';
  const searchInput = document.getElementById('catalogSearch');
  if (searchInput) searchInput.value = '';
  const headerInput = document.getElementById('headerGlobalSearch');
  if (headerInput) headerInput.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  const headerClearBtn = document.getElementById('headerSearchClear');
  if (headerClearBtn) headerClearBtn.style.display = 'none';
  renderPriceListTable();
}

function clearHeaderSearch() {
  clearTableSearch();
}

function resolveCategorySlug(slug) {
  if (!slug || slug === 'all') return 'all';
  if (/^cat-[a-zA-Z0-9]+-\d+$/.test(slug)) return slug;

  const products = (window.ALL_BRANDS_PRODUCTS && window.ALL_BRANDS_PRODUCTS[currentBrand]) ? window.ALL_BRANDS_PRODUCTS[currentBrand] : [];
  const categoryNames = [...new Set(products.map(p => p.category))];

  const slugKeywords = {
    'sparklers': ['sparkler', 'மத்தாப்பு', 'sparkle'],
    'sparkles': ['sparkler', 'மத்தாப்பு', 'sparkle'],
    'foundation': ['fountain', 'பவுண்டன்', 'flower', 'பூச்சட்டி'],
    'fountains': ['fountain', 'பவுண்டன்', 'flower', 'பூச்சட்டி'],
    'flower-pots': ['flower', 'பூச்சட்டி', 'koti', 'கோட்டி', 'fountain', 'பவுண்டன்'],
    'ground-chakkars': ['chakkar', 'சக்கரம்', 'wheel', 'வீல்'],
    'sound': ['sound', 'சவுண்ட்', 'bomb', 'பாம்', 'one sound', 'வெடி'],
    'sound-crackers': ['sound', 'சவுண்ட்', 'bomb', 'பாம்', 'one sound', 'வெடி'],
    'rockets': ['rocket', 'ராக்கெட்', 'bijili', 'பிஜிலி'],
    'fancy': ['fancy', 'பேன்சி', 'pipe', 'பைப்', 'shots', 'ஷாட்ஸ்', 'aerial'],
    'fancy-novelties': ['fancy', 'பேன்சி', 'pipe', 'பைப்', 'shots', 'ஷாட்ஸ்', 'aerial'],
    'aerial-shots': ['aerial', 'sky', 'வான', 'shot', 'ஷாட்ஸ்', 'shell', 'pipe', 'பைப்', 'pyro'],
    'one-sound-crackers': ['one sound', 'ஒன் சவுண்ட்', 'sound & bombs', 'sound cracker', 'thunder', 'bomb', 'பாம்', 'வெடி'],
    'multi-sound-walas': ['wala', 'வாலா', 'garland', 'சரவெடி', 'multi sound', 'மல்டி சவுண்ட்', 'sound cracker', 'சவுண்ட் வெடி'],
    'kids': ['kid', 'கிட்ஸ்', 'novelty', 'நாவல்டி', 'gun', 'துப்பாக்கி', 'pencil', 'பென்சில்'],
    'kids-special': ['kid', 'கிட்ஸ்', 'novelty', 'நாவல்டி', 'gun', 'துப்பாக்கி', 'pencil', 'பென்சில்'],
    'gift-boxes': ['gift', 'கிப்ட்', 'box', 'பாக்ஸ்', 'பரிசு'],
    'gift-box': ['gift', 'கிப்ட்', 'box', 'பாக்ஸ்', 'பரிசு'],
    'family-combo': ['combo', 'காம்போ', 'family', 'பேக்', 'pack', 'hamper'],
    'family-combos': ['combo', 'காம்போ', 'family', 'பேக்', 'pack', 'hamper'],
    'combos': ['combo', 'காம்போ', 'family', 'பேக்', 'pack', 'hamper']
  };

  const kws = slugKeywords[slug] || [slug.replace(/-/g, ' ')];
  let matchedIndex = -1;
  for (const kw of kws) {
    matchedIndex = categoryNames.findIndex(cat => cat.toLowerCase().includes(kw.toLowerCase()));
    if (matchedIndex !== -1) break;
  }

  if (matchedIndex !== -1) {
    return `cat-${currentBrand}-${matchedIndex}`;
  }

  return 'all';
}

// Interactive 80% Offer Popup Badge Toggle
function toggleOfferBadgePopup(open) {
  const popup = document.getElementById('festiveOfferPopup');
  const badge = document.getElementById('festiveFloatingBadge');
  if (!popup) return;
  const isCurrentlyOpen = popup.classList.contains('is-active');
  const shouldOpen = (typeof open === 'boolean') ? open : !isCurrentlyOpen;
  if (shouldOpen) {
    popup.classList.add('is-active');
    if (badge) badge.classList.add('badge-hidden');
  } else {
    popup.classList.remove('is-active');
    if (badge) badge.classList.remove('badge-hidden');
  }
}

// Automatically display 80% offer popup when page first opens
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    toggleOfferBadgePopup(true);
  }, 900);
});

function filterCategoryBySlug(slug) {
  closeMobileMenu();
  const resolvedSlug = resolveCategorySlug(slug);
  if (resolvedSlug !== 'all') {
    handleCategoryJump(resolvedSlug);
  } else {
    const searchTerm = slug.replace(/-/g, ' ');
    currentCategoryFilter = 'all';
    handleTableSearch(searchTerm);
    const tableSearchInput = document.getElementById('catalogSearch');
    if (tableSearchInput) tableSearchInput.value = searchTerm;
    const productsEl = document.getElementById('products');
    if (productsEl) {
      const yOffset = -85;
      const y = productsEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }
}

function showAllCrackers() {
  closeMobileMenu();
  filterByCategory('all');
  const selectEl = document.getElementById('categoryJumpSelect');
  if (selectEl) selectEl.value = 'all';
  const productsEl = document.getElementById('products');
  if (productsEl) {
    const yOffset = -85;
    const y = productsEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

function handleCategoryJump(catSlug) {
  const resolved = resolveCategorySlug(catSlug);
  if (resolved === 'all') {
    filterByCategory('all');
    const selectEl = document.getElementById('categoryJumpSelect');
    if (selectEl) selectEl.value = 'all';
    const productsEl = document.getElementById('products');
    if (productsEl) {
      const yOffset = -85;
      const y = productsEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    return;
  }
  mobileOpenCategories.add(resolved);
  filterByCategory(resolved);
  const selectEl = document.getElementById('categoryJumpSelect');
  if (selectEl) selectEl.value = resolved;
  setTimeout(() => {
    const targetEl = document.getElementById(resolved) || document.getElementById('products');
    if (targetEl) {
      const yOffset = -85;
      const y = targetEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, 50);
}

function filterByCategory(catSlug) {
  currentCategoryFilter = catSlug;
  if (catSlug !== 'all') {
    mobileOpenCategories.add(catSlug);
  }
  renderPriceListTable();
}

// ==========================================
// WHATSAPP DIRECT ORDER GENERATOR
// ==========================================
// ==========================================
// WHATSAPP DIRECT ORDER FLOW & DETAILS MODAL
// ==========================================
function sendWhatsAppDirectOrder(existingOrder = null) {
  const brand = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]) || window.BRANDS_CONFIG?.['ayyan'] || { name: 'Get Pattas Kadai', themeColor: '#ea580c' };
  const brandColor = brand.themeColor || '#ea580c';

  // If an existing order is provided (e.g. from invoice re-order or past order), trigger WhatsApp directly
  if (existingOrder) {
    executeWhatsAppSend(existingOrder);
    return;
  }

  // Validate cart
  if (!cart || cart.length === 0) {
    if (window.Swal) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimum Order Value: ₹3,000',
        html: `Your cart is empty!<br>Minimum order value for WhatsApp Order is <b>₹3,000</b>.<br>Please select cracker items to proceed.`,
        confirmButtonColor: brandColor,
        confirmButtonText: '<i class="fas fa-cart-plus"></i> Select Crackers'
      });
    } else {
      alert('⚠️ Your cart is empty! Minimum order value for WhatsApp Order is ₹3,000. Please select cracker items.');
    }
    const tableEl = document.getElementById('products') || document.getElementById('priceListContainer');
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  let netTotal = 0;
  cart.forEach(item => {
    netTotal += (item.price || 0) * (item.qty || 1);
  });

  if (netTotal < 3000) {
    const diff = 3000 - netTotal;
    if (window.Swal) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimum Order Value: ₹3,000',
        html: `Your current order total is <b>₹${netTotal.toLocaleString('en-IN')}</b>.<br>WhatsApp Order requires a minimum purchase of <b>₹3,000</b>.<br>Please add <b>₹${diff.toLocaleString('en-IN')}</b> more crackers to proceed with WhatsApp Order!`,
        confirmButtonColor: brandColor,
        confirmButtonText: '<i class="fas fa-plus-circle"></i> Add More Items'
      });
    } else {
      alert(`⚠️ Minimum WhatsApp order value is ₹3,000.\nYour current total is ₹${netTotal.toLocaleString('en-IN')}.\nPlease add ₹${diff.toLocaleString('en-IN')} more to proceed!`);
    }
    const tableEl = document.getElementById('products') || document.getElementById('priceListContainer');
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Open WhatsApp Order Details Modal for customer to fill contact & delivery details
  openWhatsAppOrderModal();
}

function openWhatsAppOrderModal() {
  const modal = document.getElementById('whatsAppOrderModalOverlay');
  if (!modal) {
    executeWhatsAppSend(null);
    return;
  }

  let totalBoxes = 0;
  let netTotal = 0;
  let totalMrp = 0;

  cart.forEach((item) => {
    const rowTot = (item.price || 0) * (item.qty || 1);
    totalBoxes += (item.qty || 1);
    netTotal += rowTot;
    totalMrp += (item.mrp || item.price || 0) * (item.qty || 1);
  });

  const savings = Math.max(0, totalMrp - netTotal);

  const itemCountEl = document.getElementById('waModalItemCount');
  const boxCountEl = document.getElementById('waModalBoxCount');
  const mrpEl = document.getElementById('waModalMrp');
  const savingsEl = document.getElementById('waModalSavings');
  const netTotalEl = document.getElementById('waModalNetTotal');

  if (itemCountEl) itemCountEl.innerText = cart.length;
  if (boxCountEl) boxCountEl.innerText = totalBoxes;
  if (mrpEl) mrpEl.innerText = '₹' + totalMrp.toLocaleString('en-IN');
  if (savingsEl) savingsEl.innerText = '₹' + savings.toLocaleString('en-IN');
  if (netTotalEl) netTotalEl.innerText = '₹' + netTotal.toLocaleString('en-IN');

  // Pre-populate saved customer details if available
  const savedCust = getSavedCustomerDetails();
  if (savedCust) {
    const nameInput = document.getElementById('waCustName');
    const phoneInput = document.getElementById('waCustPhone');
    const streetInput = document.getElementById('waCustStreet');
    const cityInput = document.getElementById('waCustCity');
    const stateInput = document.getElementById('waCustState');
    const pinInput = document.getElementById('waCustPincode');
    const emailInput = document.getElementById('waCustEmail');

    if (nameInput && !nameInput.value) nameInput.value = savedCust.name || ((savedCust.firstName || '') + ' ' + (savedCust.lastName || '')).trim();
    if (phoneInput && !phoneInput.value) phoneInput.value = (savedCust.phone || '').replace(/\D/g, '').slice(-10);
    if (streetInput && !streetInput.value) streetInput.value = savedCust.street || savedCust.address || '';
    if (cityInput && !cityInput.value) cityInput.value = savedCust.city || '';
    if (stateInput && savedCust.state) stateInput.value = savedCust.state;
    if (pinInput && !pinInput.value) pinInput.value = savedCust.pincode || '';
    if (emailInput && !emailInput.value) emailInput.value = savedCust.email || '';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWhatsAppOrderModal(e) {
  if (e && e.target && e.target.id !== 'whatsAppOrderModalOverlay' && e !== true) return;
  const modal = document.getElementById('whatsAppOrderModalOverlay');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function handleWhatsAppOrderSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const brand = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]) || window.BRANDS_CONFIG?.['ayyan'] || { name: 'Get Pattas Kadai', themeColor: '#ea580c' };
  const brandColor = brand.themeColor || '#ea580c';

  if (!cart || cart.length === 0) {
    alert('Your cart is empty!');
    closeWhatsAppOrderModal(true);
    return;
  }

  const custName = document.getElementById('waCustName')?.value.trim();
  const rawPhone = document.getElementById('waCustPhone')?.value.trim().replace(/\D/g, '');
  const custStreet = document.getElementById('waCustStreet')?.value.trim();
  const custCity = document.getElementById('waCustCity')?.value.trim();
  const custState = document.getElementById('waCustState')?.value || 'Tamil Nadu';
  const custPincode = document.getElementById('waCustPincode')?.value.trim();
  const custEmail = document.getElementById('waCustEmail')?.value.trim() || '';

  if (!custName) {
    alert('Please enter your full name.');
    return;
  }
  if (!rawPhone || rawPhone.length < 10) {
    alert('Please enter a valid 10-digit WhatsApp / mobile number.');
    return;
  }
  const custPhone = rawPhone.slice(-10);

  if (!custStreet || !custCity) {
    alert('Please provide your complete street address and city.');
    return;
  }

  const custFullAddress = [custStreet, custCity, custState, custPincode].filter(Boolean).join(', ');

  // Save details in local storage for seamless re-orders & future checkout
  try {
    const toSave = {
      name: custName,
      phone: custPhone,
      email: custEmail,
      street: custStreet,
      city: custCity,
      state: custState,
      pincode: custPincode,
      address: custFullAddress
    };
    localStorage.setItem(getShopStorageKey('checkout_saved_address'), JSON.stringify(toSave));
  } catch (err) { }

  let totalBoxes = 0;
  let netTotal = 0;
  let totalMrp = 0;

  cart.forEach((item) => {
    const rowTot = (item.price || 0) * (item.qty || 1);
    totalBoxes += (item.qty || 1);
    netTotal += rowTot;
    totalMrp += (item.mrp || item.price || 0) * (item.qty || 1);
  });

  const shopCode = getShopShortCode ? getShopShortCode(currentBrand) : '004';
  const shopTitle = getShopInvoiceTitle ? getShopInvoiceTitle(currentBrand) : 'Get Pattas Kadai';
  const bookingNumber = `Get-Pattas-BookNo-${shopCode}-WA-${Math.floor(10000 + Math.random() * 90000)}`;

  const orderRecord = {
    orderId: bookingNumber,
    bookingNumber: bookingNumber,
    brand: currentBrand,
    brandName: shopTitle,
    customerName: custName,
    phone: custPhone,
    email: custEmail,
    address: custFullAddress,
    city: custCity,
    state: custState,
    pincode: custPincode,
    customer: {
      name: custName,
      phone: custPhone,
      email: custEmail,
      address: custFullAddress,
      city: custCity,
      state: custState,
      pincode: custPincode
    },
    items: cart.map(i => ({
      id: i.id || '',
      name: i.name,
      tamilName: i.tamilName || '',
      pack: i.packInfo || i.pack || 'Box',
      qty: i.qty,
      price: i.price,
      subtotal: i.price * i.qty
    })),
    totalAmount: netTotal,
    totalItems: cart.length,
    totalBoxes: totalBoxes,
    paymentMethod: 'WhatsApp Direct',
    utrRef: '',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  // 1. Sync order to Admin panel local storage
  try {
    const existing = JSON.parse(localStorage.getItem('admin_orders_sync') || '[]');
    existing.unshift(orderRecord);
    localStorage.setItem('admin_orders_sync', JSON.stringify(existing));
  } catch (e) { }

  // 2. Post to backend REST API so it is saved in MongoDB / Memory Store
  try {
    fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderRecord)
    }).catch(() => { });
  } catch (e) { }

  // 3. Broadcast real-time sync event across all browser tabs & Admin Dashboard
  if (syncChannel) {
    syncChannel.postMessage({ type: 'ORDER_PLACED', order: orderRecord });
  }

  // 4. Construct WhatsApp wholesale order message
  const currentOrigin = (window.location.protocol && window.location.protocol.startsWith('http'))
    ? window.location.origin
    : 'http://localhost:5000';
  const invoiceWebUrl = (window.location.protocol === 'file:')
    ? 'invoice.html?bn=' + bookingNumber
    : `${currentOrigin}/invoice.html?bn=${bookingNumber}`;

  let message = `💥 *${shopTitle.toUpperCase()} - DIWALI WHOLESALE BOOKING*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *BOOKING NUMBER:* *${bookingNumber}*\n`;
  message += `🏬 *Store:* ${shopTitle}\n`;
  message += `📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *CUSTOMER DETAILS:*\n`;
  message += `• Name: *${custName}*\n`;
  message += `• Mobile / WhatsApp: *+91 ${custPhone}*\n`;
  if (custEmail) message += `• Email: ${custEmail}\n`;
  message += `• Delivery Address: *${custFullAddress}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📦 *ORDER ITEMS LIST:*\n`;

  cart.forEach((item, idx) => {
    const rowTot = (item.price || 0) * (item.qty || 1);
    message += `${idx + 1}. *${item.name}* (${item.tamilName || ''})\n`;
    message += `   • Size/Pack: ${item.packInfo || item.pack || 'Box'}\n`;
    message += `   • Qty: *${item.qty} Boxes* × ₹${item.price} = *₹${rowTot.toLocaleString('en-IN')}*\n`;
  });

  const savings = Math.max(0, totalMrp - netTotal);

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📊 *Total Quantity:* ${totalBoxes} Boxes (${cart.length} Varieties)\n`;
  message += `💰 *Original MRP:* ~₹${totalMrp.toLocaleString('en-IN')}~\n`;
  message += `🔥 *Wholesale Net Total:* *₹${netTotal.toLocaleString('en-IN')}*\n`;
  message += `🎉 *Your Savings (80% Off):* *₹${savings.toLocaleString('en-IN')}*\n`;
  message += `🚚 *Delivery:* Direct Sivakasi Factory Transport (To-Pay LR)\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Please confirm my order and share dispatch details. Thank you!\n`;
  message += `📄 *Digital Invoice PDF:* ${invoiceWebUrl}`;

  const targetDeskPhone = (brand.phone || '8610451118').replace(/[^0-9]/g, '');
  const deskWaUrl = `https://wa.me/91${targetDeskPhone.slice(-10)}?text=${encodeURIComponent(message)}`;

  // Close the WhatsApp details modal
  closeWhatsAppOrderModal(true);

  // Open WhatsApp in a new tab
  window.open(deskWaUrl, '_blank');

  // Reset cart
  cart = [];
  qtyMap = {};
  saveCartToStorage();
  renderPriceListTable();
  updateStickySummaryBar();

  // Show Order Confirmation Popup (SweetAlert or Fallback)
  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: '<span style="font-size:23px;font-weight:800;color:#15803d;">🎉 WhatsApp Order Received!</span>',
      html: `
        <div style="text-align: left; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 16px; margin: 14px 0; font-size: 13.5px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #bbf7d0; padding-bottom: 6px;">
            <span style="font-weight: 700; color: #166534;">Booking Number:</span>
            <span style="background: #dcfce7; color: #15803d; font-weight: 800; font-family: monospace; font-size: 14px; padding: 2px 8px; border-radius: 6px;">${bookingNumber}</span>
          </div>
          <div style="margin-bottom: 4px; color: #334155;"><b>Store:</b> ${escapeHtml(shopTitle)}</div>
          <div style="margin-bottom: 4px; color: #334155;"><b>Customer:</b> ${escapeHtml(custName)} (+91 ${escapeHtml(custPhone)})</div>
          <div style="margin-bottom: 4px; color: #334155;"><b>Delivery:</b> ${escapeHtml(custFullAddress)}</div>
          <div style="margin-bottom: 4px; color: #334155;"><b>Items Booked:</b> ${totalBoxes} Boxes (${orderRecord.totalItems} Varieties)</div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #86efac; padding-top: 8px; margin-top: 8px;">
            <span style="font-weight: 700; color: #1e293b; font-size: 15px;">Wholesale Total:</span>
            <span style="font-weight: 800; color: #15803d; font-size: 18px;">₹${netTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div style="font-size: 12.5px; color: #15803d; margin-bottom: 10px; text-align: center; font-weight: 600;">
          ✅ Order synced with Sivakasi Admin & opened in WhatsApp!
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#0284c7',
      confirmButtonText: '<i class="fab fa-whatsapp" style="margin-right:4px;"></i> Open WhatsApp Chat',
      cancelButtonText: '<i class="fas fa-file-invoice" style="margin-right:4px;"></i> View Invoice PDF'
    }).then((result) => {
      if (result.isConfirmed) {
        window.open(deskWaUrl, '_blank');
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        window.open(invoiceWebUrl, '_blank');
      }
    });
  }
}

function executeWhatsAppSend(existingOrder) {
  const brand = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]) || window.BRANDS_CONFIG?.['ayyan'] || { name: 'Get Pattas Kadai', themeColor: '#ea580c' };
  const orderItems = existingOrder ? existingOrder.items : cart;

  let totalBoxes = 0;
  let netTotal = 0;
  let totalMrp = 0;

  orderItems.forEach((item) => {
    const rowTot = (item.price || 0) * (item.qty || 1);
    totalBoxes += (item.qty || 1);
    netTotal += rowTot;
    totalMrp += (item.mrp || item.price || 0) * (item.qty || 1);
  });

  const savedCust = getSavedCustomerDetails();
  const custName = existingOrder?.customerName || savedCust?.name || 'Valued Customer';
  const custPhone = existingOrder?.phone || savedCust?.phone || '';
  const custAddr = existingOrder?.address || (savedCust ? `${savedCust.street || savedCust.address || ''}, ${savedCust.city || ''} - ${savedCust.pincode || ''}` : '');

  let message = `💥 *Get Pattas KADAI - DIWALI WHOLESALE ORDER ESTIMATE*\n`;
  message += `🏢 *Brand:* ${brand.name}\n`;
  message += `-------------------------------------------\n`;
  if (existingOrder?.bookingNumber || existingOrder?.orderId) {
    message += `📋 *Booking Number:* *${existingOrder.bookingNumber || existingOrder.orderId}*\n`;
  }
  message += `*ORDER ITEMS LIST:*\n`;

  orderItems.forEach((item, idx) => {
    const rowTot = (item.price || 0) * (item.qty || 1);
    message += `${idx + 1}. *${item.name}* (${item.tamilName || ''})\n`;
    message += `   • Size/Pack: ${item.pack || item.packInfo || 'Box'}\n`;
    message += `   • Qty: *${item.qty} Boxes* × ₹${item.price} = *₹${rowTot.toLocaleString('en-IN')}*\n`;
  });

  const savings = Math.max(0, totalMrp - netTotal);

  message += `-------------------------------------------\n`;
  message += `📦 *Total Items:* ${orderItems.length} items (${totalBoxes} Boxes)\n`;
  message += `💰 *Original MRP:* ~₹${totalMrp.toLocaleString('en-IN')}~\n`;
  message += `🔥 *Wholesale Net Total:* *₹${netTotal.toLocaleString('en-IN')}*\n`;
  message += `🎉 *Your Total Savings (80% Off):* *₹${savings.toLocaleString('en-IN')}*\n`;
  message += `-------------------------------------------\n`;
  if (custName) message += `👤 *Customer Name:* ${custName}\n`;
  if (custPhone) message += `📞 *Phone:* ${custPhone}\n`;
  if (custAddr) message += `📍 *Delivery Address:* ${custAddr}\n`;
  message += `-------------------------------------------\n`;
  message += `🚚 *Delivery:* Direct Sivakasi Factory Transport\n`;
  message += `Please confirm my order and share invoice/payment details. Thank you!`;

  const phoneNum = (brand.phone || '8610451118').replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

function getSavedCustomerDetails() {
  try {
    const local = localStorage.getItem(getShopStorageKey('checkout_saved_address'));
    if (local) return JSON.parse(local);
  } catch (e) { }
  return null;
}

// ==========================================
// CART STORAGE & CART DRAWER (ISOLATED PER SHOP)
// ==========================================
function saveCartToStorage() {
  try {
    localStorage.setItem(getShopStorageKey('get_pattasu_cart'), JSON.stringify(cart));
    localStorage.setItem(getShopStorageKey('get_pattasu_qty_map'), JSON.stringify(qtyMap));
  } catch (e) { }
}

function loadCartFromStorage() {
  try {
    const savedCart = localStorage.getItem(getShopStorageKey('get_pattasu_cart'));
    const savedQtyMap = localStorage.getItem(getShopStorageKey('get_pattasu_qty_map'));
    if (savedCart) cart = JSON.parse(savedCart) || [];
    if (savedQtyMap) qtyMap = JSON.parse(savedQtyMap) || {};
  } catch (e) {
    cart = [];
    qtyMap = {};
  }
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop') || document.getElementById('cartOverlay');
  if (!drawer) return;
  drawer.classList.toggle('active');
  if (backdrop) backdrop.classList.toggle('active');
  if (drawer.classList.contains('active')) {
    updateCartDrawerUI();
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop') || document.getElementById('cartOverlay');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
}

function updateCartDrawerUI() {
  const listEl = document.getElementById('cartDrawerItemsList') || document.getElementById('cartDrawerBody');
  const subtotalEl = document.getElementById('cartDrawerSubtotal') || document.getElementById('summaryTotal');
  const countEl = document.getElementById('cartDrawerItemCount') || document.getElementById('cartDrawerCount');
  const summaryMrpEl = document.getElementById('summaryMRP');

  if (!listEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = `
      <div class="empty-cart-state" style="text-align: center; padding: 2.5rem 1rem;">
        <span class="empty-cart-icon" style="font-size: 3rem; display: block; margin-bottom: 0.8rem; color: #cbd5e1;"><i class="fa-solid fa-cart-shopping"></i></span>
        <h4 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Your Festival Cart is Empty</h4>
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.2rem;">Explore our genuine Sivakasi wholesale price list and add your favorite crackers!</p>
        <button class="btn btn-primary" onclick="closeCartDrawer(); (document.getElementById('products') || document.getElementById('priceListContainer'))?.scrollIntoView({behavior: 'smooth'})" style="padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700;"><i class="fa-solid fa-cart-shopping"></i> Browse Price List</button>
      </div>`;
    if (subtotalEl) subtotalEl.innerText = '₹0';
    if (summaryMrpEl) summaryMrpEl.innerText = '₹0';
    if (countEl) countEl.innerText = '0 Items';
    return;
  }

  let subtotal = 0;
  let totalMrp = 0;
  let totalBoxes = 0;
  let html = '';

  cart.forEach(item => {
    const rowTot = item.price * item.qty;
    subtotal += rowTot;
    totalMrp += (item.mrp || item.price) * item.qty;
    totalBoxes += item.qty;

    html += `
      <div class="cart-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 0; border-bottom: 1px solid #f1f5f9; gap: 0.5rem;">
        <div class="cart-item-info" style="flex: 1; min-width: 0;">
          <div class="cart-item-name" style="font-weight: 700; font-size: 0.9rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
          <div class="cart-item-tamil" style="font-size: 0.75rem; color: #ea580c; font-weight: 600;">${item.tamilName || ''}</div>
          <div class="cart-item-pack" style="font-size: 0.75rem; color: #64748b;">${item.packInfo} • ₹${item.price} each</div>
        </div>
        <div class="cart-item-actions" style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="stepper-wrap-mini" style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
            <button class="btn-qty-mini" onclick="changeQty('${item.id}', -1)" style="padding: 0.2rem 0.5rem; background: #f8fafc; border: none; font-weight: bold; cursor: pointer;">−</button>
            <span class="qty-num-mini" style="padding: 0.2rem 0.6rem; font-weight: 700; font-size: 0.85rem;">${item.qty}</span>
            <button class="btn-qty-mini" onclick="changeQty('${item.id}', 1)" style="padding: 0.2rem 0.5rem; background: #f8fafc; border: none; font-weight: bold; cursor: pointer;">+</button>
          </div>
          <div class="cart-item-subtotal" style="font-weight: 700; font-size: 0.9rem; color: #0f172a; min-width: 60px; text-align: right;">₹${rowTot.toLocaleString('en-IN')}</div>
          <button class="btn-remove-item" onclick="changeQty('${item.id}', -${item.qty})" title="Remove item" style="background: none; border: none; color: #ef4444; font-size: 1rem; cursor: pointer; padding: 0.2rem;">✕</button>
        </div>
      </div>`;
  });

  listEl.innerHTML = html;
  if (subtotalEl) subtotalEl.innerText = `₹${subtotal.toLocaleString('en-IN')}`;
  if (summaryMrpEl) summaryMrpEl.innerText = `₹${totalMrp.toLocaleString('en-IN')}`;
  if (countEl) countEl.innerText = `${cart.length} Items (${totalBoxes} Boxes)`;
}

// ==========================================
// CHECKOUT MODAL & ORDER PLACEMENT
// ==========================================
function openCheckoutModal() {
  closeMobileMenu();
  if (cart.length === 0) {
    showToast('⚠️ Please select at least 1 cracker item to proceed to checkout!');
    const tableEl = document.getElementById('products') || document.getElementById('priceListContainer');
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  let checkNetTotal = 0;
  cart.forEach(item => { checkNetTotal += item.price * item.qty; });
  if (checkNetTotal < 3000) {
    const diff = 3000 - checkNetTotal;
    const brandColor = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]?.themeColor) || '#ea580c';
    if (window.Swal) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimum Order Value: ₹3,000',
        html: `Your current cart total is <b>₹${checkNetTotal.toLocaleString('en-IN')}</b>.<br>Please add <b>₹${diff.toLocaleString('en-IN')}</b> more to meet the factory minimum wholesale order!`,
        confirmButtonColor: brandColor,
        confirmButtonText: '<i class="fas fa-plus-circle"></i> Add More Items'
      });
    } else {
      alert(`⚠️ Minimum order value is ₹3,000.\nPlease add ₹${diff.toLocaleString('en-IN')} more to reach the minimum order!`);
    }
    const tableEl = document.getElementById('products') || document.getElementById('priceListContainer');
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  closeCartDrawer();

  const coModal = document.getElementById('checkoutModalOverlay');
  if (coModal) {
    populateCheckoutSummary();
    populateCheckoutSavedAddresses();
    initCheckoutAutoSave();
    coModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function proceedToCheckoutModal() {
  openCheckoutModal();
}

function closeCheckoutModal(e) {
  if (e && e.target && e.target.id !== 'checkoutModalOverlay' && e !== true) {
    return;
  }
  const coModal = document.getElementById('checkoutModalOverlay');
  if (coModal) {
    coModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function populateCheckoutSummary() {
  const previewList = document.getElementById('coItemsPreviewList');
  const subtotalEl = document.getElementById('coSubtotal');
  const grandTotalEl = document.getElementById('coGrandTotal');

  if (!previewList) return;

  if (cart.length === 0) {
    previewList.innerHTML = `
      <div class="co-empty-state" style="text-align: center; padding: 2rem 0.5rem; color: #64748b;">
        <span style="font-size: 2.2rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem;"><i class="fa-solid fa-cart-shopping"></i></span>
        <h5 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Your Cart is Empty</h5>
        <p style="font-size: 0.8rem; margin-bottom: 1rem; color: #64748b;">Add cracker items to proceed with wholesale checkout.</p>
        <button type="button" class="btn btn-primary" onclick="closeCheckoutModal(true); (document.getElementById('products') || document.getElementById('priceListContainer'))?.scrollIntoView({behavior:'smooth'});" style="font-size: 0.82rem; padding: 0.4rem 0.9rem; border-radius: 6px;">
          <i class="fa-solid fa-plus"></i> Select Crackers
        </button>
      </div>`;
    if (subtotalEl) subtotalEl.innerText = '₹0';
    if (grandTotalEl) grandTotalEl.innerText = '₹0';
    updateCheckoutQrCode(0);
    return;
  }

  let netTotal = 0;
  let itemsHTML = '';

  cart.forEach(item => {
    const rowTot = item.price * item.qty;
    netTotal += rowTot;
    itemsHTML += `
      <div class="co-preview-item" id="co-item-${item.id}">
        <div class="co-preview-info">
          <strong class="co-preview-name" title="${item.name}">${item.name}</strong>
          <span class="co-preview-meta">${item.packInfo || 'Box'} • ₹${item.price} each</span>
        </div>
        <div class="co-preview-actions">
          <div class="co-stepper">
            <button type="button" class="co-btn-step co-btn-minus" onclick="changeQty('${item.id}', -1)" title="Decrease quantity (less)">−</button>
            <span class="co-qty-val">${item.qty}</span>
            <button type="button" class="co-btn-step co-btn-plus" onclick="changeQty('${item.id}', 1)" title="Increase quantity (plus)">+</button>
          </div>
          <strong class="co-preview-price">₹${rowTot.toLocaleString('en-IN')}</strong>
          <button type="button" class="co-btn-remove" onclick="clearCheckoutItem('${item.id}')" title="Remove item">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>`;
  });

  previewList.innerHTML = itemsHTML;
  if (subtotalEl) subtotalEl.innerText = `₹${netTotal.toLocaleString('en-IN')}`;
  if (grandTotalEl) grandTotalEl.innerText = `₹${netTotal.toLocaleString('en-IN')}`;

  // Update Universal UPI QR Code for payment
  updateCheckoutQrCode(netTotal);
}

function clearCheckoutItem(productId) {
  setQtyDirect(productId, 0);
}

function clearAllCheckoutItems() {
  if (!cart || cart.length === 0) return;
  if (window.Swal) {
    Swal.fire({
      title: 'Clear Entire Order?',
      text: 'Are you sure you want to remove all items from your checkout list?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Clear All'
    }).then((res) => {
      if (res.isConfirmed) {
        const ids = cart.map(i => i.id);
        ids.forEach(id => setQtyDirect(id, 0));
        populateCheckoutSummary();
      }
    });
  } else {
    if (confirm('Are you sure you want to clear all items from your checkout list?')) {
      const ids = cart.map(i => i.id);
      ids.forEach(id => setQtyDirect(id, 0));
      populateCheckoutSummary();
    }
  }
}

function updateCheckoutQrCode(amount) {
  const qrImg = document.getElementById('coUpiQrImage');
  const qrAmountEl = document.getElementById('coQrAmountText');
  const upiId = '8610451118@upi';
  const upiUrl = `upi://pay?pa=${upiId}&pn=GetPattasuKadai&am=${amount}&cu=INR&tn=DiwaliWholesaleOrder`;

  if (qrAmountEl) qrAmountEl.innerText = `₹${amount.toLocaleString('en-IN')}`;
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}&margin=4`;
  }
}

function handlePaymentOptionChange(val) {
  const qrBox = document.getElementById('coUpiQrBox');
  if (qrBox) {
    if (val === 'UPI_QR') {
      qrBox.style.display = 'block';
    } else {
      qrBox.style.display = 'none';
    }
  }
}

function copyMerchantUpiId() {
  const upiId = '8610451118@upi';
  navigator.clipboard?.writeText(upiId).then(() => {
    showToast('UPI ID copied: ' + upiId);
  }).catch(() => {
    showToast('UPI ID: ' + upiId);
  });
}

function clearCheckoutAddressForm() {
  const street = document.getElementById('coStreet');
  const apt = document.getElementById('coApartment');
  const city = document.getElementById('coCity');
  const pincode = document.getElementById('coPincode');
  const select = document.getElementById('coSavedAddressSelect');

  if (street) street.value = '';
  if (apt) apt.value = '';
  if (city) city.value = '';
  if (pincode) pincode.value = '';
  if (select) select.value = 'NEW';

  if (street) {
    street.focus();
    street.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  showToast('✏️ Ready for new address! Fill in street & city below.');
}

function initCheckoutAutoSave() {
  try {
    const saved = localStorage.getItem(getShopStorageKey('checkout_saved_address'));
    if (saved) {
      const data = JSON.parse(saved);
      applyAddressToCheckoutForm(data);
    }
  } catch (e) { }
  populateCheckoutSavedAddresses();
}

function applyAddressToCheckoutForm(data) {
  if (!data) return;
  if (document.getElementById('coEmail') && data.email) document.getElementById('coEmail').value = data.email;
  if (document.getElementById('coFirstName') && data.firstName) document.getElementById('coFirstName').value = data.firstName;
  if (document.getElementById('coLastName') && data.lastName) document.getElementById('coLastName').value = data.lastName;
  if (document.getElementById('coStreet')) document.getElementById('coStreet').value = data.street || data.addressLine || data.address || '';
  if (document.getElementById('coApartment') && data.apartment) document.getElementById('coApartment').value = data.apartment;
  if (document.getElementById('coCity') && data.city) document.getElementById('coCity').value = data.city;
  if (document.getElementById('coState') && data.state) document.getElementById('coState').value = data.state;
  if (document.getElementById('coPincode') && data.pincode) document.getElementById('coPincode').value = data.pincode;
  if (document.getElementById('coPhone') && data.phone) document.getElementById('coPhone').value = data.phone;
}

function populateCheckoutSavedAddresses() {
  const wrapper = document.getElementById('coSavedAddressWrapper');
  const select = document.getElementById('coSavedAddressSelect');
  if (!wrapper || !select) return;

  const key = getShopStorageKey('get_pattasu_addresses');
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (err) { list = []; }

  if (!list || list.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  wrapper.style.display = 'block';
  select.innerHTML = '<option value="">-- Choose from saved addresses (' + list.length + ') --</option>' +
    list.map(function (a) {
      return '<option value="' + a.id + '" ' + (a.isDefault ? 'selected' : '') + '>' +
        (a.label || 'Address') + ': ' + (a.street || a.address || '') + (a.city ? ' (' + a.city + ')' : '') + (a.isDefault ? ' ★ Default' : '') +
        '</option>';
    }).join('') +
    '<option value="NEW">+ Add New Address...</option>';
}

function handleCheckoutAddressSelect(addrId) {
  if (!addrId) return;
  if (addrId === 'NEW') {
    clearCheckoutAddressForm();
    return;
  }

  const key = getShopStorageKey('get_pattasu_addresses');
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (err) { list = []; }

  const addr = list.find(function (a) { return a.id === addrId; });
  if (!addr) return;

  applyAddressToCheckoutForm(addr);
  showToast('📍 Selected: ' + (addr.label || 'Delivery Address'));
}

function saveAddressFromCheckout(silent) {
  silent = Boolean(silent);
  const fName = document.getElementById('coFirstName')?.value.trim() || '';
  const lName = document.getElementById('coLastName')?.value.trim() || '';
  const fullName = (fName + ' ' + lName).trim() || fName || lName || (currentCustomer?.name || 'Valued Customer');
  const phone = document.getElementById('coPhone')?.value.trim() || (currentCustomer?.phone || '');
  const street = document.getElementById('coStreet')?.value.trim() || '';
  const apt = document.getElementById('coApartment')?.value.trim() || '';
  const city = document.getElementById('coCity')?.value.trim() || '';
  const state = document.getElementById('coState')?.value || 'Tamil Nadu';
  const pincode = document.getElementById('coPincode')?.value.trim() || '';
  const email = document.getElementById('coEmail')?.value.trim() || '';

  if (!street && !city) {
    if (!silent) showToast('⚠️ Please enter street address and city to save.');
    return false;
  }

  const fullStreet = apt ? (street + ', ' + apt) : street;
  const formattedAddress = fullStreet + ', ' + city + ' - ' + pincode + ', ' + state;

  const addressData = {
    id: 'addr_' + Date.now(),
    email: email,
    firstName: fName,
    lastName: lName,
    name: fullName,
    label: 'Delivery Address',
    street: fullStreet,
    city: city,
    state: state,
    pincode: pincode,
    phone: phone,
    address: formattedAddress,
    isDefault: true
  };

  try {
    localStorage.setItem(getShopStorageKey('checkout_saved_address'), JSON.stringify(addressData));

    // Also sync to customer's saved address book
    const key = getShopStorageKey('get_pattasu_addresses');
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (err) { list = []; }

    // Un-default other addresses
    list.forEach(function (a) { a.isDefault = false; });

    // Check if this address matches an existing entry
    const existingIdx = list.findIndex(function (a) {
      return a.street && a.street.toLowerCase() === fullStreet.toLowerCase() &&
        a.city && a.city.toLowerCase() === city.toLowerCase();
    });
    if (existingIdx >= 0) {
      list[existingIdx] = Object.assign({}, list[existingIdx], addressData);
    } else {
      list.unshift(addressData);
    }
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) { }

  populateCheckoutSavedAddresses();
  renderSavedAddresses();

  if (!silent) {
    showToast('💾 Default delivery address saved successfully!');
  }
  return true;
}

// ==========================================
// SHOP BRAND NAMING & CODE HELPERS (GLOBAL SCOPE)
// ==========================================
function getShopInvoiceTitle(brandKey) {
  return 'Get Pattas - Wholesale Shop-004';
}

function getShopShortCode(brandKey) {
  return '004';
}

function handleCheckoutFormSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  if (cart.length === 0) {
    if (window.Swal) {
      Swal.fire({
        icon: 'warning',
        title: 'Your Cart is Empty!',
        text: 'Please select crackers from the price list to place your order.',
        confirmButtonColor: '#ea580c'
      });
    } else {
      alert('⚠️ Your cart is empty! Please add crackers to your order first.');
    }
    return;
  }

  saveAddressFromCheckout(true);

  const paymentMode = document.querySelector('input[name="checkoutPayment"]:checked')?.value || 'UPI_QR';

  // Calculate Order Totals
  let netTotal = 0;
  let totalBoxes = 0;
  cart.forEach(item => {
    netTotal += item.price * item.qty;
    totalBoxes += item.qty;
  });

  if (netTotal < 3000) {
    const diff = 3000 - netTotal;
    const brandColor = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]?.themeColor) || '#ea580c';
    if (window.Swal) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimum Order Value: ₹3,000',
        html: `Your order total is <b>₹${netTotal.toLocaleString('en-IN')}</b>.<br>Please add <b>₹${diff.toLocaleString('en-IN')}</b> more items to complete your wholesale order.`,
        confirmButtonColor: brandColor,
        confirmButtonText: 'Add More Crackers'
      });
    } else {
      alert('⚠️ Minimum order value is ₹3,000. Please add more items to proceed.');
    }
    return;
  }

  const brandObj = window.BRANDS_CONFIG[currentBrand] || window.BRANDS_CONFIG['muthu'];
  const fName = document.getElementById('coFirstName')?.value.trim() || '';
  const lName = document.getElementById('coLastName')?.value.trim() || '';
  const custName = (fName + ' ' + lName).trim() || fName || lName || 'Online Customer';
  const custPhone = document.getElementById('coPhone')?.value.trim() || '8610451118';
  const custEmail = document.getElementById('coEmail')?.value.trim() || '';
  const street = document.getElementById('coStreet')?.value.trim() || '';
  const city = document.getElementById('coCity')?.value.trim() || '';
  const state = document.getElementById('coState')?.value || 'Tamil Nadu';
  const pincode = document.getElementById('coPincode')?.value.trim() || '';
  const custAddress = [street, city, state, pincode].filter(Boolean).join(', ') || 'Direct Factory Delivery';
  const utrRef = document.getElementById('coUtrInput')?.value.trim() || '';

  const shopCode = getShopShortCode(currentBrand);
  const shopTitle = getShopInvoiceTitle(currentBrand);
  const bookingNumber = `Get-Pattas-BookNo-${shopCode}-${Math.floor(10000 + Math.random() * 90000)}`;

  // Construct Multi-Brand Order Object
  const orderRecord = {
    orderId: bookingNumber,
    bookingNumber: bookingNumber,
    brand: currentBrand,
    brandName: shopTitle,
    customerName: custName,
    phone: custPhone,
    email: custEmail,
    address: custAddress,
    items: cart.map(i => ({
      name: i.name,
      tamilName: i.tamilName || '',
      pack: i.packInfo,
      qty: i.qty,
      price: i.price,
      subtotal: i.price * i.qty
    })),
    totalAmount: netTotal,
    totalItems: cart.length,
    totalBoxes: totalBoxes,
    paymentMethod: 'Wholesale Booking (Direct Dispatch)',
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };

  // 1. Save in local storage orders sync
  try {
    const existingOrders = JSON.parse(localStorage.getItem('admin_orders_sync') || '[]');
    existingOrders.unshift(orderRecord);
    localStorage.setItem('admin_orders_sync', JSON.stringify(existingOrders));
  } catch (err) { }

  // 2. Post to backend API
  try {
    fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderRecord)
    }).catch(() => { });
  } catch (err) { }

  // 3. Broadcast real-time sync event across all tabs & Admin
  if (syncChannel) {
    syncChannel.postMessage({ type: 'ORDER_PLACED', order: orderRecord });
  }

  const currentOrigin = (window.location.protocol && window.location.protocol.startsWith('http'))
    ? window.location.origin
    : 'http://localhost:5000';
  const invoiceWebUrl = (window.location.protocol === 'file:')
    ? 'invoice.html?bn=' + bookingNumber
    : `${currentOrigin}/invoice.html?bn=${bookingNumber}`;

  // 4. Construct WhatsApp Trigger Message for Store Desk
  let waMsg = `💥 *Get Pattas - OFFICIAL DIWALI WHOLESALE BOOKING*\n`;
  waMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `📋 *BOOKING NUMBER:* *${bookingNumber}*\n`;
  waMsg += `🏬 *Store:* Get Pattas\n`;
  waMsg += `📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
  waMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `👤 *CUSTOMER DETAILS:*\n`;
  waMsg += `• Name: *${custName}*\n`;
  waMsg += `• Mobile / WhatsApp: *${custPhone}*\n`;
  if (custEmail) waMsg += `• Email: ${custEmail}\n`;
  waMsg += `• Delivery Address: *${custAddress}*\n`;
  waMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `📦 *ITEMS BOOKED:*\n`;

  cart.forEach((item, idx) => {
    const rowTot = item.price * item.qty;
    waMsg += `${idx + 1}. *${item.name}* (${item.tamilName || ''})\n`;
    waMsg += `   • Qty: *${item.qty} Boxes* × ₹${item.price} = ₹${rowTot.toLocaleString('en-IN')}\n`;
  });

  waMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `📊 *Total Quantity:* ${totalBoxes} Boxes (${cart.length} Items)\n`;
  waMsg += `💰 *Total Order Amount:* *₹${netTotal.toLocaleString('en-IN')}*\n`;
  waMsg += `🚚 *Delivery:* Direct Sivakasi Factory Transport\n`;
  waMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `Please verify this Booking Number (*${bookingNumber}*) and confirm dispatch tracking details. Thank you!\n`;
  waMsg += `📄 *Digital Invoice PDF:* ${invoiceWebUrl}`;

  // Desk WhatsApp URL - Always sends to Kaira WhatsApp (+91 86104 51118)
  const targetDeskPhone = '918610451118';
  const deskWaUrl = `https://wa.me/${targetDeskPhone}?text=${encodeURIComponent(waMsg)}`;

  // Construct Customer WhatsApp Confirmation Message
  const custPhoneClean = (custPhone || '').replace(/[^0-9]/g, '');
  const targetCustPhone = custPhoneClean.startsWith('91') && custPhoneClean.length === 12
    ? custPhoneClean
    : (custPhoneClean.length === 10 ? `91${custPhoneClean}` : custPhoneClean);

  let custWaMsg = `💥 *DIWALI WHOLESALE BOOKING CONFIRMATION*\n`;
  custWaMsg += `🏬 *Get Pattas*\n`;
  custWaMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  custWaMsg += `Dear *${custName}*,\n`;
  custWaMsg += `Your fireworks wholesale booking is confirmed! Official invoice generated.\n\n`;
  custWaMsg += `📋 *OFFICIAL BOOKING NO:* *${bookingNumber}*\n`;
  custWaMsg += `📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
  custWaMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  custWaMsg += `👤 *DELIVERY CONSIGNEE:*\n`;
  custWaMsg += `• Name: *${custName}*\n`;
  custWaMsg += `• Phone: *${custPhone}*\n`;
  custWaMsg += `• Delivery Address: *${custAddress}*\n`;
  custWaMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  custWaMsg += `📦 *ORDERED VARIETIES (${cart.length}):*\n`;
  cart.forEach((item, idx) => {
    const rowTot = item.price * item.qty;
    custWaMsg += `${idx + 1}. *${item.name}* × ${item.qty} Boxes = ₹${rowTot.toLocaleString('en-IN')}\n`;
  });
  custWaMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  custWaMsg += `📊 *Total Quantity:* ${totalBoxes} Boxes\n`;
  custWaMsg += `💰 *Grand Total Amount:* *₹${netTotal.toLocaleString('en-IN')}*\n`;
  custWaMsg += `🚚 *Transport:* Direct Sivakasi Factory Transport (To-Pay LR)\n`;
  custWaMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  custWaMsg += `📄 *View / Download Digital Invoice (PDF):*\n`;
  custWaMsg += `${invoiceWebUrl}\n\n`;
  custWaMsg += `✨ Thank you for choosing Sivakasi direct factory crackers! Quote your Booking Number (*${bookingNumber}*) for lorry LR tracking inquiries. ✨`;

  const custWaUrl = deskWaUrl;

  // 5. Store globally & in LocalStorage for invoice PDF rendering
  lastCompletedOrder = orderRecord;
  try {
    localStorage.setItem('last_confirmed_order', JSON.stringify(orderRecord));
  } catch (err) { }

  // 6. Reset Cart & Quantities
  cart = [];
  qtyMap = {};
  saveCartToStorage();
  renderPriceListTable();
  updateStickySummaryBar();
  closeCheckoutModal();

  // 7. Pop up ONE AND ONLY Order Confirmation Modal (SweetAlert or Fallback)
  if (window.Swal) {
    const brandColor = (brandObj && brandObj.themeColor) || '#059669';
    Swal.fire({
      icon: 'success',
      title: '<span style="font-size:23px;font-weight:800;color:' + brandColor + ';">🎉 Order Placed Successfully!</span>',
      html: `
        <div style="text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 14px 0; font-size: 13.5px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 8px;">
            <span style="color: #64748b; font-weight: 600;">Booking Number:</span>
            <span style="background: #e0f2fe; color: #0284c7; font-weight: 800; font-family: monospace; font-size: 14px; padding: 2px 8px; border-radius: 6px;">${bookingNumber}</span>
          </div>
          <div style="margin-bottom: 4px; color: #334155;"><b>Store:</b> ${escapeHtml(shopTitle)}</div>
          <div style="margin-bottom: 4px; color: #334155;"><b>Customer:</b> ${escapeHtml(custName)} (${escapeHtml(custPhone)})</div>
          <div style="margin-bottom: 4px; color: #334155;"><b>Delivery:</b> ${escapeHtml(custAddress)}</div>
          <div style="margin-bottom: 6px; color: #334155;"><b>Items Booked:</b> ${totalBoxes} Boxes (${orderRecord.totalItems} Varieties)</div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
            <span style="font-weight: 700; color: #1e293b; font-size: 15px;">Total Order:</span>
            <span style="font-weight: 800; color: ${brandColor}; font-size: 18px;">₹${netTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div style="font-size: 12.5px; color: #64748b; margin-bottom: 10px; text-align: center;">
          🚀 Transport: Direct Sivakasi Factory Transport (To-Pay LR)
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: '#25D366',
      cancelButtonColor: '#0284c7',
      denyButtonColor: '#64748b',
      confirmButtonText: '<i class="fab fa-whatsapp" style="margin-right:4px;"></i> Confirm on WhatsApp',
      cancelButtonText: '<i class="fas fa-file-invoice" style="margin-right:4px;"></i> View Invoice PDF',
      denyButtonText: 'Done',
      customClass: {
        popup: 'swal2-order-popup'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        window.open(deskWaUrl, '_blank');
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        window.open(invoiceWebUrl, '_blank');
      }
    });
  } else {
    // Offline fallback: only open basic modal if SweetAlert is not available
    openOrderConfirmModal(orderRecord, bookingNumber, deskWaUrl, deskWaUrl);
  }
}

// ==========================================
// ORDER CONFIRMATION MODAL LOGIC
// ==========================================
let lastCompletedOrder = null;

function openOrderConfirmModal(order, bookingNo, customerWaUrl, storeWaUrl) {
  lastCompletedOrder = order;
  try {
    localStorage.setItem('last_confirmed_order', JSON.stringify(order));
  } catch (e) { }

  const modal = document.getElementById('orderConfirmModalOverlay');
  if (!modal) return;

  const storeEl = document.getElementById('ocStoreTitle');
  const bnEl = document.getElementById('ocBookingNumber');
  const nameEl = document.getElementById('ocCustomerName');
  const phoneEl = document.getElementById('ocCustomerPhone');
  const addrEl = document.getElementById('ocCustomerAddress');
  const totEl = document.getElementById('ocTotalAmount');
  const qtyEl = document.getElementById('ocTotalBoxes');
  const custWaBtn = document.getElementById('ocCustomerWhatsAppBtn');
  const storeWaBtn = document.getElementById('ocWhatsAppBtn');

  const shopTitle = getShopInvoiceTitle(order.brand || currentBrand);
  if (storeEl) storeEl.innerText = shopTitle;
  if (bnEl) bnEl.innerText = bookingNo;
  if (nameEl) nameEl.innerText = order.customerName;
  if (phoneEl) phoneEl.innerText = order.phone;
  if (addrEl) addrEl.innerText = order.address;
  if (totEl) totEl.innerText = '₹' + Number(order.totalAmount).toLocaleString('en-IN');
  if (qtyEl) qtyEl.innerText = `${order.totalBoxes} Boxes (${order.totalItems || (order.items && order.items.length) || 0} Varieties)`;

  // Bind WhatsApp URLs - Always to Kaira WhatsApp +91 86104 51118
  const targetWa = storeWaUrl || deskWaUrl;
  if (custWaBtn && targetWa) {
    custWaBtn.href = targetWa;
  }
  if (storeWaBtn && targetWa) {
    storeWaBtn.href = targetWa;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  showToast(`🎉 Order Placed! Booking #${bookingNo}`);
}

function closeOrderConfirmModal(force = false) {
  const modal = document.getElementById('orderConfirmModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function copyBookingNumber() {
  const bn = document.getElementById('ocBookingNumber')?.innerText;
  if (!bn) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(bn).then(() => {
      const copyText = document.getElementById('copyBnText');
      if (copyText) {
        copyText.innerText = 'Copied!';
        setTimeout(() => { copyText.innerText = 'Copy'; }, 2000);
      }
      showToast(`📋 Booking No ${bn} copied to clipboard!`);
    });
  } else {
    showToast(`📋 Booking No: ${bn}`);
  }
}

// ==========================================
// INVOICE PDF GENERATION & PRINT LOGIC
// ==========================================
function getActiveInvoiceOrder() {
  if (lastCompletedOrder && lastCompletedOrder.items && lastCompletedOrder.items.length) {
    return lastCompletedOrder;
  }
  try {
    const saved = localStorage.getItem('last_confirmed_order');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  try {
    const orders = JSON.parse(localStorage.getItem('admin_orders_sync') || '[]');
    if (orders.length > 0) return orders[0];
  } catch (e) { }
  return null;
}

function buildInvoiceDOM(order) {
  const brandKey = order.brand || detectCurrentBrand();
  const shopTitle = getShopInvoiceTitle(brandKey);
  const brandObj = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[brandKey]) || {
    name: shopTitle,
    shortName: getShopShortCode(brandKey),
    phone: '+91 86104 51118',
    email: 'Sales@getpattasu.in'
  };

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = (order.items || []).map((it, idx) => {
    const unitPrice = Number(it.price) || 0;
    const qty = Number(it.qty) || 1;
    const sub = unitPrice * qty;
    return `
      <tr>
        <td style="text-align: center; border-bottom: 1px solid #e2e8f0; padding: 7px 10px;">${idx + 1}</td>
        <td style="border-bottom: 1px solid #e2e8f0; padding: 7px 10px;">
          <strong>${it.name}</strong>
          ${it.tamilName ? `<div style="font-size: 0.75rem; color: #64748b;">${it.tamilName}</div>` : ''}
        </td>
        <td style="text-align: center; border-bottom: 1px solid #e2e8f0; padding: 7px 10px; font-weight: 700;">${qty}</td>
        <td style="text-align: right; border-bottom: 1px solid #e2e8f0; padding: 7px 10px;">₹${unitPrice.toLocaleString('en-IN')}</td>
        <td style="text-align: right; border-bottom: 1px solid #e2e8f0; padding: 7px 10px; font-weight: 700;">₹${sub.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="invoice-doc" style="background:#ffffff; padding:24px; border:1px solid #e2e8f0; border-radius:8px; font-family:'Inter', sans-serif; color:#0f172a;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #b91c1c; padding-bottom:14px; margin-bottom:14px;">
        <div>
          <h2 style="margin:0 0 4px 0; color:#b91c1c; font-size:1.4rem; font-weight:900;">${shopTitle}</h2>
          <div style="font-size:0.82rem; font-weight:700; color:#475569;">Authorized Sivakasi Crackers Wholesale Depot</div>
          <div style="font-size:0.76rem; color:#64748b; margin-top:2px;">Factory Direct Dispatch, Sivakasi, Tamil Nadu - 626123</div>
          <div style="font-size:0.76rem; color:#64748b;">📞 Phone / WhatsApp: ${brandObj.phone} | ✉️ ${brandObj.email || 'Sales@getpattasu.in'}</div>
        </div>
        <div style="text-align:right;">
          <div style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; font-weight:800; font-size:0.75rem; padding:4px 12px; border-radius:4px; display:inline-block; margin-bottom:6px;">
            WHOLESALE TAX ESTIMATE / INVOICE
          </div>
          <div style="font-size:1.15rem; font-weight:900; font-family:monospace; color:#0f172a;">${order.bookingNumber || order.orderId}</div>
          <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">Date: <strong>${orderDate}</strong></div>
          <div style="font-size:0.76rem; color:#15803d; font-weight:700; margin-top:2px;">● Status: CONFIRMED BOOKING</div>
        </div>
      </div>

      <!-- Customer / Delivery Info -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px 14px; margin-bottom:16px; font-size:0.82rem;">
        <div>
          <span style="font-size:0.72rem; font-weight:800; color:#94a3b8; letter-spacing:0.5px; display:block; margin-bottom:4px;">BILL TO / CUSTOMER:</span>
          <div style="font-size:0.95rem; font-weight:800; color:#0f172a;">${order.customerName}</div>
          <div style="margin-top:2px; color:#334155;">📞 Phone: <strong>${order.phone}</strong></div>
          ${order.email ? `<div style="color:#64748b;">✉️ ${order.email}</div>` : ''}
        </div>
        <div>
          <span style="font-size:0.72rem; font-weight:800; color:#94a3b8; letter-spacing:0.5px; display:block; margin-bottom:4px;">DELIVERY & PARCEL DISPATCH:</span>
          <div style="font-weight:600; color:#334155;">${order.address}</div>
          <div style="margin-top:4px; font-size:0.76rem; color:#0369a1; font-weight:700;">🚚 Sivakasi Factory Transport Service (Direct Lorry LR)</div>
        </div>
      </div>

      <!-- Table of items -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:0.82rem;">
        <thead>
          <tr style="background:#0f172a; color:#ffffff;">
            <th style="padding:8px 10px; text-align:center; width:5%;">#</th>
            <th style="padding:8px 10px; text-align:left; width:50%;">Product Description</th>
            <th style="padding:8px 10px; text-align:center; width:15%;">Quantity (Boxes)</th>
            <th style="padding:8px 10px; text-align:right; width:15%;">Wholesale Rate (₹)</th>
            <th style="padding:8px 10px; text-align:right; width:15%;">Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Summary & Terms -->
      <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:16px; border-top:2px solid #e2e8f0; padding-top:12px;">
        <div style="font-size:0.72rem; color:#64748b; line-height:1.4;">
          <strong style="color:#1e293b; display:block; margin-bottom:4px;">Wholesale Delivery Terms:</strong>
          <ul style="margin:0; padding-left:16px;">
            <li>Compliant with Supreme Court of India 2018 guidelines (Green Crackers / QR Verified).</li>
            <li>Direct factory consignment dispatched through leading South Indian transport services.</li>
            <li>Keep this Booking Number handy for lorry receipt (LR) verification.</li>
          </ul>
        </div>
        <div>
          <table style="width:100%; font-size:0.82rem;">
            <tr>
              <td style="padding:3px 0; color:#64748b;">Total Varieties:</td>
              <td style="padding:3px 0; text-align:right; font-weight:700;">${order.totalItems || (order.items && order.items.length) || 0} Items</td>
            </tr>
            <tr>
              <td style="padding:3px 0; color:#64748b;">Total Boxes:</td>
              <td style="padding:3px 0; text-align:right; font-weight:700;">${order.totalBoxes} Boxes</td>
            </tr>
            <tr style="border-top:2px solid #0f172a;">
              <td style="padding:6px 0; font-size:1.05rem; font-weight:900; color:#b91c1c;">Net Payable:</td>
              <td style="padding:6px 0; text-align:right; font-size:1.15rem; font-weight:900; color:#b91c1c;">₹${Number(order.totalAmount).toLocaleString('en-IN')}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Seal & Sign -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px; padding-top:14px; border-top:1px dashed #cbd5e1;">
        <div style="border:2px dashed #059669; color:#059669; border-radius:50%; width:80px; height:80px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:0.58rem; font-weight:900; text-align:center; transform:rotate(-8deg); line-height:1.2;">
          <span>SIVAKASI CRACKERS</span>
          <span style="font-size:0.75rem;">★ ★ ★</span>
          <span>OFFICIAL SEAL</span>
        </div>
        <div style="text-align:right; font-size:0.78rem; color:#475569;">
          <div style="width:150px; border-bottom:1px solid #94a3b8; margin-bottom:4px; margin-left:auto;"></div>
          <strong>Authorized Signatory</strong>
          <div>${shopTitle}</div>
        </div>
      </div>
    </div>
  `;
}

function downloadOrderInvoicePDF() {
  const order = getActiveInvoiceOrder();
  if (!order) {
    showToast('⚠️ No active order found to download.');
    return;
  }

  showToast(`📄 Generating Official Invoice for #${order.bookingNumber}...`);

  // Under file:/// protocol, Chromium blocks iframe cloning for canvas security.
  // Directly trigger in-page print preview where user can choose "Save as PDF" without any iframe errors!
  if (window.location.protocol === 'file:') {
    printOrderInvoice();
    showToast('🖨️ In Print dialog, select "Save as PDF" to save your invoice!');
    return;
  }

  // On http:// or https:// (e.g. localhost or server)
  let container = document.getElementById('invoiceExportContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'invoiceExportContainer';
    document.body.appendChild(container);
  }
  container.style.cssText = 'position: fixed; left: 0; top: 0; width: 800px; z-index: 99999; background: #ffffff; padding: 20px; box-shadow: 0 0 20px rgba(0,0,0,0.5);';
  container.innerHTML = buildInvoiceDOM(order);

  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin: 8,
      filename: `Invoice_${order.bookingNumber || 'Order'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(container).save().then(() => {
      container.style.display = 'none';
      showToast(`✅ Invoice_${order.bookingNumber}.pdf downloaded!`);
    }).catch(err => {
      console.warn('html2pdf fallback to print:', err);
      container.style.display = 'none';
      printOrderInvoice();
    });
  } else {
    container.style.display = 'none';
    printOrderInvoice();
  }
}

function printOrderInvoice() {
  const order = getActiveInvoiceOrder();
  if (!order) {
    showToast('⚠️ No active order found.');
    return;
  }

  // Use in-page printing: 100% compliant with file:/// and HTTP, no cross-frame security errors!
  let printArea = document.getElementById('printableInvoiceArea');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'printableInvoiceArea';
    document.body.appendChild(printArea);
  }
  printArea.innerHTML = buildInvoiceDOM(order);

  document.body.classList.add('printing-invoice-active');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-invoice-active');
  }, 1000);
}

// ==========================================
// COMBO HAMPER BANNER SHORTCUT
// ==========================================
function addComboToCart(comboKey) {
  // Add Grand Family Combo Pack (₹6,250)
  let comboItem = null;
  for (const bSlug in window.ALL_BRANDS_PRODUCTS) {
    comboItem = window.ALL_BRANDS_PRODUCTS[bSlug].find(i => i.id === 'gp-15');
    if (comboItem) break;
  }
  if (!comboItem) {
    for (const bSlug in window.ALL_BRANDS_PRODUCTS) {
      comboItem = window.ALL_BRANDS_PRODUCTS[bSlug].find(i => (i.price === 6250 || i.price === 5000) && (i.category.includes('Gift') || i.category.includes('Combo') || i.category.includes('பாக்ஸ்')));
      if (comboItem) break;
    }
  }

  if (comboItem) {
    changeQty(comboItem.id, 1);
    showToast(`🎉 Added ${comboItem.name} (₹${comboItem.price.toLocaleString('en-IN')}) to your order!`);
  } else {
    showToast('🎉 Added Diwali Family Combo Pack (₹6,250)!');
  }
}

// ==========================================
// CUSTOMER AUTH & ADDRESS BOOK STATE
// ==========================================

function handleCustomerBtnClick(e) {
  if (e) e.stopPropagation();
  if (currentCustomer && window.innerWidth > 768) {
    toggleDesktopDropdown();
  } else {
    openCustomerModal();
  }
}

function toggleDesktopDropdown() {
  const dd = document.getElementById('desktopProfileDropdown');
  const wrap = document.getElementById('headerAccountWrap');
  if (dd) {
    const isActive = dd.classList.toggle('active');
    if (wrap) wrap.classList.toggle('active', isActive);
  }
}

function closeDesktopDropdown() {
  const dd = document.getElementById('desktopProfileDropdown');
  const wrap = document.getElementById('headerAccountWrap');
  if (dd) dd.classList.remove('active');
  if (wrap) wrap.classList.remove('active');
}

// Global click outside to close desktop profile dropdown
document.addEventListener('click', function (e) {
  const wrap = document.getElementById('headerAccountWrap');
  if (wrap && !wrap.contains(e.target)) {
    closeDesktopDropdown();
  }
});

function openCustomerModal() {
  closeMobileMenu();
  initCustomerState();
  const modal = document.getElementById('customerModalOverlay');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCustomerModal(force = false) {
  const modal = document.getElementById('customerModalOverlay');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function switchCustomerAuthTab(tab) {
  const tabLogin = document.getElementById('cTabLogin');
  const tabSignup = document.getElementById('cTabSignup');
  const formLogin = document.getElementById('customerLoginForm');
  const formSignup = document.getElementById('customerSignupForm');

  if (tab === 'login') {
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (formLogin) formLogin.style.display = 'block';
    if (formSignup) formSignup.style.display = 'none';
  } else {
    if (tabSignup) tabSignup.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
    if (formSignup) formSignup.style.display = 'block';
    if (formLogin) formLogin.style.display = 'none';
  }
}

// 100% Isolated Customer Login for Current Shop
function handleCustomerLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const username = document.getElementById('custLoginUser')?.value.trim();
  const password = document.getElementById('custLoginPass')?.value.trim();
  const errEl = document.getElementById('custLoginErr');
  if (errEl) errEl.innerText = '';

  if (!username) return;

  const usersDbKey = getShopStorageKey('get_pattasu_registered_users');
  let usersDb = {};
  try {
    usersDb = JSON.parse(localStorage.getItem(usersDbKey) || '{}');
  } catch (err) { usersDb = {}; }

  let userProfile = usersDb[username.toLowerCase()];
  if (userProfile && userProfile.password && password && userProfile.password !== password) {
    if (errEl) errEl.innerText = 'Incorrect password. Please try again.';
    return;
  }

  const brandObj = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]) ? window.BRANDS_CONFIG[currentBrand] : {};
  currentCustomer = userProfile ? {
    username: userProfile.username,
    name: userProfile.name || username.toUpperCase(),
    phone: userProfile.phone || brandObj.phone || '+91 86104 51118',
    address: userProfile.address || 'Direct Sivakasi Order'
  } : {
    username: username,
    name: username.toUpperCase(),
    phone: brandObj.phone || '+91 86104 51118',
    address: 'Direct Sivakasi Order'
  };

  localStorage.setItem(getShopStorageKey('get_pattasu_customer'), JSON.stringify(currentCustomer));
  updateCustomerHeaderUI();
  closeCustomerModal();
  showToast(`Welcome back to ${brandObj.shortName || 'Get Pattas'}, ${currentCustomer.name}!`);
}

// 100% Isolated Customer Signup for Current Shop
function handleCustomerSignup(e) {
  if (e && e.preventDefault) e.preventDefault();
  const username = document.getElementById('custRegUser')?.value.trim();
  const password = document.getElementById('custRegPass')?.value.trim();
  const name = document.getElementById('custRegName')?.value.trim() || username;
  const phone = document.getElementById('custRegPhone')?.value.trim() || '';
  const address = document.getElementById('custRegAddress')?.value.trim() || '';
  const errEl = document.getElementById('custRegErr');
  if (errEl) errEl.innerText = '';

  if (!username) {
    if (errEl) errEl.innerText = 'Please enter a valid username.';
    return;
  }

  const usersDbKey = getShopStorageKey('get_pattasu_registered_users');
  let usersDb = {};
  try {
    usersDb = JSON.parse(localStorage.getItem(usersDbKey) || '{}');
  } catch (err) { usersDb = {}; }

  const newUser = { username, password, name, phone, address, registeredAt: new Date().toISOString() };
  usersDb[username.toLowerCase()] = newUser;
  localStorage.setItem(usersDbKey, JSON.stringify(usersDb));

  currentCustomer = { username, name, phone, address };
  localStorage.setItem(getShopStorageKey('get_pattasu_customer'), JSON.stringify(currentCustomer));

  if (address) {
    const addrData = {
      id: 'addr_' + Date.now(),
      name: name,
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      phone: phone,
      label: 'Home',
      address: address,
      street: address,
      city: '',
      pincode: '',
      state: 'Tamil Nadu',
      isDefault: true
    };
    localStorage.setItem(getShopStorageKey('checkout_saved_address'), JSON.stringify(addrData));
    const key = getShopStorageKey('get_pattasu_addresses');
    localStorage.setItem(key, JSON.stringify([addrData]));
  }

  updateCustomerHeaderUI();
  closeCustomerModal();
  const brandObj = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]) ? window.BRANDS_CONFIG[currentBrand] : {};
  showToast(`Account registered in Get Pattas! Welcome, ${name}`);
}

// 100% Isolated Customer Logout for Current Shop (Never affects other shops)
function handleCustomerLogout() {
  currentCustomer = null;
  localStorage.removeItem(getShopStorageKey('get_pattasu_customer'));
  updateCustomerHeaderUI();
  closeCustomerModal();
  closeDesktopDropdown();
  showToast('You have been logged out from this store.');
}

// Initialize Customer State for Current Shop
function initCustomerState() {
  try {
    const saved = localStorage.getItem(getShopStorageKey('get_pattasu_customer'));
    if (saved) {
      currentCustomer = JSON.parse(saved);
    } else {
      currentCustomer = null;
    }
    updateCustomerHeaderUI();
  } catch (e) {
    currentCustomer = null;
  }
}

function updateCustomerHeaderUI() {
  const btnText = document.getElementById('customerBtnText');
  const authBtn = document.getElementById('customerAuthBtn');
  const mobileAuthBtn = document.getElementById('mobileAuthBtn');
  const authViews = document.getElementById('customerAuthViews');
  const profileView = document.getElementById('customerProfileView');

  // Mobile drawer card elements
  const mucCard = document.getElementById('mobileUserCard');
  const mucAvatar = document.getElementById('mucAvatar');
  const mucTitle = document.getElementById('mucTitle');
  const mucSubtitle = document.getElementById('mucSubtitle');
  const mucActionBtn = document.getElementById('mucActionBtn');

  // Checkout Login Banner elements
  const coIcon = document.getElementById('coLoginBannerIcon');
  const coTitle = document.getElementById('coLoginBannerTitle');
  const coSub = document.getElementById('coLoginBannerSub');
  const coBtn = document.getElementById('coLoginBannerBtn');

  if (currentCustomer) {
    const firstName = (currentCustomer.name || '').split(' ')[0] || currentCustomer.username || 'User';
    if (btnText) btnText.innerText = firstName;
    if (authBtn) authBtn.classList.add('logged-in');
    const caret = document.getElementById('customerAuthCaret');
    if (caret) caret.style.display = 'inline-block';
    const dpName = document.getElementById('dpUserName');
    const dpTag = document.getElementById('dpUserTag');
    if (dpName) dpName.innerText = currentCustomer.name || firstName;
    if (dpTag) dpTag.innerText = '@' + currentCustomer.username;
    if (mobileAuthBtn) mobileAuthBtn.innerHTML = '<span><i class="fa-solid fa-user-check"></i> ' + firstName + '</span>';

    if (mucCard) mucCard.classList.add('logged-in');
    if (mucAvatar) mucAvatar.innerHTML = '<i class="fa-solid fa-user-check"></i>';
    if (mucTitle) mucTitle.innerText = currentCustomer.name || firstName;
    if (mucSubtitle) mucSubtitle.innerText = '@' + currentCustomer.username + ' • Active';
    if (mucActionBtn) mucActionBtn.innerHTML = '<span>Account</span>';

    if (coIcon) coIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #16a34a;"></i>';
    if (coTitle) coTitle.innerText = 'Logged in as ' + (currentCustomer.name || firstName);
    if (coSub) coSub.innerText = '@' + currentCustomer.username + ' • Address linked';
    if (coBtn) coBtn.innerHTML = '<span>Account</span>';

    if (authViews) authViews.style.display = 'none';
    if (profileView) {
      profileView.style.display = 'block';
      const pName = document.getElementById('custProfileName');
      const pUser = document.getElementById('custProfileUser');
      const pPhone = document.getElementById('custProfilePhone');
      if (pName) pName.innerText = currentCustomer.name;
      if (pUser) pUser.innerText = '@' + currentCustomer.username;
      if (pPhone) pPhone.innerHTML = '<i class="fa-solid fa-mobile-screen"></i> ' + currentCustomer.phone;
      renderSavedAddresses();
    }
  } else {
    if (btnText) btnText.innerText = 'Login';
    if (authBtn) authBtn.classList.remove('logged-in');
    const caret = document.getElementById('customerAuthCaret');
    if (caret) caret.style.display = 'none';
    closeDesktopDropdown();
    if (mobileAuthBtn) mobileAuthBtn.innerHTML = '<span><i class="fa-solid fa-user"></i> Login</span>';

    if (mucCard) mucCard.classList.remove('logged-in');
    if (mucAvatar) mucAvatar.innerHTML = '<i class="fa-solid fa-user"></i>';
    if (mucTitle) mucTitle.innerText = 'Welcome, Guest!';
    if (mucSubtitle) mucSubtitle.innerText = 'Log in for saved addresses';
    if (mucActionBtn) mucActionBtn.innerHTML = '<span>Login</span>';

    if (coIcon) coIcon.innerHTML = '<i class="fa-solid fa-circle-user" style="color: #0284c7;"></i>';
    if (coTitle) coTitle.innerText = 'Have an account?';
    if (coSub) coSub.innerText = 'Log in for instant address auto-fill';
    if (coBtn) coBtn.innerHTML = '<span>Log In</span>';

    if (authViews) authViews.style.display = 'block';
    if (profileView) profileView.style.display = 'none';
  }
}

// Address Book Manager for Customer Account
// Address Book Manager for Customer Account
// Address Book Manager for Customer Account
// Address Book Manager for Customer Account
function showAddressForm(editId) {
  const form = document.getElementById('addressCrudForm');
  if (!form) return;
  form.style.display = 'block';

  const editIdInp = document.getElementById('addrEditId');
  const titleEl = document.getElementById('addrFormTitle');
  const labelInp = document.getElementById('addrLabelInput');
  const cityInp = document.getElementById('addrCityInput');
  const textInp = document.getElementById('addrTextInput');
  const pincodeInp = document.getElementById('addrPincodeInput');
  const defaultInp = document.getElementById('addrDefaultInput');

  if (editId) {
    const key = getShopStorageKey('get_pattasu_addresses');
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { }
    const addr = list.find(function (a) { return a.id === editId; });
    if (addr) {
      if (editIdInp) editIdInp.value = addr.id;
      if (titleEl) titleEl.innerText = 'Edit Delivery Address';
      if (labelInp) labelInp.value = addr.label || 'Home';
      if (cityInp) cityInp.value = addr.city || '';
      if (textInp) textInp.value = addr.street || addr.address || '';
      if (pincodeInp) pincodeInp.value = addr.pincode || '';
      if (defaultInp) defaultInp.checked = Boolean(addr.isDefault);
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  // Reset for Add New Address
  if (editIdInp) editIdInp.value = '';
  if (titleEl) titleEl.innerText = 'Add New Delivery Address';
  if (labelInp) labelInp.value = 'Home';
  if (cityInp) cityInp.value = '';
  if (textInp) textInp.value = '';
  if (pincodeInp) pincodeInp.value = '';
  if (defaultInp) defaultInp.checked = true;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideAddressForm() {
  const form = document.getElementById('addressCrudForm');
  if (form) form.style.display = 'none';
  const editIdInp = document.getElementById('addrEditId');
  if (editIdInp) editIdInp.value = '';
}

function handleSaveAddress(e) {
  if (e && e.preventDefault) e.preventDefault();
  const editId = document.getElementById('addrEditId')?.value;
  const label = document.getElementById('addrLabelInput')?.value.trim() || 'Home';
  const city = document.getElementById('addrCityInput')?.value.trim() || '';
  const text = document.getElementById('addrTextInput')?.value.trim() || '';
  const pincode = document.getElementById('addrPincodeInput')?.value.trim() || '';
  const isDefault = document.getElementById('addrDefaultInput')?.checked || false;

  const formattedAddress = pincode ? (text + ', ' + city + ' - ' + pincode) : (text + ', ' + city);
  const addressId = editId || ('addr_' + Date.now());

  const addressData = {
    id: addressId,
    label: label,
    city: city,
    street: text,
    address: formattedAddress,
    pincode: pincode,
    phone: currentCustomer?.phone || '',
    name: currentCustomer?.name || '',
    firstName: currentCustomer?.name?.split(' ')[0] || '',
    lastName: currentCustomer?.name?.split(' ').slice(1).join(' ') || '',
    isDefault: isDefault
  };

  const key = getShopStorageKey('get_pattasu_addresses');
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (err) { list = []; }

  if (isDefault) {
    list.forEach(function (a) { a.isDefault = false; });
  }

  if (editId) {
    const idx = list.findIndex(function (a) { return a.id === editId; });
    if (idx >= 0) {
      list[idx] = addressData;
    } else {
      list.push(addressData);
    }
  } else {
    if (list.length === 0) addressData.isDefault = true;
    list.unshift(addressData);
  }

  localStorage.setItem(key, JSON.stringify(list));

  if (addressData.isDefault) {
    localStorage.setItem(getShopStorageKey('checkout_saved_address'), JSON.stringify(addressData));
  }

  hideAddressForm();
  renderSavedAddresses();
  populateCheckoutSavedAddresses();
  showToast(editId ? 'Delivery address updated!' : 'Delivery address saved to your account!');
}

function setDefaultAddress(id) {
  const key = getShopStorageKey('get_pattasu_addresses');
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (err) { list = []; }

  let chosen = null;
  list.forEach(function (a) {
    if (a.id === id) {
      a.isDefault = true;
      chosen = a;
    } else {
      a.isDefault = false;
    }
  });
  localStorage.setItem(key, JSON.stringify(list));
  if (chosen) {
    localStorage.setItem(getShopStorageKey('checkout_saved_address'), JSON.stringify(chosen));
  }
  renderSavedAddresses();
  populateCheckoutSavedAddresses();
  showToast('★ Default address set to ' + (chosen?.label || 'Address'));
}

function renderSavedAddresses() {
  const container = document.getElementById('addressListContainer');
  if (!container) return;
  const key = getShopStorageKey('get_pattasu_addresses');
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (err) { list = []; }

  if (list.length === 0) {
    container.innerHTML = '<p style="color: #64748b; font-size: 0.85rem; margin-top: 8px;">No saved delivery addresses yet. Click "+ Add Address" above to save one.</p>';
    return;
  }

  const q = String.fromCharCode(39);
  container.innerHTML = list.map(function (a) {
    const safeId = a.id.replace(/'/g, "");
    const defaultBtn = '<button type="button" class="btn-sm link-btn" onclick="setDefaultAddress(' + q + safeId + q + ')" style="font-size: 0.75rem; color: #0284c7; cursor: pointer; border: none; background: none; padding: 0;">Set as Default</button>';
    const defaultPill = '<span class="default-pill" style="font-size: 0.68rem; background: #059669; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 700;">DEFAULT</span>';

    return '<div class="address-card ' + (a.isDefault ? 'default-address' : '') + '" style="margin-bottom: 10px; border: 1px solid ' + (a.isDefault ? '#059669' : '#e2e8f0') + '; padding: 12px; border-radius: 8px; background: ' + (a.isDefault ? '#f0fdf4' : '#ffffff') + ';">' +
      '<div class="address-card-header" style="display: flex; justify-content: space-between; align-items: center;">' +
      '<span class="addr-label-badge" style="font-weight: 700; font-size: 0.82rem; color: #0f172a;"><i class="fa-solid fa-location-dot"></i> ' + (a.label || 'Address') + '</span>' +
      (a.isDefault ? defaultPill : defaultBtn) +
      '</div>' +
      '<p class="addr-text" style="margin: 6px 0; font-size: 0.85rem; color: #475569;">' + (a.address || (a.street + (a.city ? ', ' + a.city : ''))) + '</p>' +
      '<div class="addr-actions" style="display: flex; gap: 12px; justify-content: flex-end; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 6px;">' +
      '<button type="button" class="btn-sm link-btn" onclick="showAddressForm(' + q + safeId + q + ')" style="color: #0284c7; font-size: 0.78rem; cursor: pointer; border: none; background: none; padding: 0;"><i class="fa-solid fa-pen-to-square"></i> Edit</button>' +
      '<button type="button" class="btn-sm link-btn" onclick="deleteSavedAddress(' + q + safeId + q + ')" style="color: #dc2626; font-size: 0.78rem; cursor: pointer; border: none; background: none; padding: 0;"><i class="fa-solid fa-trash"></i> Remove</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

function deleteSavedAddress(id) {
  const doDelete = () => {
    const key = getShopStorageKey('get_pattasu_addresses');
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (err) { list = []; }
    list = list.filter(function (a) { return a.id !== id; });
    localStorage.setItem(key, JSON.stringify(list));
    renderSavedAddresses();
    populateCheckoutSavedAddresses();
    showToast('Address removed from your account.', 'info');
  };

  if (window.Swal) {
    Swal.fire({
      title: 'Remove address?',
      text: 'Are you sure you want to remove this saved delivery address?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fa-solid fa-trash"></i> Yes, remove',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) doDelete();
    });
  } else {
    doDelete();
  }
}

// ==========================================
// UTILITIES & PARTICLES
// ==========================================
function showToast(msg, iconType) {
  if (window.Swal) {
    let swalIcon = iconType;
    if (!swalIcon) {
      const lower = (msg || '').toLowerCase();
      if (lower.includes('error') || lower.includes('failed') || lower.includes('invalid')) {
        swalIcon = 'error';
      } else if (lower.includes('warning') || lower.includes('⚠️') || lower.includes('minimum') || lower.includes('empty') || lower.includes('select at least')) {
        swalIcon = 'warning';
      } else if (lower.includes('info') || lower.includes('copied') || lower.includes('clipboard') || lower.includes('removed')) {
        swalIcon = 'info';
      } else {
        swalIcon = 'success';
      }
    }

    const cleanMsg = (msg || '').replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/u, '').trim();

    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });

    Toast.fire({
      icon: swalIcon,
      title: cleanMsg || msg
    });
    return;
  }

  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerText = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

function closeMobileMenu() {
  const nav = document.getElementById('navMenu');
  const backdrop = document.getElementById('menuBackdrop');
  if (nav) nav.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

function toggleMobileMenu() {
  const nav = document.getElementById('navMenu');
  const backdrop = document.getElementById('menuBackdrop');
  if (!nav) return;
  const isNowActive = nav.classList.toggle('active');
  if (backdrop) backdrop.classList.toggle('active', isNowActive);
  document.body.style.overflow = isNowActive ? 'hidden' : '';
}

function handleNavLinkClick(link) {
  closeMobileMenu();
  return true;
}

function initNavScrollSpy() {
  const sections = ['hero', 'products', 'offers', 'contact'];
  const navLinks = document.querySelectorAll('.nav-menu .nav-link');
  if (!navLinks.length) return;

  function updateActiveLink() {
    const scrollPosition = window.pageYOffset + 140;
    let currentSectionId = '';

    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          currentSectionId = id;
          break;
        }
      }
    }

    if (!currentSectionId && window.pageYOffset < 300) {
      currentSectionId = 'hero';
    }

    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (currentSectionId === 'hero' && (href === '#' || href === '#hero' || href === 'index.html')) {
        link.classList.add('active');
      } else if (currentSectionId && href === `#${currentSectionId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  setTimeout(updateActiveLink, 200);
}

function handleFormSubmit(e) {
  e.preventDefault();
  const brandColor = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]?.themeColor) || '#059669';
  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: 'Enquiry Received! 🎆',
      text: 'Thank you! Our Sivakasi store desk will contact you via WhatsApp shortly.',
      confirmButtonColor: brandColor,
      confirmButtonText: 'Great!'
    });
  } else {
    alert('Thank you! Your enquiry has been received. Our Sivakasi store desk will contact you via WhatsApp shortly.');
  }
  e.target.reset();
}

function handleReviewSubmit(e) {
  e.preventDefault();
  const brandColor = (window.BRANDS_CONFIG && window.BRANDS_CONFIG[currentBrand]?.themeColor) || '#059669';
  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: 'Thank You for Your Review! ⭐️⭐️⭐️⭐️⭐️',
      text: 'Your 5-star rating helps festival shoppers choose genuine Sivakasi fireworks!',
      confirmButtonColor: brandColor,
      confirmButtonText: 'Done'
    });
  } else {
    alert('Thank you for your 5-Star review! Your feedback helps festival shoppers choose genuine Sivakasi fireworks.');
  }
  document.getElementById('reviewModalOverlay')?.classList.remove('active');
}

function openReviewModal(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('reviewModalOverlay');
  if (modal) modal.classList.add('active');
}

// Reviews Slider
let currentReviewIndex = 0;
function initReviewsSlider() {
  // Optional auto-slide or touch-navigation logic
}

function slideReviewNext() {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;
  track.scrollBy({ left: 320, behavior: 'smooth' });
}

function slideReviewPrev() {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;
  track.scrollBy({ left: -320, behavior: 'smooth' });
}

// Festive Sparks Canvas Animation
function initSparksCanvas() {
  const canvas = document.getElementById('sparksCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const particles = [];
  for (let i = 0; i < 25; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -Math.random() * 1.5 - 0.5,
      size: Math.random() * 2.5 + 1,
      color: ['#f59e0b', '#dc2626', '#e11d48', '#fbbf24'][Math.floor(Math.random() * 4)],
      alpha: Math.random() * 0.8 + 0.2
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < 0) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    requestAnimationFrame(animate);
  }
  animate();
}

// Window resize listener to handle dynamic switching between desktop & mobile catalog filters
let mobileResizeTimer;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    clearTimeout(mobileResizeTimer);
    mobileResizeTimer = setTimeout(() => {
      renderPriceListTable();
    }, 250);
  });
}
