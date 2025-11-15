/**
 * Functions to manage the loading spinner
 */

/**
 * Shows the loading spinner
 */
function showLoadingSpinner() {
  const loadingSpinner = document.getElementById("admin-loading");
  if (loadingSpinner) {
    loadingSpinner.style.display = "flex";
  }
}

/**
 * Hides the loading spinner
 */
function hideLoadingSpinner() {
  const loadingSpinner = document.getElementById("admin-loading");
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
}

// Hide loading spinner when page is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Hide the loading spinner after a short delay to ensure the page has rendered
  setTimeout(() => {
    hideLoadingSpinner();
  }, 500);
});
