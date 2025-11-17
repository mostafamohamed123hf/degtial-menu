// API Base URL
const API_BASE_URL =
  (typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"))
    ? "http://localhost:5000/api"
    : "/api";

// Offers Management Module
const OffersManager = {
  offers: [],
  currentFilter: { category: "all", status: "all", search: "", sort: "newest" },
  viewMode: "grid",
  selectedOffers: new Set(),

  init() {
    this.loadSavedViewMode();
    this.loadOffers();
    this.loadProducts(); // Load products for selection
    this.attachEventListeners();
    this.setupLanguageChangeListener();
  },

  async loadProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      this.products = data.data || [];
    } catch (error) {
      console.error("Error loading products:", error);
      this.products = [];
    }
  },

  loadSavedViewMode() {
    // Load saved view mode from localStorage
    const savedViewMode = localStorage.getItem('offers-view-mode');
    if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
      this.viewMode = savedViewMode;
      
      // Apply the saved view mode to the UI
      const offersList = document.getElementById('offers-list');
      const gridViewBtn = document.getElementById('grid-view-btn');
      const listViewBtn = document.getElementById('list-view-btn');
      
      if (offersList && gridViewBtn && listViewBtn) {
        if (this.viewMode === 'list') {
          offersList.className = 'offers-list list-view';
          listViewBtn.classList.add('active');
          gridViewBtn.classList.remove('active');
        } else {
          offersList.className = 'offers-list grid-view';
          gridViewBtn.classList.add('active');
          listViewBtn.classList.remove('active');
        }
      }
    }
  },

  saveViewMode(mode) {
    // Save view mode to localStorage
    localStorage.setItem('offers-view-mode', mode);
  },

  attachEventListeners() {
    // Add offer button
    const addOfferBtn = document.getElementById("add-offer-btn");
    if (addOfferBtn) {
      addOfferBtn.addEventListener("click", () => this.showOfferModal());
    }

    // Filter controls
    const categoryFilter = document.getElementById("offer-category-filter");
    if (categoryFilter) {
      categoryFilter.addEventListener("change", (e) => {
        this.currentFilter.category = e.target.value;
        this.renderOffers();
      });
    }

    const statusFilter = document.getElementById("offer-status-filter");
    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.currentFilter.status = e.target.value;
        this.renderOffers();
      });
    }

    // Search functionality
    const searchInput = document.getElementById("offer-search");
    const clearSearch = document.getElementById("clear-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.currentFilter.search = e.target.value;
        clearSearch.style.display = e.target.value ? "block" : "none";
        this.renderOffers();
      });
    }
    if (clearSearch) {
      clearSearch.addEventListener("click", () => {
        searchInput.value = "";
        this.currentFilter.search = "";
        clearSearch.style.display = "none";
        this.renderOffers();
      });
    }

    // Sort functionality
    const sortSelect = document.getElementById("offer-sort-by");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.currentFilter.sort = e.target.value;
        this.renderOffers();
      });
    }

    // View mode toggle
    const gridViewBtn = document.getElementById("grid-view-btn");
    const listViewBtn = document.getElementById("list-view-btn");
    const offersList = document.getElementById("offers-list");
    
    if (gridViewBtn) {
      gridViewBtn.addEventListener("click", () => {
        this.viewMode = "grid";
        this.saveViewMode("grid");
        offersList.className = "offers-list grid-view";
        gridViewBtn.classList.add("active");
        listViewBtn.classList.remove("active");
      });
    }
    if (listViewBtn) {
      listViewBtn.addEventListener("click", () => {
        this.viewMode = "list";
        this.saveViewMode("list");
        offersList.className = "offers-list list-view";
        listViewBtn.classList.add("active");
        gridViewBtn.classList.remove("active");
      });
    }

    // Reset filters
    const resetBtn = document.getElementById("reset-filters-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetFilters());
    }

    // Select all checkbox
    const selectAllCheckbox = document.getElementById("select-all-offers");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", (e) => {
        this.selectAllOffers(e.target.checked);
      });
    }

    // Bulk actions
    const bulkActivate = document.querySelector(".bulk-activate");
    const bulkDeactivate = document.querySelector(".bulk-deactivate");
    const bulkFeature = document.querySelector(".bulk-feature");
    const bulkDelete = document.querySelector(".bulk-delete");

    if (bulkActivate) {
      bulkActivate.addEventListener("click", () => this.bulkActivateOffers());
    }
    if (bulkDeactivate) {
      bulkDeactivate.addEventListener("click", () => this.bulkDeactivateOffers());
    }
    if (bulkFeature) {
      bulkFeature.addEventListener("click", () => this.bulkFeatureOffers());
    }
    if (bulkDelete) {
      bulkDelete.addEventListener("click", () => this.bulkDeleteOffers());
    }
  },

  setupLanguageChangeListener() {
    // Listen for language change events
    document.addEventListener("languageChanged", () => {
      // If the offer modal is currently open, refresh it
      if (this.currentModalOfferId !== undefined) {
        const modalElement = document.getElementById("offer-modal");
        if (modalElement) {
          // Re-render the modal with the new language
          this.showOfferModal(this.currentModalOfferId);
        }
      }
      // Also refresh the offers list to update translations
      this.renderOffers();
    });

    // Listen for global settings updates (including currency changes)
    document.addEventListener("global-settings-updated", () => {
      // If the offer modal is currently open, refresh it
      if (this.currentModalOfferId !== undefined) {
        const modalElement = document.getElementById("offer-modal");
        if (modalElement) {
          // Re-render the modal with the new currency
          this.showOfferModal(this.currentModalOfferId);
        }
      }
      // Also refresh the offers list to update currency
      this.renderOffers();
    });
  },

  async loadOffers() {
    const spinner = document.getElementById("offers-spinner");
    const offersList = document.getElementById("offers-list");

    try {
      if (spinner) spinner.style.display = "block";

      const response = await fetch(`${API_BASE_URL}/offers`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch offers");
      }

      const data = await response.json();
      this.offers = data.data || [];
      this.updateStatistics();
      this.renderOffers();
    } catch (error) {
      console.error("Error loading offers:", error);
      if (offersList) {
        offersList.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>فشل تحميل العروض. يرجى المحاولة مرة أخرى.</p>
          </div>
        `;
      }
    } finally {
      if (spinner) spinner.style.display = "none";
    }
  },

  updateStatistics() {
    const totalCount = document.getElementById("total-offers-count");
    const activeCount = document.getElementById("active-offers-count");
    const featuredCount = document.getElementById("featured-offers-count");
    const expiredCount = document.getElementById("expired-offers-count");

    // Helper function to check if offer is expired
    const isOfferExpired = (offer) => {
      if (!offer.endDate) return false;
      const now = new Date();
      const endDate = new Date(offer.endDate);
      return now > endDate;
    };

    if (totalCount) totalCount.textContent = this.offers.length;
    if (activeCount) {
      const activeOffers = this.offers.filter(o => o.isActive).length;
      activeCount.textContent = activeOffers;
    }
    if (featuredCount) {
      const featured = this.offers.filter(o => o.isFeatured).length;
      featuredCount.textContent = featured;
    }
    if (expiredCount) {
      const expired = this.offers.filter(o => isOfferExpired(o)).length;
      expiredCount.textContent = expired;
    }

    // Update dashboard offer stats if the function exists
    if (typeof window.updateDashboardOfferStats === 'function') {
      window.updateDashboardOfferStats();
    }
  },

  resetFilters() {
    this.currentFilter = { category: "all", status: "all", search: "", sort: "newest" };
    document.getElementById("offer-category-filter").value = "all";
    document.getElementById("offer-status-filter").value = "all";
    document.getElementById("offer-search").value = "";
    document.getElementById("clear-search").style.display = "none";
    document.getElementById("offer-sort-by").value = "newest";
    this.renderOffers();
  },

  renderOffers() {
    const offersList = document.getElementById("offers-list");
    if (!offersList) return;

    // Get translation function
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;

    // Filter offers
    let filteredOffers = this.offers;

    // Category filter
    if (this.currentFilter.category !== "all") {
      filteredOffers = filteredOffers.filter(
        (offer) => offer.category === this.currentFilter.category
      );
    }

    // Status filter
    if (this.currentFilter.status === "active") {
      filteredOffers = filteredOffers.filter((offer) => offer.isActive);
    } else if (this.currentFilter.status === "inactive") {
      filteredOffers = filteredOffers.filter((offer) => !offer.isActive);
    }

    // Search filter
    if (this.currentFilter.search) {
      const searchLower = this.currentFilter.search.toLowerCase();
      filteredOffers = filteredOffers.filter(offer => 
        offer.title.toLowerCase().includes(searchLower) ||
        (offer.titleEn && offer.titleEn.toLowerCase().includes(searchLower)) ||
        offer.description.toLowerCase().includes(searchLower) ||
        (offer.descriptionEn && offer.descriptionEn.toLowerCase().includes(searchLower))
      );
    }

    // Sorting
    const sortFunctions = {
      newest: (a, b) => new Date(b.id || 0) - new Date(a.id || 0),
      oldest: (a, b) => new Date(a.id || 0) - new Date(b.id || 0),
      'discount-high': (a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0),
      'discount-low': (a, b) => (a.discountPercentage || 0) - (b.discountPercentage || 0),
      'price-high': (a, b) => (b.discountedPrice || 0) - (a.discountedPrice || 0),
      'price-low': (a, b) => (a.discountedPrice || 0) - (b.discountedPrice || 0)
    };
    
    if (sortFunctions[this.currentFilter.sort]) {
      filteredOffers = [...filteredOffers].sort(sortFunctions[this.currentFilter.sort]);
    }

    if (filteredOffers.length === 0) {
      offersList.innerHTML = `
        <div class="empty-message">
          <i class="fas fa-tags"></i>
          <p data-i18n="noOffers">${t("noOffers")}</p>
        </div>
      `;
      return;
    }

    // Get current language for locale
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'ar';
    const locale = currentLang === 'en' ? 'en-US' : 'ar-EG';
    
    // Get currency code from global settings
    const currencyCode = (window.globalSettings && window.globalSettings.currency) ? window.globalSettings.currency : 'EGP';

    // Helper function to check if offer is expired
    const isOfferExpired = (offer) => {
      if (!offer.endDate) return false;
      const now = new Date();
      const endDate = new Date(offer.endDate);
      return now > endDate;
    };

    offersList.innerHTML = filteredOffers
      .map(
        (offer) => {
          const isExpired = isOfferExpired(offer);
          // Check if offer is inactive due to user limit
          const isUserLimitReached = !offer.isActive && 
                                      offer.userLimit && 
                                      offer.userLimit > 0 && 
                                      offer.claimedBy && 
                                      offer.claimedBy.length >= offer.userLimit;
          
          return `
      <div class="offer-card-admin ${this.selectedOffers.has(offer.id) ? 'selected' : ''} ${!offer.isActive ? 'inactive-offer' : ''} ${isExpired ? 'expired-offer' : ''} ${isUserLimitReached ? 'user-limit-reached' : ''}" data-offer-id="${offer.id}">
        <input type="checkbox" class="offer-selection-checkbox" data-offer-id="${offer.id}" 
          ${this.selectedOffers.has(offer.id) ? 'checked' : ''} 
          onchange="OffersManager.toggleOfferSelection('${offer.id}', this.checked)" />
        <div class="offer-image-container">
          <img src="${offer.image}" alt="${offer.title}" />
          <div class="offer-status-indicator ${offer.isActive ? 'active' : 'inactive'}"></div>
          ${
            offer.isFeatured
              ? `<span class="featured-badge"><i class="fas fa-star"></i> ${t("featured")}</span>`
              : ""
          }
          ${
            isUserLimitReached
              ? `<span class="user-limit-badge"><i class="fas fa-users-slash"></i> ${currentLang === 'en' ? 'User Limit Reached' : 'تم الوصول لحد المستخدمين'}</span>`
              : !offer.isActive
              ? `<span class="inactive-badge"><i class="fas fa-eye-slash"></i> ${t("inactive")}</span>`
              : ""
          }
          ${
            isExpired
              ? `<span class="expired-badge"><i class="fas fa-clock"></i> ${currentLang === 'en' ? 'Expired' : 'منتهي'}</span>`
              : ""
          }
        </div>
        <div class="offer-card-content">
          <h3>${currentLang === 'en' && offer.titleEn ? offer.titleEn : offer.title}</h3>
          <p class="offer-description">${currentLang === 'en' && offer.descriptionEn ? offer.descriptionEn : offer.description}</p>
          <div class="offer-details">
            <div class="price-info">
              <span class="original-price">${offer.originalPrice.toFixed(2)} ${currencyCode}</span>
              <span class="discounted-price">${offer.discountedPrice.toFixed(2)} ${currencyCode}</span>
              <span class="discount-badge">${offer.discountPercentage}% ${currentLang === 'en' ? 'OFF' : 'خصم'}</span>
            </div>
            <div class="category-badge">
              <i class="fas fa-tag"></i>
              ${this.getCategoryName(offer.category)}
            </div>
          </div>
          ${
            offer.endDate
              ? `<div class="offer-dates ${isExpired ? 'expired-date' : ''}">
                  <i class="fas fa-calendar${isExpired ? '-times' : ''}"></i>
                  <span>${isExpired ? (currentLang === 'en' ? 'Expired on' : 'انتهى في') : (currentLang === 'en' ? 'Ends on' : 'ينتهي في')}: ${new Date(offer.endDate).toLocaleDateString(locale)}</span>
                </div>`
              : ""
          }
          <div class="offer-actions">
            <button class="btn-edit" onclick="OffersManager.showOfferModal('${
              offer.id
            }')">
              <i class="fas fa-edit"></i> <span data-i18n="edit">${t("edit")}</span>
            </button>
            <button class="btn-duplicate" onclick="OffersManager.duplicateOffer('${
              offer.id
            }')">
              <i class="fas fa-copy"></i> <span data-i18n="duplicate">${t("duplicate")}</span>
            </button>
            <button class="btn-toggle ${offer.isActive ? "btn-deactivate" : "btn-activate"}" onclick="OffersManager.toggleOfferStatus('${
              offer.id
            }')">
              <i class="fas fa-${offer.isActive ? "eye-slash" : "eye"}"></i>
              <span data-i18n="${offer.isActive ? "deactivate" : "activate"}">${
          offer.isActive ? t("deactivate") : t("activate")
        }</span>
            </button>
            <button class="btn-delete" onclick="OffersManager.deleteOffer('${
              offer.id
            }')">
              <i class="fas fa-trash"></i> <span data-i18n="delete">${t("delete")}</span>
            </button>
          </div>
        </div>
      </div>
    `;
        }
      )
      .join("");
  },

  getCategoryName(category) {
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const categories = {
      all: t("allCategories"),
      new: t("newOffers"),
      weekly: t("weeklyOffers"),
      special: t("specialOffers"),
    };
    return categories[category] || category;
  },

  showOfferModal(offerId = null) {
    const isEdit = offerId !== null;
    const offer = isEdit
      ? this.offers.find((o) => o.id === offerId)
      : null;

    // Remove existing modal if any
    const existingModal = document.getElementById("offer-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Store the current offer ID for language change refresh
    this.currentModalOfferId = offerId;

    // Get translation function
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    
    // Get current language and currency code from global settings
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'ar';
    const currencyCode = (window.globalSettings && window.globalSettings.currency) ? window.globalSettings.currency : 'EGP';

    const modal = document.createElement("div");
    modal.id = "offer-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="close-modal" onclick="OffersManager.closeOfferModal()">
          <i class="fas fa-times"></i>
        </button>
        <div class="modal-header">
          <h2 class="modal-title" data-i18n="${isEdit ? "editOffer" : "addNewOffer"}">
            ${isEdit ? t("editOffer") : t("addNewOffer")}
          </h2>
        </div>
        <div class="modal-body">
          <form id="offer-form">
            
            <!-- Basic Information Section -->
            <div class="form-section">
              <div class="form-section-header">
                <h3 class="form-section-title">
                  <i class="fas fa-info-circle"></i>
                  <span data-i18n="basicInformation">${t("basicInformation")}</span>
                </h3>
              </div>
              <div class="form-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label for="offer-title" data-i18n="titleArabic">${t("titleArabic")}</label>
                    <input type="text" id="offer-title" required value="${
                      offer?.title || ""
                    }" />
                  </div>
                  <div class="form-group">
                    <label for="offer-title-en" data-i18n="titleEnglish">${t("titleEnglish")}</label>
                    <input type="text" id="offer-title-en" value="${
                      offer?.titleEn || ""
                    }" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="offer-description" data-i18n="descriptionArabic">${t("descriptionArabic")}</label>
                    <textarea id="offer-description" required rows="3">${
                      offer?.description || ""
                    }</textarea>
                  </div>
                  <div class="form-group">
                    <label for="offer-description-en" data-i18n="descriptionEnglish">${t("descriptionEnglish")}</label>
                    <textarea id="offer-description-en" rows="3">${
                      offer?.descriptionEn || ""
                    }</textarea>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="offer-category" data-i18n="category">${t("category")}</label>
                    <select id="offer-category" required>
                      <option value="all" ${
                        offer?.category === "all" ? "selected" : ""
                      } data-i18n="allCategories">${t("allCategories")}</option>
                      <option value="new" ${
                        offer?.category === "new" ? "selected" : ""
                      } data-i18n="newOffers">${t("newOffers")}</option>
                      <option value="weekly" ${
                        offer?.category === "weekly" ? "selected" : ""
                      } data-i18n="weeklyOffers">${t("weeklyOffers")}</option>
                      <option value="special" ${
                        offer?.category === "special" ? "selected" : ""
                      } data-i18n="specialOffers">${t("specialOffers")}</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group full-width">
                    <div class="image-upload-container">
                      <div class="image-upload-tabs">
                        <button type="button" class="image-tab active" data-tab="url" data-i18n="imageUrl">
                          ${t("imageUrl") || "رابط صورة"}
                        </button>
                        <button type="button" class="image-tab" data-tab="upload" data-i18n="uploadImage">
                          ${t("uploadImage") || "رفع صورة"}
                        </button>
                      </div>
                      <div class="image-tab-content active" id="offer-url-tab">
                        <div class="image-input-container">
                          <input
                            type="url"
                            id="offer-image"
                            name="offer-image-url"
                            value="${offer?.image || ""}"
                            placeholder="https://example.com/image.jpg" />
                          <button type="button" id="offer-preview-image-btn" data-i18n="preview">${t("preview") || "معاينة"}</button>
                        </div>
                      </div>
                      <div class="image-tab-content" id="offer-upload-tab">
                        <div class="file-upload-wrapper">
                          <input
                            type="file"
                            id="offer-image-upload"
                            accept="image/*"
                            class="file-upload-input" />
                          <div class="file-upload-box">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p data-i18n="dragDropImage">${t("dragDropImage") || "اضغط لاختيار صورة أو اسحب وأفلت الصورة هنا"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <input type="hidden" id="offer-image-final" required value="${offer?.image || ""}" />
                    <div class="image-preview-container">
                      <div id="offer-image-preview" class="offer-image-preview">
                        ${offer?.image ? `<img src="${offer.image}" alt="Offer preview" id="offer-preview-img" />` : `
                          <div class="no-preview" id="offer-no-preview">
                            <i class="fas fa-image"></i>
                            <p data-i18n="noImagePreview">${t("noImagePreview")}</p>
                          </div>
                        `}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Product Selection Section -->
            <div class="form-section">
              <div class="form-section-header">
                <h3 class="form-section-title">
                  <i class="fas fa-shopping-basket"></i>
                  <span data-i18n="selectFromProducts">${(() => {
                    const trans = t("selectFromProducts");
                    return trans === "selectFromProducts" ? (currentLang === 'en' ? "Select from Products" : "اختيار من المنتجات") : trans;
                  })()}</span>
                </h3>
              </div>
              <div class="form-section-content">
                <div class="form-row">
                  <div class="form-group full-width">
                    <label for="product-selector" data-i18n="selectProduct">${(() => {
                      const trans = t("selectProduct");
                      return trans === "selectProduct" ? (currentLang === 'en' ? "Select a product to create an offer" : "اختر منتج لإنشاء عرض") : trans;
                    })()}</label>
                    <select id="product-selector" class="product-selector">
                      <option value="" data-i18n="selectProductOption">${(() => {
                        const trans = t("selectProductOption");
                        return trans === "selectProductOption" ? (currentLang === 'en' ? "-- Select a product --" : "-- اختر منتج --") : trans;
                      })()}</option>
                    </select>
                    <small class="form-hint">
                      <i class="fas fa-info-circle"></i>
                      <span data-i18n="productSelectorHint">${(() => {
                        const trans = t("productSelectorHint");
                        return trans === "productSelectorHint" ? (currentLang === 'en' ? "Select a product to auto-fill data (name, description, price, image)" : "اختر منتجاً لملء البيانات تلقائياً (الاسم، الوصف، السعر، الصورة)") : trans;
                      })()}</span>
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pricing Section -->
            <div class="form-section">
              <div class="form-section-header">
                <h3 class="form-section-title">
                  <i class="fas fa-tag"></i>
                  <span data-i18n="pricingInformation">${t("pricingInformation")}</span>
                </h3>
              </div>
              <div class="form-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label for="offer-original-price" data-i18n="originalPrice">${t("originalPrice")}</label>
                    <div class="price-input-wrapper">
                      <input type="number" id="offer-original-price" required min="0" step="0.01" 
                        value="${offer?.originalPrice || ""}" placeholder="0.00" />
                      <span class="currency-symbol currency-text">${currencyCode}</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="offer-discounted-price" data-i18n="discountedPrice">${t("discountedPrice")}</label>
                    <div class="price-input-wrapper">
                      <input type="number" id="offer-discounted-price" required min="0" step="0.01" 
                        value="${offer?.discountedPrice || ""}" placeholder="0.00" />
                      <span class="currency-symbol currency-text">${currencyCode}</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="offer-discount-percentage" data-i18n="discountPercentage">${t("discountPercentage")}</label>
                    <div class="percentage-input-wrapper">
                      <input type="number" id="offer-discount-percentage" required min="0" max="100" 
                        value="${offer?.discountPercentage || ""}" placeholder="0" readonly />
                      <span class="percentage-symbol"><i class="fas fa-percentage"></i></span>
                    </div>
                    <small class="form-hint"><i class="fas fa-calculator"></i> ${t("autoCalculated")}</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Duration Section -->
            <div class="form-section">
              <div class="form-section-header">
                <h3 class="form-section-title">
                  <i class="fas fa-calendar-alt"></i>
                  <span data-i18n="offerDuration">${t("offerDuration")}</span>
                </h3>
              </div>
              <div class="form-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label for="offer-start-date" data-i18n="startDate">${t("startDate")}</label>
                    <input type="date" id="offer-start-date" value="${
                      offer?.startDate
                        ? new Date(offer.startDate).toISOString().split("T")[0]
                        : ""
                    }" />
                  </div>
                  <div class="form-group">
                    <label for="offer-end-date" data-i18n="endDate">${t("endDate")}</label>
                    <input type="date" id="offer-end-date" value="${
                      offer?.endDate
                        ? new Date(offer.endDate).toISOString().split("T")[0]
                        : ""
                    }" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Restrictions Section -->
            <div class="form-section">
              <div class="form-section-header">
                <h3 class="form-section-title">
                  <i class="fas fa-shield-alt"></i>
                  <span data-i18n="offerRestrictions">${t("offerRestrictions")}</span>
                </h3>
              </div>
              <div class="form-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label for="offer-user-limit" data-i18n="userLimit">${t("userLimit")}</label>
                    <input type="number" id="offer-user-limit" min="0" step="1" 
                      placeholder="${(() => {
                        const p = t("unlimitedIfEmpty");
                        return p === "unlimitedIfEmpty" ? 'غير محدود إذا كان فارغاً' : p;
                      })()}" 
                      value="${offer?.userLimit || ""}" />
                    <small class="form-hint" data-i18n="userLimitHint">${(() => {
                      const h = t("userLimitHint");
                      return h === "userLimitHint" ? 'اترك فارغاً للسماح لعدد غير محدود من المستخدمين' : h;
                    })()}</small>
                  </div>
                  <div class="form-group" id="min-purchase-group">
                    <label for="offer-min-purchase" data-i18n="minimumPurchase">${t("minimumPurchase")}</label>
                    <div class="price-input-wrapper" id="min-purchase-wrapper">
                      <input type="number" id="offer-min-purchase" min="0" step="0.01" 
                        placeholder="${(() => {
                          const p = t("noMinimumIfEmpty");
                          return p === "noMinimumIfEmpty" ? 'لا يوجد حد أدنى إذا كان فارغاً' : p;
                        })()}" 
                        value="${offer?.minPurchase || ""}"
                        ${offer?.customerEligibility === "new" ? "disabled" : ""} />
                      <span class="currency-symbol currency-text">${currencyCode}</span>
                    </div>
                    <small class="form-hint" data-i18n="minPurchaseHint" id="min-purchase-hint">${(() => {
                      if (offer?.customerEligibility === "new") {
                        const h = t("minPurchaseDisabledForNew");
                        return h === "minPurchaseDisabledForNew" ? (currentLang === 'en' ? 'Disabled for new customers (they have no purchase history)' : 'معطل للعملاء الجدد (ليس لديهم سجل شراء)') : h;
                      }
                      const h = t("minPurchaseHint");
                      return h === "minPurchaseHint" ? 'اترك فارغاً إذا لم يكن هناك حد أدنى للشراء' : h;
                    })()}</small>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="offer-customer-eligibility" data-i18n="customerEligibility">${t("customerEligibility")}</label>
                    <select id="offer-customer-eligibility">
                      <option value="all" ${
                        !offer?.customerEligibility || offer?.customerEligibility === "all" ? "selected" : ""
                      } data-i18n="allCustomers">${t("allCustomers")}</option>
                      <option value="new" ${
                        offer?.customerEligibility === "new" ? "selected" : ""
                      } data-i18n="newCustomersOnly">${t("newCustomersOnly")}</option>
                      <option value="existing" ${
                        offer?.customerEligibility === "existing" ? "selected" : ""
                      } data-i18n="existingCustomersOnly">${t("existingCustomersOnly")}</option>
                      <option value="loyalty" ${
                        offer?.customerEligibility === "loyalty" ? "selected" : ""
                      } data-i18n="loyaltyMembersOnly">${t("loyaltyMembersOnly")}</option>
                    </select>
                    <small class="form-hint eligibility-hint" data-i18n="eligibilityHint${
                      offer?.customerEligibility === "new" ? "New" : 
                      offer?.customerEligibility === "existing" ? "Existing" : 
                      offer?.customerEligibility === "loyalty" ? "Loyalty" : "All"
                    }">${
                      (() => {
                        if (offer?.customerEligibility === "new") {
                          const h = t("eligibilityHintNew");
                          return h === "eligibilityHintNew" ? "متاح فقط للعملاء الذين يقومون بالطلب لأول مرة" : h;
                        } else if (offer?.customerEligibility === "existing") {
                          const h = t("eligibilityHintExisting");
                          return h === "eligibilityHintExisting" ? "متاح فقط للعملاء الذين لديهم طلبات سابقة" : h;
                        } else if (offer?.customerEligibility === "loyalty") {
                          const h = t("eligibilityHintLoyalty");
                          return h === "eligibilityHintLoyalty" ? "متاح فقط للعملاء المسجلين في برنامج الولاء" : h;
                        } else {
                          const h = t("eligibilityHintAll");
                          return h === "eligibilityHintAll" ? "متاح لجميع العملاء بدون قيود" : h;
                        }
                      })()
                    }</small>
                  </div>
                  <div class="form-group" id="loyalty-points-group" style="display: ${offer?.customerEligibility === 'loyalty' ? 'block' : 'none'};">
                    <label for="offer-min-loyalty-points" data-i18n="minimumLoyaltyPoints">${(() => {
                      const trans = t("minimumLoyaltyPoints");
                      return trans === "minimumLoyaltyPoints" ? (currentLang === 'en' ? "Minimum Loyalty Points" : "الحد الأدنى من نقاط الولاء") : trans;
                    })()}</label>
                    <div class="points-input-wrapper">
                      <input type="number" id="offer-min-loyalty-points" min="0" step="1" 
                        placeholder="${(() => {
                          const p = t("enterMinPoints");
                          return p === "enterMinPoints" ? (currentLang === 'en' ? 'Enter minimum points' : 'أدخل الحد الأدنى من النقاط') : p;
                        })()}" 
                        value="${offer?.minLoyaltyPoints || ""}" />
                      <span class="points-symbol"><i class="fas fa-star"></i></span>
                    </div>
                    <small class="form-hint" data-i18n="minLoyaltyPointsHint">${(() => {
                      const h = t("minLoyaltyPointsHint");
                      return h === "minLoyaltyPointsHint" ? (currentLang === 'en' ? 'Minimum loyalty points required to claim this offer' : 'الحد الأدنى من نقاط الولاء المطلوبة للحصول على هذا العرض') : h;
                    })()}</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Status Section -->
            <div class="form-section">
              <div class="form-section-header">
                <h3 class="form-section-title">
                  <i class="fas fa-toggle-on"></i>
                  <span data-i18n="offerStatus">${t("offerStatus")}</span>
                </h3>
              </div>
              <div class="form-section-content">
                <div class="form-row status-toggles">
                  <div class="form-group toggle-group">
                    <div class="toggle-switch-container">
                      <label class="toggle-switch">
                        <input type="checkbox" id="offer-is-active" ${
                          offer?.isActive !== false ? "checked" : ""
                        } />
                        <span class="toggle-slider"></span>
                      </label>
                      <div class="toggle-label">
                        <i class="fas fa-eye"></i>
                        <span data-i18n="active">${t("active")}</span>
                        <span data-i18n="activeHint">${t("activeHint")}</span>
                      </div>
                    </div>
                  </div>
                  <div class="form-group toggle-group">
                    <div class="toggle-switch-container">
                      <label class="toggle-switch">
                        <input type="checkbox" id="offer-is-featured" ${
                          offer?.isFeatured ? "checked" : ""
                        } />
                        <span class="toggle-slider"></span>
                      </label>
                      <div class="toggle-label">
                        <i class="fas fa-star"></i>
                        <span data-i18n="featured">${t("featured")}</span>
                        <small data-i18n="featuredHint">${t("featuredHint")}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="submit" class="btn-primary">
                <i class="fas fa-save"></i>
                <span data-i18n="save">${t("save")}</span>
              </button>
              <button type="button" class="btn-secondary" onclick="OffersManager.closeOfferModal()">
                <i class="fas fa-times"></i>
                <span data-i18n="cancel">${t("cancel")}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    // Show modal with animation (following admin.js pattern)
    setTimeout(() => {
      modal.style.display = "flex";
      setTimeout(() => {
        modal.classList.add("show");
      }, 10);
    }, 10);

    // Populate product selector
    this.populateProductSelector();

    // Click outside to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeOfferModal();
      }
    });

    // Handle editing offer with uploaded image (data URL)
    if (offer && offer.image && offer.image.startsWith("data:image/")) {
      // Switch to upload tab
      const imageTabs = modal.querySelectorAll(".image-tab");
      const imageTabContents = modal.querySelectorAll(".image-tab-content");
      
      imageTabs.forEach((tab) => tab.classList.remove("active"));
      imageTabContents.forEach((content) => content.classList.remove("active"));
      
      const uploadTab = modal.querySelector('.image-tab[data-tab="upload"]');
      const uploadTabContent = modal.getElementById("offer-upload-tab");
      if (uploadTab && uploadTabContent) {
        uploadTab.classList.add("active");
        uploadTabContent.classList.add("active");
      }
      
      // Update file upload status
      const fileUploadWrapper = modal.querySelector(".file-upload-wrapper");
      if (fileUploadWrapper) {
        fileUploadWrapper.classList.add("has-file");
        const statusText = fileUploadWrapper.querySelector("p");
        if (statusText) {
          statusText.textContent = t("imageUploadedSuccess") || "تم رفع الصورة بنجاح";
        }
      }
    }

    // Auto-calculate discount percentage
    const originalPriceInput = document.getElementById("offer-original-price");
    const discountedPriceInput = document.getElementById(
      "offer-discounted-price"
    );
    const discountPercentageInput = document.getElementById(
      "offer-discount-percentage"
    );

    const calculateDiscount = () => {
      const original = parseFloat(originalPriceInput.value) || 0;
      const discounted = parseFloat(discountedPriceInput.value) || 0;
      if (original > 0 && discounted > 0 && discounted < original) {
        const percentage = ((original - discounted) / original) * 100;
        discountPercentageInput.value = percentage.toFixed(0);
      }
    };

    originalPriceInput.addEventListener("input", calculateDiscount);
    discountedPriceInput.addEventListener("input", calculateDiscount);

    // Dynamic hint for customer eligibility
    const eligibilitySelect = document.getElementById("offer-customer-eligibility");
    const eligibilityHint = eligibilitySelect.nextElementSibling;
    
    const getEligibilityHint = (key, fallback) => {
      const trans = t(key);
      return trans === key ? fallback : trans;
    };
    
    const eligibilityHints = {
      all: getEligibilityHint("eligibilityHintAll", "متاح لجميع العملاء بدون قيود"),
      new: getEligibilityHint("eligibilityHintNew", "متاح فقط للعملاء الذين يقومون بالطلب لأول مرة"),
      existing: getEligibilityHint("eligibilityHintExisting", "متاح فقط للعملاء الذين لديهم طلبات سابقة"),
      loyalty: getEligibilityHint("eligibilityHintLoyalty", "متاح فقط للعملاء المسجلين في برنامج الولاء")
    };
    
    eligibilitySelect.addEventListener("change", (e) => {
      const selectedValue = e.target.value;
      eligibilityHint.textContent = eligibilityHints[selectedValue] || eligibilityHints.all;
      
      // Toggle loyalty points field visibility
      const loyaltyPointsGroup = document.getElementById("loyalty-points-group");
      if (loyaltyPointsGroup) {
        loyaltyPointsGroup.style.display = selectedValue === "loyalty" ? "block" : "none";
      }
      
      // Toggle minimum purchase field disabled state
      const minPurchaseInput = document.getElementById("offer-min-purchase");
      const minPurchaseWrapper = document.getElementById("min-purchase-wrapper");
      const minPurchaseHint = document.getElementById("min-purchase-hint");
      
      if (minPurchaseInput && minPurchaseWrapper && minPurchaseHint) {
        if (selectedValue === "new") {
          // Disable for new customers
          minPurchaseInput.disabled = true;
          minPurchaseInput.value = ""; // Clear the value
          minPurchaseWrapper.style.opacity = "0.5";
          minPurchaseWrapper.style.cursor = "not-allowed";
          const disabledHint = t("minPurchaseDisabledForNew");
          minPurchaseHint.textContent = disabledHint === "minPurchaseDisabledForNew" 
            ? (currentLang === 'en' ? 'Disabled for new customers (they have no purchase history)' : 'معطل للعملاء الجدد (ليس لديهم سجل شراء)')
            : disabledHint;
        } else {
          // Enable for other customer types
          minPurchaseInput.disabled = false;
          minPurchaseWrapper.style.opacity = "1";
          minPurchaseWrapper.style.cursor = "default";
          const enabledHint = t("minPurchaseHint");
          minPurchaseHint.textContent = enabledHint === "minPurchaseHint" 
            ? 'اترك فارغاً إذا لم يكن هناك حد أدنى للشراء'
            : enabledHint;
        }
      }
    });

    // Tab switching functionality
    const imageTabs = modal.querySelectorAll(".image-tab");
    const imageTabContents = modal.querySelectorAll(".image-tab-content");
    
    imageTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        imageTabs.forEach((t) => t.classList.remove("active"));
        imageTabContents.forEach((c) => c.classList.remove("active"));
        
        tab.classList.add("active");
        const targetContent = modal.querySelector(`#offer-${tabName}-tab`);
        if (targetContent) {
          targetContent.classList.add("active");
        }
      });
    });

    // Image URL preview handler
    const imageInput = document.getElementById("offer-image");
    const previewBtn = document.getElementById("offer-preview-image-btn");
    const imageFinal = document.getElementById("offer-image-final");
    
    const previewImageFromUrl = (url) => {
      const previewImg = document.getElementById("offer-preview-img");
      const noPreview = document.getElementById("offer-no-preview");
      const imagePreview = document.getElementById("offer-image-preview");
      
      if (url) {
        const errorText = t("imageLoadError");
        imagePreview.innerHTML = `<img src="${url}" alt="Offer preview" id="offer-preview-img" onerror="this.parentElement.innerHTML='<div class=\\'no-preview\\' id=\\'offer-no-preview\\'><i class=\\'fas fa-exclamation-triangle\\'></i><p>${errorText}</p></div>';" />`;
        imageFinal.value = url;
      } else {
        const noPreviewText = t("noImagePreview");
        imagePreview.innerHTML = `
          <div class="no-preview" id="offer-no-preview">
            <i class="fas fa-image"></i>
            <p data-i18n="noImagePreview">${noPreviewText}</p>
          </div>
        `;
        imageFinal.value = "";
      }
    };
    
    if (previewBtn) {
      previewBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const url = imageInput.value.trim();
        previewImageFromUrl(url);
      });
    }
    
    // Auto-preview on Enter key
    if (imageInput) {
      imageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const url = imageInput.value.trim();
          previewImageFromUrl(url);
        }
      });
    }

    // File upload handler
    const fileUploadInput = document.getElementById("offer-image-upload");
    if (fileUploadInput) {
      const fileUploadWrapper = fileUploadInput.closest(".file-upload-wrapper");
      const fileUploadBox = fileUploadWrapper.querySelector(".file-upload-box");
      
      // Click to upload
      // Remove old event listeners by cloning the input element
      const newFileUploadInput = fileUploadInput.cloneNode(true);
      fileUploadInput.parentNode.replaceChild(newFileUploadInput, fileUploadInput);
      
      // Remove old event listeners by cloning the box element
      const newFileUploadBox = fileUploadBox.cloneNode(true);
      fileUploadBox.parentNode.replaceChild(newFileUploadBox, fileUploadBox);
      
      newFileUploadBox.addEventListener("click", () => {
        newFileUploadInput.click();
      });
      
      // File selection (only one listener now)
      newFileUploadInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          handleOfferFileUpload(file, fileUploadWrapper);
        }
      });
      
      // Drag and drop (only one listener now)
      newFileUploadBox.addEventListener("dragover", (e) => {
        e.preventDefault();
        newFileUploadBox.classList.add("drag-over");
      });
      
      newFileUploadBox.addEventListener("dragleave", () => {
        newFileUploadBox.classList.remove("drag-over");
      });
      
      newFileUploadBox.addEventListener("drop", (e) => {
        e.preventDefault();
        newFileUploadBox.classList.remove("drag-over");
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          handleOfferFileUpload(file, fileUploadWrapper);
        }
      });
    }
    
    // File upload handler function
    function handleOfferFileUpload(file, wrapper) {
      const imageFinal = document.getElementById("offer-image-final");
      const imagePreview = document.getElementById("offer-image-preview");
      const statusText = wrapper.querySelector("p");
      
      // Reset error state
      wrapper.classList.remove("error");
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        statusText.textContent = t("invalidFileType") || "نوع الملف غير صحيح";
        wrapper.classList.add("error");
        return;
      }
      
      // Validate file size (5MB max before compression)
      if (file.size > 5 * 1024 * 1024) {
        statusText.textContent = t("fileTooLarge") || "حجم الملف كبير جداً (الحد الأقصى 5MB)";
        wrapper.classList.add("error");
        return;
      }
      
      // Show processing status
      statusText.textContent = t("processingImage") || "جاري معالجة الصورة...";
      
      // Compress image before uploading
      ImageCompressor.compress(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        outputFormat: 'jpeg'
      }).then(async (compressedDataUrl) => {
        console.log("Offer image compressed successfully, uploading to server...");
        statusText.textContent = t("uploadingImage") || "جاري رفع الصورة...";
        
        try {
          // Upload compressed image to server
          const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: compressedDataUrl
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload image');
          }

          const result = await response.json();
          
          if (!result.success || !result.imageUrl) {
            throw new Error('Invalid response from server');
          }

          console.log("Offer image uploaded successfully:", result.imageUrl);

          // Update preview with the uploaded image URL
          // Remove /api from API_BASE_URL for asset URLs since assets are served from root
          const baseUrl = API_BASE_URL.replace('/api', '');
          const imageUrl = `${baseUrl}${result.imageUrl}`;
          imagePreview.innerHTML = `<img src="${imageUrl}" alt="Offer preview" id="offer-preview-img" />`;
          
          // Set final image value to URL (not base64)
          imageFinal.value = result.imageUrl;
          
          // Update status
          wrapper.classList.add("has-file");
          statusText.textContent = t("imageUploadedSuccess") || "تم رفع الصورة بنجاح";
        } catch (uploadError) {
          console.error("Error uploading offer image:", uploadError);
          statusText.textContent = uploadError.message || t("fileReadError") || "فشل رفع الصورة";
          wrapper.classList.add("error");
        }
      }).catch((error) => {
        console.error("Error compressing offer image:", error);
        statusText.textContent = t("fileReadError") || "فشل قراءة الملف";
        wrapper.classList.add("error");
      });
    }

    // Form submission
    const form = document.getElementById("offer-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveOffer(offerId, modal);
    });
  },

  populateProductSelector() {
    const productSelector = document.getElementById("product-selector");
    if (!productSelector || !this.products) return;

    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'ar';

    // Clear existing options except the first one
    const trans = t("selectProductOption");
    const selectText = trans === "selectProductOption" ? (currentLang === 'en' ? "-- Select a product --" : "-- اختر منتج --") : trans;
    productSelector.innerHTML = `<option value="" data-i18n="selectProductOption">${selectText}</option>`;

    // Add products as options
    this.products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      const productName = currentLang === 'en' && product.nameEn ? product.nameEn : product.name;
      const price = product.price ? product.price.toFixed(2) : '0.00';
      const currencyCode = (window.globalSettings && window.globalSettings.currency) ? window.globalSettings.currency : 'EGP';
      option.textContent = `${productName} - ${price} ${currencyCode}`;
      productSelector.appendChild(option);
    });

    // Add change event listener
    productSelector.addEventListener('change', (e) => {
      this.handleProductSelection(e.target.value);
    });
  },

  handleProductSelection(productId) {
    if (!productId) return;

    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'ar';

    // Auto-fill form fields with product data
    const titleInput = document.getElementById("offer-title");
    const titleEnInput = document.getElementById("offer-title-en");
    const descriptionInput = document.getElementById("offer-description");
    const descriptionEnInput = document.getElementById("offer-description-en");
    const originalPriceInput = document.getElementById("offer-original-price");
    const imageInput = document.getElementById("offer-image");
    const imageFinalInput = document.getElementById("offer-image-final");

    // Fill Arabic title
    if (titleInput && product.name) {
      titleInput.value = product.name;
    }

    // Fill English title
    if (titleEnInput && product.nameEn) {
      titleEnInput.value = product.nameEn;
    }

    // Fill Arabic description
    if (descriptionInput && product.description) {
      descriptionInput.value = product.description;
    }

    // Fill English description
    if (descriptionEnInput && product.descriptionEn) {
      descriptionEnInput.value = product.descriptionEn;
    }

    // Fill original price
    if (originalPriceInput && product.price) {
      originalPriceInput.value = product.price.toFixed(2);
    }

    // Fill image
    if (product.image) {
      if (imageInput) {
        imageInput.value = product.image;
      }
      if (imageFinalInput) {
        imageFinalInput.value = product.image;
      }

      // Preview the image
      const imagePreview = document.getElementById("offer-image-preview");
      if (imagePreview) {
        const errorText = t("imageLoadError") || "فشل تحميل الصورة";
        imagePreview.innerHTML = `<img src="${product.image}" alt="Product preview" id="offer-preview-img" onerror="this.parentElement.innerHTML='<div class=\\'no-preview\\' id=\\'offer-no-preview\\'><i class=\\'fas fa-exclamation-triangle\\'></i><p>${errorText}</p></div>';" />`;
      }
    }

    // Show notification
    const successMsg = t("productDataLoaded") || "تم تحميل بيانات المنتج بنجاح";
    if (typeof showNotification === 'function') {
      showNotification(successMsg, "success");
    }

    // Focus on discounted price field for user to enter the offer price
    const discountedPriceInput = document.getElementById("offer-discounted-price");
    if (discountedPriceInput) {
      setTimeout(() => {
        discountedPriceInput.focus();
      }, 100);
    }
  },

  closeOfferModal() {
    const modalElement = document.getElementById("offer-modal");
    if (modalElement) {
      modalElement.classList.remove("show");
      setTimeout(() => {
        modalElement.remove();
        // Restore body scroll
        document.body.style.overflow = "";
      }, 300);
    }
    // Clear the stored offer ID
    this.currentModalOfferId = null;
  },

  async saveOffer(offerId, modal) {
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    
    // Validate required fields
    const titleValue = document.getElementById("offer-title").value.trim();
    const descriptionValue = document.getElementById("offer-description").value.trim();
    const originalPriceValue = document.getElementById("offer-original-price").value;
    const discountedPriceValue = document.getElementById("offer-discounted-price").value;
    
    // Check image from either URL input or final hidden input
    let imageValue = document.getElementById("offer-image-final").value.trim();
    if (!imageValue) {
      // Try to get from URL input if final is empty
      const imageUrlInput = document.getElementById("offer-image");
      if (imageUrlInput && imageUrlInput.value.trim()) {
        imageValue = imageUrlInput.value.trim();
        // Update the hidden field
        document.getElementById("offer-image-final").value = imageValue;
      }
    }
    
    // Debug: Log which fields are empty
    const missingFields = [];
    if (!titleValue) missingFields.push("Title");
    if (!descriptionValue) missingFields.push("Description");
    if (!originalPriceValue) missingFields.push("Original Price");
    if (!discountedPriceValue) missingFields.push("Discounted Price");
    if (!imageValue) missingFields.push("Image");
    
    if (missingFields.length > 0) {
      console.warn("Missing required fields:", missingFields);
      const errorMsg = t("pleaseAllRequiredFields") || "الرجاء ملء جميع الحقول المطلوبة";
      const detailedMsg = `${errorMsg}: ${missingFields.join(", ")}`;
      
      if (typeof showNotification === 'function') {
        showNotification(detailedMsg, "error");
      } else {
        alert(detailedMsg);
      }
      return;
    }

    const userLimitValue = document.getElementById("offer-user-limit").value;
    const minPurchaseValue = document.getElementById("offer-min-purchase").value;
    
    // Additional validation
    const originalPrice = parseFloat(originalPriceValue);
    const discountedPrice = parseFloat(discountedPriceValue);
    
    if (isNaN(originalPrice) || originalPrice <= 0) {
      const errorMsg = t("invalidOriginalPrice") || "السعر الأصلي غير صحيح";
      if (typeof showNotification === 'function') {
        showNotification(errorMsg, "error");
      } else {
        alert(errorMsg);
      }
      return;
    }
    
    if (isNaN(discountedPrice) || discountedPrice <= 0 || discountedPrice >= originalPrice) {
      const errorMsg = t("invalidDiscountedPrice") || "السعر بعد الخصم غير صحيح";
      if (typeof showNotification === 'function') {
        showNotification(errorMsg, "error");
      } else {
        alert(errorMsg);
      }
      return;
    }

    const formData = {
      id: offerId || `offer_${Date.now()}`,
      title: titleValue,
      titleEn: document.getElementById("offer-title-en").value.trim() || titleValue,
      description: descriptionValue,
      descriptionEn: document.getElementById("offer-description-en").value.trim() || descriptionValue,
      originalPrice: originalPrice,
      discountedPrice: discountedPrice,
      discountPercentage: parseFloat(
        document.getElementById("offer-discount-percentage").value || "0"
      ),
      category: document.getElementById("offer-category").value,
      image: imageValue,
      startDate: document.getElementById("offer-start-date").value || null,
      endDate: document.getElementById("offer-end-date").value || null,
      userLimit: userLimitValue ? parseInt(userLimitValue) : null,
      customerEligibility: document.getElementById("offer-customer-eligibility").value || "all",
      minPurchase: (() => {
        const eligibility = document.getElementById("offer-customer-eligibility").value;
        // Force minPurchase to null for new customers (they have no purchase history)
        if (eligibility === "new") {
          return null;
        }
        return minPurchaseValue ? parseFloat(minPurchaseValue) : null;
      })(),
      minLoyaltyPoints: (() => {
        const loyaltyPointsValue = document.getElementById("offer-min-loyalty-points").value.trim();
        return loyaltyPointsValue ? parseInt(loyaltyPointsValue) : null;
      })(),
      isActive: document.getElementById("offer-is-active").checked,
      isFeatured: document.getElementById("offer-is-featured").checked,
    };
    
    // Check if trying to set as featured when another featured offer already exists
    if (formData.isFeatured) {
      const existingFeaturedOffer = this.offers.find(offer => 
        offer.isFeatured && offer.id !== offerId
      );
      
      if (existingFeaturedOffer) {
        const currentLang = localStorage.getItem("admin-language") || "ar";
        const errorMsg = currentLang === "en" 
          ? "Another featured offer already exists"
          : "يوجد بالفعل عرض مميز آخر";
        if (typeof showNotification === 'function') {
          showNotification(errorMsg, "error");
        }
        return;
      }
    }
    
    // Log the data being sent for debugging
    console.log("Sending offer data:", formData);

    try {
      const token = localStorage.getItem("adminToken");
      const csrfToken = localStorage.getItem("csrfToken");

      const url = offerId
        ? `${API_BASE_URL}/offers/${offerId}`
        : `${API_BASE_URL}/offers`;
      const method = offerId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Server validation error:", error);
        
        // Log detailed validation errors
        if (error.errors && Array.isArray(error.errors)) {
          console.error("Validation errors details:", error.errors);
          
          // Show specific validation errors to user
          const errorMessages = error.errors.map(err => {
            if (typeof err === 'string') return err;
            return err.message || err.msg || err.error || JSON.stringify(err);
          }).join(", ");
          
          throw new Error(errorMessages || error.message || "Validation Error");
        }
        
        throw new Error(error.message || error.error || "Failed to save offer");
      }

      const successMsg = offerId 
        ? (t("offerUpdatedSuccess") || "تم تحديث العرض بنجاح") 
        : (t("offerAddedSuccess") || "تم إضافة العرض بنجاح");
      
      if (typeof showNotification === 'function') {
        showNotification(successMsg, "success");
      }
      
      // Close modal
      this.closeOfferModal();
      
      await this.loadOffers();
    } catch (error) {
      console.error("Error saving offer:", error);
      const errorMsg = t("offerSaveFailed") || "فشل حفظ العرض";
      
      if (typeof showNotification === 'function') {
        showNotification(errorMsg + ": " + error.message, "error");
      } else {
        alert(errorMsg + ": " + error.message);
      }
    }
  },

  async toggleOfferStatus(offerId) {
    const offer = this.offers.find((o) => o.id === offerId);
    if (!offer) return;

    try {
      const token = localStorage.getItem("adminToken");
      const csrfToken = localStorage.getItem("csrfToken");

      const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ ...offer, isActive: !offer.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle offer status");
      }

      // Update the local offer object immediately
      offer.isActive = !offer.isActive;

      const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
      const statusMsg = t("offerStatusUpdated") || "تم تحديث حالة العرض بنجاح";
      
      if (typeof showNotification === 'function') {
        showNotification(statusMsg, "success");
      }
      
      // Re-render the offers list to show the change immediately
      this.renderOffers();
      this.updateStatistics();
    } catch (error) {
      console.error("Error toggling offer status:", error);
      const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
      const toggleErrorMsg = t("offerStatusUpdateFailed") || "فشل تحديث حالة العرض";
      
      if (typeof showNotification === 'function') {
        showNotification(toggleErrorMsg, "error");
      }
    }
  },

  async deleteOffer(offerId) {
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const offer = this.offers.find((o) => o.id === offerId);
    if (!offer) return;

    const confirmMsg = (t("confirmDeleteOffer") || "هل أنت متأكد من حذف العرض '{title}'؟").replace("{title}", offer.title);
    const confirmed = confirm(confirmMsg);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("adminToken");
      const csrfToken = localStorage.getItem("csrfToken");

      const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete offer");
      }

      const deleteMsg = t("offerDeletedSuccess") || "تم حذف العرض بنجاح";
      
      if (typeof showNotification === 'function') {
        showNotification(deleteMsg, "success");
      }
      
      await this.loadOffers();
    } catch (error) {
      console.error("Error deleting offer:", error);
      const deleteErrorMsg = t("offerDeleteFailed") || "فشل حذف العرض";
      
      if (typeof showNotification === 'function') {
        showNotification(deleteErrorMsg, "error");
      }
    }
  },

  toggleOfferSelection(offerId, checked) {
    if (checked) {
      this.selectedOffers.add(offerId);
    } else {
      this.selectedOffers.delete(offerId);
    }
    this.updateBulkActionsBar();
    
    // Update card visual state
    const card = document.querySelector(`.offer-card-admin[data-offer-id="${offerId}"]`);
    if (card) {
      if (checked) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    }
  },

  selectAllOffers(checked) {
    const checkboxes = document.querySelectorAll('.offer-selection-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = checked;
      const offerId = cb.dataset.offerId;
      if (checked) {
        this.selectedOffers.add(offerId);
      } else {
        this.selectedOffers.delete(offerId);
      }
      
      // Update card visual state
      const card = document.querySelector(`.offer-card-admin[data-offer-id="${offerId}"]`);
      if (card) {
        if (checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });
    this.updateBulkActionsBar();
  },

  updateBulkActionsBar() {
    const bulkActionsBar = document.getElementById('bulk-actions-bar');
    const selectedCount = document.getElementById('selected-count');
    const selectAllCheckbox = document.getElementById('select-all-offers');
    
    if (bulkActionsBar && selectedCount) {
      selectedCount.textContent = this.selectedOffers.size;
      bulkActionsBar.style.display = this.selectedOffers.size > 0 ? 'flex' : 'none';
    }
    
    // Update select all checkbox state
    if (selectAllCheckbox) {
      const allCheckboxes = document.querySelectorAll('.offer-selection-checkbox');
      const allChecked = allCheckboxes.length > 0 && 
        Array.from(allCheckboxes).every(cb => cb.checked);
      selectAllCheckbox.checked = allChecked;
      selectAllCheckbox.indeterminate = this.selectedOffers.size > 0 && !allChecked;
    }
  },

  async bulkActivateOffers() {
    if (this.selectedOffers.size === 0) return;
    
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const confirmMsg = t('confirmBulkActivate') || `هل تريد تفعيل ${this.selectedOffers.size} عروض؟`;
    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("adminToken");
      const csrfToken = localStorage.getItem("csrfToken");
      
      const promises = Array.from(this.selectedOffers).map(async (offerId) => {
        const offer = this.offers.find(o => o.id === offerId);
        if (!offer) return;
        
        return fetch(`${API_BASE_URL}/offers/${offerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ ...offer, isActive: true }),
        });
      });
      
      await Promise.all(promises);
      showNotification(t('bulkActivateSuccess') || 'تم تفعيل العروض بنجاح', "success");
      this.selectedOffers.clear();
      await this.loadOffers();
    } catch (error) {
      console.error("Error bulk activating offers:", error);
      showNotification(t('bulkActivateFailed') || 'فشل تفعيل العروض', "error");
    }
  },

  async bulkDeactivateOffers() {
    if (this.selectedOffers.size === 0) return;
    
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const confirmMsg = t('confirmBulkDeactivate') || `هل تريد إلغاء تفعيل ${this.selectedOffers.size} عروض؟`;
    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("adminToken");
      const csrfToken = localStorage.getItem("csrfToken");
      
      const promises = Array.from(this.selectedOffers).map(async (offerId) => {
        const offer = this.offers.find(o => o.id === offerId);
        if (!offer) return;
        
        return fetch(`${API_BASE_URL}/offers/${offerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ ...offer, isActive: false }),
        });
      });
      
      await Promise.all(promises);
      showNotification(t('bulkDeactivateSuccess') || 'تم إلغاء تفعيل العروض بنجاح', "success");
      this.selectedOffers.clear();
      await this.loadOffers();
    } catch (error) {
      console.error("Error bulk deactivating offers:", error);
      showNotification(t('bulkDeactivateFailed') || 'فشل إلغاء تفعيل العروض', "error");
    }
  },

  async bulkFeatureOffers() {
    if (this.selectedOffers.size === 0) return;
    
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const confirmMsg = t('confirmBulkFeature') || `هل تريد جعل ${this.selectedOffers.size} عروض مميزة؟`;
    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("adminToken");
      const csrfToken = localStorage.getItem("csrfToken");
      
      const promises = Array.from(this.selectedOffers).map(async (offerId) => {
        const offer = this.offers.find(o => o.id === offerId);
        if (!offer) return;
        
        return fetch(`${API_BASE_URL}/offers/${offerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ ...offer, isFeatured: true }),
        });
      });
      
      await Promise.all(promises);
      showNotification(t('bulkFeatureSuccess') || 'تم جعل العروض مميزة بنجاح', "success");
      this.selectedOffers.clear();
      await this.loadOffers();
    } catch (error) {
      console.error("Error bulk featuring offers:", error);
      showNotification(t('bulkFeatureFailed') || 'فشل جعل العروض مميزة', "error");
    }
  },

  async bulkDeleteOffers() {
    if (this.selectedOffers.size === 0) return;
    
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const confirmMsg = t('confirmBulkDelete') || `هل تريد حذف ${this.selectedOffers.size} عروض؟ لا يمكن التراجع عن هذا الإجراء.`;
    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("adminToken");
      const csrfToken = localStorage.getItem("csrfToken");
      
      const promises = Array.from(this.selectedOffers).map(offerId => 
        fetch(`${API_BASE_URL}/offers/${offerId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": csrfToken,
          },
        })
      );
      
      await Promise.all(promises);
      showNotification(t('bulkDeleteSuccess') || 'تم حذف العروض بنجاح', "success");
      this.selectedOffers.clear();
      await this.loadOffers();
    } catch (error) {
      console.error("Error bulk deleting offers:", error);
      showNotification(t('bulkDeleteFailed') || 'فشل حذف العروض', "error");
    }
  },

  duplicateOffer(offerId) {
    const offer = this.offers.find(o => o.id === offerId);
    if (!offer) return;
    
    // Create a copy with a new ID and modified title
    const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
    const copyLabel = t('copy') || 'نسخة';
    
    const duplicatedOffer = {
      ...offer,
      id: null, // Will be generated on server
      title: `${offer.title} (${copyLabel})`,
      titleEn: offer.titleEn ? `${offer.titleEn} (Copy)` : '',
      isActive: false, // Start as inactive
      isFeatured: false, // Don't duplicate featured status
    };
    
    // Open modal with duplicated data
    this.showOfferModal(null);
    
    // Populate form after a short delay to ensure modal is rendered
    setTimeout(() => {
      document.getElementById('offer-title').value = duplicatedOffer.title;
      document.getElementById('offer-title-en').value = duplicatedOffer.titleEn;
      document.getElementById('offer-description').value = duplicatedOffer.description;
      document.getElementById('offer-description-en').value = duplicatedOffer.descriptionEn || '';
      document.getElementById('offer-category').value = duplicatedOffer.category;
      document.getElementById('offer-image').value = duplicatedOffer.image;
      document.getElementById('offer-original-price').value = duplicatedOffer.originalPrice;
      document.getElementById('offer-discounted-price').value = duplicatedOffer.discountedPrice;
      document.getElementById('offer-discount-percentage').value = duplicatedOffer.discountPercentage;
      
      if (duplicatedOffer.startDate) {
        document.getElementById('offer-start-date').value = new Date(duplicatedOffer.startDate).toISOString().split('T')[0];
      }
      if (duplicatedOffer.endDate) {
        document.getElementById('offer-end-date').value = new Date(duplicatedOffer.endDate).toISOString().split('T')[0];
      }
      
      if (duplicatedOffer.userLimit) {
        document.getElementById('offer-user-limit').value = duplicatedOffer.userLimit;
      }
      if (duplicatedOffer.minPurchase) {
        document.getElementById('offer-min-purchase').value = duplicatedOffer.minPurchase;
      }
      
      document.getElementById('offer-customer-eligibility').value = duplicatedOffer.customerEligibility || 'all';
      
      // Set loyalty points if applicable
      if (duplicatedOffer.minLoyaltyPoints) {
        document.getElementById('offer-min-loyalty-points').value = duplicatedOffer.minLoyaltyPoints;
      }
      
      // Toggle loyalty points field visibility
      const loyaltyPointsGroup = document.getElementById('loyalty-points-group');
      if (loyaltyPointsGroup) {
        loyaltyPointsGroup.style.display = duplicatedOffer.customerEligibility === 'loyalty' ? 'block' : 'none';
      }
      
      document.getElementById('offer-is-active').checked = false;
      document.getElementById('offer-is-featured').checked = false;
      
      // Trigger image preview
      const imageInput = document.getElementById('offer-image');
      imageInput.dispatchEvent(new Event('input'));
    }, 100);
  },

  previewOffer(offerId) {
    const offer = this.offers.find(o => o.id === offerId);
    if (!offer) return;
    
    // Open modal in read-only mode for preview
    this.showOfferModal(offerId);
    
    // Disable all inputs after modal is rendered
    setTimeout(() => {
      const form = document.getElementById('offer-form');
      if (form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => input.disabled = true);
        
        // Hide save button, show close only
        const saveBtn = form.querySelector('.btn-primary');
        if (saveBtn) {
          saveBtn.style.display = 'none';
        }
        
        // Update modal title
        const modalTitle = document.querySelector('.modal-title');
        const t = typeof getTranslation === 'function' ? getTranslation : (key) => key;
        if (modalTitle) {
          modalTitle.innerHTML = `<i class="fas fa-eye"></i> ${t('previewOffer') || 'معاينة العرض'}`;
        }
      }
    }, 100);
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on the offers section
  const offersSection = document.getElementById("offers-section");
  if (offersSection) {
    OffersManager.init();
  }
});

// Export for use in other modules
if (typeof window !== "undefined") {
  window.OffersManager = OffersManager;
}
