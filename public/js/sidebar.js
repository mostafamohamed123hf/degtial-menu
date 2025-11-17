// Sidebar functionality for profile page

document.addEventListener("DOMContentLoaded", function () {
  // Initialize sidebar
  initSidebar();

  // Setup auth-dependent UI elements
  updateUIBasedOnAuth();

  // Setup logout button
  setupLogoutButton();

  // Setup section navigation
  setupSectionNavigation();

  // Listen for language changes
  document.addEventListener("language_changed", function (e) {
    // If i18n is available, it will automatically update translations
    // based on data-i18n attributes

    // Re-initialize sidebar to update its position based on new language direction
    initSidebar();
  });

  // Note: Dark mode toggle is now handled by theme.js
});

// Initialize sidebar functionality
function initSidebar() {
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarClose = document.getElementById("sidebar-close");
  const sidebar = document.getElementById("sidebar-menu");
  const overlay = document.getElementById("sidebar-overlay");

  if (!sidebarToggle || !sidebar) return;

  // Toggle sidebar when menu icon is clicked
  sidebarToggle.addEventListener("click", function (e) {
    e.preventDefault();
    sidebar.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  // Close sidebar when close button is clicked
  if (sidebarClose) {
    sidebarClose.addEventListener("click", function (e) {
      e.preventDefault();
      closeSidebar();
    });
  }

  // Close sidebar when overlay is clicked
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // Add escape key support to close sidebar
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sidebar.classList.contains("active")) {
      closeSidebar();
    }
  });

  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// Update UI based on authentication state
function updateUIBasedOnAuth() {
  const isAuthenticated = isLoggedIn();
  const authDependentElements = document.querySelectorAll(".auth-dependent");
  const nonAuthDependentElements = document.querySelectorAll(
    ".non-auth-dependent"
  );

  // Show/hide elements based on auth state
  if (isAuthenticated) {
    authDependentElements.forEach((el) => (el.style.display = "block"));
    nonAuthDependentElements.forEach((el) => (el.style.display = "none"));

    // Check user role for admin/cashier access
    const userRole = getUserRole();
    if (userRole === "admin") {
      document
        .querySelectorAll(".admin-only-item")
        .forEach((el) => (el.style.display = "block"));
    }
    if (userRole === "cashier" || userRole === "admin") {
      document
        .querySelectorAll(".cashier-only-item")
        .forEach((el) => (el.style.display = "block"));
    }
  } else {
    authDependentElements.forEach((el) => (el.style.display = "none"));
    nonAuthDependentElements.forEach((el) => (el.style.display = "block"));
    document
      .querySelectorAll(".admin-only-item, .cashier-only-item")
      .forEach((el) => (el.style.display = "none"));
  }
}

// Setup logout button
function setupLogoutButton() {
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
      window.location.href = "index.html";
    });
  }
}

// Setup section navigation from profile page to index page
function setupSectionNavigation() {
  // Handle previous orders section link
  const previousOrdersLink = document.querySelector(
    ".previous-orders-section-link"
  );
  if (previousOrdersLink) {
    previousOrdersLink.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToIndexSection("previousOrders");
    });
  }

  // Handle offers section link
  const offersLink = document.querySelector(".offers-section-link");
  if (offersLink) {
    offersLink.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToIndexSection("offers");
    });
  }

  // Handle reservation section link
  const reservationLink = document.querySelector(".reservation-section-link");
  if (reservationLink) {
    reservationLink.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToIndexSection("reservation");
    });
  }

  // Handle menu section link
  const menuLink = document.querySelector(".menu-section-link");
  if (menuLink) {
    menuLink.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToIndexSection("menu");
    });
  }
}

// Navigate to specific section in index page
function navigateToIndexSection(sectionName) {
  // Save the target section to localStorage
  localStorage.setItem("activeSection", sectionName);

  // Navigate to index page
  window.location.href = "index.html";
}
