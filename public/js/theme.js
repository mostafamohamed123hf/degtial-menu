// Theme management across the application

// Create a global namespace for theme functions
window.themeJs = {};

// Track if theme has been initialized to avoid duplicate warnings
let themeInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Initialize immediately and on DOM content loaded
(function () {
  // Try to apply theme immediately to body to prevent flash
  applyThemeToBody();
  
  // Try to initialize toggle after a brief moment
  if (document.readyState === 'loading') {
    // DOM is still loading, wait for it
    document.addEventListener("DOMContentLoaded", function () {
      applyThemeToBody(); // Apply again when DOM is ready
      initThemeToggle();
      ensureBackwardsCompatibility();
    });
  } else {
    // DOM is already loaded
    applyThemeToBody(); // Ensure theme is applied
    setTimeout(initThemeToggle, 100);
  }
})();

// Apply theme to body immediately without needing the toggle switch
function applyThemeToBody() {
  const currentTheme = localStorage.getItem("theme") || "dark";
  const body = document.body;
  const isRegisterPage =
    (window.location && window.location.href.includes("register.html")) ||
    (window.location && window.location.pathname.includes("/pages/register"));
  const disableToggleAttr =
    body &&
    (body.getAttribute("data-disable-theme-toggle") === "true" ||
      (body.dataset && body.dataset.disableThemeToggle === "true"));
  const forceDark = disableToggleAttr || isRegisterPage;
  if (forceDark) {
    localStorage.setItem("theme", "dark");
  }
  
  // If body doesn't exist yet, we can't apply theme
  if (!body) {
    return;
  }
  
  if (currentTheme === "light") {
    body.classList.add("light-mode");
    body.classList.remove("dark-mode");
  } else {
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");
  }
}

function initThemeToggle() {
  // If already initialized, don't try again
  if (themeInitialized) {
    return;
  }
  
  initAttempts++;
  
  // Look for the switch by ID or by data attribute or by class
  const toggleSwitch =
    document.getElementById("switch") ||
    document.querySelector('[data-theme-switch="true"]') ||
    document.querySelector(".theme-toggle");
  const body = document.body;
  const isRegisterPage =
    (window.location && window.location.href.includes("register.html")) ||
    (window.location && window.location.pathname.includes("/pages/register"));
  const disableToggleAttr =
    body &&
    (body.getAttribute("data-disable-theme-toggle") === "true" ||
      (body.dataset && body.dataset.disableThemeToggle === "true"));
  if (disableToggleAttr || isRegisterPage) {
    themeInitialized = true;
    applyThemeToBody();
    return;
  }

  if (!toggleSwitch) {
    if (initAttempts >= MAX_INIT_ATTEMPTS) {
      return;
    } else {
      setTimeout(initThemeToggle, 300);
    }
    return;
  }
  
  // Mark as initialized
  themeInitialized = true;

  // Check for saved theme preference
  const currentTheme = localStorage.getItem("theme") || "dark";

  // Apply the saved theme on load
  if (currentTheme === "light") {
    body.classList.add("light-mode");
    body.classList.remove("dark-mode");
    toggleSwitch.checked = false;
  } else {
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");
    toggleSwitch.checked = true;
  }

  // Clear any existing event listeners (in case this function runs multiple times)
  toggleSwitch.removeEventListener("change", themeToggleHandler);

  // Toggle theme when switch is clicked
  toggleSwitch.addEventListener("change", themeToggleHandler);

  console.log("Theme toggle initialized with theme:", currentTheme);
}

// Separate handler function to avoid duplicate event listeners
function themeToggleHandler() {
  const body = document.body;

  if (this.checked) {
    // Dark mode
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
    localStorage.setItem("darkMode", "true"); // For backwards compatibility
  } else {
    // Light mode
    body.classList.add("light-mode");
    body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
    localStorage.setItem("darkMode", "false"); // For backwards compatibility
  }

  // Dispatch an event that other components can listen for
  document.dispatchEvent(
    new CustomEvent("themeChanged", {
      detail: { theme: this.checked ? "dark" : "light" },
    })
  );
}

// For backwards compatibility with code that might be using darkMode key
function ensureBackwardsCompatibility() {
  // If only darkMode key exists but theme doesn't, set theme based on darkMode
  if (localStorage.getItem("darkMode") && !localStorage.getItem("theme")) {
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }
  // If only theme exists, set darkMode
  else if (localStorage.getItem("theme") && !localStorage.getItem("darkMode")) {
    const theme = localStorage.getItem("theme");
    localStorage.setItem("darkMode", theme === "dark" ? "true" : "false");
  }
}

// Make functions available globally
window.themeJs.initThemeToggle = initThemeToggle;
window.themeJs.applyThemeToBody = applyThemeToBody;
window.themeJs.ensureBackwardsCompatibility = ensureBackwardsCompatibility;
