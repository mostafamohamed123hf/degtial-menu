// Admin Reservations Management

// Import ApiService for audit logging
// Instead of redeclaring ApiService, we'll use the global instance
const apiServiceInstance = window.apiService || {
  // Fallback implementation if global apiService is not available
  logAuditAction: async function (
    action,
    resourceType,
    resourceId,
    previousState,
    newState,
    details
  ) {
    console.log("Audit logging:", {
      action,
      resourceType,
      resourceId,
      details,
    });
    // If ApiService is not available, we'll just log to console and not fail
    return { success: true };
  },
};

document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on the admin page with reservations section
  const reservationsSection = document.getElementById("reservations-section");
  if (!reservationsSection) return;

  // DOM Elements
  const reservationsList = document.getElementById("reservations-list");
  const noReservationsMessage = document.getElementById(
    "no-reservations-message"
  );

  const statusFilter = document.getElementById("reservation-status-filter");
  const dateFilter = document.getElementById("reservation-date-filter");
  const clearFiltersBtn = document.getElementById("clear-reservation-filters");

  // ID Card Modal Elements
  const idCardModal = document.getElementById("id-card-modal");
  const idCardImage = document.getElementById("id-card-image");
  const idCardLoader = document.getElementById("id-card-loader");
  const closeModalBtn = document.getElementById("close-id-card-modal");
  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const rotateLeftBtn = document.getElementById("rotate-left-btn");
  const rotateRightBtn = document.getElementById("rotate-right-btn");
  const resetViewBtn = document.getElementById("reset-view-btn");
  const downloadBtn = document.getElementById("download-id-card-btn");
  const verificationStatus = document.getElementById("id-verification-status");
  const verificationIndicator = document.querySelector(
    ".verification-indicator"
  );
  const approveIdBtn = document.getElementById("approve-id-btn");
  const rejectIdBtn = document.getElementById("reject-id-btn");
  const idOwnerName = document.getElementById("id-owner-name");
  const idUploadDate = document.getElementById("id-upload-date");
  const idFileSize = document.getElementById("id-file-size");

  // Image transformation variables
  let currentZoom = 1;
  let currentRotation = 0;
  const MAX_ZOOM = 3;
  const MIN_ZOOM = 0.5;
  const ZOOM_STEP = 0.2;
  const ROTATION_STEP = 90;

  // Current ID being viewed
  let currentIdData = null;

  const API_URL = "";

  // Load reservations on page load
  loadReservations();

  // Add event listeners for filters
  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
  }

  if (dateFilter) {
    dateFilter.addEventListener("change", applyFilters);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", clearFilters);
  }

  // Add ID card modal button listeners
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeIDCardModal);
  }

  // Add zoom and rotation button event listeners
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", zoomIn);
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", zoomOut);
  }

  if (rotateLeftBtn) {
    rotateLeftBtn.addEventListener("click", rotateLeft);
  }

  if (rotateRightBtn) {
    rotateRightBtn.addEventListener("click", rotateRight);
  }

  if (resetViewBtn) {
    resetViewBtn.addEventListener("click", resetImageView);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadImage);
  }

  // Add verification button listeners
  if (approveIdBtn) {
    approveIdBtn.addEventListener("click", async () => {
      await verifyIdCard("verified");
    });
  }

  if (rejectIdBtn) {
    rejectIdBtn.addEventListener("click", async () => {
      await verifyIdCard("rejected");
    });
  }

  // Close modal when clicking outside content
  document.addEventListener("click", function (e) {
    if (e.target === idCardModal) {
      closeIDCardModal();
    }
  });

  // Keyboard navigation for modal
  document.addEventListener("keydown", function (e) {
    if (!idCardModal || !idCardModal.classList.contains("active")) return;

    switch (e.key) {
      case "Escape": // Close modal with ESC key
        closeIDCardModal();
        break;
      case "+":
      case "=": // Zoom in
        zoomIn();
        break;
      case "-": // Zoom out
        zoomOut();
        break;
      case "ArrowLeft": // Rotate left
        rotateLeft();
        break;
      case "ArrowRight": // Rotate right
        rotateRight();
        break;
      case "r": // Reset view
        resetImageView();
        break;
    }
  });

  // Function to load reservations from API
  async function loadReservations() {
    try {
      if (statusFilter && !statusFilter.value) {
        statusFilter.value = "all";
      }
      const saved = localStorage.getItem("reservations");
      let list = [];
      if (saved) {
        try {
          list = JSON.parse(saved);
        } catch (_) {
          list = [];
        }
      }
      window.allReservations = Array.isArray(list) ? list : [];
      applyFilters();
    } catch (_) {
      window.allReservations = [];
      displayReservations([]);
    }
  }

  // Function to display reservations
  function displayReservations(reservations) {
    if (!reservationsList) return;

    if (!reservations || reservations.length === 0) {
      reservationsList.innerHTML = "";
      if (noReservationsMessage) {
        noReservationsMessage.style.display = "flex";
      }
      return;
    }

    // Hide no reservations message
    if (noReservationsMessage) {
      noReservationsMessage.style.display = "none";
    }

    // Clear previous reservations
    reservationsList.innerHTML = "";

    // Sort reservations by date and time
    reservations.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB || a.time.localeCompare(b.time);
    });

    // Count duplicate phone numbers for active reservations
    const phoneNumbers = {};
    reservations.forEach((reservation) => {
      if (
        reservation.status === "pending" ||
        reservation.status === "confirmed"
      ) {
        phoneNumbers[reservation.phone] =
          (phoneNumbers[reservation.phone] || 0) + 1;
      }
    });

    // Add each reservation to the table
    reservations.forEach((reservation) => {
      const row = document.createElement("tr");

      // Check if this phone number has multiple active reservations
      const hasDuplicatePhone = phoneNumbers[reservation.phone] > 1;

      // Add class if this is a duplicate phone number
      if (
        hasDuplicatePhone &&
        (reservation.status === "pending" || reservation.status === "confirmed")
      ) {
        row.classList.add("duplicate-reservation");
      }

      // Format date
      const reservationDate = new Date(reservation.date);

      // Get current language
      const currentLang = localStorage.getItem("admin-language") || "ar";

      // Format date based on language
      const formattedDate = reservationDate.toLocaleDateString(
        currentLang === "ar" ? "ar-EG" : "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      );

      // Default file size text based on language
      const defaultFileSize =
        currentLang === "ar" ? "21.46 كيلوبايت" : "21.46 KB";

      // Map status to Arabic or English based on current language
      const statusMap =
        currentLang === "ar"
          ? {
              pending: "قيد الانتظار",
              confirmed: "مؤكد",
              completed: "مكتمل",
              cancelled: "ملغي",
            }
          : {
              pending: "Pending",
              confirmed: "Confirmed",
              completed: "Completed",
              cancelled: "Cancelled",
            };

      // Create status class
      const statusClass = `status-${reservation.status}`;

      const viewIdText = currentLang === "en" ? "View ID" : "عرض الهوية";

      // Internationalized action button titles
      const confirmTitle =
        currentLang === "en" ? "Confirm Reservation" : "تأكيد الحجز";
      const completeTitle =
        currentLang === "en" ? "Complete Reservation" : "إكمال الحجز";
      const cancelTitle =
        currentLang === "en" ? "Cancel Reservation" : "إلغاء الحجز";
      const deleteTitle =
        currentLang === "en" ? "Delete Reservation" : "حذف الحجز";

      row.innerHTML = `
        <td>${reservation.name}</td>
        <td class="${hasDuplicatePhone ? "duplicate-phone" : ""}">${
        reservation.phone
      }</td>
        <td>${reservation.guests}</td>
        <td>${formattedDate}</td>
        <td>${reservation.time}</td>
        <td><span class="reservation-status ${statusClass}">${
        statusMap[reservation.status] || reservation.status
      }</span></td>
        <td>${reservation.notes || "-"}</td>
        <td>
          ${
            reservation.idCardPhoto
              ? `<button class="view-id-card-btn" 
                  data-photo="${reservation.idCardPhoto}" 
                  data-id="${reservation._id}" 
                  data-name="${reservation.name}" 
                  data-date="${formattedDate}" 
                  data-size="${reservation.idCardSize || defaultFileSize}" 
                  data-status="${
                    reservation.idVerification?.status || "pending"
                  }">
                  <i class="fas fa-id-card"></i> 
                  ${getIdVerificationBadge(reservation.idVerification?.status)}
                  <span data-i18n="viewIdCard" data-i18n-en="View ID">${viewIdText}</span>
                </button>`
              : "-"
          }
        </td>
        <td>
          <div class="reservation-actions">
            ${
              reservation.status === "pending"
                ? `
              <button class="reservation-action-btn action-confirm" data-id="${reservation._id}" data-action="confirm" title="${confirmTitle}">
                <i class="fas fa-check"></i>
              </button>`
                : ""
            }
            ${
              reservation.status !== "cancelled" &&
              reservation.status !== "completed"
                ? `
              <button class="reservation-action-btn action-complete" data-id="${reservation._id}" data-action="complete" title="${completeTitle}">
                <i class="fas fa-flag-checkered"></i>
              </button>`
                : ""
            }
            ${
              reservation.status !== "cancelled"
                ? `
              <button class="reservation-action-btn action-cancel" data-id="${reservation._id}" data-action="cancel" title="${cancelTitle}">
                <i class="fas fa-ban"></i>
              </button>`
                : ""
            }
            <button class="reservation-action-btn action-delete" data-id="${
              reservation._id
            }" data-action="delete" title="${deleteTitle}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;

      reservationsList.appendChild(row);
    });

    // Add a warning message if there are duplicate phone numbers
    const hasDuplicates = Object.values(phoneNumbers).some(
      (count) => count > 1
    );
    const warningContainer = document.querySelector(".reservations-filters");

    if (hasDuplicates && warningContainer) {
      // Remove any existing warning
      const existingWarning = document.querySelector(".warning-message");
      if (existingWarning) {
        existingWarning.remove();
      }

      // Get current language
      const currentLang = localStorage.getItem("admin-language") || "ar";
      const warningText =
        currentLang === "en"
          ? "Warning: There are phone numbers with multiple active reservations"
          : "تنبيه: يوجد أرقام هواتف لها أكثر من حجز نشط";

      // Add warning message
      const warningMessage = document.createElement("div");
      warningMessage.className = "warning-message";
      warningMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${warningText}`;
      warningContainer.prepend(warningMessage);
    }

    // Add event listeners to action buttons
    addActionListeners();

    // Add event listeners to ID card buttons
    addIdCardViewListeners();

    // Update language of view ID buttons on page load
    updateViewIdButtonsLanguage();
  }

  // Function to add event listeners to ID card view buttons
  function addIdCardViewListeners() {
    const viewIdCardBtns = document.querySelectorAll(".view-id-card-btn");

    viewIdCardBtns.forEach((button) => {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        const photoUrl = this.getAttribute("data-photo");
        const reservationId = this.getAttribute("data-id");
        const currentLang = localStorage.getItem("admin-language") || "ar";
        const unknownText = currentLang === "en" ? "Unknown" : "غير معروف";
        const reservationName = this.getAttribute("data-name") || unknownText;
        const uploadDate = this.getAttribute("data-date");
        const fileSize =
          this.getAttribute("data-size") ||
          (currentLang === "en" ? "Unknown" : "غير معروف");
        const verificationStatus =
          this.getAttribute("data-status") || "pending";

        if (photoUrl) {
          // Use the verification function
          showIDCardWithVerification(photoUrl, {
            reservationId: reservationId,
            userName: reservationName,
            uploadDate: uploadDate,
            fileSize: fileSize,
            status: verificationStatus,
          });
        }
      });
    });
  }

  // Function to add event listeners to action buttons
  function addActionListeners() {
    const actionButtons = document.querySelectorAll(".reservation-action-btn");

    actionButtons.forEach((button) => {
      button.addEventListener("click", handleReservationAction);
    });
  }

  // Function to handle reservation actions
  async function handleReservationAction(e) {
    const button = e.currentTarget;
    const reservationId = button.getAttribute("data-id");
    const action = button.getAttribute("data-action");

    if (!reservationId || !action) return;

    try {
      const reservation = window.allReservations.find((r) => String(r._id) === String(reservationId));
      if (!reservation) return;
      const originalContent = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      button.disabled = true;
      if (action === "delete") {
        if (!confirm(getTranslation("confirmDeleteReservation"))) {
          button.innerHTML = originalContent;
          button.disabled = false;
          return;
        }
        window.allReservations = window.allReservations.filter((r) => String(r._id) !== String(reservationId));
      } else if (action === "confirm") {
        reservation.status = "confirmed";
      } else if (action === "complete") {
        reservation.status = "completed";
      } else if (action === "cancel") {
        reservation.status = "cancelled";
      }
      localStorage.setItem("reservations", JSON.stringify(window.allReservations));
      const message = getActionMessage(action);
      showError(message, "success");
      displayReservations(window.allReservations);
    } catch (error) {
      showError(error.message || "حدث خطأ أثناء تنفيذ الإجراء");
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-check"></i>';
    }
  }

  // Function to get success message based on action
  function getActionMessage(action) {
    switch (action) {
      case "confirm":
        return "تم تأكيد الحجز بنجاح";
      case "complete":
        return "تم إكمال الحجز بنجاح";
      case "cancel":
        return "تم إلغاء الحجز بنجاح";
      case "delete":
        return "تم حذف الحجز بنجاح";
      default:
        return "تم تنفيذ الإجراء بنجاح";
    }
  }

  // Function to apply filters
  function applyFilters() {
    const statusValue = statusFilter ? statusFilter.value : "all";
    const dateValue = dateFilter ? dateFilter.value : "";

    if (statusValue === "all" && !dateValue) {
      // If no filters are applied, show all reservations
      displayReservations(window.allReservations);
      return;
    }

    // Apply filters
    let filteredReservations = [...window.allReservations];

    // Filter by status
    if (statusValue !== "all") {
      filteredReservations = filteredReservations.filter(
        (r) => r.status === statusValue
      );
    }

    // Filter by date
    if (dateValue) {
      // Convert filter date to start of day
      const filterDate = new Date(dateValue);
      filterDate.setHours(0, 0, 0, 0);

      filteredReservations = filteredReservations.filter((r) => {
        const reservationDate = new Date(r.date);
        reservationDate.setHours(0, 0, 0, 0);
        return reservationDate.getTime() === filterDate.getTime();
      });
    }

    // Display filtered reservations
    displayReservations(filteredReservations);
  }

  // Function to clear filters
  function clearFilters() {
    if (statusFilter) statusFilter.value = "all";
    if (dateFilter) dateFilter.value = "";
    displayReservations(window.allReservations);
  }

  // Function to show error message
  function showError(message, type = "error") {
    const container = document.createElement("div");
    container.className = `admin-notification ${type}`;
    container.textContent = message;
    document.body.appendChild(container);

    // Show notification
    setTimeout(() => {
      container.classList.add("show");
    }, 10);

    // Hide and remove notification after a delay
    setTimeout(() => {
      container.classList.remove("show");
      setTimeout(() => {
        container.remove();
      }, 300);
    }, 3000);
  }

  // Helper function to close modal
  function closeIDCardModal() {
    if (idCardModal) {
      idCardModal.classList.remove("active");
      // Re-enable body scrolling
      document.body.style.overflow = "";
    }
  }

  // Image transformation functions
  function zoomIn() {
    if (currentZoom < MAX_ZOOM) {
      currentZoom += ZOOM_STEP;
      applyTransform();
    }
  }

  function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
      currentZoom -= ZOOM_STEP;
      applyTransform();
    }
  }

  function rotateLeft() {
    currentRotation -= ROTATION_STEP;
    applyTransform();
  }

  function rotateRight() {
    currentRotation += ROTATION_STEP;
    applyTransform();
  }

  function resetImageView() {
    currentZoom = 1;
    currentRotation = 0;
    applyTransform();
  }

  function applyTransform() {
    if (idCardImage) {
      idCardImage.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
    }
  }

  function downloadImage() {
    if (idCardImage && idCardImage.src) {
      // Create a temporary anchor element
      const downloadLink = document.createElement("a");

      // Set properties for download
      downloadLink.href = idCardImage.src;

      // Generate a file name from the source URL
      const fileName = idCardImage.src.split("/").pop() || "id-card-image.jpg";
      downloadLink.download = fileName;

      // Append to the body temporarily
      document.body.appendChild(downloadLink);

      // Trigger click event to download
      downloadLink.click();

      // Remove the element
      document.body.removeChild(downloadLink);
    }
  }

  // Function to show ID card with verification options
  function showIDCardWithVerification(imageUrl, metadata = {}) {
    if (!idCardModal || !idCardImage) return;

    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";

    // Format date based on language if needed
    let formattedUploadDate = metadata.uploadDate;
    if (!formattedUploadDate) {
      formattedUploadDate = new Date().toLocaleDateString(
        currentLang === "ar" ? "ar-EG" : "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      );
    }

    // Store current ID data
    currentIdData = {
      url: imageUrl,
      reservationId: metadata.reservationId || null,
      userId: metadata.userId || null,
      verified: metadata.verified || false,
      status: metadata.status || "pending",
      userName: metadata.userName || "غير معروف",
      uploadDate: formattedUploadDate,
      fileSize: metadata.fileSize || "غير معروف",
    };

    // Reset zoom and rotation
    currentZoom = 1;
    currentRotation = 0;
    applyTransform();

    // Show loading state
    if (idCardLoader) {
      idCardLoader.classList.add("active");
    }

    // Update verification UI
    updateVerificationUI();

    // Set image source
    idCardImage.src = "";
    idCardImage.onload = () => {
      if (idCardLoader) {
        idCardLoader.classList.remove("active");
      }
    };
    idCardImage.onerror = () => {
      if (idCardLoader) {
        idCardLoader.classList.remove("active");
      }
      showError("فشل تحميل صورة الهوية");
    };
    idCardImage.src = imageUrl;

    // Show modal
    idCardModal.classList.add("active");
    // Disable body scrolling
    document.body.style.overflow = "hidden";
  }

  // Function to update verification UI based on status
  function updateVerificationUI() {
    if (!verificationStatus || !verificationIndicator || !currentIdData) return;

    // Update metadata display
    if (idOwnerName) idOwnerName.textContent = currentIdData.userName;
    if (idUploadDate) idUploadDate.textContent = currentIdData.uploadDate;
    if (idFileSize) idFileSize.textContent = currentIdData.fileSize;

    // Update verification status indicator
    verificationIndicator.className = "verification-indicator";

    let statusText, statusDescription, iconClass;

    // Set default values based on current language
    const currentLang = localStorage.getItem("admin-language") || "ar";

    switch (currentIdData.status) {
      case "verified":
        statusText =
          currentLang === "en" ? "ID Verified" : "تم التحقق من الهوية";
        iconClass = "fa-check-circle";
        statusDescription =
          currentLang === "en"
            ? "This ID has been verified and approved"
            : "تم التحقق من هذه الهوية والموافقة عليها";
        verificationIndicator.classList.add("verified");
        break;
      case "rejected":
        statusText = currentLang === "en" ? "ID Rejected" : "تم رفض الهوية";
        iconClass = "fa-times-circle";
        statusDescription =
          currentLang === "en"
            ? "This ID has been rejected. Please contact the customer to provide a valid ID"
            : "تم رفض هذه الهوية، يرجى التواصل مع العميل لتقديم هوية صحيحة";
        verificationIndicator.classList.add("rejected");
        break;
      default:
        statusText =
          currentLang === "en"
            ? "ID Not Verified Yet"
            : "لم يتم التحقق من الهوية بعد";
        iconClass = "fa-exclamation-triangle";
        statusDescription =
          currentLang === "en"
            ? "This ID is pending review and verification by an administrator"
            : "هذه الهوية في انتظار المراجعة والتحقق من قبل المشرف";
        break;
    }

    verificationIndicator.innerHTML = `
      <i class="fas ${iconClass}"></i>
      <div class="status-content">
        <span class="status-title">${statusText}</span>
        <span class="status-description">${statusDescription}</span>
      </div>
    `;

    // Show/hide action buttons based on current status
    if (approveIdBtn && rejectIdBtn) {
      if (currentIdData.status === "pending") {
        approveIdBtn.style.display = "flex";
        rejectIdBtn.style.display = "flex";
      } else {
        approveIdBtn.style.display = "none";
        rejectIdBtn.style.display = "none";
      }
    }
  }

  // Function to handle ID verification
  async function verifyIdCard(status) {
    if (!currentIdData || !currentIdData.reservationId) {
      const currentLang = localStorage.getItem("admin-language") || "ar";
      const errorMsg =
        currentLang === "en"
          ? "Cannot verify ID at this time"
          : "لا يمكن التحقق من الهوية في الوقت الحالي";
      showError(errorMsg);
      return;
    }

    try {
      const isApproving = status === "verified";
      const actionBtn = isApproving ? approveIdBtn : rejectIdBtn;
      const currentLang = localStorage.getItem("admin-language") || "ar";
      if (!currentIdData || !currentIdData.reservationId) {
        showError(
          currentLang === "en" ? "Cannot verify ID at this time" : "لا يمكن التحقق من الهوية في الوقت الحالي"
        );
        return;
      }
      if (actionBtn) {
        actionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        actionBtn.disabled = true;
      }
      const list = window.allReservations || [];
      const idx = list.findIndex((r) => String(r._id) === String(currentIdData.reservationId));
      if (idx !== -1) {
        list[idx].idVerification = list[idx].idVerification || {};
        list[idx].idVerification.status = status;
        localStorage.setItem("reservations", JSON.stringify(list));
        window.allReservations = list;
      }
      currentIdData.status = status;
      updateVerificationUI();
      showError(
        isApproving
          ? currentLang === "en" ? "ID successfully approved" : "تم تأكيد الهوية بنجاح"
          : currentLang === "en" ? "ID successfully rejected" : "تم رفض الهوية بنجاح",
        "success"
      );
      displayReservations(window.allReservations);
    } catch (error) {
      showError(error.message || "حدث خطأ أثناء تحديث حالة التحقق");
    } finally {
      const currentLang = localStorage.getItem("admin-language") || "ar";
      if (approveIdBtn)
        approveIdBtn.innerHTML = `<i class="fas fa-check"></i> ${
          currentLang === "en" ? "Approve" : "تأكيد"
        }`;
      if (rejectIdBtn)
        rejectIdBtn.innerHTML = `<i class="fas fa-times"></i> ${
          currentLang === "en" ? "Reject" : "رفض"
        }`;
      if (approveIdBtn) approveIdBtn.disabled = false;
      if (rejectIdBtn) rejectIdBtn.disabled = false;
    }
  }

  // Function to get HTML for ID verification badge
  function getIdVerificationBadge(status) {
    if (!status || status === "pending") {
      return '<span class="id-badge pending"><i class="fas fa-exclamation-circle"></i></span>';
    } else if (status === "verified") {
      return '<span class="id-badge verified"><i class="fas fa-check-circle"></i></span>';
    } else if (status === "rejected") {
      return '<span class="id-badge rejected"><i class="fas fa-times-circle"></i></span>';
    }
    return "";
  }

  // Add event listener for language changes
  document.addEventListener("languageChanged", function (e) {
    updateViewIdButtonsLanguage();
    // Reload reservations to update status text in the new language
    loadReservations();
  });

  // Function to update language of view ID buttons
  function updateViewIdButtonsLanguage() {
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const viewIdText = currentLang === "en" ? "View ID" : "عرض الهوية";

    const viewIdButtons = document.querySelectorAll(
      ".view-id-card-btn span[data-i18n='viewIdCard']"
    );
    viewIdButtons.forEach((span) => {
      span.textContent = viewIdText;
    });
  }
});
