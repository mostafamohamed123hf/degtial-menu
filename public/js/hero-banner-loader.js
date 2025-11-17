// Hero Banner Loader
// This script loads hero banner settings and updates the banner on the index page
(function () {
  "use strict";

  // Function to update hero banner with settings
  function updateHeroBanner(settings) {
    // Check if hero banner is enabled
    if (settings.heroBannerEnabled === false) {
      const heroBanner = document.querySelector('.hero-banner');
      if (heroBanner) {
        heroBanner.style.display = 'none';
      }
      return;
    }

    // Get current language
    const currentLang = localStorage.getItem('public-language') || 'ar';
    
    // Get banner elements
    const bannerTitle = document.querySelector('.hero-banner .banner-content h2');
    const bannerDescription = document.querySelector('.hero-banner .banner-content p');
    const originalPrice = document.querySelector('.hero-banner .original-price');
    const discountedPrice = document.querySelector('.hero-banner .discounted-price');
    const orderButton = document.querySelector('.hero-banner .order-now-btn');
    const bannerImage = document.querySelector('.hero-banner .banner-image');

    // Update title
    if (bannerTitle) {
      const title = currentLang === 'en' 
        ? settings.heroBannerTitleEn || settings.heroBannerTitle || 'Delicious Burger'
        : settings.heroBannerTitle || 'Delicious Burger';
      bannerTitle.textContent = title;
      bannerTitle.setAttribute('data-i18n', 'bannerTitle');
    }

    // Update description
    if (bannerDescription) {
      const description = currentLang === 'en'
        ? settings.heroBannerDescriptionEn || settings.heroBannerDescription || 'Fresh ingredients, amazing taste'
        : settings.heroBannerDescription || 'مكونات طازجة، طعم رائع';
      bannerDescription.textContent = description;
      bannerDescription.setAttribute('data-i18n', 'bannerDescription');
    }

    // Get currency text
    const currencyText = typeof getCurrencyText === 'function' 
      ? getCurrencyText() 
      : (currentLang === 'en' ? 'EGP' : 'جنيه');

    // Update original price
    if (originalPrice && settings.heroBannerOriginalPrice) {
      originalPrice.textContent = `${settings.heroBannerOriginalPrice} ${currencyText}`;
    }

    // Update discounted price
    if (discountedPrice && settings.heroBannerDiscountedPrice) {
      discountedPrice.textContent = `${settings.heroBannerDiscountedPrice} ${currencyText}`;
    }

    // Update order button category
    if (orderButton && settings.heroBannerCategory) {
      orderButton.setAttribute('data-category', settings.heroBannerCategory);
    }

    // Update banner image if URL is provided
    if (bannerImage && settings.heroBannerImage) {
      bannerImage.style.backgroundImage = `url('${settings.heroBannerImage}')`;
      bannerImage.style.backgroundSize = 'cover';
      bannerImage.style.backgroundPosition = 'center';
    }

    // Show banner if it was hidden
    const heroBanner = document.querySelector('.hero-banner');
    if (heroBanner) {
      heroBanner.style.display = '';
    }

    console.log('Hero banner updated with settings');
  }

  // Listen for global settings loaded event
  window.addEventListener('global-settings-loaded', function(event) {
    if (event.detail && event.detail.loaded) {
      updateHeroBanner(event.detail);
    }
  });

  // Listen for global settings changed event (real-time updates)
  window.addEventListener('global-settings-changed', function(event) {
    if (event.detail) {
      updateHeroBanner(event.detail);
    }
  });

  // If settings are already loaded, update immediately
  if (window.globalSettings && window.globalSettings.loaded) {
    updateHeroBanner(window.globalSettings);
  }

  // Export update function
  window.updateHeroBanner = updateHeroBanner;
})();
