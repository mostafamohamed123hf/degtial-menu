/**
 * User permissions handling for the Digital Menu
 * This script checks user permissions after login and shows/hides relevant UI elements
 */

// Function to check user permissions and update UI accordingly
function checkUserPermissions() {
  console.log("Checking user permissions...");

  // Check if the user is logged in
  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    console.log("User is logged in, checking permissions");

    // Get user permissions
    let userPermissions = null;

    if (typeof getUserPermissions === "function") {
      userPermissions = getUserPermissions();
    } else {
      // Fallback if the function is not available
      try {
        const permissionsJson = localStorage.getItem("userPermissions");
        if (permissionsJson) {
          userPermissions = JSON.parse(permissionsJson);
        }
      } catch (e) {
        console.error("Error parsing permissions:", e);
      }
    }

    // Update UI based on permissions
    if (userPermissions) {
      console.log("User permissions found:", userPermissions);

      // Check for admin panel access
      const adminOnlyElements = document.querySelectorAll(".admin-only-item");
      if (userPermissions.adminPanel === true) {
        adminOnlyElements.forEach((el) => (el.style.display = "block"));
      } else {
        adminOnlyElements.forEach((el) => (el.style.display = "none"));
      }

      // Check for cashier access
      const cashierOnlyElements =
        document.querySelectorAll(".cashier-only-item");
      if (userPermissions.cashier === true) {
        cashierOnlyElements.forEach((el) => (el.style.display = "block"));
      } else {
        cashierOnlyElements.forEach((el) => (el.style.display = "none"));
      }

      // Handle other permission-based elements
      document.querySelectorAll("[data-permission]").forEach((el) => {
        const requiredPermission = el.getAttribute("data-permission");
        if (userPermissions[requiredPermission] === true) {
          el.style.display = "block";
        } else {
          el.style.display = "none";
        }
      });

      console.log("User permissions applied to UI");
    }
    // If no permissions found but user is logged in, fetch current user data
    else {
      console.log("No permissions found, fetching current user data");

      if (typeof getCurrentUser === "function") {
        getCurrentUser()
          .then((userData) => {
            if (userData && userData.permissions) {
              console.log(
                "Retrieved user data with permissions:",
                userData.permissions
              );

              // Store the permissions
              if (typeof setUserPermissions === "function") {
                setUserPermissions(userData.permissions);
              } else {
                localStorage.setItem(
                  "userPermissions",
                  JSON.stringify(userData.permissions)
                );
              }

              // Rerun this function to apply the permissions
              checkUserPermissions();
            }
          })
          .catch((error) => {
            console.error("Error fetching user data:", error);
          });
      }
    }
  } else {
    console.log("User is not logged in");

    // Hide all permission-based elements when user not logged in
    const cashierOnlyElements = document.querySelectorAll(".cashier-only-item");
    cashierOnlyElements.forEach((el) => (el.style.display = "none"));

    const adminOnlyElements = document.querySelectorAll(".admin-only-item");
    adminOnlyElements.forEach((el) => (el.style.display = "none"));

    document.querySelectorAll("[data-permission]").forEach((el) => {
      el.style.display = "none";
    });
  }
}

// Run permission check when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  checkUserPermissions();

  // Listen for auth state changes
  window.addEventListener("auth_state_changed", function () {
    checkUserPermissions();
  });

  // Listen for storage events (in case permissions change in another tab)
  window.addEventListener("storage", function (e) {
    if (e.key === "token" || e.key === "userPermissions") {
      checkUserPermissions();
    }
  });
});
