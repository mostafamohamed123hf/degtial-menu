// Reservation Settings Integration with Global Settings
(function () {
  "use strict";

  // Function to update reservation section with global settings
  function updateReservationWithGlobalSettings() {
    if (!window.globalSettings || !window.globalSettings.loaded) {
      console.log("Global settings not loaded yet for reservation section");
      return;
    }

    const settings = window.globalSettings;

    // Update working hours display
    updateWorkingHoursDisplay(settings);

    // Update contact phone number
    updateContactPhone(settings);

    // Update time slots based on working hours
    updateTimeSlots(settings);
  }

  // Update working hours display
  function updateWorkingHoursDisplay(settings) {
    const workingHoursCard = document.querySelector('.info-card');
    if (!workingHoursCard) return;

    const currentLang = typeof getCurrentLanguage === 'function' 
      ? getCurrentLanguage() 
      : localStorage.getItem('public-language') || 'ar';

    // Get working hours from settings
    const startTime = settings.workingHoursStart || "09:00";
    const endTime = settings.workingHoursEnd || "23:00";
    const workingDays = settings.workingDays || [];

    // Format time for display
    const formatTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      
      if (currentLang === 'en') {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes} ${period}`;
      } else {
        const period = hour >= 12 ? 'مساءً' : 'صباحًا';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes} ${period}`;
      }
    };

    // Get day names in current language
    const dayNames = {
      ar: {
        sunday: 'الأحد',
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
        saturday: 'السبت'
      },
      en: {
        sunday: 'Sunday',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday'
      }
    };

    // Build working days text
    let workingDaysText = '';
    if (workingDays.length === 7) {
      workingDaysText = currentLang === 'ar' ? 'جميع أيام الأسبوع' : 'All week';
    } else if (workingDays.length > 0) {
      const days = workingDays.map(day => dayNames[currentLang][day] || day);
      workingDaysText = days.join(currentLang === 'ar' ? ' - ' : ' - ');
    }

    // Update the working hours card content
    const workingHoursHTML = `
      <div class="info-icon">
        <i class="fas fa-clock"></i>
      </div>
      <h3 data-i18n="workingHours">${currentLang === 'ar' ? 'ساعات العمل' : 'Working Hours'}</h3>
      <p class="working-days">${workingDaysText}</p>
      <p class="working-hours-time">${formatTime(startTime)} - ${formatTime(endTime)}</p>
    `;

    workingHoursCard.innerHTML = workingHoursHTML;
  }

  // Update contact phone number
  function updateContactPhone(settings) {
    const phoneElement = document.querySelector('.phone-number');
    if (!phoneElement) return;

    // Use contactPhone or contactWhatsapp from settings
    const phone = settings.contactPhone || settings.contactWhatsapp || '+20 123 456 7890';
    phoneElement.textContent = phone;

    // Make it clickable
    phoneElement.style.cursor = 'pointer';
    phoneElement.onclick = function() {
      window.location.href = `tel:${phone.replace(/\s/g, '')}`;
    };
  }

  // Update time slots based on working hours
  function updateTimeSlots(settings) {
    const timeSelect = document.getElementById('time');
    if (!timeSelect) return;

    const currentLang = typeof getCurrentLanguage === 'function' 
      ? getCurrentLanguage() 
      : localStorage.getItem('public-language') || 'ar';

    // Get working hours from settings
    const startTime = settings.workingHoursStart || "09:00";
    const endTime = settings.workingHoursEnd || "23:00";

    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    // Generate time slots (every hour)
    const timeSlots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      const timeValue = `${hour.toString().padStart(2, '0')}:00`;
      
      // Format time for display
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const period = currentLang === 'ar' 
        ? (hour >= 12 ? 'مساءً' : 'صباحًا')
        : (hour >= 12 ? 'PM' : 'AM');
      
      const displayTime = `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
      
      timeSlots.push({
        value: timeValue,
        text: displayTime
      });
    }

    // Clear existing options except the first placeholder
    const placeholder = timeSelect.querySelector('option[value=""]');
    timeSelect.innerHTML = '';
    if (placeholder) {
      timeSelect.appendChild(placeholder);
    } else {
      const newPlaceholder = document.createElement('option');
      newPlaceholder.value = '';
      newPlaceholder.disabled = true;
      newPlaceholder.selected = true;
      newPlaceholder.setAttribute('data-i18n', 'selectTime');
      newPlaceholder.textContent = currentLang === 'ar' ? 'اختر الوقت' : 'Select Time';
      timeSelect.appendChild(newPlaceholder);
    }

    // Add new time slots
    timeSlots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.value;
      option.textContent = slot.text;
      timeSelect.appendChild(option);
    });
  }

  // Validate reservation date against working days
  function validateReservationDate() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;

    dateInput.addEventListener('change', function() {
      if (!window.globalSettings || !window.globalSettings.loaded) return;

      const selectedDate = new Date(this.value);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const selectedDay = dayMap[dayOfWeek];

      const workingDays = window.globalSettings.workingDays || [];
      
      if (!workingDays.includes(selectedDay)) {
        const currentLang = typeof getCurrentLanguage === 'function' 
          ? getCurrentLanguage() 
          : localStorage.getItem('public-language') || 'ar';
        
        const message = currentLang === 'ar' 
          ? 'عذراً، المطعم مغلق في هذا اليوم. يرجى اختيار يوم آخر.'
          : 'Sorry, the restaurant is closed on this day. Please select another day.';
        
        if (typeof showReservationMessage === 'function') {
          showReservationMessage(message, 'error');
        } else {
          alert(message);
        }
        
        this.value = '';
      }
    });
  }

  // Initialize when global settings are loaded
  function init() {
    if (window.globalSettings && window.globalSettings.loaded) {
      updateReservationWithGlobalSettings();
      validateReservationDate();
    }
  }

  // Listen for global settings loaded event
  window.addEventListener('global-settings-loaded', function() {
    updateReservationWithGlobalSettings();
    validateReservationDate();
  });

  // Listen for global settings changed event (real-time updates)
  window.addEventListener('global-settings-changed', function() {
    updateReservationWithGlobalSettings();
  });

  // Listen for language change event
  window.addEventListener('language-changed', function() {
    updateReservationWithGlobalSettings();
  });

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.reservationSettings = {
    update: updateReservationWithGlobalSettings
  };
})();
