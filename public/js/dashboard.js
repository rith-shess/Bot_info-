/**
 * Admin Dashboard Main Application Script
 */

const dashboard = {
  currentTab: 'overview',
  categories: [],
  productsPage: 1,
  productsLimit: 15,
  productsTotalPages: 1,
  selectedFiles: [],
  imagesToRemove: [],
  selectedVideos: [],
  videosToRemove: [],
  MAX_VIDEO_BYTES: 1024 * 1024 * 1024, // 1GB
  MAX_VIDEOS: 3,
  confirmCallback: null,

  init() {
    this.setupEventListeners();
    this.checkCurrentUser();
    this.loadOverview();
    this.loadCategories();
  },

  setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Mobile Sidebar Toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => sidebar.classList.add('open'));
    }
    if (closeSidebarBtn) {
      closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

    // Topbar Add Button
    document.getElementById('topbarAddBtn').addEventListener('click', () => {
      this.openProductModal();
    });

    // Products Search & Filters
    const searchInput = document.getElementById('productSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
      debounceTimer = setTimeout(() => {
        this.productsPage = 1;
        this.loadProducts();
      }, 350);
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      this.productsPage = 1;
      this.loadProducts();
    });

    document.getElementById('filterCategory').addEventListener('change', () => {
      this.productsPage = 1;
      this.loadProducts();
    });
    document.getElementById('filterStock').addEventListener('change', () => {
      this.productsPage = 1;
      this.loadProducts();
    });
    document.getElementById('filterActive').addEventListener('change', () => {
      this.productsPage = 1;
      this.loadProducts();
    });

    // Add Product Modal Triggers
    document.getElementById('openAddProductModalBtn').addEventListener('click', () => {
      this.openProductModal();
    });

    // Add Category Modal Trigger
    document.getElementById('openAddCategoryModalBtn').addEventListener('click', () => {
      this.openCategoryModal();
    });

    // Forms Submissions
    document.getElementById('productForm').addEventListener('submit', (e) => this.handleProductSubmit(e));
    document.getElementById('categoryForm').addEventListener('submit', (e) => this.handleCategorySubmit(e));
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
    }

    // Confirm Delete Button
    document.getElementById('confirmModalBtn').addEventListener('click', () => {
      if (typeof this.confirmCallback === 'function') {
        this.confirmCallback();
      }
      this.closeModal('confirmModal');
    });

    // Image Upload Dropzone Setup
    this.setupDropzone();
    this.setupVideoDropzone();
  },

  setupDropzone() {
    const dropzone = document.getElementById('uploadDropzone');
    const fileInput = document.getElementById('prodImagesInput');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.appendNewFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.appendNewFiles(Array.from(fileInput.files));
      }
    });
  },

  setupVideoDropzone() {
    const dropzone = document.getElementById('videoDropzone');
    const input = document.getElementById('prodVideosInput');
    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.appendNewVideos(Array.from(e.dataTransfer.files));
      }
    });
    input.addEventListener('change', () => {
      if (input.files && input.files.length > 0) {
        this.appendNewVideos(Array.from(input.files));
      }
      input.value = ''; // allow picking the same file again
    });
  },

  formatBytes(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  },

  appendNewVideos(files) {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        this.showToast(`"${file.name}" skipped: only MP4, MOV and WEBM videos are allowed.`, 'warning');
        continue;
      }
      if (file.size > this.MAX_VIDEO_BYTES) {
        this.showToast(`"${file.name}" skipped: ${this.formatBytes(file.size)} is over the 1GB limit.`, 'error');
        continue;
      }
      if (this.selectedVideos.length >= this.MAX_VIDEOS) {
        this.showToast(`Only ${this.MAX_VIDEOS} videos can be uploaded at once.`, 'warning');
        break;
      }
      this.selectedVideos.push(file);
    }
    this.renderNewVideosPreview();
  },

  renderNewVideosPreview() {
    const container = document.getElementById('newVideosPreview');
    if (!container) return;
    container.innerHTML = '';

    this.selectedVideos.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'video-item';

      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-film';
      row.appendChild(icon);

      const name = document.createElement('span');
      name.className = 'video-name';
      name.textContent = file.name;
      row.appendChild(name);

      const size = document.createElement('span');
      size.className = 'video-size';
      size.textContent = this.formatBytes(file.size);
      row.appendChild(size);

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'video-remove-btn';
      rm.title = 'Remove video';
      rm.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      rm.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedVideos.splice(index, 1);
        this.renderNewVideosPreview();
      });
      row.appendChild(rm);

      container.appendChild(row);
    });
  },

  markVideoForRemoval(videoId) {
    if (!this.videosToRemove.includes(videoId)) {
      this.videosToRemove.push(videoId);
    }
    const elem = document.getElementById(`existing-vid-${videoId}`);
    if (elem) elem.remove();
  },

  // Sends the product form with real upload progress (fetch cannot report upload progress)
  sendProductForm(url, method, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        let json = null;
        try { json = JSON.parse(xhr.responseText); } catch (err) { /* not JSON */ }
        resolve({ status: xhr.status, json });
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.send(formData);
    });
  },

  appendNewFiles(files) {
    const valid = files.filter(f => f.type.startsWith('image/'));
    if (valid.length !== files.length) {
      this.showToast('Some files were ignored because they are not valid images.', 'warning');
    }
    this.selectedFiles = this.selectedFiles.concat(valid);
    this.renderNewImagesPreview();
  },

  renderNewImagesPreview() {
    const container = document.getElementById('newImagesPreview');
    container.innerHTML = '';

    this.selectedFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'img-preview-card';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      card.appendChild(img);

      const rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'img-remove-btn';
      rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      rmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedFiles.splice(index, 1);
        this.renderNewImagesPreview();
      });
      card.appendChild(rmBtn);

      container.appendChild(card);
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update Nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update Tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    const activePane = document.getElementById(`tab-${tabName}`);
    if (activePane) activePane.classList.add('active');

    // Update Topbar Title
    const titleMap = {
      overview: 'Dashboard Overview',
      products: 'Product Management',
      categories: 'Category Management',
      settings: 'Store & Contact Settings'
    };
    document.getElementById('pageTitle').textContent = titleMap[tabName] || 'Dashboard';

    // Close mobile sidebar if open
    document.getElementById('sidebar').classList.remove('open');

    // Trigger tab-specific loads
    if (tabName === 'overview') this.loadOverview();
    if (tabName === 'products') this.loadProducts();
    if (tabName === 'categories') this.loadCategories();
    if (tabName === 'settings') this.loadSettings();
  },

  async checkCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.admin) {
        document.getElementById('adminUserName').textContent = data.admin.fullName || data.admin.username;
      }
    } catch (e) {
      console.error('Failed to get current user info');
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      window.location.href = '/login';
    }
  },

  /* ================= OVERVIEW TAB ================= */
  async loadOverview() {
    try {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      if (!json.success) return;

      const data = json.data;

      // Update counters
      document.getElementById('statTotalProducts').textContent = data.totalProducts ?? 0;
      document.getElementById('statActiveProducts').textContent = data.activeProducts ?? 0;
      document.getElementById('statOutOfStock').textContent = data.outOfStockProducts ?? 0;
      document.getElementById('statTotalCategories').textContent = data.totalCategories ?? 0;

      // Update Bot Status Elements
      this.renderBotStatus(data.botStatus);

      // Render Recent Products
      this.renderRecentProducts(data.recentProducts || []);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  },

  renderBotStatus(bot) {
    const sidebarDot = document.getElementById('sidebarDot');
    const sidebarText = document.getElementById('sidebarBotText');
    const topbarStatus = document.getElementById('topbarBotStatus');
    const badge = document.getElementById('botStateBadge');
    const details = document.getElementById('botStatusDetails');

    if (!bot) return;

    if (bot.connected) {
      sidebarDot.className = 'status-indicator-dot online';
      sidebarText.textContent = `@${bot.username || 'Bot'} (Online)`;
      topbarStatus.innerHTML = `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Bot Online: @${bot.username}</span>`;
      badge.className = 'badge badge-success';
      badge.textContent = 'Connected & Active';
      details.innerHTML = `
        <strong>Bot Username:</strong> @${bot.username} (${bot.firstName || 'Telegram Bot'})<br>
        <strong>Status:</strong> Ready to answer customer questions and send product pictures in English & Khmer.<br>
        <span class="text-muted"><i class="fa-regular fa-clock"></i> Running since: ${new Date(bot.startedAt).toLocaleString()}</span>
      `;
    } else {
      sidebarDot.className = 'status-indicator-dot offline';
      sidebarText.textContent = 'Bot Inactive';
      topbarStatus.innerHTML = `<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Bot Inactive</span>`;
      badge.className = 'badge badge-warning';
      badge.textContent = 'Inactive / Setup Required';
      details.innerHTML = `
        <strong>Notice:</strong> ${bot.error || 'Telegram Bot token is not configured.'}<br>
        Add your <code>BOT_TOKEN</code> in the <code>.env</code> file obtained from <strong>@BotFather</strong> to enable live Telegram customer inquiries.
      `;
    }
  },

  renderRecentProducts(products) {
    const tbody = document.getElementById('recentProductsTableBody');
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No products have been added yet.</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => {
      const thumb = p.thumbnail 
        ? `<img src="/uploads/products/${p.thumbnail}" class="table-thumb" alt="${this.escapeHtml(p.name_en)}">`
        : `<div class="thumb-placeholder"><i class="fa-solid fa-image"></i></div>`;
      
      const price = p.currency === 'USD' ? `$${Number(p.price).toFixed(2)}` : `${Number(p.price).toLocaleString()} ៛`;
      const stockBadge = this.getStockBadge(p.stock_status);
      const activeBadge = p.is_active === 1 ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';

      return `
        <tr>
          <td>${thumb}</td>
          <td><code>${this.escapeHtml(p.sku)}</code></td>
          <td>
            <div class="prod-name-en">${this.escapeHtml(p.name_en)}</div>
            <div class="prod-name-km">${this.escapeHtml(p.name_km || '')}</div>
          </td>
          <td>${this.escapeHtml(p.category_name_en || '-')}</td>
          <td><strong>${price}</strong></td>
          <td>${stockBadge}</td>
          <td>${activeBadge}</td>
        </tr>
      `;
    }).join('');
  },

  /* ================= PRODUCTS TAB ================= */
  async loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading products...</td></tr>';

    const search = document.getElementById('productSearchInput').value.trim();
    const category_id = document.getElementById('filterCategory').value;
    const stock_status = document.getElementById('filterStock').value;
    const is_active = document.getElementById('filterActive').value;

    const params = new URLSearchParams({
      page: this.productsPage,
      limit: this.productsLimit,
      search,
      category_id,
      stock_status,
      is_active
    });

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (!json.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${json.message || 'Error loading products.'}</td></tr>`;
        return;
      }

      this.renderProductsTable(json.data, json.pagination);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Failed to fetch products.</td></tr>';
    }
  },

  renderProductsTable(products, pagination) {
    const tbody = document.getElementById('productsTableBody');

    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No products found matching the criteria.</td></tr>';
      document.getElementById('paginationInfo').textContent = 'Showing 0 of 0';
      document.getElementById('paginationControls').innerHTML = '';
      return;
    }

    tbody.innerHTML = products.map(p => {
      const firstImg = p.images && p.images.length > 0 ? p.images[0].file_path : null;
      const thumb = firstImg 
        ? `<img src="/uploads/products/${firstImg}" class="table-thumb" alt="${this.escapeHtml(p.name_en)}">`
        : `<div class="thumb-placeholder"><i class="fa-solid fa-image"></i></div>`;

      const price = p.currency === 'USD' ? `$${Number(p.price).toFixed(2)}` : `${Number(p.price).toLocaleString()} ៛`;
      const stockBadge = this.getStockBadge(p.stock_status);

      return `
        <tr>
          <td>${thumb}</td>
          <td><code>${this.escapeHtml(p.sku)}</code></td>
          <td>
            <div class="prod-name-en">${this.escapeHtml(p.name_en)}</div>
            <div class="prod-name-km">${this.escapeHtml(p.name_km || '')}</div>
          </td>
          <td>${this.escapeHtml(p.category_name_en || '-')}</td>
          <td><strong>${price}</strong></td>
          <td>${stockBadge}</td>
          <td>
            <label class="switch">
              <input type="checkbox" ${p.is_active === 1 ? 'checked' : ''} onchange="dashboard.toggleProductStatus(${p.id})">
              <span class="slider"></span>
            </label>
          </td>
          <td class="text-right">
            <div class="action-buttons" style="justify-content: flex-end;">
              <button class="btn btn-sm btn-outline btn-icon" title="Edit Product" onclick="dashboard.editProduct(${p.id})">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-sm btn-danger btn-icon" title="Delete Product" onclick="dashboard.confirmDeleteProduct(${p.id}, '${this.escapeHtml(p.name_en)}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination
    this.productsTotalPages = pagination.totalPages;
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    document.getElementById('paginationInfo').textContent = `Showing ${start} - ${end} of ${pagination.total} products`;

    const controls = document.getElementById('paginationControls');
    let btns = '';

    if (pagination.page > 1) {
      btns += `<button class="btn btn-sm btn-outline" onclick="dashboard.goToPage(${pagination.page - 1})">Prev</button>`;
    }
    btns += `<span class="btn btn-sm btn-outline" style="cursor:default; font-weight:bold;">${pagination.page} / ${pagination.totalPages || 1}</span>`;
    if (pagination.page < pagination.totalPages) {
      btns += `<button class="btn btn-sm btn-outline" onclick="dashboard.goToPage(${pagination.page + 1})">Next</button>`;
    }
    controls.innerHTML = btns;
  },

  goToPage(p) {
    this.productsPage = p;
    this.loadProducts();
  },

  async toggleProductStatus(id) {
    try {
      const res = await fetch(`/api/products/${id}/toggle-status`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) {
        this.showToast(json.message, 'success');
      } else {
        this.showToast(json.message || 'Failed to toggle status.', 'error');
        this.loadProducts();
      }
    } catch (e) {
      this.showToast('Network error while toggling status.', 'error');
      this.loadProducts();
    }
  },

  openProductModal(product = null) {
    const form = document.getElementById('productForm');
    form.reset();
    this.selectedFiles = [];
    this.imagesToRemove = [];
    this.selectedVideos = [];
    this.videosToRemove = [];
    this.renderNewImagesPreview();
    this.renderNewVideosPreview();
    const progressWrap = document.getElementById('uploadProgressWrap');
    if (progressWrap) progressWrap.style.display = 'none';
    const existingVidBox = document.getElementById('existingVideosContainer');
    const existingVidList = document.getElementById('existingVideosList');
    if (existingVidBox) existingVidBox.style.display = 'none';
    if (existingVidList) existingVidList.innerHTML = '';

    // Populate category dropdown
    const catSelect = document.getElementById('prodCategory');
    catSelect.innerHTML = '<option value="">-- Select Category --</option>' + 
      this.categories.map(c => `<option value="${c.id}">${this.escapeHtml(c.name_en)} (${this.escapeHtml(c.name_km || '')})</option>`).join('');

    const existingContainer = document.getElementById('existingImagesContainer');
    const existingList = document.getElementById('existingImagesList');
    existingList.innerHTML = '';

    if (product) {
      document.getElementById('productModalTitle').textContent = 'Edit Product';
      document.getElementById('prodFormId').value = product.id;
      document.getElementById('prodSku').value = product.sku;
      document.getElementById('prodNameEn').value = product.name_en;
      document.getElementById('prodNameKm').value = product.name_km || '';
      document.getElementById('prodPrice').value = product.price;
      document.getElementById('prodCurrency').value = product.currency || 'USD';
      document.getElementById('prodCategory').value = product.category_id || '';
      document.getElementById('prodStock').value = product.stock_status || 'in_stock';
      document.getElementById('prodIsActive').checked = product.is_active === 1;
      document.getElementById('prodDescEn').value = product.description_en || '';
      document.getElementById('prodDescKm').value = product.description_km || '';
      document.getElementById('prodDetailsEn').value = product.details_en || '';
      document.getElementById('prodDetailsKm').value = product.details_km || '';

      if (product.images && product.images.length > 0) {
        existingContainer.style.display = 'block';
        product.images.forEach(img => {
          const card = document.createElement('div');
          card.className = 'img-preview-card';
          card.id = `existing-img-${img.id}`;
          card.innerHTML = `
            <img src="/uploads/products/${img.file_path}" alt="">
            <button type="button" class="img-remove-btn" title="Remove image" onclick="dashboard.markImageForRemoval(${img.id})">
              <i class="fa-solid fa-trash"></i>
            </button>
          `;
          existingList.appendChild(card);
        });
      } else {
        existingContainer.style.display = 'none';
      }

      if (existingVidBox && existingVidList && product.videos && product.videos.length > 0) {
        existingVidBox.style.display = 'block';
        product.videos.forEach(vid => {
          const row = document.createElement('div');
          row.className = 'video-item';
          row.id = `existing-vid-${vid.id}`;
          row.innerHTML = `
            <i class="fa-solid fa-film"></i>
            <span class="video-name">${this.escapeHtml(vid.original_name || vid.file_path)}</span>
            <span class="video-size">${this.formatBytes(vid.file_size || 0)}</span>
            <a href="/uploads/videos/${encodeURIComponent(vid.file_path)}" target="_blank" rel="noopener">Preview</a>
          `;
          const rmBtn = document.createElement('button');
          rmBtn.type = 'button';
          rmBtn.className = 'video-remove-btn';
          rmBtn.title = 'Remove video';
          rmBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
          rmBtn.addEventListener('click', () => this.markVideoForRemoval(vid.id));
          row.appendChild(rmBtn);
          existingVidList.appendChild(row);
        });
      }
    } else {
      document.getElementById('productModalTitle').textContent = 'Add New Product';
      document.getElementById('prodFormId').value = '';
      document.getElementById('prodIsActive').checked = true;
      existingContainer.style.display = 'none';
    }

    this.openModal('productModal');
  },

  markImageForRemoval(imageId) {
    if (!this.imagesToRemove.includes(imageId)) {
      this.imagesToRemove.push(imageId);
    }
    const elem = document.getElementById(`existing-img-${imageId}`);
    if (elem) elem.remove();
  },

  async editProduct(id) {
    try {
      const res = await fetch(`/api/products/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        this.openProductModal(json.data);
      } else {
        this.showToast(json.message || 'Failed to fetch product details.', 'error');
      }
    } catch (e) {
      this.showToast('Network error while retrieving product.', 'error');
    }
  },

  async handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('prodFormId').value;
    const isEdit = !!id;

    const saveBtn = document.getElementById('saveProductBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.spinner');

    saveBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';

    const formData = new FormData();
    formData.append('sku', document.getElementById('prodSku').value.trim());
    formData.append('name_en', document.getElementById('prodNameEn').value.trim());
    formData.append('name_km', document.getElementById('prodNameKm').value.trim());
    formData.append('price', document.getElementById('prodPrice').value);
    formData.append('currency', document.getElementById('prodCurrency').value);
    formData.append('category_id', document.getElementById('prodCategory').value);
    formData.append('stock_status', document.getElementById('prodStock').value);
    formData.append('is_active', document.getElementById('prodIsActive').checked ? 1 : 0);
    formData.append('description_en', document.getElementById('prodDescEn').value.trim());
    formData.append('description_km', document.getElementById('prodDescKm').value.trim());
    formData.append('details_en', document.getElementById('prodDetailsEn').value.trim());
    formData.append('details_km', document.getElementById('prodDetailsKm').value.trim());

    if (isEdit && this.imagesToRemove.length > 0) {
      formData.append('remove_images', JSON.stringify(this.imagesToRemove));
    }

    this.selectedFiles.forEach(file => {
      formData.append('images', file);
    });

    if (isEdit && this.videosToRemove.length > 0) {
      formData.append('remove_videos', JSON.stringify(this.videosToRemove));
    }
    this.selectedVideos.forEach(file => {
      formData.append('videos', file);
    });

    const url = isEdit ? `/api/products/${id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    const progressWrap = document.getElementById('uploadProgressWrap');
    const progressFill = document.getElementById('uploadProgressFill');
    const progressText = document.getElementById('uploadProgressText');
    const hasVideos = this.selectedVideos.length > 0;
    if (hasVideos && progressWrap) {
      progressWrap.style.display = 'flex';
      progressFill.style.width = '0%';
      progressText.textContent = '0%';
    }

    try {
      const { json } = await this.sendProductForm(url, method, formData, (pct) => {
        if (!hasVideos || !progressWrap) return;
        progressFill.style.width = pct + '%';
        progressText.textContent = pct >= 100 ? 'Saving...' : pct + '%';
      });

      if (!json) {
        this.showToast('The server returned an unexpected response. Please try again.', 'error');
      } else if (json.success) {
        this.showToast(json.message, 'success');
        this.closeModal('productModal');
        this.loadProducts();
        this.loadOverview();
      } else {
        this.showToast(json.message || 'Operation failed.', 'error');
      }
    } catch (err) {
      this.showToast('Network error occurred while saving product.', 'error');
    } finally {
      saveBtn.disabled = false;
      btnText.style.display = 'inline-block';
      spinner.style.display = 'none';
      if (progressWrap) progressWrap.style.display = 'none';
    }
  },

  confirmDeleteProduct(id, name) {
    document.getElementById('confirmModalTitle').textContent = 'Delete Product';
    document.getElementById('confirmModalMessage').innerHTML = `Are you sure you want to permanently delete <strong>${name}</strong>? All pictures associated with it will also be deleted.`;
    this.confirmCallback = async () => {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast(json.message, 'success');
          this.loadProducts();
          this.loadOverview();
        } else {
          this.showToast(json.message || 'Failed to delete product.', 'error');
        }
      } catch (e) {
        this.showToast('Network error while deleting product.', 'error');
      }
    };
    this.openModal('confirmModal');
  },

  /* ================= CATEGORIES TAB ================= */
  async loadCategories() {
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (!json.success) return;

      this.categories = json.data;

      // Populate filter dropdown in products tab
      const filterSelect = document.getElementById('filterCategory');
      const curVal = filterSelect.value;
      filterSelect.innerHTML = '<option value="">All Categories</option>' + 
        this.categories.map(c => `<option value="${c.id}">${this.escapeHtml(c.name_en)}</option>`).join('');
      filterSelect.value = curVal;

      // Render Categories Table
      this.renderCategoriesTable(this.categories);
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  },

  renderCategoriesTable(categories) {
    const tbody = document.getElementById('categoriesTableBody');
    if (!categories || categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No categories created yet.</td></tr>';
      return;
    }

    tbody.innerHTML = categories.map(cat => {
      return `
        <tr>
          <td>#${cat.id}</td>
          <td><strong>${this.escapeHtml(cat.name_en)}</strong></td>
          <td>${this.escapeHtml(cat.name_km || '-')}</td>
          <td><span class="text-muted">${this.escapeHtml(cat.description_en || '-')}</span></td>
          <td><span class="text-muted">${this.escapeHtml(cat.description_km || '-')}</span></td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="dashboard.viewCategoryProducts(${cat.id}, '${this.escapeHtml(cat.name_en)}')">
              <i class="fa-solid fa-boxes-stacked"></i> ${cat.product_count} Products
            </button>
          </td>
          <td class="text-right">
            <div class="action-buttons" style="justify-content: flex-end;">
              <button class="btn btn-sm btn-outline btn-icon" title="Edit Category" onclick="dashboard.editCategory(${cat.id})">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-sm btn-danger btn-icon" title="Delete Category" onclick="dashboard.confirmDeleteCategory(${cat.id}, '${this.escapeHtml(cat.name_en)}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openCategoryModal(category = null) {
    const form = document.getElementById('categoryForm');
    form.reset();

    if (category) {
      document.getElementById('categoryModalTitle').textContent = 'Edit Category';
      document.getElementById('catFormId').value = category.id;
      document.getElementById('catNameEn').value = category.name_en;
      document.getElementById('catNameKm').value = category.name_km || '';
      document.getElementById('catDescEn').value = category.description_en || '';
      document.getElementById('catDescKm').value = category.description_km || '';
    } else {
      document.getElementById('categoryModalTitle').textContent = 'Add New Category';
      document.getElementById('catFormId').value = '';
    }

    this.openModal('categoryModal');
  },

  async editCategory(id) {
    try {
      const res = await fetch(`/api/categories/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        this.openCategoryModal(json.data);
      } else {
        this.showToast(json.message || 'Category not found.', 'error');
      }
    } catch (e) {
      this.showToast('Network error while retrieving category.', 'error');
    }
  },

  async handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('catFormId').value;
    const isEdit = !!id;

    const payload = {
      name_en: document.getElementById('catNameEn').value.trim(),
      name_km: document.getElementById('catNameKm').value.trim(),
      description_en: document.getElementById('catDescEn').value.trim(),
      description_km: document.getElementById('catDescKm').value.trim()
    };

    const url = isEdit ? `/api/categories/${id}` : '/api/categories';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        this.showToast(json.message, 'success');
        this.closeModal('categoryModal');
        this.loadCategories();
        this.loadOverview();
      } else {
        this.showToast(json.message || 'Failed to save category.', 'error');
      }
    } catch (err) {
      this.showToast('Network error while saving category.', 'error');
    }
  },

  confirmDeleteCategory(id, name) {
    document.getElementById('confirmModalTitle').textContent = 'Delete Category';
    document.getElementById('confirmModalMessage').innerHTML = `Are you sure you want to delete category <strong>${name}</strong>?<br><small class="text-muted">Products in this category will not be deleted; their category will be unassigned.</small>`;
    this.confirmCallback = async () => {
      try {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast(json.message, 'success');
          this.loadCategories();
          this.loadOverview();
        } else {
          this.showToast(json.message || 'Failed to delete category.', 'error');
        }
      } catch (e) {
        this.showToast('Network error while deleting category.', 'error');
      }
    };
    this.openModal('confirmModal');
  },

  async viewCategoryProducts(catId, catName) {
    document.getElementById('categoryProductsTitle').textContent = `Products in "${catName}"`;
    const tbody = document.getElementById('categoryProductsBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</td></tr>';
    this.openModal('categoryProductsModal');

    try {
      const res = await fetch(`/api/categories/${catId}/products`);
      const json = await res.json();
      if (!json.success || !json.data || json.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">No products in this category yet.</td></tr>';
        return;
      }

      tbody.innerHTML = json.data.map(p => {
        const price = p.currency === 'USD' ? `$${Number(p.price).toFixed(2)}` : `${Number(p.price).toLocaleString()} ៛`;
        return `
          <tr>
            <td><code>${this.escapeHtml(p.sku)}</code></td>
            <td><strong>${this.escapeHtml(p.name_en)}</strong></td>
            <td>${price}</td>
            <td>${this.getStockBadge(p.stock_status)}</td>
            <td>${p.is_active === 1 ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-danger">Failed to load products.</td></tr>';
    }
  },

  /* ================= SETTINGS TAB ================= */
  async loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (!json.success || !json.data) return;

      const d = json.data;
      if (document.getElementById('setPhone')) document.getElementById('setPhone').value = d.contact_phone || '';
      if (document.getElementById('setTelegram')) document.getElementById('setTelegram').value = d.contact_telegram || '';
      if (document.getElementById('setSalesTelegram')) document.getElementById('setSalesTelegram').value = d.sales_telegram || '';
      if (document.getElementById('setSalesContact')) document.getElementById('setSalesContact').value = d.contact_sales || '';
      if (document.getElementById('setSalesChatId')) document.getElementById('setSalesChatId').value = d.sales_chat_id || '';
      if (document.getElementById('setAddressEn')) document.getElementById('setAddressEn').value = d.contact_address_en || '';
      if (document.getElementById('setAddressKm')) document.getElementById('setAddressKm').value = d.contact_address_km || '';
      if (document.getElementById('setHoursEn')) document.getElementById('setHoursEn').value = d.contact_hours_en || '';
      if (document.getElementById('setHoursKm')) document.getElementById('setHoursKm').value = d.contact_hours_km || '';
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  },

  async handleSettingsSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveSettingsBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.spinner');

    saveBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';

    const payload = {
      contact_phone: document.getElementById('setPhone').value.trim(),
      contact_telegram: document.getElementById('setTelegram').value.trim(),
      sales_telegram: document.getElementById('setSalesTelegram') ? document.getElementById('setSalesTelegram').value.trim() : undefined,
      contact_sales: document.getElementById('setSalesContact') ? document.getElementById('setSalesContact').value.trim() : undefined,
      sales_chat_id: document.getElementById('setSalesChatId') ? document.getElementById('setSalesChatId').value.trim() : undefined,
      contact_address_en: document.getElementById('setAddressEn').value.trim(),
      contact_address_km: document.getElementById('setAddressKm').value.trim(),
      contact_hours_en: document.getElementById('setHoursEn').value.trim(),
      contact_hours_km: document.getElementById('setHoursKm').value.trim()
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        this.showToast('Contact settings updated successfully!', 'success');
      } else {
        this.showToast(json.message || 'Failed to save settings.', 'error');
      }
    } catch (err) {
      this.showToast('Network error while saving settings.', 'error');
    } finally {
      saveBtn.disabled = false;
      btnText.style.display = 'inline-block';
      spinner.style.display = 'none';
    }
  },

  /* ================= HELPERS & MODALS ================= */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  },

  getStockBadge(status) {
    switch (status) {
      case 'in_stock':
        return '<span class="badge badge-success">In Stock</span>';
      case 'low_stock':
        return '<span class="badge badge-warning">Low Stock</span>';
      case 'out_of_stock':
        return '<span class="badge badge-danger">Out of Stock</span>';
      default:
        return `<span class="badge badge-info">${status}</span>`;
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  dashboard.init();
});
