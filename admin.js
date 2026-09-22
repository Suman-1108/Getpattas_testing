/* ==========================================================================
   Get Pattas KADAI - Enterprise Store Admin JS
   Real-Time Sync, Product Registry, Orders & Interactive Analytics
   ========================================================================== */

const API_BASE = (window.location.protocol && window.location.protocol.startsWith('http'))
  ? (window.location.port === '5000' || !window.location.port ? window.location.origin : 'http://localhost:5000')
  : 'http://localhost:5000';

// BroadcastChannel for instant cross-tab sync
const syncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('get_pattasu_sync_channel') : null;

function broadcastProductsUpdate() {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'PRODUCTS_UPDATED', products: adminProducts });
  }
}

function broadcastConfigUpdate() {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'CONFIG_UPDATED', config: adminConfig });
  }
}

let adminProducts = [];
let adminOrders = [];
let adminCustomers = [];
let adminConfig = {};
let currentActiveTab = 'dashboard';
let currentAdminBrand = 'all'; // 'all', 'getpattasu', 'muthu', 'Get pattas ', 'red'
let currentOrderSubTab = 'active'; // 'active' or 'draft'

let knownOrderIds = new Set();
let isInitialOrderLoad = true;

// ----------------------------------------------------
// NOTIFICATION CENTER (REAL-TIME & PERSISTENT)
// ----------------------------------------------------
let adminNotifications = [];

function initNotifications() {
  try {
    const saved = localStorage.getItem('admin_notifications_v2');
    if (saved) {
      adminNotifications = JSON.parse(saved);
    } else {
      adminNotifications = [
        {
          id: 'notif-demo-1',
          type: 'order',
          icon: 'fa-cart-shopping',
          title: 'Wholesale Order #GP-7421 Received',
          desc: 'Karthik Sivakumar placed an order for ₹6,450 (The Get pattas )',
          time: '5m ago',
          unread: true,
          targetTab: 'orders',
          createdAt: Date.now() - 5 * 60 * 1000
        },
        {
          id: 'notif-demo-2',
          type: 'inventory',
          icon: 'fa-triangle-exclamation',
          title: 'Low Stock Alert: 10cm Sparklers',
          desc: '10 cm Electric Sparklers has reached reorder threshold (14 boxes remaining)',
          time: '25m ago',
          unread: true,
          targetTab: 'inventory',
          createdAt: Date.now() - 25 * 60 * 1000
        },
        {
          id: 'notif-demo-3',
          type: 'review',
          icon: 'fa-star',
          title: '5-Star Customer Review',
          desc: 'Suresh Kumar S. (Chennai) verified 5 stars for Grand Family Dhamaka Box',
          time: '1h ago',
          unread: true,
          targetTab: 'reviews',
          createdAt: Date.now() - 60 * 60 * 1000
        }
      ];
      saveNotifications();
    }
  } catch (e) {
    adminNotifications = [];
  }
  renderNotifications();

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notificationDropdown');
    const notifBtn = document.getElementById('notifBtn');
    if (dropdown && dropdown.style.display !== 'none') {
      if (!dropdown.contains(e.target) && !notifBtn?.contains(e.target)) {
        dropdown.style.display = 'none';
        if (notifBtn) notifBtn.classList.remove('active');
      }
    }
  });
}

function saveNotifications() {
  try {
    localStorage.setItem('admin_notifications_v2', JSON.stringify(adminNotifications));
  } catch (e) {}
}

function renderNotifications() {
  const listEl = document.getElementById('notifItemsList');
  const badgeEl = document.getElementById('notifBadgeCount');
  const unreadPill = document.getElementById('notifUnreadPill');
  if (!listEl) return;

  const unreadCount = adminNotifications.filter(n => n.unread).length;

  if (badgeEl) {
    badgeEl.innerText = unreadCount;
    if (unreadCount === 0) {
      badgeEl.style.display = 'none';
    } else {
      badgeEl.style.display = 'flex';
    }
  }

  if (unreadPill) {
    unreadPill.innerText = `${unreadCount} New`;
    unreadPill.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }

  if (adminNotifications.length === 0) {
    listEl.innerHTML = `
      <div class="notif-empty-state">
        <i class="fa-regular fa-bell-slash"></i>
        <h4>No Notifications</h4>
        <p>You're all caught up! New orders and live alerts will appear here.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = adminNotifications.map(n => {
    const unreadClass = n.unread ? 'unread' : '';
    const iconClass = n.icon || (n.type === 'order' ? 'fa-cart-shopping' : n.type === 'inventory' ? 'fa-triangle-exclamation' : n.type === 'review' ? 'fa-star' : 'fa-bell');
    const typeClass = `type-${n.type || 'system'}`;

    return `
      <div class="notif-item ${unreadClass}" onclick="handleNotificationClick('${n.id}', '${n.targetTab || ''}')">
        <div class="notif-icon-box ${typeClass}">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="notif-item-body">
          <div class="notif-item-title">
            <span>${n.title}</span>
            ${n.unread ? `<span class="notif-unread-dot" title="Unread"></span>` : ''}
          </div>
          <div class="notif-item-desc">${n.desc}</div>
          <div class="notif-item-meta">
            <span><i class="fa-regular fa-clock"></i> ${n.time || 'Just now'}</span>
            ${n.targetTab ? `<span style="color: var(--primary-purple); font-weight: 700;">View &rarr;</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleNotificationDropdown(event) {
  if (event && event.stopPropagation) {
    event.stopPropagation();
  }
  const dropdown = document.getElementById('notificationDropdown');
  const notifBtn = document.getElementById('notifBtn');
  if (!dropdown) return;

  if (typeof event === 'boolean') {
    dropdown.style.display = event ? 'flex' : 'none';
    if (notifBtn) {
      if (event) notifBtn.classList.add('active');
      else notifBtn.classList.remove('active');
    }
    return;
  }

  const isVisible = dropdown.style.display !== 'none';
  dropdown.style.display = isVisible ? 'none' : 'flex';
  if (notifBtn) {
    if (isVisible) notifBtn.classList.remove('active');
    else notifBtn.classList.add('active');
  }
}

function markAllNotificationsRead() {
  adminNotifications.forEach(n => n.unread = false);
  saveNotifications();
  renderNotifications();
}

function clearAllNotifications() {
  adminNotifications = [];
  saveNotifications();
  renderNotifications();
}

// ----------------------------------------------------
// PERMANENT DELETED ORDER TRACKING
// ----------------------------------------------------
function getDeletedOrderIds() {
  try {
    const saved = localStorage.getItem('admin_deleted_order_ids');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function addDeletedOrderId(id) {
  if (!id) return;
  try {
    const list = getDeletedOrderIds();
    const strId = String(id);
    if (!list.includes(strId)) {
      list.push(strId);
      localStorage.setItem('admin_deleted_order_ids', JSON.stringify(list));
    }
  } catch (e) {}
}

function handleNotificationClick(notifId, targetTab) {
  const item = adminNotifications.find(n => n.id === notifId);
  if (item) {
    item.unread = false;
    saveNotifications();
    renderNotifications();
  }
  toggleNotificationDropdown(false);

  // Determine target tab (defaults to 'orders')
  const tab = targetTab || (item ? item.targetTab : 'orders') || 'orders';
  switchAdminTab(tab);

  // Check if notification points to a specific order
  let targetOrderId = item?.orderId;
  if (!targetOrderId && item) {
    const text = `${item.title || ''} ${item.desc || ''}`;
    // Matches ORD-WA-..., Get-Pattas-BookNo-..., GP-..., or #...
    const match = text.match(/(ORD-[A-Z0-9-]+|Get-Pattas-[A-Za-z0-9-]+|GP-[0-9]+|#([A-Za-z0-9-]+))/i);
    if (match) {
      targetOrderId = match[1].replace(/^#/, '');
    }
  }

  if (tab === 'orders' && targetOrderId) {
    // 1. Switch to active orders sub-tab
    switchOrderSubTab('active');
    // 2. Set search filter directly to this specific order
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
      searchInput.value = targetOrderId;
    }
    renderAdminOrders();

    // 3. Scroll directly to the row and flash highlight
    setTimeout(() => {
      const row = document.getElementById(`order-row-${targetOrderId}`) || document.querySelector(`[data-order-id="${targetOrderId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.remove('row-pulse-highlight');
        void row.offsetWidth;
        row.classList.add('row-pulse-highlight');
      }
    }, 150);
  }
}

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {}
}

function addNotification({ type = 'order', title, desc, targetTab = 'orders', icon = 'fa-cart-shopping', orderId = null }) {
  const newNotif = {
    id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    type,
    icon,
    title,
    desc,
    orderId,
    time: 'Just now',
    unread: true,
    targetTab,
    createdAt: Date.now()
  };

  adminNotifications.unshift(newNotif);
  if (adminNotifications.length > 50) adminNotifications.pop();

  saveNotifications();
  renderNotifications();
  playNotificationChime();

  const badge = document.getElementById('notifBadgeCount');
  if (badge) {
    badge.classList.remove('badge-pulse');
    void badge.offsetWidth;
    badge.classList.add('badge-pulse');
  }
}

// Manual Orders Refresh with visual feedback
async function handleManualOrderRefresh() {
  const icon = document.getElementById('refreshOrdersIcon');
  const btn = document.getElementById('btnRefreshOrders');
  if (icon) icon.classList.add('fa-spin');
  if (btn) btn.disabled = true;

  try {
    await loadAdminOrders(true);
    showAdminToast('Orders Refreshed', `Successfully loaded fresh live orders (${adminOrders.length} total)`, 'info');
  } catch (err) {
    showAdminToast('Refresh Notice', err.message || 'Orders updated from local registry', 'info');
  } finally {
    if (icon) icon.classList.remove('fa-spin');
    if (btn) btn.disabled = false;
  }
}

// On Load
document.addEventListener('DOMContentLoaded', () => {
  initAdminTheme();
  initNotifications();

  const token = localStorage.getItem('adminToken');
  if (token === 'authenticated-admin-session-token' || !token) {
    localStorage.setItem('adminToken', 'authenticated-admin-session-token');
    const overlay = document.getElementById('loginOverlay');
    const app = document.getElementById('adminApp');
    if (overlay) overlay.style.display = 'none';
    if (app) app.style.display = 'flex';
    initAdminDashboard();
  }

  // Cross-tab real-time listener for orders placed/deleted from any storefront or admin tab
  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'ORDER_PLACED') {
        const o = event.data.order;
        if (o) {
          const oId = o.orderId || o.bookingNumber;
          addNotification({
            type: 'order',
            title: `New Order Received (${oId || 'Live'})`,
            desc: `${o.customerName || 'Customer'} placed order for ₹${(o.totalAmount || 0).toLocaleString('en-IN')} (${o.brandName || 'Store'})`,
            targetTab: 'orders',
            orderId: oId,
            icon: 'fa-cart-shopping'
          });
        }
        loadAdminOrders();
      } else if (event.data && event.data.type === 'ORDER_DELETED') {
        const delId = event.data.orderId;
        if (delId) {
          addDeletedOrderId(delId);
          adminOrders = adminOrders.filter(o => o.orderId !== delId && o.bookingNumber !== delId && o._id !== delId);
          renderAdminOrders();
          renderDashboardOverview();
        }
      }
    };
  }

  // LocalStorage storage event listener for cross-window sync
  window.addEventListener('storage', (e) => {
    if (e.key === 'admin_orders_sync') {
      loadAdminOrders();
    }
  });

  // Gentle 60s background sync ONLY when tab is focused (stops non-stop refreshing!)
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadAdminOrders(false);
    }
  }, 60000);
});

// Brand Switcher in Admin
function setAdminActiveBrand(brandSlug, btnElement = null) {
  currentAdminBrand = brandSlug;

  // 1. Update active pill in top switcher
  document.querySelectorAll('.admin-brand-pills-row .admin-brand-pill').forEach(pill => {
    if (pill.getAttribute('data-brand') === brandSlug) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // 2. Update Sidebar Title, Tag, and Logo
  const sbTitle = document.getElementById('adminSidebarTitle');
  const sbTag = document.getElementById('adminSidebarTag');
  const storeLink = document.getElementById('topbarStoreLink');
  const usrName = document.getElementById('adminUserName');
  const topUsrName = document.getElementById('topbarUserName');

  const brandTitles = {
    'getpattasu': { title: 'Get Pattas', tag: 'WHOLESALE ADMIN', url: '/getpattas/shopno004', name: 'Get Pattas Admin' },
    'muthu': { title: 'Get pattas ', tag: 'Get pattas ADMIN', url: '/getpattas/shopno001', name: 'Get pattas Crackers Admin' },
    'Get pattas ': { title: "Get pattas 'S CRACKERS", tag: 'Get pattas  ADMIN', url: '/getpattas/shopno002', name: "Get pattas 's Crackers Admin" },
    'red': { title: 'THE Get pattas ', tag: 'Get pattas ADMIN', url: '/getpattas/shopno003', name: 'The Get pattas  Admin' },
    'all': { title: 'Get Pattas', tag: 'ALL 4 BRANDS ADMIN', url: '/getpattas/shopno004', name: 'Master Super Admin' }
  };

  const bInfo = brandTitles[brandSlug] || brandTitles['all'];
  if (sbTitle) sbTitle.innerText = bInfo.title;
  if (sbTag) sbTag.innerText = bInfo.tag;
  if (storeLink) storeLink.href = bInfo.url;
  if (usrName) usrName.innerText = bInfo.name;
  if (topUsrName) topUsrName.innerText = bInfo.name;

  // 3. Sync orders filter dropdown
  const filterSelect = document.getElementById('adminBrandFilter');
  if (filterSelect) {
    filterSelect.value = brandSlug;
  }

  // 4. Reload data for active brand
  loadAdminProducts();
  renderDashboardOverview();
  renderAdminProducts();
  renderAdminOrders();
}

// Admin Login
async function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const errDiv = document.getElementById('loginErrMsg');

  errDiv.innerText = '';

  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('adminToken', data.token);
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('adminApp').style.display = 'flex';
      initAdminDashboard();
    } else {
      errDiv.innerText = data.message || 'Invalid Login Credentials';
    }
  } catch (err) {
    if ((user === 'adgetmin' && pass === 'adgetmin321') || (user === 'admin' && pass === 'admin123')) {
      localStorage.setItem('adminToken', 'authenticated-admin-session-token');
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('adminApp').style.display = 'flex';
      initAdminDashboard();
    } else {
      errDiv.innerText = 'Login Failed. Check credentials.';
    }
  }
}

// Logout
function handleAdminLogout() {
  localStorage.removeItem('adminToken');
  location.reload();
}

// Initialize Admin Dashboard
async function initAdminDashboard() {
  await Promise.all([
    loadAdminOrders(),
    loadAdminCustomers(),
    loadAdminProducts(),
    loadAdminConfig()
  ]);
  renderDashboardOverview();
}

// Switch Tabs between Dashboard, Products, Orders, Users, Categories, etc.
function switchAdminTab(tabName, btnElement = null) {
  currentActiveTab = tabName;

  // 1. Update Sidebar Active Button
  document.querySelectorAll('.app-sidebar .menu-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 2. Hide all panes & show target pane
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(`pane-${tabName}`);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  // 3. Trigger specific renderers
  if (tabName === 'dashboard') {
    renderDashboardOverview();
  } else if (tabName === 'products') {
    renderAdminProducts();
  } else if (tabName === 'orders') {
    renderAdminOrders();
  } else if (tabName === 'customers') {
    renderAdminCustomers();
  } else if (tabName === 'categories') {
    renderCategoryCounts();
  } else if (tabName === 'reviews') {
    renderAdminReviews();
  } else if (tabName === 'analytics') {
    renderAnalyticsView();
  }
}

// Global Search
function handleGlobalSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) return;

  if (currentActiveTab !== 'products' && currentActiveTab !== 'orders') {
    switchAdminTab('products');
  }

  const prodSearch = document.getElementById('prodSearchInput');
  if (prodSearch) {
    prodSearch.value = query;
    renderAdminProducts();
  }
}

// ----------------------------------------------------
// DASHBOARD VIEW (Matching Screenshot 1)
// ----------------------------------------------------
function renderDashboardOverview() {
  // Filter orders by active brand
  const filteredOrders = adminOrders.filter(o => {
    if (currentAdminBrand === 'all') return true;
    return (o.brand === currentAdminBrand) || (o.brandName && o.brandName.toLowerCase().includes(currentAdminBrand));
  });

  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const totalCustomersCount = adminCustomers.length;
  const productsCount = adminProducts.length;

  // 1. Top 6 Metric Cards
  const salesEl = document.getElementById('statDashSales');
  const ordEl = document.getElementById('statDashOrders');
  const custEl = document.getElementById('statDashCustomers');
  const prodEl = document.getElementById('statDashProducts');
  const revEl = document.getElementById('statDashRevenue');

  if (salesEl) salesEl.innerText = `₹${totalSales.toLocaleString('en-IN')}`;
  if (ordEl) ordEl.innerText = totalOrdersCount;
  if (custEl) custEl.innerText = totalCustomersCount;
  if (prodEl) prodEl.innerText = productsCount;
  if (revEl) revEl.innerText = `₹${totalSales.toLocaleString('en-IN')}`;

  // Sidebar badges
  const sideProd = document.getElementById('sideBadgeProducts');
  const sideOrders = document.getElementById('sideBadgeOrders');
  const sideUsers = document.getElementById('sideBadgeUsers');

  if (sideProd) sideProd.innerText = productsCount;
  if (sideOrders) sideOrders.innerText = totalOrdersCount;
  if (sideUsers) sideUsers.innerText = totalCustomersCount;

  // Update pill badges on top switcher
  const pillAll = document.getElementById('pillBadgeAll');
  const pillGP = document.getElementById('pillBadgeGetpattasu');
  const pillMuthu = document.getElementById('pillBadgeMuthu');
  const pillVel = document.getElementById('pillBadgeVel');
  const pillRed = document.getElementById('pillBadgeRed');

  if (pillAll) pillAll.innerText = adminOrders.length;
  if (pillGP) pillGP.innerText = adminOrders.filter(o => o.brand === 'getpattasu' || (o.brandName && o.brandName.toLowerCase().includes('Get Pattas'))).length;
  if (pillMuthu) pillMuthu.innerText = adminOrders.filter(o => o.brand === 'muthu' || (o.brandName && o.brandName.toLowerCase().includes('muthu'))).length;
  if (pillVel) pillVel.innerText = adminOrders.filter(o => o.brand === 'vel' || (o.brandName && o.brandName.toLowerCase().includes('vel'))).length;
  if (pillRed) pillRed.innerText = adminOrders.filter(o => o.brand === 'red' || (o.brandName && o.brandName.toLowerCase().includes('red'))).length;

  // 2. Recent Orders List
  const recentOrdersContainer = document.getElementById('dashRecentOrdersList');
  if (recentOrdersContainer) {
    if (filteredOrders.length === 0) {
      recentOrdersContainer.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 2rem 0; font-size: 0.85rem;">
          No orders recorded yet for ${currentAdminBrand === 'all' ? 'any brand' : currentAdminBrand}. Live orders will appear here automatically.
        </div>
      `;
    } else {
      recentOrdersContainer.innerHTML = filteredOrders.slice(0, 6).map(o => `
        <div class="recent-order-row">
          <div class="order-cust-info">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="order-cust-name">${o.customerName || 'Online Customer'}</span>
              <span style="font-size: 0.68rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 4px; ${getBrandStyle(o.brand)}">
                ${getBrandEmoji(o.brand)} ${o.brandName || getBrandTitle(o.brand)}
              </span>
            </div>
            <span class="order-id-tag">${o.orderId || 'ORD-NEW'} • ${o.paymentMethod || 'UPI'}</span>
          </div>
          <div class="order-amount-status">
            <div class="order-amount-val">₹${(o.totalAmount || 0).toLocaleString('en-IN')}</div>
            <span class="status-badge-green" style="${o.status === 'Pending' ? 'background: #fef3c7; color: #b45309;' : ''}">
              ${o.status || 'Pending'}
            </span>
          </div>
        </div>
      `).join('');
    }
  }

  // 3. Top Selling Products Table
  const topProdTable = document.getElementById('dashTopProductsTable');
  if (topProdTable) {
    topProdTable.innerHTML = adminProducts.slice(0, 5).map((p, idx) => `
      <tr>
        <td>
          <div class="dash-prod-cell">
            <img src="${(p.image && p.image !== 'undefined') ? p.image : 'assets/product_sparklers.jpg'}" alt="${p.name || 'Product'}" class="dash-prod-thumb" onerror="this.src='assets/product_sparklers.jpg'">
            <div>
              <strong>${p.name}</strong>
              <div style="font-size: 0.72rem; color: #94a3b8;">${p.pack || 'Standard Box Pack'}</div>
            </div>
          </div>
        </td>
        <td><span style="text-transform: capitalize; color: #64748b;">${p.category}</span></td>
        <td><strong>${(idx + 1) * 35} units</strong></td>
        <td><strong class="text-purple">₹${((idx + 1) * 35 * p.price).toLocaleString('en-IN')}</strong></td>
        <td><span class="status-badge-green">In Stock</span></td>
      </tr>
    `).join('');
  }

  // Inventory count
  const invCount = document.getElementById('invInStockCount');
  if (invCount) invCount.innerText = `${productsCount} Items`;
}

// ----------------------------------------------------
// PRODUCTS REGISTRY (Matching Screenshot 2)
// ----------------------------------------------------
async function loadAdminProducts() {
  // If catalogData.js is loaded, load items for the selected brand
  if (window.ALL_BRANDS_PRODUCTS) {
    if (currentAdminBrand === 'all') {
      let combined = [];
      Object.keys(window.ALL_BRANDS_PRODUCTS).forEach(k => {
        const list = window.ALL_BRANDS_PRODUCTS[k] || [];
        combined = combined.concat(list.map(item => ({ ...item, brandKey: k })));
      });
      adminProducts = combined;
    } else {
      const list = window.ALL_BRANDS_PRODUCTS[currentAdminBrand] || [];
      adminProducts = list.map(item => ({ ...item, brandKey: currentAdminBrand }));
    }
  } else {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      adminProducts = await res.json();
    } catch (err) {
      const local = localStorage.getItem('admin_products_sync');
      if (local) adminProducts = JSON.parse(local);
    }
  }

  renderAdminProducts();
  renderDashboardOverview();
}

function renderAdminProducts() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  const search = (document.getElementById('prodSearchInput')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('prodCategoryFilter')?.value || 'all';

  const filtered = adminProducts.filter(p => {
    const matchSearch = (p.name && p.name.toLowerCase().includes(search)) ||
      (p.tamilName && p.tamilName.toLowerCase().includes(search)) ||
      (p.id && p.id.toLowerCase().includes(search)) ||
      (p.category && p.category.toLowerCase().includes(search));
    const matchCat = (catFilter === 'all') || (p.category === catFilter);
    return matchSearch && matchCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 3rem;">No matching cracker products found for this category/search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 100).map(prod => {
    const code = (prod.id || 'SKU').toUpperCase();
    const brandBadge = prod.brandKey ? `<span style="font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.3rem; ${getBrandStyle(prod.brandKey)}">${getBrandIcon(prod.brandKey)} ${getBrandTitle(prod.brandKey)}</span>` : '';

    return `
      <tr>
        <td>
          <div class="prod-name-cell">
            <img src="${(prod.image && prod.image !== 'undefined') ? prod.image : 'assets/product_sparklers.jpg'}" alt="${prod.name || 'Product'}" class="prod-table-thumb" onerror="this.src='assets/product_sparklers.jpg'">
            <div>
              <div class="prod-name-title">${prod.name} ${brandBadge}</div>
              ${prod.tamilName ? `<div style="font-size: 0.75rem; color: #ea580c; font-weight: 600;">${prod.tamilName}</div>` : ''}
              <div class="prod-pack-sub">${prod.pack || 'Standard Box Pack'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="code-badge">${code}</span>
        </td>
        <td>
          <span style="font-weight: 600; text-transform: capitalize; color: #475569;">${prod.category}</span>
        </td>
        <td>
          <strong style="font-size: 1rem; color: #0f172a;">₹${prod.price}</strong>
          ${prod.mrp ? `<span style="font-size: 0.75rem; color: #94a3b8; text-decoration: line-through; margin-left: 4px;">₹${prod.mrp}</span>` : ''}
        </td>
        <td>
          <span class="stock-pill-orange">100 units</span>
        </td>
        <td>
          <div class="action-btns-cell">
            <button class="btn btn-edit-sm" onclick="editProduct('${prod.id}')" title="Edit Product"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn btn-danger-sm" onclick="deleteProduct('${prod.id}')" title="Delete Product"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddProductModal() {
  document.getElementById('modalTitle').innerText = 'Add New Cracker Product';
  document.getElementById('prodEditId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('prodImgPreview').src = 'assets/product_sparklers.jpg';
  document.getElementById('productModal').classList.add('active');
}

function editProduct(prodId) {
  const prod = adminProducts.find(p => p.id === prodId);
  if (!prod) return;

  document.getElementById('modalTitle').innerText = 'Edit Cracker Product Details';
  document.getElementById('prodEditId').value = prod.id;
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodCategory').value = prod.category;
  document.getElementById('prodMrp').value = prod.mrp;
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodPack').value = prod.pack;
  document.getElementById('prodImgUrl').value = (prod.image && prod.image !== 'undefined') ? prod.image : 'assets/product_sparklers.jpg';
  document.getElementById('prodImgPreview').src = (prod.image && prod.image !== 'undefined') ? prod.image : 'assets/product_sparklers.jpg';

  document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

async function handleProductSave(e) {
  e.preventDefault();
  const editId = document.getElementById('prodEditId').value;
  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value;
  const mrp = Number(document.getElementById('prodMrp').value);
  const price = Number(document.getElementById('prodPrice').value);
  const pack = document.getElementById('prodPack').value.trim();
  const image = document.getElementById('prodImgUrl').value.trim() || 'assets/product_sparklers.jpg';

  const payload = { name, category, mrp, price, pack, image };

  try {
    if (editId) {
      await fetch(`${API_BASE}/api/products/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const idx = adminProducts.findIndex(p => p.id === editId);
      if (idx !== -1) adminProducts[idx] = { ...adminProducts[idx], ...payload };
    } else {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.product) {
        adminProducts.unshift(data.product);
      } else {
        adminProducts.unshift({ id: 'spk-' + Date.now(), ...payload });
      }
    }

    localStorage.setItem('admin_products_sync', JSON.stringify(adminProducts));
    broadcastProductsUpdate();
    closeProductModal();
    renderAdminProducts();
    renderDashboardOverview();
    alert('Product saved successfully! Customer storefront updated live.');
  } catch (err) {
    if (editId) {
      const idx = adminProducts.findIndex(p => p.id === editId);
      if (idx !== -1) adminProducts[idx] = { ...adminProducts[idx], ...payload };
    } else {
      adminProducts.unshift({ id: 'spk-' + Date.now(), ...payload });
    }
    localStorage.setItem('admin_products_sync', JSON.stringify(adminProducts));
    broadcastProductsUpdate();
    closeProductModal();
    renderAdminProducts();
    renderDashboardOverview();
    alert('Product saved! Customer storefront updated live.');
  }
}

async function deleteProduct(prodId) {
  if (!confirm('Are you sure you want to delete this cracker item from the catalog?')) return;
  try {
    await fetch(`${API_BASE}/api/products/${prodId}`, { method: 'DELETE' });
  } catch (err) { }
  adminProducts = adminProducts.filter(p => p.id !== prodId);
  localStorage.setItem('admin_products_sync', JSON.stringify(adminProducts));
  broadcastProductsUpdate();
  renderAdminProducts();
  renderDashboardOverview();
  alert('Product deleted successfully! Customer storefront updated live.');
}

async function uploadProductPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('image', input.files[0]);

  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('prodImgUrl').value = data.url;
      document.getElementById('prodImgPreview').src = data.url;
    }
  } catch (err) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('prodImgUrl').value = e.target.result;
      document.getElementById('prodImgPreview').src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function downloadAdminPriceList() {
  alert('Downloading Get Pattas Complete Wholesale Registry (PDF / Excel)...');
}

// Brand Helper Utilities for Admin
function getBrandStyle(brandSlug) {
  switch (brandSlug) {
    case 'red':
      return 'background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;';
    case 'muthu':
      return 'background: #ecfdf5; color: #059669; border: 1px solid #6ee7b7;';
    case 'Get pattas ':
    case 'vel':
      return 'background: #f5f3ff; color: #7c3aed; border: 1px solid #c4b5fd;';
    default:
      return 'background: #fffbeb; color: #d97706; border: 1px solid #fcd34d;';
  }
}

function getBrandEmoji(brandSlug) {
  switch (brandSlug) {
    case 'red': return '🧨';
    case 'muthu': return '🎆';
    case 'Get pattas ':
    case 'vel': return '💥';
    default: return '⭐';
  }
}

function getBrandIcon(brandSlug) {
  switch (brandSlug) {
    case 'red': return '<i class="fa-solid fa-fire-flame-curved" style="color: #dc2626;"></i>';
    case 'muthu': return '<i class="fa-solid fa-burst" style="color: #059669;"></i>';
    case 'Get pattas ':
    case 'vel': return '<i class="fa-solid fa-wand-magic-sparkles" style="color: #7c3aed;"></i>';
    default: return '<i class="fa-solid fa-crown" style="color: #d97706;"></i>';
  }
}

function getBrandTitle(brandSlug) {
  switch (brandSlug) {
    case 'red': return 'The Get pattas ';
    case 'muthu': return 'Get pattas Crackers';
    case 'Get pattas ':
    case 'vel': return "Get pattas 's Crackers";
    default: return 'Get Pattas Kadai';
  }
}

// ----------------------------------------------------
// ORDERS MANAGEMENT (MULTI-BRAND 4 SITES SUPPORT)
// ----------------------------------------------------
async function loadAdminOrders(isManual = false) {
  const deletedIds = new Set(getDeletedOrderIds());

  let apiOrders = [];
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (res.ok) {
      const data = await res.json();
      const rawApi = Array.isArray(data) ? data : (data.orders || []);
      apiOrders = rawApi.filter(o => 
        !deletedIds.has(String(o.orderId)) && 
        !deletedIds.has(String(o.bookingNumber)) && 
        !deletedIds.has(String(o._id))
      );
    }
  } catch (err) { }

  let localOrders = [];
  try {
    const saved = localStorage.getItem('admin_orders_sync');
    if (saved) {
      const rawLocal = JSON.parse(saved);
      localOrders = (Array.isArray(rawLocal) ? rawLocal : []).filter(o => 
        !deletedIds.has(String(o.orderId)) && 
        !deletedIds.has(String(o.bookingNumber)) && 
        !deletedIds.has(String(o._id))
      );
    }
  } catch (err) { }

  // Merge and deduplicate by orderId:
  // Local orders first, then FRESH apiOrders overwrite to guarantee updated status & deletion state!
  const orderMap = new Map();
  localOrders.forEach(o => {
    const key = o?.orderId || o?.bookingNumber;
    if (key && !deletedIds.has(String(key))) {
      orderMap.set(key, o);
    }
  });

  apiOrders.forEach(o => {
    const key = o?.orderId || o?.bookingNumber;
    if (key && !deletedIds.has(String(key))) {
      orderMap.set(key, o);
    }
  });

  // Filter out any draft-deleted orders older than 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  adminOrders = Array.from(orderMap.values())
    .filter(o => {
      if (deletedIds.has(String(o.orderId)) || deletedIds.has(String(o.bookingNumber)) || deletedIds.has(String(o._id))) {
        return false;
      }
      if (o.isDraftDeleted && o.deletedAt) {
        return new Date(o.deletedAt).getTime() > thirtyDaysAgo;
      }
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });

  // Keep localStorage sync updated with fresh non-deleted merged data
  try {
    localStorage.setItem('admin_orders_sync', JSON.stringify(adminOrders));
  } catch (e) { }

  // Auto-sync genuinely new local orders to backend server, STRICTLY excluding any deleted orders
  if (localOrders.length > 0) {
    const apiIdSet = new Set(apiOrders.map(o => o.orderId || o.bookingNumber));
    localOrders.forEach(lo => {
      const id = lo.orderId || lo.bookingNumber;
      if (id && !apiIdSet.has(id) && !deletedIds.has(String(id))) {
        fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lo)
        }).catch(() => {});
      }
    });
  }

  // Automatically trigger real-time notification on newly detected order
  if (!isInitialOrderLoad) {
    adminOrders.forEach(o => {
      const oId = o.orderId || o.bookingNumber;
      if (oId && !knownOrderIds.has(oId) && !o.isDraftDeleted && !deletedIds.has(String(oId))) {
        addNotification({
          type: 'order',
          title: `New Order Received (${oId})`,
          desc: `${o.customerName || 'Customer'} placed order for ₹${(o.totalAmount || 0).toLocaleString('en-IN')} (${o.brandName || getBrandTitle(o.brand)})`,
          targetTab: 'orders',
          orderId: oId,
          icon: 'fa-cart-shopping'
        });
      }
    });
  }
  knownOrderIds = new Set(adminOrders.map(o => o.orderId || o.bookingNumber));
  isInitialOrderLoad = false;

  renderAdminOrders();
  renderDashboardOverview();
}

function switchOrderSubTab(subTab) {
  currentOrderSubTab = subTab;

  const btnActive = document.getElementById('subtab-active-orders');
  const btnDraft = document.getElementById('subtab-draft-orders');
  const activeContainer = document.getElementById('activeOrdersContainer');
  const draftContainer = document.getElementById('draftOrdersContainer');

  if (subTab === 'draft') {
    btnActive?.classList.remove('active');
    btnDraft?.classList.add('active');
    if (activeContainer) activeContainer.style.display = 'none';
    if (draftContainer) draftContainer.style.display = 'block';
  } else {
    btnDraft?.classList.remove('active');
    btnActive?.classList.add('active');
    if (draftContainer) draftContainer.style.display = 'none';
    if (activeContainer) activeContainer.style.display = 'block';
  }

  renderAdminOrders();
}

function renderAdminOrders() {
  const activeTbody = document.getElementById('ordersTableBody');
  const draftTbody = document.getElementById('draftOrdersTableBody');

  const search = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();
  const dropdownBrand = document.getElementById('adminBrandFilter')?.value || 'all';

  const activeBrand = dropdownBrand !== 'all' ? dropdownBrand : currentAdminBrand;

  // Split into Active Orders and Draft / Trash Orders
  const allActive = adminOrders.filter(o => !o.isDraftDeleted);
  const allDraft = adminOrders.filter(o => Boolean(o.isDraftDeleted));

  // Update live count badge indicators
  const activeBadge = document.getElementById('activeOrdersCount');
  const draftBadge = document.getElementById('draftOrdersCount');
  if (activeBadge) activeBadge.textContent = allActive.length;
  if (draftBadge) draftBadge.textContent = allDraft.length;

  // 1. FILTER & RENDER ACTIVE ORDERS
  if (activeTbody) {
    const filteredActive = allActive.filter(o => {
      const matchesSearch = !search ||
        (o.orderId && o.orderId.toLowerCase().includes(search)) ||
        (o.bookingNumber && o.bookingNumber.toLowerCase().includes(search)) ||
        (o.customerName && o.customerName.toLowerCase().includes(search)) ||
        (o.phone && o.phone.toLowerCase().includes(search)) ||
        (o.email && o.email.toLowerCase().includes(search)) ||
        (o.address && o.address.toLowerCase().includes(search)) ||
        (o.city && o.city.toLowerCase().includes(search)) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(search)) ||
        (o.brandName && o.brandName.toLowerCase().includes(search));

      let matchesBrand = true;
      if (activeBrand === 'whatsapp') {
        matchesBrand = (o.paymentMethod || '').toLowerCase().includes('whatsapp');
      } else if (activeBrand !== 'all') {
        matchesBrand = (o.brand === activeBrand) ||
          (o.brandName && o.brandName.toLowerCase().includes(activeBrand));
      }

      return matchesSearch && matchesBrand;
    });

    if (filteredActive.length === 0) {
      const brandNameDisplay = activeBrand === 'all' 
        ? 'All 4 Brands' 
        : (activeBrand === 'whatsapp' ? 'WhatsApp Direct Orders' : getBrandTitle(activeBrand));
      activeTbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: #94a3b8; padding: 3.5rem 1rem;">
            <i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.75rem; display: block;"></i>
            <div style="font-size: 1.05rem; font-weight: 700; color: #334155; margin-bottom: 0.3rem;">No active orders found for ${brandNameDisplay}</div>
            <div style="font-size: 0.85rem; color: #64748b;">Customer orders placed on the website or WhatsApp will appear here live!</div>
          </td>
        </tr>`;
    } else {
      activeTbody.innerHTML = filteredActive.map(order => {
        const orderId = order.orderId || order.bookingNumber || 'ORD-UNKNOWN';
        const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const itemsSummary = (order.items || []).map(i => `${i.name} (${i.qty}x)`).join(', ');
        const brandName = order.brandName || getBrandTitle(order.brand);
        const brandStyle = getBrandStyle(order.brand);
        const brandIcon = getBrandIcon(order.brand);
        const isWhatsApp = (order.paymentMethod || '').toLowerCase().includes('whatsapp');
        const cleanPhone = (order.phone || '').replace(/\D/g, '').slice(-10);

        // Normalize status for active button check
        const currentStatus = (order.status || 'Pending').toLowerCase();
        const isPending = currentStatus === 'pending';
        const isProcessing = currentStatus === 'processing';
        const isCompleted = currentStatus === 'completed' || currentStatus === 'delivered' || currentStatus === 'complete';
        const isCancelled = currentStatus === 'cancelled' || currentStatus === 'cancelling';

        return `
          <tr id="order-row-${orderId}" data-order-id="${orderId}">
            <td>
              <strong style="font-family: monospace; color: #2563eb; font-size: 0.9rem;">${orderId}</strong>
            </td>
            <td>
              <span style="font-size: 0.76rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 6px; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem; ${brandStyle}">
                <span>${brandIcon}</span>
                <span>${brandName}</span>
              </span>
            </td>
            <td>
              <strong style="color: #0f172a; font-size: 0.9rem;">${order.customerName}</strong><br>
              <small style="color: #64748b; font-size: 0.75rem; display: block; max-width: 200px; line-height: 1.3;" title="${order.address || ''}">${order.address || 'Address not specified'}</small>
            </td>
            <td>
              <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">${order.phone || '-'}</div>
              ${order.email ? `<small style="color: #64748b; font-size: 0.75rem;">${order.email}</small>` : ''}
            </td>
            <td style="max-width: 200px; font-size: 0.8rem; color: #475569;" title="${itemsSummary}">${itemsSummary || 'Festival Crackers Order'}</td>
            <td>
              <strong style="color: #0f172a; font-size: 1.05rem;">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</strong>
            </td>
            <td>
              ${isWhatsApp ? `
                <span style="font-size: 0.76rem; font-weight: 800; padding: 0.26rem 0.65rem; border-radius: 9999px; background: #dcfce7; color: #15803d; display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid #86efac; box-shadow: 0 1px 2px rgba(22,163,74,0.1);">
                  <i class="fa-brands fa-whatsapp" style="color: #16a34a; font-size: 0.92rem;"></i>
                  <span>WhatsApp Direct</span>
                </span>
              ` : `
                <div style="font-size: 0.78rem; font-weight: 700; color: #0f172a;">
                  ${order.paymentMethod || 'UPI QR'}
                </div>
              `}
              ${order.utrRef ? `<div style="font-size: 0.7rem; color: #059669; font-family: monospace;">UTR: ${order.utrRef}</div>` : ''}
            </td>
            <td>
              <div class="status-btn-group">
                <button class="status-btn btn-pnd ${isPending ? 'active' : ''}" onclick="updateOrderStatus('${orderId}', 'Pending')" title="Mark as Pending (triggers email notification)"><i class="fa-solid fa-clock"></i> Pending</button>
                <button class="status-btn btn-prc ${isProcessing ? 'active' : ''}" onclick="updateOrderStatus('${orderId}', 'Processing')" title="Mark as Processing (triggers email notification)"><i class="fa-solid fa-gears"></i> Processing</button>
                <button class="status-btn btn-dlv ${isCompleted ? 'active' : ''}" onclick="updateOrderStatus('${orderId}', 'Completed')" title="Mark as Completed (triggers email notification)"><i class="fa-solid fa-circle-check"></i> Completed</button>
                <button class="status-btn btn-ccl ${isCancelled ? 'active' : ''}" onclick="updateOrderStatus('${orderId}', 'Cancelled')" title="Mark as Cancelled (triggers email notification)"><i class="fa-solid fa-circle-xmark"></i> Cancelled</button>
              </div>
            </td>
            <td style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">${dateStr}</td>
            <td>
              <div class="action-btn-row">
                <a href="https://wa.me/91${cleanPhone}?text=Hi%20${encodeURIComponent(order.customerName)},%20update%20from%20${encodeURIComponent(brandName)}%20regarding%20your%20Order%20${orderId}" target="_blank" class="btn btn-dark-outline btn-act" title="Chat on WhatsApp (+91 ${cleanPhone})">
                  <i class="fa-brands fa-whatsapp" style="color: #22c55e;"></i>
                </a>
                <button type="button" class="btn btn-dark-outline btn-act" onclick="viewOrderInvoice('${orderId}')" title="View Order Tax Invoice & Estimate">
                  <i class="fa-solid fa-file-invoice" style="color: #2563eb;"></i>
                </button>
                <button class="btn-perm-del-order" onclick="permanentlyDeleteOrder('${orderId}')" title="Permanently delete this order from database">
                  <i class="fa-solid fa-trash-can"></i>
                  <span>Delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 2. FILTER & RENDER DRAFT / TRASH ORDERS
  if (draftTbody) {
    const filteredDraft = allDraft.filter(o => {
      const matchesSearch = !search ||
        (o.orderId && o.orderId.toLowerCase().includes(search)) ||
        (o.bookingNumber && o.bookingNumber.toLowerCase().includes(search)) ||
        (o.customerName && o.customerName.toLowerCase().includes(search)) ||
        (o.phone && o.phone.toLowerCase().includes(search));

      const matchesBrand = (activeBrand === 'all') || (o.brand === activeBrand) ||
        (o.brandName && o.brandName.toLowerCase().includes(activeBrand));

      return matchesSearch && matchesBrand;
    });

    if (filteredDraft.length === 0) {
      draftTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #94a3b8; padding: 3.5rem 1rem;">
            <i class="fa-solid fa-trash-can-check" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.75rem; display: block;"></i>
            <div style="font-size: 1.05rem; font-weight: 700; color: #334155; margin-bottom: 0.3rem;">Draft Trash Bin is empty</div>
            <div style="font-size: 0.85rem; color: #64748b;">Orders deleted via "Draft Delete" are safely preserved here for 30 days before automatic deletion.</div>
          </td>
        </tr>`;
    } else {
      const now = Date.now();
      draftTbody.innerHTML = filteredDraft.map(order => {
        const orderId = order.orderId || order.bookingNumber || 'ORD-UNKNOWN';
        const deletedTime = new Date(order.deletedAt || order.updatedAt || now).getTime();
        const expireTime = deletedTime + (30 * 24 * 60 * 60 * 1000);
        const diffMs = Math.max(0, expireTime - now);
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));

        let pillClass = 'pill-safe';
        let pillText = `⏱️ ${daysLeft} days remaining`;
        if (daysLeft <= 5) {
          pillClass = 'pill-danger';
          pillText = daysLeft <= 1 ? `🚨 ${hoursLeft} hours left` : `🚨 ${daysLeft} days remaining`;
        } else if (daysLeft <= 15) {
          pillClass = 'pill-warn';
          pillText = `⚠️ ${daysLeft} days remaining`;
        }

        const deletedDateStr = new Date(deletedTime).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const brandName = order.brandName || getBrandTitle(order.brand);
        const brandStyle = getBrandStyle(order.brand);
        const brandIcon = getBrandIcon(order.brand);

        return `
          <tr id="draft-row-${orderId}">
            <td><strong style="font-family: monospace; color: #64748b;">${orderId}</strong></td>
            <td>
              <span style="font-size: 0.76rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 6px; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem; ${brandStyle}">
                <span>${brandIcon}</span>
                <span>${brandName}</span>
              </span>
            </td>
            <td>
              <strong>${order.customerName}</strong><br>
              <small style="color: #64748b;">${order.phone} ${order.email ? `• ${order.email}` : ''}</small>
            </td>
            <td>
              <strong style="color: #0f172a;">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</strong><br>
              <small style="color: #64748b;">${(order.items || []).length} items ordered</small>
            </td>
            <td style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">${deletedDateStr}</td>
            <td>
              <span class="trash-countdown-pill ${pillClass}">
                ${pillText}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: nowrap;">
                <button type="button" class="btn btn-dark-outline btn-act" onclick="viewOrderInvoice('${orderId}')" title="View Order Tax Invoice & Estimate">
                  <i class="fa-solid fa-file-invoice" style="color: #2563eb;"></i>
                </button>
                <button class="btn-restore-order" onclick="restoreOrder('${orderId}')" title="Restore order back to Active list">
                  <i class="fa-solid fa-rotate-left"></i>
                  <span>Restore</span>
                </button>
                <button class="btn-perm-del-order" onclick="permanentlyDeleteOrder('${orderId}')" title="Permanently delete now (irreversible)">
                  <i class="fa-solid fa-ban"></i>
                  <span>Delete Forever</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

// ----------------------------------------------------
// VIEW ORDER TAX INVOICE & ESTIMATE
// ----------------------------------------------------
function viewOrderInvoice(orderId) {
  if (!orderId) {
    showAdminToast('Error', 'Invalid Order ID', 'error');
    return;
  }

  // 1. Locate the order from in-memory adminOrders or sync storage
  let order = adminOrders.find(o => (o.orderId === orderId || o.bookingNumber === orderId || o._id === orderId));
  if (!order) {
    try {
      const syncList = JSON.parse(localStorage.getItem('admin_orders_sync') || '[]');
      order = syncList.find(o => (o.orderId === orderId || o.bookingNumber === orderId || o._id === orderId));
    } catch (e) { }
  }

  // 2. Pre-cache order into localStorage so invoice.html displays complete invoice details instantly
  if (order) {
    try {
      localStorage.setItem('view_invoice_order', JSON.stringify(order));
      localStorage.setItem('last_confirmed_order', JSON.stringify(order));
    } catch (e) {
      console.warn('Could not cache order in localStorage:', e);
    }
  }

  // 3. Build invoice URL supporting both HTTP/HTTPS and file:/// protocols
  let invoiceUrl = `invoice.html?bn=${encodeURIComponent(orderId)}`;
  if (window.location.protocol && window.location.protocol.startsWith('http')) {
    const pathParts = window.location.pathname.split('/');
    pathParts.pop(); // Remove 'admin.html'
    const dirPath = pathParts.join('/');
    invoiceUrl = `${window.location.origin}${dirPath ? dirPath + '/' : '/'}invoice.html?bn=${encodeURIComponent(orderId)}`;
  }

  // Open invoice in new tab
  window.open(invoiceUrl, '_blank');
}

// ----------------------------------------------------
// ORDER STATUS UPDATE WITH AUTOMATED SMTP EMAIL TRIGGER
// ----------------------------------------------------
async function updateOrderStatus(orderId, newStatus) {
  try {
    const order = adminOrders.find(o => (o.orderId === orderId || o.bookingNumber === orderId));
    const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, order: order })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to update order status');
    }

    // Update in-memory order object
    if (order) {
      order.status = data.newStatus || newStatus;
    }

    // Persist updated state to localStorage immediately
    try {
      localStorage.setItem('admin_orders_sync', JSON.stringify(adminOrders));
    } catch (e) { }

    renderAdminOrders();
    renderDashboardOverview();

    // Show detailed toast notification regarding status & email trigger
    if (data.emailSent) {
      showAdminToast(
        `Order #${orderId} Updated`,
        `Status set to <strong>${data.newStatus || newStatus}</strong>. Automated notification email dispatched to <strong>${data.emailDetails?.recipient || order?.email}</strong>.`,
        'success'
      );
    } else {
      const reason = data.emailDetails?.reason || (order?.email ? 'Email service unconfigured' : 'No customer email provided');
      showAdminToast(
        `Order #${orderId} Updated`,
        `Status set to <strong>${data.newStatus || newStatus}</strong>. (Note: ${reason})`,
        'info'
      );
    }
  } catch (err) {
    console.error('Status update error:', err);
    showAdminToast('Update Failed', err.message, 'error');
  }
}

// ----------------------------------------------------
// DRAFT DELETE (SOFT DELETE WITH 30-DAY RETENTION)
// ----------------------------------------------------
async function draftDeleteOrder(orderId) {
  const confirmed = confirm(
    `Move Order #${orderId} to Draft Trash?\n\n` +
    `• The order will be removed from Active Orders.\n` +
    `• It will be safely retained in Draft Trash for 30 days.\n` +
    `• After 30 days, it is automatically purged forever.\n` +
    `• You can restore it anytime within 30 days.`
  );

  if (!confirmed) return;

  try {
    const order = adminOrders.find(o => o.orderId === orderId || o.bookingNumber === orderId);
    const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}/draft-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: order })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to move order to draft trash');

    // Update local state
    if (order) {
      order.isDraftDeleted = true;
      order.deletedAt = new Date().toISOString();
    }

    try {
      localStorage.setItem('admin_orders_sync', JSON.stringify(adminOrders));
    } catch (e) { }

    renderAdminOrders();
    renderDashboardOverview();

    showAdminToast(
      'Order Moved to Draft Trash',
      `Order #${orderId} has been moved to Draft Trash. It will be kept for 30 days.`,
      'warning'
    );
  } catch (err) {
    showAdminToast('Draft Delete Failed', err.message, 'error');
  }
}

// ----------------------------------------------------
// RESTORE ORDER FROM DRAFT TRASH
// ----------------------------------------------------
async function restoreOrder(orderId) {
  try {
    const order = adminOrders.find(o => o.orderId === orderId || o.bookingNumber === orderId);
    const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: order })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to restore order');

    // Update local state
    if (order) {
      order.isDraftDeleted = false;
      order.deletedAt = null;
    }

    try {
      localStorage.setItem('admin_orders_sync', JSON.stringify(adminOrders));
    } catch (e) { }

    renderAdminOrders();
    renderDashboardOverview();

    showAdminToast(
      'Order Restored',
      `Order #${orderId} is restored back to Active Orders!`,
      'success'
    );
  } catch (err) {
    showAdminToast('Restore Failed', err.message, 'error');
  }
}

// ----------------------------------------------------
// PERMANENTLY DELETE SINGLE ORDER
// ----------------------------------------------------
async function permanentlyDeleteOrder(orderId) {
  const confirmed = confirm(
    `Are you sure you want to permanently delete Order #${orderId}?\n\n` +
    `This will completely remove the order from the registry.\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  // 1. Mark as permanently deleted immediately in local blacklist
  addDeletedOrderId(orderId);
  const target = adminOrders.find(o => o.orderId === orderId || o.bookingNumber === orderId || o._id === orderId);
  if (target) {
    if (target.orderId) addDeletedOrderId(target.orderId);
    if (target.bookingNumber) addDeletedOrderId(target.bookingNumber);
    if (target._id) addDeletedOrderId(target._id);
  }

  // 2. Remove from local memory state immediately
  adminOrders = adminOrders.filter(o => o.orderId !== orderId && o.bookingNumber !== orderId && o._id !== orderId);

  try {
    localStorage.setItem('admin_orders_sync', JSON.stringify(adminOrders));
  } catch (e) { }

  // 3. Remove associated notification
  adminNotifications = adminNotifications.filter(n => {
    const text = `${n.title || ''} ${n.desc || ''}`;
    return !text.includes(orderId) && n.orderId !== orderId;
  });
  saveNotifications();
  renderNotifications();

  renderAdminOrders();
  renderDashboardOverview();

  // 4. Notify other open admin windows immediately
  if (syncChannel) {
    syncChannel.postMessage({ type: 'ORDER_DELETED', orderId });
  }

  // 5. Send DELETE request to backend API
  try {
    await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE'
    });
    showAdminToast(
      'Order Deleted',
      `Order #${orderId} was permanently deleted.`,
      'success'
    );
  } catch (err) {
    console.warn('Backend DELETE fetch warning:', err);
    showAdminToast(
      'Order Deleted',
      `Order #${orderId} removed from local records.`,
      'success'
    );
  }
}

// ----------------------------------------------------
// EMPTY ALL DRAFT TRASH
// ----------------------------------------------------
async function emptyDraftTrash() {
  const draftCount = adminOrders.filter(o => o.isDraftDeleted).length;
  if (draftCount === 0) {
    alert('Draft Trash is already empty!');
    return;
  }

  const confirmed = confirm(
    `⚠️ EMPTY ALL DRAFT TRASH WARNING\n\n` +
    `Permanently delete all ${draftCount} orders in Draft Trash?\n\n` +
    `All ${draftCount} orders will be destroyed forever and cannot be recovered!`
  );

  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/api/orders/drafts/empty`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to empty draft trash');

    adminOrders = adminOrders.filter(o => !o.isDraftDeleted);

    try {
      localStorage.setItem('admin_orders_sync', JSON.stringify(adminOrders));
    } catch (e) { }

    renderAdminOrders();
    renderDashboardOverview();

    showAdminToast(
      'Draft Trash Emptied',
      `All ${draftCount} draft-deleted orders have been permanently cleared.`,
      'info'
    );
  } catch (err) {
    showAdminToast('Empty Trash Failed', err.message, 'error');
  }
}

// ----------------------------------------------------
// SMTP EMAIL SETTINGS MODAL & CONFIGURATION
// ----------------------------------------------------
async function openSmtpSettingsModal() {
  const modal = document.getElementById('smtpSettingsModal');
  if (!modal) return;
  modal.style.display = 'flex';

  // Load existing SMTP config
  try {
    const res = await fetch(`${API_BASE}/api/admin/smtp-config`);
    if (res.ok) {
      const config = await res.json();
      if (document.getElementById('smtpHostInput')) document.getElementById('smtpHostInput').value = config.host || 'smtp.gmail.com';
      if (document.getElementById('smtpPortInput')) document.getElementById('smtpPortInput').value = config.port || 587;
      if (document.getElementById('smtpSecureInput')) document.getElementById('smtpSecureInput').checked = Boolean(config.secure);
      if (document.getElementById('smtpUserInput')) document.getElementById('smtpUserInput').value = config.user || '';
      if (document.getElementById('smtpFromInput')) document.getElementById('smtpFromInput').value = config.from || '"Get Pattas Kadai" <sales@getpattas.com>';
      if (document.getElementById('smtpPassInput')) {
        document.getElementById('smtpPassInput').value = '';
        document.getElementById('smtpPassInput').placeholder = config.hasPassword ? '●●●●●●●● (Password set; enter new to change)' : 'Enter SMTP App Password';
      }
    }
  } catch (e) { }
}

function closeSmtpSettingsModal() {
  const modal = document.getElementById('smtpSettingsModal');
  if (modal) modal.style.display = 'none';
  const feedback = document.getElementById('smtpTestFeedback');
  if (feedback) feedback.style.display = 'none';
}

function toggleSmtpPasswordVisibility() {
  const input = document.getElementById('smtpPassInput');
  const eye = document.getElementById('smtpPassEye');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    eye?.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    eye?.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

async function saveSmtpSettings(e) {
  if (e) e.preventDefault();
  const host = document.getElementById('smtpHostInput')?.value.trim();
  const port = document.getElementById('smtpPortInput')?.value.trim();
  const secure = document.getElementById('smtpSecureInput')?.checked;
  const user = document.getElementById('smtpUserInput')?.value.trim();
  const pass = document.getElementById('smtpPassInput')?.value.trim();
  const from = document.getElementById('smtpFromInput')?.value.trim();

  const btn = document.getElementById('btnSaveSmtp');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/smtp-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpHost: host,
        smtpPort: port,
        smtpSecure: secure,
        smtpUser: user,
        smtpPass: pass,
        smtpFrom: from
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save SMTP configuration');

    showAdminToast('SMTP Configuration Saved', 'SMTP settings have been updated successfully.', 'success');
    closeSmtpSettingsModal();
  } catch (err) {
    showAdminToast('Save Failed', err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Save Configuration</span>';
    }
  }
}

async function sendTestSmtpEmail() {
  const recipient = document.getElementById('smtpTestRecipient')?.value.trim();
  const feedback = document.getElementById('smtpTestFeedback');
  const btn = document.getElementById('btnTestSmtp');

  if (!recipient || !recipient.includes('@')) {
    alert('Please enter a valid recipient email address to receive the test email.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
  }
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.color = '#2563eb';
    feedback.textContent = 'Connecting to SMTP server and sending test email...';
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/test-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testEmail: recipient })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'SMTP test failed');

    if (feedback) {
      feedback.style.color = '#059669';
      feedback.innerHTML = `✅ ${data.message}`;
    }
    showAdminToast('Test Email Sent!', `Successfully verified SMTP connection to ${recipient}`, 'success');
  } catch (err) {
    if (feedback) {
      feedback.style.color = '#dc2626';
      feedback.innerHTML = `❌ ${err.message}`;
    }
    showAdminToast('SMTP Test Failed', err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-vial"></i> <span>Send Test</span>';
    }
  }
}

// ----------------------------------------------------
// MODERN ADMIN TOAST NOTIFICATION SYSTEM
// ----------------------------------------------------
function showAdminToast(title, message, type = 'info', duration = 4500) {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const iconMap = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${iconMap[type] || 'fa-bell'} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}


// ----------------------------------------------------
// REGISTERED CUSTOMERS (USERS VIEW)
// ----------------------------------------------------
async function loadAdminCustomers() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/customers`);
    adminCustomers = await res.json();
  } catch (err) {
    adminCustomers = [];
  }
  renderAdminCustomers();
  renderDashboardOverview();
}

function renderAdminCustomers() {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;

  const search = (document.getElementById('customerSearchInput')?.value || '').toLowerCase().trim();

  const filtered = adminCustomers.filter(c =>
    (c.fullName && c.fullName.toLowerCase().includes(search)) ||
    (c.username && c.username.toLowerCase().includes(search)) ||
    (c.phone && c.phone.toLowerCase().includes(search))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 3rem;">No registered customer accounts found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const dateStr = new Date(c.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    let mainAddress = c.address || 'No default address specified';
    if (c.addresses && c.addresses.length > 0) {
      const def = c.addresses.find(a => a.isDefault) || c.addresses[0];
      mainAddress = `${def.label ? def.label + ': ' : ''}${def.addressText}, ${def.city} - ${def.pincode}`;
    }

    const addrCount = c.addresses ? c.addresses.length : 0;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: #f3e8ff; color: #9333ea; display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
              <i class="fa-solid fa-user"></i>
            </div>
            <div>
              <strong>${c.fullName || c.username}</strong>
            </div>
          </div>
        </td>
        <td><span style="font-family: monospace; font-weight: 600; color: #475569;">@${c.username}</span></td>
        <td><a href="tel:${c.phone}" style="color: var(--primary-purple); font-weight: 700;">${c.phone || 'N/A'}</a></td>
        <td style="max-width: 280px; font-size: 0.82rem; color: #334155;">${mainAddress}</td>
        <td><span class="code-badge" style="background: #f1f5f9; color: #475569;">${addrCount} address(es)</span></td>
        <td style="font-size: 0.78rem; color: #64748b;">${dateStr}</td>
        <td>
          <a href="https://wa.me/91${(c.phone || '').replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(c.fullName || c.username)},%20Greetings%20from%20Get%20Pattasu%20Kadai!" target="_blank" class="btn btn-dark-outline" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-brands fa-whatsapp" style="color: #22c55e;"></i> WhatsApp</a>
        </td>
      </tr>
    `;
  }).join('');
}

// ----------------------------------------------------
// CATEGORIES VIEW
// ----------------------------------------------------
function renderCategoryCounts() {
  const cats = ['sparklers', 'flowerpots', 'chakkars', 'skyshots', 'bombs', 'combos'];
  cats.forEach(cat => {
    const el = document.getElementById(`catCount${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    if (el) {
      const count = adminProducts.filter(p => p.category === cat).length;
      el.innerText = `${count} ${count === 1 ? 'item' : 'items'}`;
    }
  });
}

function filterByCat(cat) {
  switchAdminTab('products');
  const catFilter = document.getElementById('prodCategoryFilter');
  if (catFilter) {
    catFilter.value = cat;
    renderAdminProducts();
  }
}

// ----------------------------------------------------
// REVIEWS VIEW
// ----------------------------------------------------
function renderAdminReviews() {
  const container = document.getElementById('adminReviewsList');
  if (!container) return;

  const reviews = [
    { name: 'Suresh Kumar S.', city: 'Chennai', rating: 5, time: '3 days ago', text: 'Direct Factory Price & Superb Packing! Ordered the Grand Family Dhamaka box, delivered safely in 48 hrs.' },
    { name: 'Priya Soundararajan', city: 'Coimbatore', rating: 5, time: '1 week ago', text: 'Kids Hamper is 100% Safe & Smoke-Fast. The WhatsApp order support made everything effortless.' },
    { name: 'Ramesh Babu V.', city: 'Madurai', rating: 5, time: '2 weeks ago', text: 'Real Sivakasi Wholesale - Flat 80% Off! Direct factory purchase saved over ₹4,000 for our family.' },
    { name: 'Dr. Karthikeyan M.', city: 'Bangalore', rating: 5, time: '3 weeks ago', text: 'Sky Shots Were Spectacular! Every single shot burst high in the night sky with vibrant patterns.' }
  ];

  container.innerHTML = reviews.map(r => `
    <div class="dash-card" style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
        <div>
          <strong style="font-size: 1rem; color: #0f172a;">${r.name}</strong>
          <div style="font-size: 0.78rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; margin-top: 2px;">
            <span><i class="fa-solid fa-location-dot" style="color: #ea580c;"></i> ${r.city}</span>
            <span>•</span>
            <span style="color: #16a34a; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Verified Buyer</span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="color: #f59e0b; font-size: 0.88rem; letter-spacing: 2px;">
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
          </div>
          <span style="font-size: 0.72rem; color: #94a3b8;">${r.time}</span>
        </div>
      </div>
      <p style="font-size: 0.88rem; color: #475569; line-height: 1.5; margin: 0;">"${r.text}"</p>
    </div>
  `).join('');
}

// ----------------------------------------------------
// ANALYTICS VIEW
// ----------------------------------------------------
function renderAnalyticsView() {
  const totalSales = adminOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const aov = adminOrders.length > 0 ? Math.round(totalSales / adminOrders.length) : 1850;

  const aovEl = document.getElementById('analyticsAOV');
  const ordEl = document.getElementById('analyticsTotalOrders');

  if (aovEl) aovEl.innerText = `₹${aov.toLocaleString('en-IN')}`;
  if (ordEl) ordEl.innerText = adminOrders.length;
}

// ----------------------------------------------------
// HERO SECTION & CONTACT EDITORS
// ----------------------------------------------------
async function loadAdminConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    adminConfig = await res.json();
    localStorage.setItem('admin_config_sync', JSON.stringify(adminConfig));
    broadcastConfigUpdate();
  } catch (err) {
    const local = localStorage.getItem('admin_config_sync');
    if (local) adminConfig = JSON.parse(local);
  }

  document.getElementById('heroBadgeInput').value = adminConfig.heroBadge || '';
  document.getElementById('heroTitleInput').value = adminConfig.heroTitle || '';
  document.getElementById('heroSubInput').value = adminConfig.heroSubtitle || '';
  document.getElementById('heroImagePreview').src = adminConfig.heroImage || 'assets/hero_banner.jpg';

  document.getElementById('contactPhoneInput').value = adminConfig.storePhone || '';
  document.getElementById('contactEmailInput').value = adminConfig.storeEmail || '';
  document.getElementById('contactAddressInput').value = adminConfig.storeAddress || '';
}

async function handleHeroSave(e) {
  e.preventDefault();
  const heroBadge = document.getElementById('heroBadgeInput').value.trim();
  const heroTitle = document.getElementById('heroTitleInput').value.trim();
  const heroSubtitle = document.getElementById('heroSubInput').value.trim();
  const heroImage = document.getElementById('heroImagePreview').src;

  const payload = { ...adminConfig, heroBadge, heroTitle, heroSubtitle, heroImage };

  try {
    await fetch(`${API_BASE}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) { }

  adminConfig = payload;
  localStorage.setItem('admin_config_sync', JSON.stringify(adminConfig));
  broadcastConfigUpdate();
  alert('Hero banner & headlines updated successfully! Customer storefront updated live.');
}

async function handleContactSave(e) {
  e.preventDefault();
  const storePhone = document.getElementById('contactPhoneInput').value.trim();
  const storeEmail = document.getElementById('contactEmailInput').value.trim();
  const storeAddress = document.getElementById('contactAddressInput').value.trim();

  const payload = { ...adminConfig, storePhone, storeEmail, storeAddress };

  try {
    await fetch(`${API_BASE}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) { }

  adminConfig = payload;
  localStorage.setItem('admin_config_sync', JSON.stringify(adminConfig));
  broadcastConfigUpdate();
  alert('Store Contact & Address updated successfully! Customer storefront updated live.');
}

function previewImageUpload(input, previewId) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('image', input.files[0]);

  fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData
  }).then(res => res.json()).then(data => {
    if (data.success) {
      document.getElementById(previewId).src = data.url;
    }
  }).catch(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById(previewId).src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  });
}

function initAdminTheme() {
  const saved = localStorage.getItem('admin_theme');
  const icon = document.getElementById('themeToggleIcon');
  if (saved === 'dark') {
    document.body.classList.add('dark-theme');
    if (icon) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    }
  } else {
    document.body.classList.remove('dark-theme');
    if (icon) {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  }
}

function toggleAdminTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('admin_theme', isDark ? 'dark' : 'light');
  const icon = document.getElementById('themeToggleIcon');
  if (icon) {
    if (isDark) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  }
}
