/**
 * Role Management System
 * Handles creating, editing, and assigning roles to users
 */

// DOM Elements
const manageRolesBtn = document.getElementById("manage-roles-btn");
const roleManagementModal = document.getElementById("role-management-modal");
const closeRoleModalBtn = document.getElementById("close-role-modal");
const rolesList = document.getElementById("roles-list");
const noRolesMessage = document.getElementById("no-roles-message");
const roleForm = document.getElementById("role-form");
const roleName = document.getElementById("role-name");
const roleNameEn = document.getElementById("role-name-en");
const roleColor = document.getElementById("role-color");
const roleIcon = document.getElementById("role-icon");
const roleId = document.getElementById("role-id");
const saveRoleBtn = document.getElementById("save-role");
const cancelRoleEditBtn = document.getElementById("cancel-role-edit");
const roleBadgePreview = document.getElementById("role-badge-preview");

// Assign Role Modal Elements
const assignRoleModal = document.getElementById("assign-role-modal");
const closeAssignRoleModal = document.getElementById("close-assign-role-modal");
const assignRoleUsername = document.getElementById("assign-role-username");
const assignRoleUserId = document.getElementById("assign-role-user-id");
const selectedRole = document.getElementById("selected-role");
const saveAssignRoleBtn = document.getElementById("save-assign-role");
const cancelAssignRoleBtn = document.getElementById("cancel-assign-role");

// Global variables
let roles = [];
let editingRoleId = null;

// Initialize role management when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the role management system
  initRoleManagement();

  // Check MongoDB connection status
  checkMongoDbConnection();
  
  // Run migration for existing roles (add color/icon if missing)
  setTimeout(() => {
    migrateRolesWithColorAndIcon();
  }, 1000);
});

/**
 * Initialize role management system
 */
function initRoleManagement() {
  // Load roles
  loadRoles();

  // Add event listeners
  if (manageRolesBtn) {
    manageRolesBtn.addEventListener("click", openRoleManagementModal);
  }

  if (closeRoleModalBtn) {
    closeRoleModalBtn.addEventListener("click", closeRoleManagementModal);
  }

  if (roleForm) {
    roleForm.addEventListener("submit", handleRoleSubmit);
  }

  if (cancelRoleEditBtn) {
    cancelRoleEditBtn.addEventListener("click", cancelRoleEdit);
  }

  // Assign role modal event listeners
  if (closeAssignRoleModal) {
    closeAssignRoleModal.addEventListener("click", closeAssignRoleModalFunc);
  }

  if (saveAssignRoleBtn) {
    saveAssignRoleBtn.addEventListener("click", handleAssignRole);
  }

  if (cancelAssignRoleBtn) {
    cancelAssignRoleBtn.addEventListener("click", closeAssignRoleModalFunc);
  }

  // When products-edit is checked, also check products-view
  document
    .getElementById("role-perm-products-edit")
    .addEventListener("change", function () {
      if (this.checked) {
        document.getElementById("role-perm-products-view").checked = true;
      }
    });

  // When vouchers-edit is checked, also check vouchers-view
  document
    .getElementById("role-perm-vouchers-edit")
    .addEventListener("change", function () {
      if (this.checked) {
        document.getElementById("role-perm-vouchers-view").checked = true;
      }
    });

  // Initialize role appearance controls
  initRoleAppearanceControls();
}

/**
 * Initialize role appearance controls (color picker, icon selector, preview)
 */
function initRoleAppearanceControls() {
  // Color picker and presets
  if (roleColor) {
    roleColor.addEventListener("input", updateRolePreview);
    
    // Color preset buttons
    document.querySelectorAll(".color-preset").forEach(preset => {
      preset.addEventListener("click", function() {
        const color = this.getAttribute("data-color");
        roleColor.value = color;
        updateActiveColorPreset(color);
        updateRolePreview();
      });
    });
  }

  // Icon selector and presets
  if (roleIcon) {
    roleIcon.addEventListener("input", updateRolePreview);
    
    // Icon preset buttons
    document.querySelectorAll(".icon-preset").forEach(preset => {
      preset.addEventListener("click", function() {
        const icon = this.getAttribute("data-icon");
        roleIcon.value = icon;
        updateActiveIconPreset(icon);
        updateRolePreview();
      });
    });
  }

  // Role name changes should update preview
  if (roleName) {
    roleName.addEventListener("input", updateRolePreview);
  }
  if (roleNameEn) {
    roleNameEn.addEventListener("input", updateRolePreview);
  }

  // Initialize preview
  updateRolePreview();
}

/**
 * Update active color preset visual state
 */
function updateActiveColorPreset(selectedColor) {
  document.querySelectorAll(".color-preset").forEach(preset => {
    preset.classList.remove("active");
    if (preset.getAttribute("data-color") === selectedColor) {
      preset.classList.add("active");
    }
  });
}

/**
 * Update active icon preset visual state
 */
function updateActiveIconPreset(selectedIcon) {
  document.querySelectorAll(".icon-preset").forEach(preset => {
    preset.classList.remove("active");
    if (preset.getAttribute("data-icon") === selectedIcon) {
      preset.classList.add("active");
    }
  });
}

/**
 * Update role badge preview
 */
function updateRolePreview() {
  if (!roleBadgePreview) return;

  const color = roleColor ? roleColor.value : "#42d158";
  const icon = roleIcon ? roleIcon.value : "fas fa-user";
  const name = roleName ? roleName.value : "";
  const nameEn = roleNameEn ? roleNameEn.value : "";
  
  // Get current language
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";
  
  // Determine display name
  let displayName = "";
  if (isEnglish && nameEn) {
    displayName = nameEn;
  } else if (name) {
    displayName = name;
  } else {
    displayName = isEnglish ? "Role Name" : "اسم الدور";
  }

  // Update preview badge
  const iconElement = roleBadgePreview.querySelector("i");
  const textElement = roleBadgePreview.querySelector(".role-preview-text");
  
  if (iconElement) {
    iconElement.className = icon;
  }
  
  if (textElement) {
    textElement.textContent = displayName;
  }

  // Apply color with proper contrast
  const rgb = hexToRgb(color);
  if (rgb) {
    roleBadgePreview.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
    roleBadgePreview.style.color = color;
    roleBadgePreview.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
  }
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Load roles from the API or create defaults if none exist
 */
async function loadRoles() {
  try {
    // Show loading state
    if (rolesList) {
      rolesList.innerHTML = `
        <div class="loading-roles">
          <i class="fas fa-spinner fa-spin"></i>
          <p>جاري تحميل الأدوار...</p>
        </div>
      `;
    }

    // Get roles from API
    const response = await apiService.getRoles();

    if (response.success && Array.isArray(response.data)) {
      roles = response.data;
    } else {
      console.warn("Failed to load roles from API, creating defaults");

      // Create default roles if none exist
      const defaultRoles = [
        {
          name: "مدير",
          nameEn: "Administrator",
          color: "#42d158",
          icon: "fas fa-crown",
          permissions: {
            adminPanel: true,
            cashier: true,
            kitchen: true,
            stats: true,
            productsView: true,
            productsEdit: true,
            vouchersView: true,
            vouchersEdit: true,
            reservations: true,
            tax: true,
            points: true,
            accounts: true,
            qr: true,
          },
        },
        {
          name: "كاشير",
          nameEn: "Cashier",
          color: "#5b7cff",
          icon: "fas fa-cash-register",
          permissions: {
            adminPanel: false,
            cashier: true,
            kitchen: false,
            stats: false,
            productsView: true,
            productsEdit: false,
            vouchersView: true,
            vouchersEdit: false,
            reservations: false,
            tax: false,
            points: false,
            accounts: false,
            qr: false,
          },
        },
      ];

      // Create default roles in the database
      for (const role of defaultRoles) {
        await apiService.createRole(role);
      }

      // Fetch the created roles
      const retryResponse = await apiService.getRoles();
      if (retryResponse.success && Array.isArray(retryResponse.data)) {
        roles = retryResponse.data;
      } else {
        roles = [];
        showAdminNotification(getTranslation("failedToCreateDefaultRoles"), "error");
      }
    }

    renderRoles();
  } catch (error) {
    console.error("Error loading roles:", error);
    showAdminNotification(getTranslation("errorLoadingRoles"), "error");

    // Clear loading state
    if (rolesList) {
      rolesList.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>حدث خطأ أثناء تحميل الأدوار</p>
        </div>
      `;
    }
  }
}

/**
 * Render roles in the role management modal
 */
function renderRoles() {
  if (!rolesList) return;

  // Clear current roles list
  rolesList.innerHTML = "";

  if (roles.length === 0) {
    // Show no roles message
    if (noRolesMessage) {
      noRolesMessage.style.display = "flex";
    }
    return;
  }

  // Hide no roles message
  if (noRolesMessage) {
    noRolesMessage.style.display = "none";
  }

  // Render each role
  roles.forEach((role) => {
    // Get role ID (handle both MongoDB _id and local id)
    const roleId = role._id || role.id;

    // Count enabled permissions
    const permissionCount = Object.values(role.permissions || {}).filter(
      Boolean
    ).length;

    const roleCard = document.createElement("div");
    roleCard.className = "role-card";
    roleCard.dataset.roleId = roleId;

    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const permissionsText = currentLang === "ar" ? "صلاحيات" : "permissions";

    roleCard.innerHTML = `
      <div class="role-info">
        <div class="role-name-container">
          <span class="role-name">${role.name}</span>
          ${
            role.nameEn
              ? `<span class="role-name-en">(${role.nameEn})</span>`
              : ""
          }
        </div>
        <span class="role-permissions-count" data-i18n="permissionsCount" data-i18n-en="${permissionCount} permissions">
          ${
            currentLang === "ar"
              ? `${permissionCount} صلاحيات`
              : `${permissionCount} permissions`
          }
        </span>
      </div>
      <div class="role-actions">
        <button type="button" class="edit-role-btn" title="${
          currentLang === "ar" ? "تعديل" : "Edit"
        }" data-i18n-title="edit" data-i18n-en-title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button type="button" class="delete-role-btn" title="${
          currentLang === "ar" ? "حذف" : "Delete"
        }" data-i18n-title="delete" data-i18n-en-title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    // Add event listeners to buttons
    const editBtn = roleCard.querySelector(".edit-role-btn");
    const deleteBtn = roleCard.querySelector(".delete-role-btn");

    editBtn.addEventListener("click", () => editRole(roleId));
    deleteBtn.addEventListener("click", () => deleteRole(roleId));

    rolesList.appendChild(roleCard);
  });

  // Also update the role dropdown in the assign role modal
  updateRolesDropdown();
}

/**
 * Update the roles dropdown in the assign role modal
 */
function updateRolesDropdown() {
  if (!selectedRole) return;

  // Clear existing options
  selectedRole.innerHTML = "";

  // Get current language
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";

  // Add each role as an option
  roles.forEach((role) => {
    const option = document.createElement("option");
    option.value = role._id || role.id;
    // Use English name if available and language is English, otherwise use Arabic name
    option.textContent = isEnglish && role.nameEn ? role.nameEn : role.name;
    selectedRole.appendChild(option);
  });
}

/**
 * Save roles to the API
 * @deprecated Use direct API calls instead
 */
async function saveRoles() {
  console.warn("saveRoles is deprecated - use direct API calls instead");
}

/**
 * Open the role management modal
 */
function openRoleManagementModal() {
  if (roleManagementModal) {
    roleManagementModal.classList.add("show");
    renderRoles();
  }
}

/**
 * Close the role management modal
 */
function closeRoleManagementModal() {
  if (roleManagementModal) {
    roleManagementModal.classList.remove("show");
    resetRoleForm();
  }
}

/**
 * Handle role form submission
 * @param {Event} e - Form submit event
 */
async function handleRoleSubmit(e) {
  e.preventDefault();

  // Get form data
  const name = roleName.value.trim();
  const nameEn = roleNameEn.value.trim();
  const color = roleColor ? roleColor.value : "#42d158";
  const icon = roleIcon ? roleIcon.value : "fas fa-user";
  const id = roleId.value;

  if (!name) {
    showAdminNotification(getTranslation("enterRoleName"), "error");
    return;
  }

  // Collect permissions
  const permissions = {
    adminPanel: document.getElementById("role-perm-admin-panel").checked,
    cashier: document.getElementById("role-perm-cashier").checked,
    stats: document.getElementById("role-perm-stats").checked,
    productsView: document.getElementById("role-perm-products-view").checked,
    productsEdit: document.getElementById("role-perm-products-edit").checked,
    vouchersView: document.getElementById("role-perm-vouchers-view").checked,
    vouchersEdit: document.getElementById("role-perm-vouchers-edit").checked,
    reservations: document.getElementById("role-perm-reservations").checked,
    tax: document.getElementById("role-perm-tax").checked,
    points: document.getElementById("role-perm-points").checked,
    accounts: document.getElementById("role-perm-accounts").checked,
    qr: document.getElementById("role-perm-qr").checked,
  };

  // Show loading state
  saveRoleBtn.disabled = true;
  saveRoleBtn.classList.add("loading");

  // Store original content to restore later
  const originalContent = saveRoleBtn.innerHTML;

  try {
    let response;

    if (editingRoleId) {
      // Update existing role
      response = await apiService.updateRole(editingRoleId, {
        name,
        nameEn,
        color,
        icon,
        permissions,
      });

      if (response.success) {
        showAdminNotification(getTranslation("roleUpdatedSuccess").replace("{name}", name), "success");
      } else {
        throw new Error(response.message || "فشل تحديث الدور");
      }
    } else {
      // Create new role
      response = await apiService.createRole({ name, nameEn, color, icon, permissions });

      if (response.success) {
        showAdminNotification(getTranslation("roleCreatedSuccess").replace("{name}", name), "success");
      } else {
        throw new Error(response.message || "فشل إنشاء الدور");
      }
    }

    // Show success animation
    saveRoleBtn.classList.remove("loading");
    saveRoleBtn.classList.add("success");

    // Reset button after animation completes
    setTimeout(() => {
      saveRoleBtn.classList.remove("success");
      saveRoleBtn.disabled = false;
      saveRoleBtn.innerHTML = originalContent;
    }, 1000);

    // Reset form and reload roles
    resetRoleForm();
    await loadRoles();
    
    // Refresh customer accounts list to update role badges
    if (typeof loadCustomerAccounts === "function") {
      loadCustomerAccounts();
    } else if (typeof loadDynamicRoleBadges === "function") {
      // Alternative: just refresh the role badges without reloading entire table
      const currentLang = localStorage.getItem("admin-language") || "ar";
      loadDynamicRoleBadges(currentLang);
    }
    
    // Show additional success message about badge updates
    setTimeout(() => {
      showAdminNotification(getTranslation("roleBadgesUpdated"), "success");
    }, 500);
  } catch (error) {
    console.error("Error saving role:", error);
    showAdminNotification(error.message || getTranslation("errorSavingRole"), "error");

    // Reset button state immediately on error
    saveRoleBtn.disabled = false;
    saveRoleBtn.classList.remove("loading");
    saveRoleBtn.innerHTML = originalContent;
  }
}

/**
 * Reset the role form
 */
function resetRoleForm() {
  if (roleForm) {
    roleForm.reset();
    roleId.value = "";
    editingRoleId = null;

    // Reset color and icon to defaults
    if (roleColor) {
      roleColor.value = "#42d158";
    }
    if (roleIcon) {
      roleIcon.value = "fas fa-user";
    }

    // Reset active states
    updateActiveColorPreset("#42d158");
    updateActiveIconPreset("fas fa-user");

    // Hide cancel button
    if (cancelRoleEditBtn) {
      cancelRoleEditBtn.style.display = "none";
    }

    // Update button text
    if (saveRoleBtn) {
      saveRoleBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الدور';
    }

    // Update preview
    updateRolePreview();
  }
}

/**
 * Cancel role editing
 */
function cancelRoleEdit() {
  resetRoleForm();
}

/**
 * Edit a role
 * @param {string} id - Role ID to edit
 */
function editRole(id) {
  // Search using both properties and with correct string comparison
  const role = roles.find(
    (r) =>
      (r._id && r._id.toString() === id.toString()) ||
      (r.id && r.id.toString() === id.toString())
  );

  if (!role) {
    console.error(`Role with ID ${id} not found in roles array:`, roles);
    showAdminNotification(getTranslation("roleNotFound"), "error");
    return;
  }

  // Set form fields
  roleName.value = role.name;
  roleNameEn.value = role.nameEn || "";
  roleId.value = id;
  editingRoleId = id;

  // Set color and icon
  if (roleColor) {
    roleColor.value = role.color || "#42d158";
    updateActiveColorPreset(role.color || "#42d158");
  }
  if (roleIcon) {
    roleIcon.value = role.icon || "fas fa-user";
    updateActiveIconPreset(role.icon || "fas fa-user");
  }

  // Set permissions
  document.getElementById("role-perm-admin-panel").checked =
    role.permissions.adminPanel || false;
  document.getElementById("role-perm-cashier").checked =
    role.permissions.cashier || false;
  document.getElementById("role-perm-stats").checked =
    role.permissions.stats || false;
  document.getElementById("role-perm-products-view").checked =
    role.permissions.productsView || false;
  document.getElementById("role-perm-products-edit").checked =
    role.permissions.productsEdit || false;
  document.getElementById("role-perm-vouchers-view").checked =
    role.permissions.vouchersView || false;
  document.getElementById("role-perm-vouchers-edit").checked =
    role.permissions.vouchersEdit || false;
  document.getElementById("role-perm-reservations").checked =
    role.permissions.reservations || false;
  document.getElementById("role-perm-tax").checked =
    role.permissions.tax || false;
  document.getElementById("role-perm-points").checked =
    role.permissions.points || false;
  document.getElementById("role-perm-accounts").checked =
    role.permissions.accounts || false;
  document.getElementById("role-perm-qr").checked =
    role.permissions.qr || false;

  // Show cancel button
  if (cancelRoleEditBtn) {
    cancelRoleEditBtn.style.display = "block";
  }

  // Update button text
  if (saveRoleBtn) {
    saveRoleBtn.innerHTML = '<i class="fas fa-save"></i> تحديث الدور';
  }

  // Update preview
  updateRolePreview();

  // Scroll to form
  if (roleForm) {
    roleForm.scrollIntoView({ behavior: "smooth" });
  }
}

/**
 * Delete a role
 * @param {string} id - Role ID to delete
 */
async function deleteRole(id) {
  if (!confirm(getTranslation("confirmDeleteRole"))) return;

  // Find role with safer comparison
  const roleIndex = roles.findIndex(
    (r) =>
      (r._id && r._id.toString() === id.toString()) ||
      (r.id && r.id.toString() === id.toString())
  );

  if (roleIndex === -1) {
    console.error(`Role with ID ${id} not found in roles array:`, roles);
    showAdminNotification(getTranslation("roleNotFound"), "error");
    return;
  }

  const roleName = roles[roleIndex].name;

  try {
    // Show loading state on the role card
    const roleCard = document.querySelector(`.role-card[data-role-id="${id}"]`);
    if (roleCard) {
      roleCard.classList.add("loading");
      roleCard.innerHTML = '<div class="loading-spinner"></div>';
    }

    // Delete role from API/localStorage
    const response = await apiService.deleteRole(id);

    if (!response.success) {
      throw new Error(response.message || "فشل في حذف الدور");
    }

    // Show success notification
    showAdminNotification(getTranslation("roleDeletedSuccess").replace("{name}", roleName), "success");

    // Reload roles to update the UI
    await loadRoles();
  } catch (error) {
    console.error("Error deleting role:", error);
    showAdminNotification(error.message || getTranslation("errorDeletingRole"), "error");

    // Remove loading state on error
    const roleCard = document.querySelector(`.role-card[data-role-id="${id}"]`);
    if (roleCard) {
      roleCard.classList.remove("loading");
      // Re-render the role card
      await loadRoles();
    }
  }
}

/**
 * Open the assign role modal for a specific user
 * @param {string} userId - ID of the user to assign role to
 * @param {string} userName - Name of the user to display
 */
async function openAssignRoleModal(userId, userName) {
  if (!assignRoleModal) return;

  // Show loading state
  assignRoleModal.classList.add("show");
  assignRoleUsername.textContent = userName;
  assignRoleUserId.value = userId;
  selectedRole.disabled = true;
  saveAssignRoleBtn.disabled = true;

  // Add loading message
  selectedRole.innerHTML = '<option value="">جاري التحميل...</option>';

  try {
    // Get current user role if any
    const roleResponse = await apiService.getUserRole(userId);

    // Update roles dropdown
    updateRolesDropdown();

    // Set selected role if user has one
    if (roleResponse.success && roleResponse.data && roleResponse.data.roleId) {
      selectedRole.value = roleResponse.data.roleId;
    }
  } catch (error) {
    console.error("Error loading user role:", error);
    selectedRole.innerHTML = '<option value="">حدث خطأ أثناء التحميل</option>';
  } finally {
    selectedRole.disabled = false;
    saveAssignRoleBtn.disabled = false;
  }
}

/**
 * Close the assign role modal
 */
function closeAssignRoleModalFunc() {
  if (assignRoleModal) {
    assignRoleModal.classList.remove("show");
  }
}

/**
 * Handle assigning a role to a user
 */
async function handleAssignRole() {
  const userId = assignRoleUserId.value;
  const roleId = selectedRole.value;

  if (!userId || !roleId) {
    showAdminNotification(getTranslation("pleaseSelectRole"), "error");
    return;
  }

  try {
    // Show loading state
    saveAssignRoleBtn.disabled = true;
    saveAssignRoleBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    // Check if MongoDB API is available
    const isMongoDbAvailable = await apiService.isMongoDbApiAvailable("roles");
    let storageType = isMongoDbAvailable ? "قاعدة البيانات" : "التخزين المحلي";

    // Get role info for notification
    const role = roles.find((r) => r._id === roleId || r.id === roleId);

    if (!role) {
      showAdminNotification(getTranslation("roleNotFound"), "error");
      return;
    }

    // Call API to assign role
    const response = await apiService.assignRoleToUser(userId, roleId);

    if (response.success) {
      // Show success notification with storage type
      showAdminNotification(
        `تم تعيين دور "${role.name}" للمستخدم بنجاح (${storageType})`,
        "success"
      );

      // Close modal
      closeAssignRoleModalFunc();

      // Refresh customer accounts list if it exists
      if (typeof loadCustomerAccounts === "function") {
        loadCustomerAccounts();
      }
    } else {
      throw new Error(response.message || "فشل في تعيين الدور");
    }
  } catch (error) {
    console.error("Error assigning role:", error);
    showAdminNotification(
      error.message || "حدث خطأ أثناء تعيين الدور",
      "error"
    );
  } finally {
    // Reset button state
    saveAssignRoleBtn.disabled = false;
    saveAssignRoleBtn.innerHTML = '<i class="fas fa-save"></i> تعيين الدور';
  }
}

/**
 * Generate a unique ID for new roles
 * @returns {string} - Unique ID
 */
function generateUniqueId() {
  return "role_" + Math.random().toString(36).substr(2, 9);
}

/**
 * Show notification to the admin
 * Using existing function from admin.js if available, or creating a simple one
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds to show the notification
 */
function showAdminNotification(message, type = "info", duration) {
  // Try to use existing function from admin.js
  if (
    typeof window.showAdminNotification === "function" &&
    window.showAdminNotification !== showAdminNotification
  ) {
    // Check if the original function supports duration
    if (duration) {
      try {
        return window.showAdminNotification(message, type, duration);
      } catch (e) {
        // If error, try without duration
        return window.showAdminNotification(message, type);
      }
    } else {
      return window.showAdminNotification(message, type);
    }
  } else if (typeof window.showNotification === "function") {
    // Try to use showNotification with duration if available
    if (duration) {
      try {
        return window.showNotification(message, type, duration);
      } catch (e) {
        // If error, try without duration
        return window.showNotification(message, type);
      }
    } else {
      return window.showNotification(message, type);
    }
  } else {
    // Create a simple notification function
    console.log(`[${type}] ${message}`);

    // Create a custom notification if needed
    const notificationContainer =
      document.getElementById("notification-container") ||
      document.querySelector(".notification-container");

    if (notificationContainer) {
      const notification = document.createElement("div");
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="notification-content">
          <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close">&times;</button>
      `;

      notificationContainer.appendChild(notification);

      // Add close button functionality
      const closeBtn = notification.querySelector(".notification-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          notification.remove();
        });
      }

      // Auto-remove after duration or default 5 seconds
      setTimeout(() => {
        notification.remove();
      }, duration || 5000);

      return;
    }

    // Fallback to alert if no notification container
    alert(message);
  }
}

/**
 * Migrate existing roles to include color and icon fields
 */
async function migrateRolesWithColorAndIcon() {
  try {
    console.log("Checking for roles that need color/icon migration...");
    
    // Get all roles
    const response = await apiService.getRoles();
    if (!response.success || !Array.isArray(response.data)) {
      console.log("No roles found or error fetching roles");
      return;
    }

    const rolesToUpdate = [];
    
    // Check which roles need migration
    response.data.forEach(role => {
      if (!role.color || !role.icon) {
        const defaultColors = {
          "مدير": "#42d158",
          "Administrator": "#42d158", 
          "كاشير": "#5b7cff",
          "Cashier": "#5b7cff",
          "محرر": "#ff9500",
          "Editor": "#ff9500"
        };
        
        const defaultIcons = {
          "مدير": "fas fa-crown",
          "Administrator": "fas fa-crown",
          "كاشير": "fas fa-cash-register", 
          "Cashier": "fas fa-cash-register",
          "محرر": "fas fa-edit",
          "Editor": "fas fa-edit"
        };

        const updateData = {
          ...role,
          color: role.color || defaultColors[role.name] || defaultColors[role.nameEn] || "#6c757d",
          icon: role.icon || defaultIcons[role.name] || defaultIcons[role.nameEn] || "fas fa-user"
        };
        
        rolesToUpdate.push({ id: role._id || role.id, data: updateData });
      }
    });

    // Update roles that need migration
    if (rolesToUpdate.length > 0) {
      console.log(`Migrating ${rolesToUpdate.length} roles with color and icon data...`);
      
      for (const roleUpdate of rolesToUpdate) {
        try {
          await apiService.updateRole(roleUpdate.id, roleUpdate.data);
          console.log(`Updated role: ${roleUpdate.data.name}`);
        } catch (error) {
          console.error(`Failed to update role ${roleUpdate.data.name}:`, error);
        }
      }
      
      showAdminNotification(getTranslation("rolesUpdatedWithDefaults").replace("{count}", rolesToUpdate.length), "success");
      
      // Reload roles and refresh badges
      await loadRoles();
      if (typeof loadCustomerAccounts === "function") {
        loadCustomerAccounts();
      }
    } else {
      console.log("All roles already have color and icon data");
    }
    
  } catch (error) {
    console.error("Error during role migration:", error);
    showAdminNotification(getTranslation("errorUpdatingRoles"), "error");
  }
}

/**
 * Check MongoDB connection status and display a notification
 */
async function checkMongoDbConnection() {
  try {
    const isAvailable = await apiService.isMongoDbApiAvailable("roles");

    if (!isAvailable) {
      console.log("MongoDB API is not available, using localStorage");
      // Only show notification if user tries to perform an action
      // This avoids showing warnings on every page load when backend is intentionally offline
    }
  } catch (error) {
    console.log("Error checking MongoDB connection:", error.message);
  }
}
