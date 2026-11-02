/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  Delice — Professional Food Editing & Management System
 *  File: js/food-editor.js
 *  Standalone, self-contained module. Zero modifications to existing files.
 *  Works on adminPanel.html and menu.html for authorized administrators.
 * ══════════════════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ── Delice Luxury Design Tokens ─────────────────────────────────────────── */
  var GOLD       = '#f2b51b';
  var GOLD_HOVER = '#ffc83e';
  var GOLD_DARK  = '#d4a017';
  var BG_DARK    = '#0e0e0e';
  var CARD_BG    = '#151515';
  var BORDER     = '#2c2720';
  var BORDER_LGT = '#3d3424';
  var TEXT_WHITE = '#ffffff';
  var TEXT_MUTED = '#9e9e9e';
  var SUCCESS_BG = '#1b4d1b';
  var SUCCESS_TX = '#4caf50';
  var DANGER_BG  = '#4a1515';
  var DANGER_TX  = '#ff6b6b';
  var FONT_MAIN  = 'Arial, sans-serif';

  /* ── Current Active Edit Session State ───────────────────────────────────── */
  var currentEditProduct = null;
  var originalImageSrc   = '';
  var currentImageSrc    = '';
  var editModalEl        = null;

  /* ═══════════════════════════════════════════════════════════════════════════
     1. AUTHENTICATION & ACCESS CONTROL
     ═══════════════════════════════════════════════════════════════════════════ */
  function getAuthUser() {
    return {
      username: localStorage.getItem('username'),
      role: localStorage.getItem('role')
    };
  }

  function isAdmin() {
    var auth = getAuthUser();
    return auth.role === 'admin' && !!auth.username;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     2. DATA STORAGE HELPERS (localStorage & Overrides)
     ═══════════════════════════════════════════════════════════════════════════ */
  function getRawProducts() {
    try {
      return JSON.parse(localStorage.getItem('Products') || '[]');
    } catch (e) {
      console.error('[Delice Food Editor] Error reading Products from localStorage:', e);
      return [];
    }
  }

  function saveRawProducts(list) {
    try {
      localStorage.setItem('Products', JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('[Delice Food Editor] Error saving Products to localStorage:', e);
      return false;
    }
  }

  function getOverrides() {
    try {
      return JSON.parse(localStorage.getItem('deliceFoodOverrides') || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveOverride(idKey, data) {
    try {
      var overrides = getOverrides();
      overrides[idKey] = data;
      localStorage.setItem('deliceFoodOverrides', JSON.stringify(overrides));
      return true;
    } catch (e) {
      console.error('[Delice Food Editor] Error saving override:', e);
      return false;
    }
  }

  function deleteOverride(idKey) {
    try {
      var overrides = getOverrides();
      delete overrides[idKey];
      localStorage.setItem('deliceFoodOverrides', JSON.stringify(overrides));
    } catch (e) {}
  }

  /**
   * Returns all food-type products (excluding original student test records)
   */
  function getAllFoodProducts() {
    var raw = getRawProducts();
    var overrides = getOverrides();

    // Filter to only meals / foods
    var foods = raw.filter(function (p) {
      return (
        p.type === 'food' ||
        p.dummyJsonId ||
        (!p.yunalish && p.fio && p.rasm) ||
        (p.yunalish && p.yunalish.indexOf('recipe') !== -1)
      );
    });

    // Apply any local overrides
    return foods.map(function (p) {
      var key = String(p.id || p.dummyJsonId || p.fio);
      var ov = overrides[key] || overrides[p.fio];
      if (ov) {
        return Object.assign({}, p, ov);
      }
      return p;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     3. STYLES INJECTION
     ═══════════════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('delice-food-editor-css')) return;
    var style = document.createElement('style');
    style.id = 'delice-food-editor-css';
    style.textContent =
      /* Modal Overlay & Card */
      '.dfe-overlay {' +
        'position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.88);' +
        'backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);' +
        'display: flex; align-items: center; justify-content: center; padding: 16px;' +
        'opacity: 0; visibility: hidden; transition: opacity .35s ease, visibility .35s ease;' +
      '}' +
      '.dfe-overlay.dfe-open { opacity: 1; visibility: visible; }' +
      '.dfe-modal {' +
        'background: ' + CARD_BG + '; border: 1px solid ' + BORDER_LGT + '; border-radius: 16px;' +
        'width: 100%; max-width: 680px; max-height: 92vh; display: flex; flex-direction: column;' +
        'box-shadow: 0 25px 70px rgba(0,0,0,0.85); overflow: hidden;' +
        'transform: scale(0.94) translateY(18px); transition: transform .35s cubic-bezier(0.4, 0, 0.2, 1);' +
        'font-family: ' + FONT_MAIN + '; color: ' + TEXT_WHITE + ';' +
      '}' +
      '.dfe-overlay.dfe-open .dfe-modal { transform: scale(1) translateY(0); }' +

      /* Modal Header */
      '.dfe-header {' +
        'padding: 18px 24px; border-bottom: 1px solid ' + BORDER + ';' +
        'display: flex; align-items: center; justify-content: space-between;' +
        'background: #111;' +
      '}' +
      '.dfe-title {' +
        'font-size: 19px; font-weight: 700; color: ' + GOLD + '; display: flex; align-items: center; gap: 8px; margin: 0;' +
      '}' +
      '.dfe-close-btn {' +
        'background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);' +
        'width: 34px; height: 34px; border-radius: 50%; color: #eee; font-size: 20px;' +
        'cursor: pointer; display: flex; align-items: center; justify-content: center;' +
        'transition: all .2s ease; line-height: 1;' +
      '}' +
      '.dfe-close-btn:hover { background: rgba(255,60,60,0.3); color: #fff; transform: rotate(90deg); }' +

      /* Modal Body & Grid */
      '.dfe-body { padding: 22px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }' +
      '.dfe-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }' +
      '@media (max-width: 620px) { .dfe-grid-2 { grid-template-columns: 1fr; } }' +

      /* Field Controls */
      '.dfe-field { display: flex; flex-direction: column; gap: 6px; }' +
      '.dfe-field label { font-size: 13px; font-weight: 600; color: #ddd; }' +
      '.dfe-field label span.req { color: #f87171; }' +
      '.dfe-input, .dfe-select, .dfe-textarea {' +
        'background: #1f1f1f; border: 1px solid #383838; border-radius: 9px;' +
        'color: #fff; padding: 10px 14px; font-size: 14px; outline: none;' +
        'transition: border-color .25s, box-shadow .25s; width: 100%; box-sizing: border-box;' +
        'font-family: ' + FONT_MAIN + ';' +
      '}' +
      '.dfe-input:focus, .dfe-select:focus, .dfe-textarea:focus {' +
        'border-color: ' + GOLD + '; box-shadow: 0 0 0 3px rgba(242, 181, 27, 0.2);' +
      '}' +
      '.dfe-textarea { min-height: 72px; resize: vertical; }' +

      /* Image Upload & Preview Box */
      '.dfe-img-section {' +
        'background: #111; border: 1px dashed ' + BORDER_LGT + '; border-radius: 12px; padding: 14px;' +
        'display: flex; gap: 16px; align-items: center;' +
      '}' +
      '.dfe-img-preview-box {' +
        'width: 120px; height: 100px; border-radius: 10px; overflow: hidden; background: #000;' +
        'border: 1px solid #333; flex-shrink: 0; position: relative;' +
      '}' +
      '.dfe-img-preview-box img {' +
        'width: 100%; height: 100%; object-fit: cover; display: block;' +
      '}' +
      '.dfe-img-controls { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }' +
      '.dfe-file-btn {' +
        'display: inline-flex; align-items: center; justify-content: center; gap: 6px;' +
        'padding: 8px 14px; background: #262626; color: #eee; border: 1px solid #404040;' +
        'border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;' +
        'transition: background .2s;' +
      '}' +
      '.dfe-file-btn:hover { background: #333; color: ' + GOLD + '; }' +
      '.dfe-revert-btn {' +
        'background: transparent; border: none; color: #aaa; font-size: 11px; cursor: pointer;' +
        'text-align: left; text-decoration: underline; padding: 0;' +
      '}' +
      '.dfe-revert-btn:hover { color: #fff; }' +

      /* Modal Footer */
      '.dfe-footer {' +
        'padding: 16px 24px; border-top: 1px solid ' + BORDER + ';' +
        'display: flex; justify-content: flex-end; align-items: center; gap: 10px;' +
        'background: #111;' +
      '}' +
      '.dfe-btn-cancel {' +
        'padding: 10px 18px; border-radius: 8px; background: transparent;' +
        'border: 1px solid #444; color: #ccc; font-size: 13px; font-weight: 600;' +
        'cursor: pointer; transition: all .2s;' +
      '}' +
      '.dfe-btn-cancel:hover { background: #262626; color: #fff; }' +
      '.dfe-btn-save {' +
        'padding: 10px 22px; border-radius: 8px; background: ' + GOLD + ';' +
        'border: none; color: #111; font-size: 13px; font-weight: 700;' +
        'cursor: pointer; transition: all .25s;' +
        'display: inline-flex; align-items: center; gap: 6px;' +
      '}' +
      '.dfe-btn-save:hover { background: ' + GOLD_HOVER + '; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(242,181,27,0.35); }' +

      /* Toast Notification */
      '.dfe-toast {' +
        'position: fixed; bottom: 24px; right: 24px; z-index: 100005;' +
        'background: #1c1c1c; border-left: 4px solid ' + GOLD + '; border-radius: 8px;' +
        'color: #fff; padding: 14px 20px; font-family: ' + FONT_MAIN + '; font-size: 13px;' +
        'box-shadow: 0 10px 30px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 10px;' +
        'opacity: 0; transform: translateY(20px); transition: all .35s ease; pointer-events: none;' +
      '}' +
      '.dfe-toast.dfe-toast-show { opacity: 1; transform: translateY(0); pointer-events: auto; }' +
      '.dfe-toast.dfe-toast-success { border-left-color: #4caf50; }' +
      '.dfe-toast.dfe-toast-error { border-left-color: #f44336; }' +

      /* Admin Panel Food Management Card & Table */
      '.dfe-admin-card {' +
        'background: #141414; border: 1px solid #2a2a2a; border-radius: 14px;' +
        'padding: 26px; margin-bottom: 30px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);' +
        'font-family: ' + FONT_MAIN + ';' +
      '}' +
      '.dfe-admin-header {' +
        'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;' +
        'border-bottom: 1px solid #282828; padding-bottom: 14px; margin-bottom: 20px;' +
      '}' +
      '.dfe-admin-title {' +
        'font-size: 20px; font-weight: 700; color: ' + GOLD + '; display: flex; align-items: center; gap: 10px; margin: 0;' +
      '}' +
      '.dfe-search-input {' +
        'background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff;' +
        'padding: 8px 14px; font-size: 13px; outline: none; width: 240px; transition: border-color .2s;' +
      '}' +
      '.dfe-search-input:focus { border-color: ' + GOLD + '; }' +
      '.dfe-badge-avail { background: ' + SUCCESS_BG + '; color: ' + SUCCESS_TX + '; border: 1px solid #2e7d32; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }' +
      '.dfe-badge-unavail { background: ' + DANGER_BG + '; color: ' + DANGER_TX + '; border: 1px solid #ff444450; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }' +
      '.dfe-btn-edit {' +
        'background: rgba(242, 181, 27, 0.15); color: ' + GOLD + '; border: 1px solid rgba(242, 181, 27, 0.4);' +
        'padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;' +
        'transition: all .2s; display: inline-flex; align-items: center; gap: 4px;' +
      '}' +
      '.dfe-btn-edit:hover { background: ' + GOLD + '; color: #111; transform: translateY(-1px); }' +

      /* Menu Card Live Edit Pill (Visible to admin on menu.html) */
      '.dfe-card-edit-pill {' +
        'position: absolute; top: 10px; right: 10px; z-index: 5;' +
        'background: rgba(0,0,0,0.78); border: 1px solid ' + GOLD + '; color: ' + GOLD + ';' +
        'border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 700;' +
        'cursor: pointer; backdrop-filter: blur(4px); transition: all .2s;' +
        'display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);' +
      '}' +
      '.dfe-card-edit-pill:hover { background: ' + GOLD + '; color: #111; transform: scale(1.05); }' +
      '.dfe-card-out-badge {' +
        'position: absolute; top: 10px; left: 10px; z-index: 5;' +
        'background: rgba(180, 20, 20, 0.9); color: #fff; font-size: 11px; font-weight: 700;' +
        'padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;' +
      '}';

    document.head.appendChild(style);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     4. EDIT MODAL DOM CREATION
     ═══════════════════════════════════════════════════════════════════════════ */
  function ensureEditModal() {
    if (editModalEl) return;

    editModalEl = document.createElement('div');
    editModalEl.className = 'dfe-overlay';
    editModalEl.id = 'delice-edit-modal-overlay';
    editModalEl.innerHTML =
      '<div class="dfe-modal" role="dialog" aria-modal="true" aria-labelledby="dfe-modal-title">' +
        '<div class="dfe-header">' +
          '<h3 class="dfe-title" id="dfe-modal-title">✏️ Taom Ma\'lumotlarini Tahrirlash</h3>' +
          '<button class="dfe-close-btn" id="dfe-btn-close" title="Yopish">&times;</button>' +
        '</div>' +

        '<form id="dfe-form" class="dfe-body" onsubmit="return false;" novalidate>' +
          /* Hidden ID tracking */
          '<input type="hidden" id="dfe-food-id" value="">' +
          '<input type="hidden" id="dfe-food-dummy-id" value="">' +

          /* Food Name & Price Grid */
          '<div class="dfe-grid-2">' +
            '<div class="dfe-field">' +
              '<label for="dfe-food-name">Taom nomi <span class="req">*</span></label>' +
              '<input type="text" id="dfe-food-name" class="dfe-input" placeholder="Masalan: Classic Margherita Pizza" required>' +
            '</div>' +
            '<div class="dfe-field">' +
              '<label for="dfe-food-price">Narxi <span class="req">*</span></label>' +
              '<input type="text" id="dfe-food-price" class="dfe-input" placeholder="Masalan: 300 $" required>' +
            '</div>' +
          '</div>' +

          /* Category & Availability Grid */
          '<div class="dfe-grid-2">' +
            '<div class="dfe-field">' +
              '<label for="dfe-food-category">Kategoriya</label>' +
              '<select id="dfe-food-category" class="dfe-select">' +
                '<option value="Pizza">Pizza (Margherita, Pepperoni, vb.)</option>' +
                '<option value="Burger">Burger (Cheeseburger, Hamburger)</option>' +
                '<option value="Pasta">Pasta (Spaghetti, Alfredo, Penne)</option>' +
                '<option value="Sushi">Sushi / Sashimi</option>' +
                '<option value="Steak">Steak (Go\'shtli taomlar)</option>' +
                '<option value="Salad">Salat (Fresh salad, Caesar)</option>' +
                '<option value="Cake">Desert / Shirinlik (Cake, Cookies)</option>' +
                '<option value="Soup">Sho\'rva / Soup</option>' +
                '<option value="Chicken">Tovuq (Chicken dishes)</option>' +
                '<option value="Rice">Guruchli taomlar (Osh, Biryani, Rice)</option>' +
                '<option value="Fish">Baliq / Dengiz mahsulotlari</option>' +
                '<option value="Taco">Lavash / Taco / Wrap</option>' +
                '<option value="Sandwich">Sandwich / Panini</option>' +
                '<option value="Pancake">Pancake / Qaymoqli nonushta</option>' +
                '<option value="Chocolate">Shokoladli shirinliklar</option>' +
                '<option value="Milliy">Milliy taomlar / Boshqa</option>' +
              '</select>' +
            '</div>' +
            '<div class="dfe-field">' +
              '<label for="dfe-food-avail">Taom holati (Mavjudligi)</label>' +
              '<select id="dfe-food-avail" class="dfe-select">' +
                '<option value="true">🟢 Mavjud (Buyurtma qabul qilinadi)</option>' +
                '<option value="false">🔴 Tugagan (Vaqtincha yo\'q)</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          /* Description */
          '<div class="dfe-field">' +
            '<label for="dfe-food-desc">Qisqa tavsif (Description)</label>' +
            '<textarea id="dfe-food-desc" class="dfe-textarea" rows="2" placeholder="Taomning mazali va o\'ziga xos xususiyatlari haqida yozing..."></textarea>' +
          '</div>' +

          /* Ingredients */
          '<div class="dfe-field">' +
            '<label for="dfe-food-ingredients">Masalliqlar / Tarkibi (Ingredients)</label>' +
            '<input type="text" id="dfe-food-ingredients" class="dfe-input" placeholder="Masalan: Go\'sht, pishloq, pomidor, maxsus sous">' +
          '</div>' +

          /* Image Section */
          '<div class="dfe-field">' +
            '<label>Taom rasmi (Image)</label>' +
            '<div class="dfe-img-section">' +
              '<div class="dfe-img-preview-box">' +
                '<img id="dfe-img-preview" src="" alt="Taom rasmi">' +
              '</div>' +
              '<div class="dfe-img-controls">' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                  '<label class="dfe-file-btn" for="dfe-file-input">' +
                    '📁 Yangi rasm yuklash' +
                    '<input type="file" id="dfe-file-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;">' +
                  '</label>' +
                  '<button type="button" id="dfe-revert-btn" class="dfe-revert-btn" style="display:none;">Eski rasmga qaytarish</button>' +
                '</div>' +
                '<input type="url" id="dfe-img-url" class="dfe-input" style="font-size:12px; padding:6px 10px;" placeholder="Yoki rasm URL manzilini kiriting">' +
                '<span style="font-size:11px; color:#888;">Fayl formati: JPG, PNG, WEBP (Maks: 2.5MB)</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</form>' +

        '<div class="dfe-footer">' +
          '<button type="button" class="dfe-btn-cancel" id="dfe-btn-cancel">Bekor qilish</button>' +
          '<button type="button" class="dfe-btn-save" id="dfe-btn-save">💾 O\'zgarishlarni saqlash</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(editModalEl);

    // Event listeners
    document.getElementById('dfe-btn-close').addEventListener('click', closeEditModal);
    document.getElementById('dfe-btn-cancel').addEventListener('click', closeEditModal);
    document.getElementById('dfe-btn-save').addEventListener('click', handleSaveProduct);

    // Close on backdrop click or ESC
    editModalEl.addEventListener('click', function (e) {
      if (e.target === editModalEl) closeEditModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && editModalEl.classList.contains('dfe-open')) closeEditModal();
    });

    // Image file upload handler
    var fileInput = document.getElementById('dfe-file-input');
    fileInput.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;

      // Validate image format
      var validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (validTypes.indexOf(file.type) === -1) {
        showToast('Faqat JPG, PNG yoki WEBP rasmlar qabul qilinadi!', 'error');
        fileInput.value = '';
        return;
      }

      // Validate size (max 2.5MB to protect localStorage quota)
      if (file.size > 2.5 * 1024 * 1024) {
        showToast('Rasm hajmi juda katta (2.5MB dan oshmasligi kerak)!', 'error');
        fileInput.value = '';
        return;
      }

      var reader = new FileReader();
      reader.onload = function (evt) {
        currentImageSrc = evt.target.result;
        updatePreview(currentImageSrc);
        document.getElementById('dfe-revert-btn').style.display = 'inline-block';
        document.getElementById('dfe-img-url').value = '';
        showToast('Yangi rasm tanlandi. Saqlash uchun "O\'zgarishlarni saqlash"ni bosing.', 'success');
      };
      reader.onerror = function () {
        showToast('Rasmni yuklashda xatolik yuz berdi.', 'error');
      };
      reader.readAsDataURL(file);
    });

    // Image URL manual change handler
    var urlInput = document.getElementById('dfe-img-url');
    urlInput.addEventListener('input', function () {
      var url = urlInput.value.trim();
      if (url) {
        currentImageSrc = url;
        updatePreview(url);
        document.getElementById('dfe-revert-btn').style.display = 'inline-block';
      }
    });

    // Revert image to original
    document.getElementById('dfe-revert-btn').addEventListener('click', function () {
      currentImageSrc = originalImageSrc;
      updatePreview(originalImageSrc);
      urlInput.value = originalImageSrc.indexOf('data:') === 0 ? '' : originalImageSrc;
      fileInput.value = '';
      this.style.display = 'none';
      showToast('Eski rasm qaytarildi.', 'info');
    });
  }

  function updatePreview(src) {
    var imgEl = document.getElementById('dfe-img-preview');
    if (imgEl) {
      imgEl.src = src || 'https://via.placeholder.com/150?text=No+Image';
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     5. OPEN & CLOSE EDIT MODAL
     ═══════════════════════════════════════════════════════════════════════════ */
  function openEditModal(product) {
    if (!isAdmin()) {
      showToast('Xatolik: Faqat Admin foydalanuvchilar taomlarni tahrirlashi mumkin!', 'error');
      return;
    }

    injectStyles();
    ensureEditModal();

    currentEditProduct = product;
    originalImageSrc   = product.rasm || product.image || '';
    currentImageSrc    = originalImageSrc;

    // Populate form fields
    document.getElementById('dfe-food-id').value       = product.id || '';
    document.getElementById('dfe-food-dummy-id').value = product.dummyJsonId || '';
    document.getElementById('dfe-food-name').value     = product.fio || product.name || '';
    document.getElementById('dfe-food-price').value    = product.kursi || product.price || '';
    document.getElementById('dfe-food-desc').value     = product.description || product.desc || '';
    document.getElementById('dfe-food-ingredients').value = Array.isArray(product.ingredients)
      ? product.ingredients.join(', ')
      : (product.ingredients || '');

    // Availability
    var isAvail = product.available !== false;
    document.getElementById('dfe-food-avail').value = isAvail ? 'true' : 'false';

    // Category mapping
    var catSelect = document.getElementById('dfe-food-category');
    var catVal = product.category || detectCategoryFromName(product.fio || product.name);
    setSelectValue(catSelect, catVal);

    // Image preview & controls
    updatePreview(currentImageSrc);
    document.getElementById('dfe-img-url').value = originalImageSrc.indexOf('data:') === 0 ? '' : originalImageSrc;
    document.getElementById('dfe-file-input').value = '';
    document.getElementById('dfe-revert-btn').style.display = 'none';

    // Show modal
    editModalEl.classList.add('dfe-open');
    document.body.style.overflow = 'hidden';
  }

  function closeEditModal() {
    if (editModalEl) {
      editModalEl.classList.remove('dfe-open');
    }
    document.body.style.overflow = '';
    currentEditProduct = null;
    originalImageSrc   = '';
    currentImageSrc    = '';
  }

  function setSelectValue(selectEl, val) {
    if (!selectEl || !val) return;
    for (var i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value.toLowerCase() === String(val).toLowerCase()) {
        selectEl.selectedIndex = i;
        return;
      }
    }
  }

  function detectCategoryFromName(name) {
    var lo = (name || '').toLowerCase();
    if (lo.indexOf('pizza') !== -1) return 'Pizza';
    if (lo.indexOf('burger') !== -1) return 'Burger';
    if (lo.indexOf('pasta') !== -1 || lo.indexOf('spaghetti') !== -1) return 'Pasta';
    if (lo.indexOf('sushi') !== -1) return 'Sushi';
    if (lo.indexOf('steak') !== -1) return 'Steak';
    if (lo.indexOf('salad') !== -1) return 'Salad';
    if (lo.indexOf('cake') !== -1 || lo.indexOf('cookie') !== -1 || lo.indexOf('dessert') !== -1) return 'Cake';
    if (lo.indexOf('soup') !== -1) return 'Soup';
    if (lo.indexOf('chicken') !== -1) return 'Chicken';
    if (lo.indexOf('rice') !== -1 || lo.indexOf('osh') !== -1) return 'Rice';
    if (lo.indexOf('fish') !== -1 || lo.indexOf('salmon') !== -1) return 'Fish';
    if (lo.indexOf('taco') !== -1 || lo.indexOf('lavash') !== -1 || lo.indexOf('wrap') !== -1) return 'Taco';
    if (lo.indexOf('sandwich') !== -1) return 'Sandwich';
    if (lo.indexOf('pancake') !== -1) return 'Pancake';
    if (lo.indexOf('chocolate') !== -1) return 'Chocolate';
    return 'Milliy';
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     6. SAVE & UPDATE PRODUCT HANDLER
     ═══════════════════════════════════════════════════════════════════════════ */
  function handleSaveProduct() {
    if (!isAdmin()) {
      showToast('Ruxsat yo\'q: Tizimga admin sifatida kirilmagan!', 'error');
      return;
    }

    var id        = document.getElementById('dfe-food-id').value;
    var dummyId   = document.getElementById('dfe-food-dummy-id').value;
    var name      = document.getElementById('dfe-food-name').value.trim();
    var price     = document.getElementById('dfe-food-price').value.trim();
    var category  = document.getElementById('dfe-food-category').value;
    var isAvail   = document.getElementById('dfe-food-avail').value === 'true';
    var desc      = document.getElementById('dfe-food-desc').value.trim();
    var ingr      = document.getElementById('dfe-food-ingredients').value.trim();
    var imgUrl    = document.getElementById('dfe-img-url').value.trim();

    // 1. Validation
    if (!name || name.length < 2) {
      showToast('Iltimos, taom nomini to\'liq kiriting (kamida 2 harf)!', 'error');
      document.getElementById('dfe-food-name').focus();
      return;
    }

    if (!price) {
      showToast('Iltimos, taom narxini kiriting!', 'error');
      document.getElementById('dfe-food-price').focus();
      return;
    }

    // Auto format price with $ if missing
    if (price.indexOf('$') === -1) {
      price = price + ' $';
    }

    var finalImage = currentImageSrc || imgUrl || originalImageSrc;
    if (!finalImage) {
      showToast('Iltimos, taom rasmini yuklang yoki rasm havolasini kiriting!', 'error');
      return;
    }

    // 2. Prepare updated payload
    var updatedData = {
      fio: name,
      name: name,
      kursi: price,
      price: price,
      rasm: finalImage,
      image: finalImage,
      category: category,
      available: isAvail,
      description: desc,
      ingredients: ingr
    };

    // 3. Update localStorage "Products"
    var products = getRawProducts();
    var targetFound = false;

    for (var i = 0; i < products.length; i++) {
      var matchById    = id && String(products[i].id) === String(id);
      var matchByDummy = dummyId && String(products[i].dummyJsonId) === String(dummyId);
      var matchByName  = currentEditProduct && products[i].fio === currentEditProduct.fio;

      if (matchById || matchByDummy || matchByName) {
        products[i].fio         = name;
        products[i].kursi       = price;
        products[i].rasm        = finalImage;
        products[i].category    = category;
        products[i].available   = isAvail;
        products[i].description = desc;
        products[i].ingredients = ingr;
        targetFound = true;
        break;
      }
    }

    // If item was rendered directly from external API and not yet in raw products, add it
    if (!targetFound) {
      var nextId = products.reduce(function (max, p) { return Math.max(max, Number(p.id) || 0); }, 0) + 1;
      products.push(Object.assign({
        id: nextId,
        type: 'food',
        dummyJsonId: dummyId ? Number(dummyId) : null
      }, updatedData));
    }

    saveRawProducts(products);

    // 4. Also store in overrides dictionary for instant lookup by original name / ID
    var lookupKey = id || dummyId || (currentEditProduct && currentEditProduct.fio) || name;
    saveOverride(String(lookupKey), updatedData);
    if (currentEditProduct && currentEditProduct.fio) {
      saveOverride(currentEditProduct.fio, updatedData);
    }

    // 5. Update DOM if on menu.html (live update customer card)
    updateMenuCardDOM(currentEditProduct ? (currentEditProduct.fio || currentEditProduct.name) : name, updatedData);

    // 6. Update Admin Table if on adminPanel.html
    renderAdminFoodTable();

    // 7. Success toast & close
    closeEditModal();
    showToast('Taom ma\'lumotlari muvaffaqiyatli saqlandi! ✨', 'success');
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     7. DOM UPDATER FOR MENU.HTML CARDS
     ═══════════════════════════════════════════════════════════════════════════ */
  function updateMenuCardDOM(originalName, updatedData) {
    var addBtns = document.querySelectorAll('button[onclick*="addToCart"]');
    for (var i = 0; i < addBtns.length; i++) {
      var btn = addBtns[i];
      var btnName = btn.getAttribute('data-name');

      if (btnName === originalName || btnName === updatedData.name) {
        // Update Add to Cart button data attributes
        btn.setAttribute('data-name', updatedData.name);
        btn.setAttribute('data-image', updatedData.image);
        btn.setAttribute('data-price', updatedData.price);

        // Update card container
        var cardSection = btn.closest('section');
        if (cardSection) {
          // Update title
          var titleEl = cardSection.querySelector('.card-title');
          if (titleEl) titleEl.textContent = updatedData.name;

          // Update price
          var priceEl = cardSection.querySelector('.card-text');
          if (priceEl) priceEl.textContent = updatedData.price;

          // Update image
          var imgEl = cardSection.querySelector('img');
          if (imgEl) {
            imgEl.src = updatedData.image;
            imgEl.alt = updatedData.name;
          }

          // Update availability badge
          var badgeEl = cardSection.querySelector('.dfe-card-out-badge');
          if (!updatedData.available) {
            if (!badgeEl) {
              badgeEl = document.createElement('span');
              badgeEl.className = 'dfe-card-out-badge';
              badgeEl.textContent = 'TUGAGAN';
              cardSection.style.position = 'relative';
              cardSection.appendChild(badgeEl);
            }
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = 'Ushbu taom ayni paytda tugagan';
          } else {
            if (badgeEl) badgeEl.remove();
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = '';
          }

          // Update 3D tasting button if present
          var tasteBtn = cardSection.querySelector('.taste3d-btn');
          if (tasteBtn) {
            tasteBtn.setAttribute('data-t3n', updatedData.name);
            tasteBtn.setAttribute('data-t3i', updatedData.image);
            tasteBtn.setAttribute('data-t3p', updatedData.price);
          }
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     8. ADMIN PANEL FOOD MANAGEMENT INTERFACE
     ═══════════════════════════════════════════════════════════════════════════ */
  function renderAdminFoodTable() {
    var tableBody = document.getElementById('dfe-admin-food-tbody');
    if (!tableBody) return;

    var foods = getAllFoodProducts();
    var searchEl = document.getElementById('dfe-food-search');
    var query = searchEl ? searchEl.value.trim().toLowerCase() : '';

    if (query) {
      foods = foods.filter(function (f) {
        var n = (f.fio || f.name || '').toLowerCase();
        var c = (f.category || f.yunalish || '').toLowerCase();
        return n.indexOf(query) !== -1 || c.indexOf(query) !== -1;
      });
    }

    var badgeCount = document.getElementById('dfe-food-count-badge');
    if (badgeCount) badgeCount.textContent = foods.length;

    if (foods.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="text-center py-8 text-neutral-500 font-medium">' +
          (query ? 'Qidiruv bo\'yicha hech qanday taom topilmadi.' : 'Menyuda taomlar mavjud emas.') +
        '</td></tr>';
      return;
    }

    tableBody.innerHTML = foods.map(function (food, idx) {
      var name  = escapeHtml(food.fio || food.name || 'Nomsiz taom');
      var price = escapeHtml(food.kursi || food.price || '-');
      var img   = food.rasm || food.image || 'https://via.placeholder.com/80?text=Food';
      var cat   = escapeHtml(food.category || detectCategoryFromName(food.fio || food.name));
      var avail = food.available !== false;
      var desc  = escapeHtml(food.description || food.ingredients || '-');

      var foodJson = escapeHtml(JSON.stringify(food));

      return (
        '<tr data-food-id="' + (food.id || idx) + '">' +
          '<td style="width:70px;">' +
            '<img src="' + img + '" alt="' + name + '" style="width:54px; height:46px; object-fit:cover; border-radius:8px; border:1px solid #333;">' +
          '</td>' +
          '<td>' +
            '<div style="font-weight:700; color:#fff; font-size:14px;">' + name + '</div>' +
            '<div style="font-size:11px; color:#888;">ID: #' + (food.id || food.dummyJsonId || (idx + 1)) + '</div>' +
          '</td>' +
          '<td><span style="color:' + GOLD + '; font-weight:700; font-size:14px;">' + price + '</span></td>' +
          '<td><span style="background:#262626; color:#ddd; padding:3px 9px; border-radius:12px; font-size:11px;">' + cat + '</span></td>' +
          '<td>' +
            (avail
              ? '<span class="dfe-badge-avail">🟢 Mavjud</span>'
              : '<span class="dfe-badge-unavail">🔴 Tugagan</span>') +
          '</td>' +
          '<td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; color:#aaa;" title="' + desc + '">' +
            desc +
          '</td>' +
          '<td style="text-align:right;">' +
            '<div style="display:inline-flex; gap:6px;">' +
              '<button type="button" class="dfe-btn-edit" onclick="window.DeliceFoodEditor.openEdit(' + idx + ')">' +
                '✏️ Tahrirlash' +
              '</button>' +
              '<button type="button" class="btn-del" onclick="window.DeliceFoodEditor.deleteFood(' + idx + ')">' +
                '🗑️' +
              '</button>' +
            '</div>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function injectAdminFoodSection() {
    // Only inject in adminPanel.html
    var adminWrapper = document.querySelector('.admin-main-wrapper');
    if (!adminWrapper || document.getElementById('delice-admin-food-section')) return;

    var section = document.createElement('div');
    section.className = 'dfe-admin-card';
    section.id = 'delice-admin-food-section';
    section.innerHTML =
      '<div class="dfe-admin-header">' +
        '<div class="dfe-admin-title">' +
          '<span>🍽️</span> Menyudagi Barcha Taomlar &amp; Tahrirlash' +
          '<span id="dfe-food-count-badge" class="text-xs bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full">0</span>' +
        '</div>' +
        '<div style="display:flex; gap:10px; align-items:center;">' +
          '<input type="text" id="dfe-food-search" class="dfe-search-input" placeholder="🔍 Taom nomini qidirish...">' +
        '</div>' +
      '</div>' +
      '<div class="overflow-x-auto">' +
        '<table class="table-custom">' +
          '<thead>' +
            '<tr>' +
              '<th>Rasm</th>' +
              '<th>Nomi</th>' +
              '<th>Narxi</th>' +
              '<th>Kategoriya</th>' +
              '<th>Holati</th>' +
              '<th>Tavsif / Tarkibi</th>' +
              '<th style="text-align:right;">Amallar</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="dfe-admin-food-tbody">' +
            '<tr><td colspan="7" class="text-center py-6 text-neutral-500">Taomlar ro\'yxati yuklanmoqda...</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>';

    // Insert section right before the food creation form card
    var existingFormCard = document.querySelector('.admin-form');
    if (existingFormCard && existingFormCard.closest('.admin-card')) {
      adminWrapper.insertBefore(section, existingFormCard.closest('.admin-card'));
    } else {
      adminWrapper.appendChild(section);
    }

    // Search filter event listener
    var searchInput = document.getElementById('dfe-food-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        renderAdminFoodTable();
      });
    }

    renderAdminFoodTable();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     9. CUSTOMER MENU PAGE INTEGRATION (menu.html)
     ═══════════════════════════════════════════════════════════════════════════ */
  function applyOverridesToCustomerMenu() {
    var overrides = getOverrides();
    var keys = Object.keys(overrides);
    if (keys.length === 0) return;

    var addBtns = document.querySelectorAll('button[onclick*="addToCart"]');
    for (var i = 0; i < addBtns.length; i++) {
      var btn = addBtns[i];
      var name = btn.getAttribute('data-name');
      var ov = overrides[name];
      if (ov) {
        updateMenuCardDOM(name, ov);
      }
    }
  }

  function injectAdminEditPillOnMenuCards() {
    if (!isAdmin()) return;

    var addBtns = document.querySelectorAll('button[onclick*="addToCart"]');
    for (var i = 0; i < addBtns.length; i++) {
      var btn = addBtns[i];
      var card = btn.closest('section');
      if (!card || card.querySelector('.dfe-card-edit-pill')) continue;

      card.style.position = 'relative';
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'dfe-card-edit-pill';
      pill.innerHTML = '✏️ Tahrirlash';
      pill.setAttribute('data-target-name', btn.getAttribute('data-name') || '');

      pill.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var targetName = this.getAttribute('data-target-name');
        var foods = getAllFoodProducts();
        var targetProduct = null;
        for (var j = 0; j < foods.length; j++) {
          if (foods[j].fio === targetName || foods[j].name === targetName) {
            targetProduct = foods[j];
            break;
          }
        }
        if (!targetProduct) {
          // Construct basic product from button attributes
          targetProduct = {
            fio: targetName,
            name: targetName,
            kursi: btn.getAttribute('data-price') || '',
            rasm: btn.getAttribute('data-image') || '',
            type: 'food'
          };
        }
        openEditModal(targetProduct);
      });

      card.appendChild(pill);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     10. TOAST NOTIFICATION HELPER
     ═══════════════════════════════════════════════════════════════════════════ */
  function showToast(message, type) {
    var toast = document.getElementById('dfe-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dfe-toast';
      toast.className = 'dfe-toast';
      document.body.appendChild(toast);
    }

    toast.className = 'dfe-toast' + (type === 'error' ? ' dfe-toast-error' : type === 'success' ? ' dfe-toast-success' : '');
    toast.innerHTML =
      '<span>' + (type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️') + '</span>' +
      '<div>' + escapeHtml(message) + '</div>';

    toast.classList.add('dfe-toast-show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('dfe-toast-show');
    }, 3800);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     11. PUBLIC GLOBAL API
     ═══════════════════════════════════════════════════════════════════════════ */
  window.DeliceFoodEditor = {
    openEdit: function (foodIndex) {
      var foods = getAllFoodProducts();
      var target = foods[foodIndex];
      if (target) openEditModal(target);
    },
    openEditByName: function (foodName) {
      var foods = getAllFoodProducts();
      var target = null;
      for (var i = 0; i < foods.length; i++) {
        if (foods[i].fio === foodName || foods[i].name === foodName) {
          target = foods[i];
          break;
        }
      }
      if (target) openEditModal(target);
    },
    deleteFood: function (foodIndex) {
      if (!isAdmin()) {
        showToast('Faqat Admin taomlarni o\'chirishi mumkin!', 'error');
        return;
      }
      var foods = getAllFoodProducts();
      var target = foods[foodIndex];
      if (!target) return;

      var name = target.fio || target.name || 'ushbu taom';
      if (!confirm('Haqiqatan ham "' + name + '" taomini menyudan o\'chirmoqchimisiz?')) return;

      var raw = getRawProducts();
      var filtered = raw.filter(function (p) {
        var matchId    = target.id && p.id === target.id;
        var matchDummy = target.dummyJsonId && p.dummyJsonId === target.dummyJsonId;
        var matchName  = p.fio === target.fio;
        return !(matchId || matchDummy || matchName);
      });

      saveRawProducts(filtered);
      deleteOverride(String(target.id || target.dummyJsonId || target.fio));
      deleteOverride(target.fio);

      renderAdminFoodTable();
      showToast('"' + name + '" muvaffaqiyatli o\'chirildi!', 'info');
    },
    refreshAdminTable: renderAdminFoodTable,
    showToast: showToast
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     12. INITIALIZATION ROUTINE
     ═══════════════════════════════════════════════════════════════════════════ */
  function init() {
    injectStyles();
    ensureEditModal();

    // If on adminPanel.html
    if (document.querySelector('.admin-main-wrapper')) {
      injectAdminFoodSection();
    }

    // If on menu.html or customer view
    if (document.querySelector('.row')) {
      applyOverridesToCustomerMenu();
      injectAdminEditPillOnMenuCards();

      // Observe for async loaded recipes
      var obs = new MutationObserver(function () {
        applyOverridesToCustomerMenu();
        injectAdminEditPillOnMenuCards();
      });
      obs.observe(document.querySelector('.row'), { childList: true, subtree: true });

      setTimeout(function () {
        applyOverridesToCustomerMenu();
        injectAdminEditPillOnMenuCards();
      }, 1200);
      setTimeout(function () {
        applyOverridesToCustomerMenu();
        injectAdminEditPillOnMenuCards();
      }, 3500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

