// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Username validation function
function isValidUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_\-.]{3,30}$/;
  return usernameRegex.test(username);
}

// Toggle password visibility
const togglePasswordFunctionality = (toggleId, passwordId) => {
  document.getElementById(toggleId)?.addEventListener("click", function () {
    const passwordInput = document.getElementById(passwordId);
    if (!passwordInput) return;

    const icon = this.querySelector("i");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    } else {
      passwordInput.type = "password";
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  });
};

// Toast notification function
function showToast(message, type = "success", duration = 3000, title = "") {
  const container = document.getElementById("toast-container");

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast-notification ${type}`;

  // Set icon based on notification type
  let iconClass = "check-circle";
  if (type === "error") iconClass = "exclamation-circle";
  if (type === "warning") iconClass = "exclamation-triangle";
  if (type === "info") iconClass = "info-circle";

  // Do not use any default title for toast notifications
  title = "";

  // Set content with title and message structure
  toast.innerHTML = `
    <i class="fas fa-${iconClass}"></i>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Add to container
  container.appendChild(toast);

  // Add close button functionality
  const closeButton = toast.querySelector(".toast-close");
  closeButton.addEventListener("click", () => {
    toast.classList.remove("show");
    toast.classList.add("hide");

    // Wait for animation to finish before removing
    setTimeout(() => {
      toast.remove();
    }, 400);
  });

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Remove after duration
  const timeoutId = setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.remove("show");
      toast.classList.add("hide");

      // Wait for animation to finish before removing
      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.remove();
        }
      }, 400);
    }
  }, duration);

  // Store timeout ID to allow early dismissal
  toast.dataset.timeoutId = timeoutId;

  return toast;
}

document.addEventListener("DOMContentLoaded", () => {
  // Check if i18n functions are available
  const i18nAvailable =
    typeof window.i18n === "object" &&
    typeof window.i18n.getTranslation === "function";

  // Initialize password toggle functionality
  togglePasswordFunctionality("toggle-login-password", "login-password");
  togglePasswordFunctionality("toggle-register-password", "register-password");
  togglePasswordFunctionality(
    "toggle-register-confirm-password",
    "register-confirm-password"
  );

  // Show register page when clicked
  document
    .getElementById("show-register")
    ?.addEventListener("click", function (e) {
      e.preventDefault();
      document.body.classList.add("show-register");
    });

  // Back to login button
  const backToLoginBtn = document.querySelector(".back-to-login");
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      document.body.classList.remove("show-register");
    });
  }

  // Password strength checker
  const passwordInput = document.getElementById("register-password");
  const strengthText = document.getElementById("strength-text");
  const strengthContainer = document.getElementById("password-strength");

  if (passwordInput && strengthText && strengthContainer) {
    passwordInput.addEventListener("input", function () {
      const password = this.value;

      // Show strength indicator only when the user starts typing
      if (password.length > 0) {
        strengthContainer.style.display = "block";
        // Add a slight delay before adding the visible class to trigger the animation
        setTimeout(() => {
          strengthContainer.classList.add("visible");
        }, 10);
      } else {
        strengthContainer.classList.remove("visible");
        // Hide the container after the animation completes
        setTimeout(() => {
          strengthContainer.style.display = "none";
        }, 300);
        return;
      }

      let strength = 0;
      let status = "";

      if (password.length >= 6) {
        strength += 20;
      }

      if (password.length >= 8) {
        strength += 20;
      }

      if (/[A-Z]/.test(password)) {
        strength += 20;
      }

      if (/[0-9]/.test(password)) {
        strength += 20;
      }

      if (/[^A-Za-z0-9]/.test(password)) {
        strength += 20;
      }

      // Get translated status text
      if (strength <= 30) {
        status = i18nAvailable
          ? window.i18n.getTranslation("passwordWeak")
          : "ضعيفة";
        strengthText.style.color = "#ff4b4b";
      } else if (strength <= 70) {
        status = i18nAvailable
          ? window.i18n.getTranslation("passwordMedium")
          : "متوسطة";
        strengthText.style.color = "#ffaf4b";
      } else {
        status = i18nAvailable
          ? window.i18n.getTranslation("passwordStrong")
          : "قوية";
        strengthText.style.color = "#52bd95";
      }

      // Get translated base text
      const baseText = i18nAvailable
        ? window.i18n.getTranslation("passwordStrength")
        : "قوة كلمة المرور";
      strengthText.textContent = `${baseText}: ${status}`;
    });
  }

  // Registration form submission
  document
    .getElementById("register-form")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = document.getElementById("register-name")?.value;
      const username = document.getElementById("register-username")?.value;
      const contact = document.getElementById("register-contact")?.value;
      const password = document.getElementById("register-password")?.value;
      const confirmPassword = document.getElementById(
        "register-confirm-password"
      )?.value;
      const termsAccepted = document.getElementById("terms")?.checked;
      const errorMessage = document.getElementById("register-error-message");
      const errorText = document.getElementById("register-error-text");

      // Basic validation with i18n support
      if (!name || !username || !contact || !password || !confirmPassword) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("fillAllFields")
          : "يرجى ملء جميع الحقول المطلوبة";
        errorMessage.classList.add("show");
        return;
      }

      // Validate username format
      if (!isValidUsername(username)) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("invalidUsername")
          : "اسم المستخدم يجب أن يكون بين 3-30 حرفًا ويحتوي على أحرف وأرقام فقط";
        errorMessage.classList.add("show");
        return;
      }

      // Validate email format
      if (!isValidEmail(contact)) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("invalidEmail")
          : "الرجاء إدخال بريد إلكتروني صحيح";
        errorMessage.classList.add("show");
        return;
      }

      if (password !== confirmPassword) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("passwordMismatch")
          : "كلمات المرور غير متطابقة";
        errorMessage.classList.add("show");
        return;
      }

      if (password.length < 6) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("passwordTooShort")
          : "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
        errorMessage.classList.add("show");
        return;
      }

      if (!termsAccepted) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("mustAgreeTerms")
          : "يجب الموافقة على الشروط والأحكام";
        errorMessage.classList.add("show");
        return;
      }

      // Hide error message
      errorMessage.classList.remove("show");

      // Show loading state
      const submitButton = this.querySelector(".auth-button");
      const originalText = submitButton.innerHTML;
      submitButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> ' +
        (i18nAvailable
          ? window.i18n.getTranslation("creatingAccount")
          : "جاري إنشاء الحساب...");
      submitButton.disabled = true;

      // Prepare data for server
      const registerData = {
        name,
        username,
        email: contact,
        password,
        termsAccepted,
      };

      // Send data to the server
      fetch("/api/customer/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Store the token in localStorage
            if (data.token && typeof data.token === "string") {
              localStorage.setItem("token", data.token);
              // console.log("Token stored successfully");
            } else {
              // console.error("Invalid token received from server");
            }

            // Show success message
            showToast(
              i18nAvailable
                ? window.i18n.getTranslation("registerSuccessMessage")
                : "يمكنك الآن تسجيل الدخول والاستفادة من جميع المزايا",
              "success",
              3000,
              i18nAvailable
                ? window.i18n.getTranslation("registerSuccess")
                : "تم إنشاء الحساب بنجاح!"
            );

            // Go back to login form
            document.body.classList.remove("show-register");

            // Reset the form
            this.reset();

            // Dispatch auth state changed event
            if (typeof dispatchAuthStateChanged === "function") {
              dispatchAuthStateChanged();
            }
          } else {
            // Show error message
            errorText.textContent =
              data.message || "حدث خطأ أثناء إنشاء الحساب";
            errorMessage.classList.add("show");
          }
        })
        .catch((error) => {
          // console.error("Error:", error);
          errorText.textContent = "حدث خطأ في الاتصال بالخادم";
          errorMessage.classList.add("show");
        })
        .finally(() => {
          // Restore button state
          submitButton.innerHTML = originalText;
          submitButton.disabled = false;
        });
    });

  // Login form submission
  document
    .getElementById("login-form")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email")?.value;
      const password = document.getElementById("login-password")?.value;
      const errorMessage = document.getElementById("error-message");
      const errorText = document.getElementById("error-text");

      // Basic validation with i18n support
      if (!email || !password) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("fillAllFields")
          : "يرجى ملء جميع الحقول المطلوبة";
        errorMessage.classList.add("show");
        return;
      }

      // Validate email format
      if (!isValidEmail(email)) {
        errorText.textContent = i18nAvailable
          ? window.i18n.getTranslation("invalidEmail")
          : "الرجاء إدخال بريد إلكتروني صحيح";
        errorMessage.classList.add("show");
        return;
      }

      // Hide error message
      errorMessage.classList.remove("show");

      // Show loading state
      const submitButton = this.querySelector(".auth-button");
      const originalText = submitButton.innerHTML;
      submitButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> ' +
        (i18nAvailable
          ? window.i18n.getTranslation("loggingIn")
          : "جاري تسجيل الدخول...");
      submitButton.disabled = true;

      // Prepare login data
      const loginData = {
        email: email,
        password: password,
      };

      // Send data to the server
      fetch("/api/customer/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
        credentials: "include", // Include cookies in the request
      })
        .then((response) => {
          // Always parse the JSON regardless of status code
          return response.json().then((data) => {
            return { status: response.status, data };
          });
        })
        .then((result) => {
          if (result.status === 200 && result.data.success) {
            // Login successful
            // Store the token using our setToken function
            if (typeof setToken === "function") {
              setToken(result.data.token);
            } else {
              // Fallback if setToken is not available
              localStorage.setItem("token", result.data.token);
            }

            // Store user permissions if available
            if (result.data.user && result.data.user.permissions) {
              if (typeof setUserPermissions === "function") {
                setUserPermissions(result.data.user.permissions);
              } else {
                // Fallback if setUserPermissions is not available
                localStorage.setItem(
                  "userPermissions",
                  JSON.stringify(result.data.user.permissions)
                );
              }
            }

            // Dispatch auth state changed event if available
            if (typeof dispatchAuthStateChanged === "function") {
              dispatchAuthStateChanged();
            }

            // Show success message
            showToast(
              i18nAvailable
                ? window.i18n.getTranslation("redirectingToHome")
                : "جاري تحويلك إلى الصفحة الرئيسية...",
              "success",
              1500,
              i18nAvailable
                ? window.i18n.getTranslation("loginSuccess")
                : "تم تسجيل الدخول بنجاح!"
            );

            // Redirect to index page after a delay
            setTimeout(() => {
              window.location.href = "index.html";
            }, 1500);
          } else {
            // Login failed
            const message = result.data.message || "بيانات الدخول غير صحيحة";

            errorText.textContent = message;
            errorMessage.classList.add("show");
          }
        })
        .catch((error) => {
          errorText.textContent = "حدث خطأ في الاتصال بالخادم";
          errorMessage.classList.add("show");
        })
        .finally(() => {
          // Restore button state
          submitButton.innerHTML = originalText;
          submitButton.disabled = false;
        });
    });

  // Add animation to CSS if not supported
  if (!CSS.supports("animation", "fadeIn 0.5s ease")) {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
    document.head.appendChild(style);
  }

  // Add current year to the copyright text if present
  const currentYear = new Date().getFullYear();
  const copyrightEl = document.querySelector(".copyright-year");
  if (copyrightEl) {
    copyrightEl.textContent = currentYear;
  }

  // Handle back button click
  document
    .getElementById("back-to-home")
    ?.addEventListener("click", function () {
      window.location.href = "index.html";
    });

  // Password Recovery View Switching
  const forgotLink = document.querySelector(".forgot-password a");
  const backToLoginLink = document.getElementById("back-to-login");
  const loginForm = document.getElementById("login-form");
  const passwordRecoveryForm = document.getElementById(
    "password-recovery-form"
  );
  const sendRecoveryCodeBtn = document.getElementById("send-recovery-code");
  const resetPasswordBtn = document.getElementById("reset-password-btn");
  const codeVerificationSection = document.getElementById(
    "code-verification-section"
  );

  try {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const emailFromLink = params.get("email") || "";
    const codeFromLink = params.get("code") || "";
    const langParam = params.get("lang");

    if (langParam && i18nAvailable) {
      const currentLang = window.i18n.getCurrentLanguage();
      if (
        langParam !== currentLang &&
        (langParam === "en" || langParam === "ar")
      ) {
        window.switchLanguage();
      }
    }

    if (mode === "recover") {
      switchToPasswordRecovery();
      const emailInput = document.getElementById("recovery-email");
      const codeInput = document.getElementById("reset-code");
      if (emailInput) emailInput.value = emailFromLink;
      if (codeInput && codeFromLink) {
        codeInput.value = codeFromLink;
        codeVerificationSection.style.display = "block";
        const newPassInput = document.getElementById("new-password");
        if (newPassInput) newPassInput.focus();
      }
    }
  } catch (_) {}

  // Switch to password recovery view
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      switchToPasswordRecovery();
    });
  }

  // Switch back to login view
  if (backToLoginLink) {
    backToLoginLink.addEventListener("click", function (e) {
      e.preventDefault();
      switchToLogin();
    });
  }

  // Send recovery code
  if (sendRecoveryCodeBtn) {
    sendRecoveryCodeBtn.addEventListener("click", function () {
      sendRecoveryCode();
    });
  }

  // Reset password
  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener("click", function () {
      resetPassword();
    });
  }

  // View switching functions
  function switchToPasswordRecovery() {
    loginForm.style.display = "none";
    passwordRecoveryForm.style.display = "block";
    document.querySelector(".auth-title").textContent = i18nAvailable
      ? window.i18n.getTranslation("forgotPassword")
      : "نسيت كلمة المرور";
    document.querySelector(".auth-footer").style.display = "none";
  }

  function switchToLogin() {
    passwordRecoveryForm.style.display = "none";
    loginForm.style.display = "block";
    codeVerificationSection.style.display = "none";
    document.querySelector(".auth-title").textContent = i18nAvailable
      ? window.i18n.getTranslation("loginTitle")
      : "تسجيل الدخول";
    document.querySelector(".auth-footer").style.display = "block";

    // Reset form fields
    document.getElementById("recovery-email").value = "";
    document.getElementById("reset-code").value = "";
    document.getElementById("new-password").value = "";
  }

  // Password recovery functionality
  function sendRecoveryCode() {
    const email = document.getElementById("recovery-email").value || "";

    if (!isValidEmail(email)) {
      showToast(
        i18nAvailable
          ? window.i18n.getTranslation("invalidEmail")
          : "الرجاء إدخال بريد إلكتروني صحيح",
        "error",
        3000
      );
      return;
    }

    sendRecoveryCodeBtn.disabled = true;
    sendRecoveryCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    fetch("/api/customer/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        language: i18nAvailable
          ? window.i18n.getCurrentLanguage()
          : document.documentElement.lang || "ar",
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success) {
          showToast(
            i18nAvailable
              ? window.i18n.getTranslation("resetCodeSent") ||
                  "تم إرسال كود إعادة التعيين إلى بريدك"
              : "تم إرسال كود إعادة التعيين إلى بريدك",
            "success",
            3000
          );
          codeVerificationSection.style.display = "block";

          // Auto-fill code in development environment
          if (d.resetToken) {
            try {
              const isLocal =
                location.hostname === "localhost" ||
                location.hostname === "127.0.0.1";
              if (isLocal) {
                document.getElementById("reset-code").value = d.resetToken;
              }
            } catch (_) {}
          }
        } else {
          showToast(
            d.message ||
              (i18nAvailable
                ? window.i18n.getTranslation("operationFailed")
                : "حدث خطأ"),
            "error",
            3000
          );
        }
      })
      .catch(() => {
        showToast(
          i18nAvailable
            ? window.i18n.getTranslation("serverConnectionError") ||
                "خطأ في الاتصال بالخادم"
            : "خطأ في الاتصال بالخادم",
          "error",
          3000
        );
      })
      .finally(() => {
        sendRecoveryCodeBtn.disabled = false;
        sendRecoveryCodeBtn.innerHTML = i18nAvailable
          ? window.i18n.getTranslation("sendCode") || "إرسال الكود"
          : "إرسال الكود";
      });
  }

  function resetPassword() {
    const email = document.getElementById("recovery-email").value || "";
    const token = document.getElementById("reset-code").value || "";
    const newPass = document.getElementById("new-password").value || "";

    if (!email || !isValidEmail(email) || !token || newPass.length < 6) {
      showToast(
        i18nAvailable
          ? window.i18n.getTranslation("fillAllFields")
          : "يرجى ملء جميع الحقول المطلوبة",
        "error",
        3000
      );
      return;
    }

    resetPasswordBtn.disabled = true;
    resetPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    fetch("/api/customer/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: token, password: newPass }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success) {
          showToast(
            i18nAvailable
              ? window.i18n.getTranslation("passwordChanged") ||
                  "تم تغيير كلمة المرور بنجاح"
              : "تم تغيير كلمة المرور بنجاح",
            "success",
            2000
          );
          setTimeout(() => {
            switchToLogin();
          }, 1500);
        } else {
          showToast(
            d.message ||
              (i18nAvailable
                ? window.i18n.getTranslation("operationFailed")
                : "حدث خطأ"),
            "error",
            3000
          );
        }
      })
      .catch(() => {
        showToast(
          i18nAvailable
            ? window.i18n.getTranslation("serverConnectionError") ||
                "خطأ في الاتصال بالخادم"
            : "خطأ في الاتصال بالخادم",
          "error",
          3000
        );
      })
      .finally(() => {
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.innerHTML = i18nAvailable
          ? window.i18n.getTranslation("resetPassword") || "تغيير كلمة المرور"
          : "تغيير كلمة المرور";
      });
  }
});
