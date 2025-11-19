/**
 * i18n.js - Internationalization for public pages
 * Handles language switching between Arabic and English
 */

// Default language is Arabic
let currentLanguage = localStorage.getItem("public-language") || "ar";

// Translations object
const translations = {
  ar: {
    // Currency - now loaded dynamically from global settings
    // currencyEGP: "جنية",
    // Document attributes
    htmlAttributes: {
      lang: "ar",
      dir: "rtl",
    },

    // Index page
    indexPageTitle: "ديجيتال منيو | Digital Menu",

    // Register/Login page
    pageTitle: "تسجيل الدخول | ديجيتال منيو",
    loginTitle: "تسجيل الدخول",
    registerTitle: "إنشاء حساب جديد",
    backToHome: "العودة للصفحة الرئيسية",

    // Login form
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    verificationCode: "كود التحقق",
    sendCode: "إرسال الكود",
    loginButton: "تسجيل الدخول",
    loggingIn: "جاري تسجيل الدخول...",

    // Register section
    noAccountYet: "ليس لديك حساب بعد؟",
    registerDescription:
      "قم بإنشاء حساب جديد للاستفادة من جميع المميزات وحفظ طلباتك السابقة",
    createNewAccount: "إنشاء حساب جديد",

    // Register form
    fullName: "الاسم الكامل",
    username: "اسم المستخدم",
    confirmPassword: "تأكيد كلمة المرور",
    resetPassword: "تغيير كلمة المرور",
    agreeToTerms: "أوافق على",
    termsAndConditions: "الشروط والأحكام",
    registerButton: "إنشاء حساب",
    creatingAccount: "جاري إنشاء الحساب...",
    backToLogin: "العودة لتسجيل الدخول",

    // Placeholders
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    passwordPlaceholder: "أدخل كلمة المرور",
    enterCode: "أدخل الكود الذي وصلك",
    fullNamePlaceholder: "أدخل اسمك الكامل",
    usernamePlaceholder: "أدخل اسم المستخدم الخاص بك",
    confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",

    // Password strength
    passwordStrength: "قوة كلمة المرور",
    passwordWeak: "ضعيفة",
    passwordMedium: "متوسطة",
    passwordStrong: "قوية",

    // Error messages
    fillAllFields: "يرجى ملء جميع الحقول المطلوبة",
    invalidEmail: "الرجاء إدخال بريد إلكتروني صحيح",
    invalidUsername:
      "اسم المستخدم يجب أن يكون بين 3-30 حرفًا ويحتوي على أحرف وأرقام فقط",
    passwordMismatch: "كلمات المرور غير متطابقة",
    passwordTooShort: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    mustAgreeTerms: "يجب الموافقة على الشروط والأحكام",

    // Notifications
    loginSuccess: "تم تسجيل الدخول بنجاح!",
    redirectingToHome: "جاري تحويلك إلى الصفحة الرئيسية...",
    registerSuccess: "تم إنشاء الحساب بنجاح!",
    registerSuccessMessage:
      "يمكنك الآن تسجيل الدخول والاستفادة من جميع المزايا",
    resetCodeSent: "تم إرسال كود إعادة التعيين إلى بريدك",
    notificationsOn: "تشغيل الإشعارات",
    notificationsOff: "إيقاف الإشعارات",
    notificationsEnabledMessage: "سيتم إشعارك عند وصول طلبات جديدة",
    notificationsDisabledMessage: "لن يتم إشعارك عند وصول طلبات جديدة",
    changeLanguage: "تغيير اللغة",

    // Welcome notifications
    welcomeToCashier: "مرحباً بك في نظام الكاشير",
    systemLoadedSuccessfully: "تم تحميل النظام بنجاح وجاهز للاستخدام",
    newNotificationSystem: "نظام الإشعارات الجديد",
    notificationSystemUpdated: "تم تحديث نظام الإشعارات بنجاح بتصميم جديد",
    updatingReservations: "جاري التحديث",
    updatingReservationsMessage: "يتم الآن تحديث بيانات الحجوزات...",
    newOrder: "طلب جديد!",
    newOrderMessage: "تم استلام طلب جديد للطاولة رقم %s بقيمة %s",

    // Footer
    privacyPolicy: "سياسة الخصوصية",
    termsOfUse: "شروط الاستخدام",
    footerDescription:
      "نقدم لكم أفضل الوجبات السريعة بجودة عالية وأسعار مناسبة",
    quickLinks: "روابط سريعة",
    footerCopyright: "جميع الحقوق محفوظة ©",

    // Language switcher
    switchLanguage: "English",

    // Addons Overlay
    addonTotal: "المجموع:",

    // Rating Modal
    rateOrder: "تقييم الطلب",
    howWouldYouRateProduct: "كيف تقيم تجربتك مع هذا المنتج؟",
    yourCommentOptional: "تعليقك (اختياري)",
    tellUsYourOpinion: "أخبرنا برأيك حول هذا المنتج...",
    submitRating: "إرسال التقييم",
    skipRating: "تخطي",
    ratingSubmittedSuccessfully: "تم إرسال تقييمك بنجاح!",
    thankYouForSharing:
      "شكراً لمشاركتك رأيك، ملاحظاتك تساعدنا على التحسين المستمر.",
    allRatingsSubmitted: "تم إرسال جميع التقييمات بنجاح!",
    thanksForYourTimeMulti:
      "شكراً على وقتك في تقييم منتجاتنا. تقييمك يساعدنا على التحسين المستمر.",
    done: "تم",
    orderRated: "تم التقييم",
    orderRatedTooltip: "لقد قمت بتقييم هذا الطلب",

    // Cart page
    cartPageTitle: "سلة التسوق | Digital Menu",
    cartTitle: "سلة التسوق",
    emptyCart: "سلة التسوق فارغة",
    returnToMenu: "العودة إلى القائمة",
    subtotal: "المجموع الفرعي:",
    tax: "الضريبة:",
    serviceTax: "ضريبة الخدمة:",
    discount: "الخصم:",
    loyaltyDiscount: "خصم نقاط الولاء",
    total: "المجموع النهائي:",
    checkout: "إتمام الطلب",
    processingOrder: "جاري التنفيذ...",

    // Language change notification
    languageChangedTo: "تم تغيير اللغة إلى",

    // Voucher section
    voucherTitle: "كوبون الخصم",
    voucherDescription: "أدخل كود الخصم للحصول على سعر أفضل",
    voucherPlaceholder: "أدخل كود الخصم",
    applyVoucher: "تطبيق",

    // Loyalty points section
    loyaltyPointsTitle: "نقاط الولاء الخاصة بك",
    availablePoints: "نقطة",
    pointsBalance: "رصيد النقاط المتاح",
    pointsDescription: "استخدم نقاطك للحصول على خصم فوري",
    appliedDiscount: "الخصم المطبق:",
    maxDiscount: "الحد الأقصى:",
    loyaltyTip:
      "استخدم كل نقاطك للحصول على أقصى خصم ممكن، وكسب المزيد مع كل طلب!",
    useAllPoints: "استخدام كل النقاط",
    cancelPoints: "إلغاء تطبيق",
    minPointsRequired: "تحتاج %s نقاط على الأقل",

    // Checkout success
    orderConfirmed: "تم تأكيد طلبك بنجاح!",
    orderConfirmedMessage: "شكراً لك! سيتم توصيل طلبك في أقرب وقت",
    returnToHome: "العودة للقائمة الرئيسية",

    // Profile page
    profilePageTitle: "الملف الشخصي | ديجيتال منيو",
    profileTitle: "الملف الشخصي",
    personalInfo: "المعلومات الشخصية",
    security: "الأمان",
    preferences: "الإعدادات",
    fullNameLabel: "الاسم الكامل",
    emailLabel: "البريد الإلكتروني",
    phoneLabel: "رقم الهاتف",
    saveChanges: "حفظ التغييرات",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPasswordChange: "تأكيد كلمة المرور",
    changePassword: "تغيير كلمة المرور",
    appLanguage: "لغة التطبيق",
    notificationsLabel: "الإشعارات",
    offersNotifications: "إشعارات العروض والخصومات",
    orderNotifications: "إشعارات حالة الطلب",
    pointsInfo: "معلومات النقاط",
    points: "نقطة",
    currentLevel: "المستوى الحالي:",
    pointsForNextLevel: "النقاط المطلوبة للمستوى التالي:",
    towardsNextLevel: "نحو المستوى التالي",
    pointsHistory: "سجل النقاط",
    noPointsHistory: "لا يوجد سجل للنقاط حتى الآن",
    pointsHistoryTotalEarned: "إجمالي النقاط المكتسبة:",
    // Points history titles
    pointsAdminAddTitle: "تعديل نقاط من الإدارة (إضافة)",
    pointsAdminDeductTitle: "تعديل نقاط من الإدارة (خصم)",
    pointsOrderTitle: "نقاط من طلب",
    pointsRewardTitle: "مكافأة على طلب",
    pointsRegistrationTitle: "تسجيل حساب جديد",
    pointsRedeemTitle: "استخدام نقاط",
    pointsTransactionTitle: "معاملة نقاط",
    pointsFirstOrderTitle: "طلب أول مرة",
    pointsEarnedTitle: "نقاط مكتسبة",
    pointsUsedForDiscountTitle: "استخدام نقاط للخصم على طلب",
    pointsAddedByAdminTitle: "نقاط مضافة بواسطة الإدارة",
    pointsDeductedByAdminTitle: "نقاط مخصومة بواسطة الإدارة",
    pointsResetByAdminTitle: "إعادة تعيين النقاط من الإدارة",
    pointsWelcomeRegistrationTitle: "نقاط الترحيب عند التسجيل",
    pointsRefundCancelledOrderTitle: "استرجاع نقاط من طلب ملغى",
    pointsFreeItemRedemptionTitle: "استبدال عنصر مجاني",
    pointsFreeItemRefundTitle: "استرجاع نقاط عنصر مجاني ملغى",
    productNameQuantity: "%name% (%qty%x)",
    orderNumber: "رقم الطلب",
    // Date format
    dateFormat: "DD MMM YYYY",
    today: "اليوم",
    yesterday: "أمس",
    daysAgo: "منذ %d أيام",
    // Points history sources
    sourceOrder: "طلب",
    sourceRegistration: "تسجيل",
    sourceManual: "يدوي",
    sourceRedeem: "استبدال",
    sourceRefund: "استرجاع",
    sourceOther: "آخر",
    changeProfilePhoto: "تغيير صورة الملف الشخصي",
    selectPhoto: "اختر صورة",
    takePhoto: "التقط صورة",
    savePhoto: "حفظ الصورة",
    cancel: "إلغاء",
    loading: "جاري التحميل...",
    beginner: "مبتدئ",
    bronze: "برونزي",
    silver: "فضي",
    gold: "ذهبي",
    platinum: "بلاتيني",
    diamond: "ماسي",
    updateSuccess: "تم تحديث المعلومات بنجاح",
    passwordChanged: "تم تغيير كلمة المرور بنجاح",
    photoUpdated: "تم تحديث الصورة بنجاح",
    pleaseLogin: "يرجى تسجيل الدخول مرة أخرى",
    offersEnabled: "تم تفعيل إشعارات العروض",
    offersDisabled: "تم إلغاء تفعيل إشعارات العروض",
    ordersEnabled: "تم تفعيل إشعارات الطلبات",
    ordersDisabled: "تم إلغاء تفعيل إشعارات الطلبات",

    // Profile page placeholders
    fullNamePlaceholder: "الاسم الكامل",
    emailPlaceholder: "البريد الإلكتروني",
    phonePlaceholder: "رقم الهاتف",

    // Sidebar menu
    sidebarDigitalMenu: "ديجيتال منيو",
    sidebarMenu: "القائمة",
    sidebarPreviousOrders: "طلباتي السابقة",
    sidebarOffers: "العروض",
    sidebarReservation: "احجز طاولة",
    sidebarContactUs: "اتصل بنا",
    sidebarCashierPanel: "نظام الكاشير",
    sidebarAdminPanel: "لوحة الإدارة",
    sidebarProfile: "الملف الشخصي",
    sidebarLogout: "تسجيل الخروج",
    sidebarFooter: "جميع الحقوق محفوظة © ديجيتال منيو 2025",

    // Theme toggle
    themeToggle: "الوضع",

    // Access Denied Modal
    accessDenied: "تم رفض الوصول",
    goToLogin: "الذهاب لتسجيل الدخول",

    // Cashier page
    cashierPageTitle: "نظام الكاشير | Digital Menu",
    cashierSystem: "نظام الكاشير",
    activeOrders: "الطلبات النشطة",
    noActiveOrders: "لا توجد طلبات نشطة حالياً",
    tableOrdersWillAppear: "طلبات الطاولات ستظهر هنا عند إدخال رقم الطاولة",
    quickManagement: "إدارة سريعة",
    tableNumber: "رقم الطاولة",
    todayReservations: "حجوزات اليوم",
    noReservationsForDate: "لا توجد حجوزات لليوم المحدد",
    reservationsWillAppear: "ستظهر هنا جميع الحجوزات المتاحة في اليوم المحدد",
    recentActivity: "النشاط الأخير",
    noRecentActivity: "لا يوجد نشاط حديث",
    orderDetails: "تفاصيل الطلب",
    item: "الصنف",
    price: "السعر",
    quantity: "الكمية",
    total: "الإجمالي",
    subtotal: "المجموع الفرعي:",
    tax: "الضريبة:",
    serviceTax: "ضريبة الخدمة:",
    discount: "الخصم:",
    loyaltyDiscount: "خصم نقاط الولاء",
    completeOrderAndBill: "إنهاء الطلب وإصدار الفاتورة",
    printReceipt: "طباعة الإيصال",
    printKitchenReceipt: "طباعة إيصال المطبخ",
    cancelOrder: "إلغاء الطلب",

    // Order details modal specific translations
    orderDetailsTitle: "تفاصيل الطلب",
    orderDateLabel: "التاريخ:",
    orderStatusLabel: "الحالة:",
    tableNumberLabel: "رقم الطاولة:",
    orderItemsTitle: "العناصر",
    orderSummaryTitle: "ملخص الطلب",
    subtotalLabel: "المجموع الفرعي:",
    taxLabel: "الضريبة",
    serviceTaxLabel: "ضريبة الخدمة",
    discountLabel: "الخصم",
    totalLabel: "الإجمالي:",
    closeButton: "إغلاق",
    reorderButton: "إعادة الطلب",
    noItemsAvailable: "لا توجد عناصر متاحة لهذا الطلب",
    itemNotes: "ملاحظات:",
    addonSection: "الإضافات:",
    freeAddon: "مجاني",

    // Product
    product: "منتج",

    // Order status
    statusPending: "قيد الانتظار",
    statusProcessing: "قيد المعالجة",
    statusInProgress: "قيد التحضير",
    statusReady: "جاهز",
    statusCompleted: "مكتمل",
    statusCancelled: "ملغي",
    statusUnknown: "غير معروف",

    // Reservation status
    reservationStatusPending: "قيد الانتظار",
    reservationStatusConfirmed: "مؤكد",
    reservationStatusCompleted: "مكتمل",
    reservationStatusCancelled: "ملغي",

    // Reservation actions
    confirmReservation: "تأكيد الحجز",
    completeReservation: "إكمال",
    cancelReservation: "إلغاء",

    // Book table section
    bookTableNow: "احجز طاولتك الآن 🍽️",
    bookTable: "احجز طاولة",
    fillFormBelow: "يرجى ملء النموذج أدناه لحجز طاولتك",
    name: "الاسم",
    enterYourName: "أدخل اسمك",
    phoneNumber: "رقم الهاتف",
    enterYourPhone: "أدخل رقم هاتفك",
    guestsCount: "عدد الضيوف",
    selectGuestsCount: "اختر عدد الضيوف",
    date: "التاريخ",
    time: "الوقت",
    selectTime: "اختر الوقت",
    idCardPhoto: "صورة الهوية (مطلوبة للحجز)",
    clickToUploadID: "اضغط لتحميل صورة الهوية",
    additionalNotes: "ملاحظات إضافية",
    anySpecialRequirements: "أي متطلبات خاصة؟",
    workingHours: "ساعات العمل",
    sundayToThursday: "الأحد - الخميس: 10 صباحًا - 11 مساءً",
    fridayToSaturday: "الجمعة - السبت: 10 صباحًا - 12 مساءً",
    contactUs: "اتصل بنا",
    forUrgentInquiries: "للاستفسارات العاجلة",

    // Time options
    time10am: "10:00 صباحاً",
    time11am: "11:00 صباحاً",
    time12pm: "12:00 ظهراً",
    time1pm: "01:00 مساءً",
    time2pm: "02:00 مساءً",
    time3pm: "03:00 مساءً",
    time4pm: "04:00 مساءً",
    time5pm: "05:00 مساءً",
    time6pm: "06:00 مساءً",
    time7pm: "07:00 مساءً",
    time8pm: "08:00 مساءً",
    time9pm: "09:00 مساءً",
    time10pm: "10:00 مساءً",

    // Order card
    orderNumber: "رقم الطلب",
    orderDate: "تاريخ الطلب",
    itemCount: "عدد العناصر",
    viewDetails: "عرض التفاصيل",
    table: "طاولة",
    loadingOrders: "جاري تحميل الطلبات",
    orderNumberFormat: "رقم الطلب: %s",
    errorLoadingOrders: "حدث خطأ أثناء تحميل الطلبات",
    retry: "إعادة المحاولة",
    usingLocalData: "تم استخدام النسخة المحلية",
    serverConnectionError:
      "تعذر الاتصال بالخادم، تم استخدام البيانات المخزنة محلياً",

    // Previous Orders Section
    previousOrdersTitle: "طلباتي السابقة 📋",
    searchOrders: "بحث في الطلبات",
    allOrders: "جميع الطلبات",
    ordersCompleted: "مكتملة",
    ordersProcessing: "قيد التنفيذ",
    ordersCancelled: "ملغية",
    noPreviousOrders: "لا توجد طلبات سابقة",
    noOrdersMessage: "لم تقم بإجراء أي طلبات حتى الآن",
    browseMenu: "تصفح القائمة",
    loadingOrders: "جاري تحميل الطلبات...",

    // Order actions
    orderTotal: "الإجمالي:",
    reorderButton: "إعادة الطلب",
    orderDetailsButton: "التفاصيل",

    // Order messages
    reorderingOrder: "جاري إعادة الطلب...",
    pleaseLoginToReorder: "يرجى تسجيل الدخول لإعادة الطلب",
    reorderError: "عذراً، حدث خطأ أثناء إعادة الطلب",
    loadingDetails: "جاري تحميل التفاصيل...",
    loginRequired: "تسجيل الدخول مطلوب",
    pleaseLoginToViewOrders: "يرجى تسجيل الدخول لعرض الطلبات السابقة",
    sessionExpired: "جلسة منتهية",
    pleaseLoginAgainToViewOrders:
      "يرجى تسجيل الدخول مرة أخرى لعرض الطلبات السابقة",
    pleaseLoginToViewOrderDetails: "يرجى تسجيل الدخول لعرض تفاصيل الطلب",
    loginButton: "تسجيل الدخول",

    // New Order Creation
    createNewOrder: "إنشاء طلب جديد",
    enterTableNumber: "أدخل رقم الطاولة",
    selectProducts: "اختر المنتجات",
    allCategories: "جميع الفئات",
    availableOffers: "العروض المتاحة",
    loadingOffers: "جاري تحميل العروض...",
    noOffersAvailable: "لا توجد عروض متاحة",
    errorLoadingOffers: "خطأ في تحميل العروض",
    offer: "عرض",
    loadingProducts: "جاري تحميل المنتجات...",
    noProductsAvailable: "لا توجد منتجات متاحة حالياً",
    createDefaultProducts: "إضافة المنتجات الافتراضية",
    orderCart: "سلة الطلب",
    emptyCart: "السلة فارغة",
    submitOrder: "تأكيد الطلب",
    addToCart: "إضافة للسلة",
    quantity: "الكمية:",

    // Sidebar items
    sidebarOffers: "العروض",
    sidebarReservation: "احجز طاولة",
    sidebarContactUs: "اتصل بنا",
    sidebarCashierPanel: "نظام الكاشير",
    sidebarAdminPanel: "لوحة الإدارة",
    sidebarProfile: "الملف الشخصي",
    sidebarLoginRegister: "تسجيل الدخول / إنشاء حساب",
    sidebarLogout: "تسجيل الخروج",
    sidebarFooter: "جميع الحقوق محفوظة © ديجيتال منيو 2025",

    // Banner Content
    bannerTitle: "برجر لذيذ",
    bannerDescription: "مكونات طازجة، طعم رائع",
    bannerDescriptionEn: "Fresh ingredients, amazing taste",
    bannerCategory: "فئة البانر",
    bannerCategoryHint: "اختر الفئة المناسبة للبانر",
    bannerImageUrl: "رابط صورة البانر",
    bannerImageHint: "أدخل رابط صورة البانر",
    bannerPreview: "معاينة",

    // Offers Section
    ourSpecialOffers: "عروضنا المميزة 🔥",
    searchOffers: "بحث عن عروض",
    allOffers: "كل العروض",
    weeklyOffers: "عروض أسبوعية",
    specialOffers: "عروض خاصة",
    exclusiveOffer: "عرض حصري",
    featured: "مميز",
    familyMealTitle: "وجبة العائلة",
    familyMealDescription: "٤ قطع برجر + بطاطس + كولا",
    discountPercentage: "30% خصم",
    getItNow: "احصل عليه الآن",
    endsIn: "ينتهي في: ",
    discount25: "خصم 25%",
    discount30: "خصم 30%",
    discount20: "خصم 20%",
    new: "جديد",
    specialBurger: "برجر سبيشل",
    specialBurgerDescription: "برجر لحم مشوي مع صوص خاص",
    mixPizza: "بيتزا ميكس",
    mixPizzaDescription: "بيتزا متوسطة مع ٤ إضافات",
    familyMeal: "وجبة عائلية",
    familyMealItems: "دجاج + برجر + بطاطس + مشروبات",
    sandwichMeal: "وجبة سندوتش",
    sandwichMealDescription: "سندوتش دجاج + بطاطس + كولا",

    // Menu section
    welcomeMessage: "مرحبا بك 👋",
    searchPlaceholder: "بحث",
    orderNow: "اطلب الآن",
    allCategories: "الكل",
    pizzaCategory: "بيتزا",
    burgerCategory: "برجر",
    sandwichCategory: "سندوتش",
    drinkCategory: "مشروبات",

    // Theme toggle
    themeToggle: "الوضع",
  },
  en: {
    // Document attributes
    htmlAttributes: {
      lang: "en",
      dir: "ltr",
    },

    // Currency - now loaded dynamically from global settings
    // currencyEGP: "EGP",

    // Banner Content
    bannerTitle: "Delicious Burger",
    bannerDescription: "Fresh ingredients, amazing taste",
    bannerDescriptionEn: "Fresh ingredients, amazing taste",
    bannerCategory: "Banner Category",
    bannerCategoryHint: "Select the appropriate category for the banner",
    bannerImageUrl: "Banner Image URL",
    bannerImageHint: "Enter the banner image URL",
    bannerPreview: "Preview",

    // Offers Section
    ourSpecialOffers: "Our Special Offers 🔥",
    searchOffers: "Search for offers",
    allOffers: "All Offers",
    weeklyOffers: "Weekly Offers",
    specialOffers: "Special Offers",
    exclusiveOffer: "Exclusive Offer",
    featured: "Featured",
    familyMealTitle: "Family Meal",
    familyMealDescription: "4 Burger pieces + Fries + Cola",
    discountPercentage: "30% Discount",
    getItNow: "Get It Now",
    endsIn: "Ends in: ",
    newOffer: "New Offer",
    margheritaPizza: "Margherita Pizza",
    margheritaPizzaDescription:
      "Fresh dough with tomato sauce and mozzarella cheese",
    discount25: "25% Discount",
    discount30: "30% Discount",
    discount20: "20% Discount",
    new: "New",
    specialBurger: "Special Burger",
    specialBurgerDescription: "Grilled beef burger with special sauce",
    mixPizza: "Mix Pizza",
    mixPizzaDescription: "Medium pizza with 4 toppings",
    familyMeal: "Family Meal",
    familyMealItems: "Chicken + Burger + Fries + Drinks",
    sandwichMeal: "Sandwich Meal",
    sandwichMealDescription: "Chicken sandwich + Fries + Cola",

    // Reservation Section
    reserveTable: "Reserve Your Table",
    reserveTableDescription: "Book your table in advance to avoid waiting",

    // Addons Overlay
    addonTotal: "Total:",
    addToCart: "Add to Cart",
    selectAllRequiredAddons: "Please select all required add-ons",

    // Rating Modal
    rateOrder: "Rate Order",
    howWouldYouRateProduct:
      "How would you rate your experience with this product?",
    yourCommentOptional: "Your Comment (Optional)",
    tellUsYourOpinion: "Tell us your opinion about this product...",
    submitRating: "Submit Rating",
    skipRating: "Skip Rating",
    ratingSubmittedSuccessfully: "Your rating has been submitted successfully!",
    thankYouForSharing:
      "Thank you for sharing your opinion, your feedback helps us improve continuously.",
    allRatingsSubmitted: "All ratings have been submitted successfully!",
    thanksForYourTimeMulti:
      "Thanks for your time rating our products. Your feedback helps us improve continuously.",
    done: "Done",
    orderRated: "Rated",
    orderRatedTooltip: "You have already rated this order",

    // Index page
    indexPageTitle: "ديجيتال منيو | Digital Menu",

    // Register/Login page
    pageTitle: "Sign In | Digital Menu",
    loginTitle: "Sign In",
    registerTitle: "Create New Account",
    backToHome: "Back to Home Page",

    // Login form
    email: "Email Address",
    password: "Password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    verificationCode: "Verification Code",
    sendCode: "Send Code",
    loginButton: "Sign In",
    loggingIn: "Logging in...",

    // Register section
    noAccountYet: "Don't have an account yet?",
    registerDescription:
      "Create a new account to enjoy all features and save your previous orders",
    createNewAccount: "Create New Account",

    // Register form
    fullName: "Full Name",
    username: "Username",
    confirmPassword: "Confirm Password",
    resetPassword: "Reset Password",
    agreeToTerms: "I agree to the",
    termsAndConditions: "Terms and Conditions",
    registerButton: "Create Account",
    creatingAccount: "Creating account...",
    backToLogin: "Back to Login",

    // Placeholders
    emailPlaceholder: "Enter your email address",
    passwordPlaceholder: "Enter your password",
    enterCode: "Enter the received code",
    fullNamePlaceholder: "Enter your full name",
    usernamePlaceholder: "Enter your username",
    confirmPasswordPlaceholder: "Re-enter your password",

    // Password strength
    passwordStrength: "Password strength",
    passwordWeak: "Weak",
    passwordMedium: "Medium",
    passwordStrong: "Strong",

    // Error messages
    fillAllFields: "Please fill in all required fields",
    invalidEmail: "Please enter a valid email address",
    invalidUsername:
      "Username must be 3-30 characters and contain only letters and numbers",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters long",
    mustAgreeTerms: "You must agree to the terms and conditions",

    // Notifications
    loginSuccess: "Login successful!",
    redirectingToHome: "Redirecting to homepage...",
    registerSuccess: "Account created successfully!",
    registerSuccessMessage: "You can now log in and enjoy all features",
    resetCodeSent: "Reset code sent to your email",
    notificationsOn: "Enable Notifications",
    notificationsOff: "Disable Notifications",
    notificationsEnabledMessage: "You will be notified when new orders arrive",
    notificationsDisabledMessage:
      "You will not be notified when new orders arrive",
    changeLanguage: "العربية",

    // Welcome notifications
    welcomeToCashier: "Welcome to Cashier System",
    systemLoadedSuccessfully: "System loaded successfully and ready to use",
    newNotificationSystem: "New Notification System",
    notificationSystemUpdated:
      "Notification system has been updated with a new design",
    updatingReservations: "Updating",
    updatingReservationsMessage: "Updating reservation data...",
    newOrder: "New Order!",
    newOrderMessage: "New order received for table %s with total %s",

    // Footer
    privacyPolicy: "Privacy Policy",
    termsOfUse: "Terms of Use",
    footerDescription:
      "We offer you the best fast food with high quality and reasonable prices",
    quickLinks: "Quick Links",
    footerCopyright: "All Rights Reserved ©",

    // Language switcher
    switchLanguage: "العربية",

    // Cart page
    cartPageTitle: "Shopping Cart | Digital Menu",
    cartTitle: "Shopping Cart",
    emptyCart: "Your cart is empty",
    returnToMenu: "Return to Menu",
    subtotal: "Subtotal:",
    tax: "Tax:",
    serviceTax: "Service Tax:",
    discount: "Discount:",
    loyaltyDiscount: "Loyalty Points Discount",
    total: "Total:",
    checkout: "Checkout",
    processingOrder: "Processing...",

    // Language change notification
    languageChangedTo: "Language changed to",

    // Voucher section
    voucherTitle: "Discount Coupon",
    voucherDescription: "Enter a discount code to get a better price",
    voucherPlaceholder: "Enter discount code",
    applyVoucher: "Apply",

    // Loyalty points section
    loyaltyPointsTitle: "Your Loyalty Points",
    availablePoints: "points",
    pointsBalance: "Available Points Balance",
    pointsDescription: "Use your points for an instant discount",
    appliedDiscount: "Applied Discount:",
    maxDiscount: "Maximum:",
    loyaltyTip:
      "Use all your points for maximum discount, and earn more with every order!",
    useAllPoints: "Use All Points",
    cancelPoints: "Cancel Application",
    minPointsRequired: "You need at least %s points",

    // Checkout success
    orderConfirmed: "Your order has been confirmed!",
    orderConfirmedMessage: "Thank you! Your order will be delivered soon",
    returnToHome: "Return to Main Menu",

    // Profile page
    profilePageTitle: "Profile | Digital Menu",
    profileTitle: "Profile",
    personalInfo: "Personal Information",
    security: "Security",
    preferences: "Preferences",
    fullNameLabel: "Full Name",
    emailLabel: "Email Address",
    phoneLabel: "Phone Number",
    saveChanges: "Save Changes",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPasswordChange: "Confirm Password",
    changePassword: "Change Password",
    appLanguage: "Application Language",
    notificationsLabel: "Notifications",
    offersNotifications: "Offers and Discounts Notifications",
    orderNotifications: "Order Status Notifications",
    pointsInfo: "Points Information",
    points: "points",
    currentLevel: "Current Level:",
    pointsForNextLevel: "Points Required for Next Level:",
    towardsNextLevel: "towards next level",
    pointsHistory: "Points History",
    noPointsHistory: "No points history available yet",
    pointsHistoryTotalEarned: "Total Points Earned:",
    // Points history titles
    pointsAdminAddTitle: "Points adjusted by admin (added)",
    pointsAdminDeductTitle: "Points adjusted by admin (deducted)",
    pointsOrderTitle: "Points from order",
    pointsRewardTitle: "Reward for order",
    pointsRegistrationTitle: "New account registration",
    pointsRedeemTitle: "Points redemption",
    pointsTransactionTitle: "Points transaction",
    pointsFirstOrderTitle: "First order",
    pointsEarnedTitle: "Earned points",
    pointsUsedForDiscountTitle: "Points used for discount on order",
    pointsAddedByAdminTitle: "Points added by admin",
    pointsDeductedByAdminTitle: "Points deducted by admin",
    pointsResetByAdminTitle: "Points reset by admin",
    pointsWelcomeRegistrationTitle: "Welcome points upon registration",
    pointsRefundCancelledOrderTitle: "Refund from cancelled order",
    pointsFreeItemRedemptionTitle: "Free item redemption",
    pointsFreeItemRefundTitle: "Cancelled free item refund",
    productNameQuantity: "%name% (%qty%x)",
    orderNumber: "Order Number",
    // Date format
    dateFormat: "MMM DD, YYYY",
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: "%d days ago",
    // Points history sources
    sourceOrder: "Order",
    sourceRegistration: "Registration",
    sourceManual: "Manual",
    sourceRedeem: "Redemption",
    sourceRefund: "Refund",
    sourceOther: "Other",
    changeProfilePhoto: "Change Profile Photo",
    selectPhoto: "Select Photo",
    takePhoto: "Take Photo",
    savePhoto: "Save Photo",
    cancel: "Cancel",
    loading: "Loading...",
    beginner: "Beginner",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
    diamond: "Diamond",
    updateSuccess: "Information updated successfully",
    passwordChanged: "Password changed successfully",
    photoUpdated: "Photo updated successfully",
    pleaseLogin: "Please log in again",
    offersEnabled: "Offers notifications enabled",
    offersDisabled: "Offers notifications disabled",
    ordersEnabled: "Order notifications enabled",
    ordersDisabled: "Order notifications disabled",

    // Profile page placeholders
    fullNamePlaceholder: "Enter your full name",
    emailPlaceholder: "Enter your email address",
    phonePlaceholder: "Enter your phone number",

    // Sidebar menu
    sidebarDigitalMenu: "Digital Menu",
    sidebarMenu: "Menu",
    sidebarPreviousOrders: "My Previous Orders",
    sidebarOffers: "Offers",
    sidebarReservation: "Reserve a Table",
    sidebarContactUs: "Contact Us",
    sidebarCashierPanel: "Cashier System",
    sidebarAdminPanel: "Admin Panel",
    sidebarProfile: "Profile",
    sidebarLogout: "Logout",
    sidebarFooter: "All Rights Reserved © Digital Menu 2025",

    // Theme toggle
    themeToggle: "Mode",

    // Access Denied Modal
    accessDenied: "Access Denied",
    goToLogin: "Go to Login",

    // Cashier page
    cashierPageTitle: "Cashier System | Digital Menu",
    cashierSystem: "Cashier System",
    activeOrders: "Active Orders",
    noActiveOrders: "No active orders at the moment",
    tableOrdersWillAppear:
      "Table orders will appear here after entering table number",
    quickManagement: "Quick Management",
    tableNumber: "Table Number",
    todayReservations: "Today's Reservations",
    noReservationsForDate: "No reservations for the selected date",
    reservationsWillAppear:
      "All available reservations for the selected date will appear here",
    recentActivity: "Recent Activity",
    noRecentActivity: "No recent activity",
    orderDetails: "Order Details",
    item: "Item",
    price: "Price",
    quantity: "Qty",
    total: "Total",
    subtotal: "Subtotal:",
    tax: "Tax:",
    serviceTax: "Service Tax:",
    discount: "Discount:",
    loyaltyDiscount: "Loyalty Points Discount",
    completeOrderAndBill: "Complete Order & Issue Bill",
    printReceipt: "Print Receipt",
    printKitchenReceipt: "Print Kitchen Receipt",
    cancelOrder: "Cancel Order",

    // Order details modal
    orderID: "Order ID",
    orderDate: "Order Date",
    orderTime: "Order Time",
    orderStatus: "Order Status",
    customerName: "Customer Name",
    customerPhone: "Customer Phone",
    tableNumber: "Table Number",
    paymentMethod: "Payment Method",
    paymentStatus: "Payment Status",
    orderItems: "Order Items",
    orderNotes: "Order Notes",
    additionalNotes: "Additional Notes",
    itemPrice: "Item Price",
    itemTotal: "Item Total",
    itemOptions: "Item Options",
    noItems: "No items in this order",

    // Order details modal specific translations
    orderDetailsTitle: "Order Details",
    orderDateLabel: "Date:",
    orderStatusLabel: "Status:",
    tableNumberLabel: "Table Number:",
    orderItemsTitle: "Items",
    orderSummaryTitle: "Order Summary",
    subtotalLabel: "Subtotal:",
    taxLabel: "Tax",
    serviceTaxLabel: "Service Tax",
    discountLabel: "Discount",
    totalLabel: "Total:",
    closeButton: "Close",
    reorderButton: "Reorder",
    noItemsAvailable: "No items available for this order",
    itemNotes: "Notes:",
    addonSection: "Add-ons:",
    freeAddon: "Free",

    // Product
    product: "Product",

    // Order status
    statusPending: "Pending",
    statusProcessing: "Processing",
    statusInProgress: "In Progress",
    statusReady: "Ready",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    statusUnknown: "Unknown",

    // Reservation status
    reservationStatusPending: "Pending",
    reservationStatusConfirmed: "Confirmed",
    reservationStatusCompleted: "Completed",
    reservationStatusCancelled: "Cancelled",

    // Reservation actions
    confirmReservation: "Confirm Reservation",
    completeReservation: "Complete",
    cancelReservation: "Cancel",

    // Book table section
    bookTableNow: "Book Your Table Now 🍽️",
    bookTable: "Book a Table",
    fillFormBelow: "Please fill out the form below to reserve your table",
    name: "Name",
    enterYourName: "Enter your name",
    phoneNumber: "Phone Number",
    enterYourPhone: "Enter your phone number",
    guestsCount: "Number of Guests",
    selectGuestsCount: "Select number of guests",
    date: "Date",
    time: "Time",
    selectTime: "Select time",
    idCardPhoto: "ID Card Photo (Required for reservation)",
    clickToUploadID: "Click to upload ID photo",
    additionalNotes: "Additional Notes",
    anySpecialRequirements: "Any special requirements?",
    workingHours: "Working Hours",
    sundayToThursday: "Sunday - Thursday: 10 AM - 11 PM",
    fridayToSaturday: "Friday - Saturday: 10 AM - 12 AM",
    contactUs: "Contact Us",
    forUrgentInquiries: "For urgent inquiries",

    // Time options
    time10am: "10:00 AM",
    time11am: "11:00 AM",
    time12pm: "12:00 PM",
    time1pm: "01:00 PM",
    time2pm: "02:00 PM",
    time3pm: "03:00 PM",
    time4pm: "04:00 PM",
    time5pm: "05:00 PM",
    time6pm: "06:00 PM",
    time7pm: "07:00 PM",
    time8pm: "08:00 PM",
    time9pm: "09:00 PM",
    time10pm: "10:00 PM",

    // Order card
    orderNumber: "Order Number",
    itemCount: "Item Count",
    viewDetails: "View Details",
    table: "Table",
    loadingOrders: "Loading orders",
    orderNumberFormat: "Order Number: %s",
    errorLoadingOrders: "Error loading orders",
    retry: "Retry",
    usingLocalData: "Using local data",
    serverConnectionError:
      "Server connection failed, using locally stored data",

    // Previous Orders Section
    previousOrdersTitle: "My Previous Orders 📋",
    searchOrders: "Search in orders",
    allOrders: "All Orders",
    ordersCompleted: "Completed",
    ordersProcessing: "Processing",
    ordersCancelled: "Cancelled",
    noPreviousOrders: "No previous orders",
    noOrdersMessage: "You haven't made any orders yet",
    browseMenu: "Browse Menu",
    loadingOrders: "Loading orders...",

    // Order actions
    orderTotal: "Total:",
    reorderButton: "Reorder",
    orderDetailsButton: "Details",

    // Order messages
    reorderingOrder: "Reordering...",
    pleaseLoginToReorder: "Please login to reorder",
    reorderError: "Sorry, an error occurred while reordering",
    loadingDetails: "Loading details...",
    loginRequired: "Login Required",
    pleaseLoginToViewOrders: "Please login to view previous orders",
    sessionExpired: "Session Expired",
    pleaseLoginAgainToViewOrders: "Please login again to view previous orders",
    pleaseLoginToViewOrderDetails: "Please login to view order details",
    loginButton: "Login",

    // New Order Creation
    createNewOrder: "Create New Order",
    enterTableNumber: "Enter table number",
    selectProducts: "Select Products",
    allCategories: "All Categories",
    availableOffers: "Available Offers",
    loadingOffers: "Loading offers...",
    noOffersAvailable: "No offers available",
    errorLoadingOffers: "Error loading offers",
    offer: "Offer",
    loadingProducts: "Loading products...",
    noProductsAvailable: "No products available at the moment",
    createDefaultProducts: "Add Default Products",
    orderCart: "Order Cart",
    emptyCart: "Cart is empty",
    submitOrder: "Submit Order",
    addToCart: "Add to Cart",
    quantity: "Qty:",

    // Sidebar items
    sidebarOffers: "Offers",
    sidebarReservation: "Book a Table",
    sidebarContactUs: "Contact Us",
    sidebarCashierPanel: "Cashier Panel",
    sidebarAdminPanel: "Admin Panel",
    sidebarProfile: "Profile",
    sidebarLoginRegister: "Sign In / Register",
    sidebarLogout: "Logout",
    sidebarFooter: "All rights reserved © Digital Menu 2025",

    // Menu section
    welcomeMessage: "Welcome 👋",
    searchPlaceholder: "Search",
    orderNow: "Order Now",
    allCategories: "All",
    pizzaCategory: "Pizza",
    burgerCategory: "Burger",
    sandwichCategory: "Sandwich",
    drinkCategory: "Drinks",

    // Theme toggle
    themeToggle: "Mode",
  },
};

/**
 * Get translation for a specific key
 * @param {string} key - The translation key
 * @returns {string} The translated text
 */
function getTranslation(key) {
  return translations[currentLanguage][key] || key;
}

/**
 * Get current language
 * @returns {string} The current language code ('en' or 'ar')
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
  // Update document language and direction
  document.documentElement.lang =
    translations[currentLanguage].htmlAttributes.lang;
  document.documentElement.dir =
    translations[currentLanguage].htmlAttributes.dir;

  // Update page title based on current page
  const currentPath = document.location.pathname;
  if (currentPath.includes("/cashier.html") || currentPath.includes("/pages/cashier.html")) {
    document.title = getTranslation("cashierPageTitle");
  } else if (currentPath.includes("/cart.html") || currentPath.includes("/pages/cart.html")) {
    document.title = getTranslation("cartPageTitle");
  } else if (currentPath.includes("/profile.html") || currentPath.includes("/pages/profile.html")) {
    document.title = getTranslation("profilePageTitle");
  } else if (currentPath.includes("/register.html") || currentPath.includes("/pages/register.html")) {
    document.title = getTranslation("pageTitle");
  } else if (
    currentPath.includes("/index.html") ||
    currentPath === "/" ||
    currentPath.endsWith("/")
  ) {
    // Index page or root path
    document.title = getTranslation("indexPageTitle");
  } else {
    // Default to index page title for any other page
    document.title = getTranslation("indexPageTitle");
  }

  // Update all elements with data-i18n attribute
  const elements = document.querySelectorAll("[data-i18n]");
  elements.forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[currentLanguage][key]) {
      element.innerHTML = translations[currentLanguage][key];
    }
  });

  // Update placeholders
  const inputElements = document.querySelectorAll("[data-i18n-placeholder]");
  inputElements.forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    if (translations[currentLanguage][key]) {
      element.placeholder = translations[currentLanguage][key];
    }
  });

  // Update directional styles based on current language
  updateDirectionalStyles();

  // Ensure rating buttons reflect current language
  try {
    const ratingButtons = document.querySelectorAll(".order-rating-btn");
    ratingButtons.forEach((btn) => {
      const orderCard = btn.closest(".order-card");
      const isRated = orderCard
        ? orderCard.getAttribute("data-is-rated") === "true"
        : btn.classList.contains("disabled");

      // Update title
      btn.setAttribute(
        "title",
        getTranslation(isRated ? "orderRatedTooltip" : "rateOrder")
      );

      // Update label text while preserving the icon
      const icon = btn.querySelector("i") || document.createElement("i");
      if (!icon.parentNode) icon.className = "fas fa-star";
      btn.innerHTML = "";
      btn.appendChild(icon);
      btn.appendChild(
        document.createTextNode(
          getTranslation(isRated ? "orderRated" : "rateOrder")
        )
      );
    });
  } catch (e) {}
}

/**
 * Switch the current language
 */
function switchLanguage() {
  currentLanguage = currentLanguage === "ar" ? "en" : "ar";
  localStorage.setItem("public-language", currentLanguage);

  // Apply translations to all elements
  applyTranslations();

  // Update language switcher text
  const languageSwitcher = document.getElementById("language-switcher");
  if (languageSwitcher) {
    languageSwitcher.textContent = getTranslation("switchLanguage");
  }

  // Update document title based on current page
  const currentPath = document.location.pathname;
  if (currentPath.includes("/cashier.html") || currentPath.includes("/pages/cashier.html")) {
    document.title = getTranslation("cashierPageTitle");
  } else if (currentPath.includes("/cart.html") || currentPath.includes("/pages/cart.html")) {
    document.title = getTranslation("cartPageTitle");
  } else if (currentPath.includes("/profile.html") || currentPath.includes("/pages/profile.html")) {
    document.title = getTranslation("profilePageTitle");
  } else if (currentPath.includes("/register.html") || currentPath.includes("/pages/register.html")) {
    document.title = getTranslation("pageTitle");
  } else if (
    currentPath.includes("/index.html") ||
    currentPath === "/" ||
    currentPath.endsWith("/")
  ) {
    // Index page or root path
    document.title = getTranslation("indexPageTitle");
  } else {
    // Default to index page title for any other page
    document.title = getTranslation("indexPageTitle");
  }

  // Update all data-i18n-title attributes
  const elementsWithTitleAttr = document.querySelectorAll("[data-i18n-title]");
  elementsWithTitleAttr.forEach((el) => {
    const titleKey = el.getAttribute("data-i18n-title");
    if (titleKey) {
      el.setAttribute("title", getTranslation(titleKey));
    }
  });

  // Update input placeholders
  const inputElements = document.querySelectorAll("[data-i18n-placeholder]");
  inputElements.forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    if (translations[currentLanguage][key]) {
      element.placeholder = getTranslation(key);
    }
  });

  // Dispatch a custom event for components to respond to language changes
  const languageChangeEvent = new CustomEvent("language_changed", {
    detail: { language: currentLanguage },
  });
  document.dispatchEvent(languageChangeEvent);

  // Reload all dynamic content
  reloadDynamicContent();

  // Show notification about language change
  if (typeof showFixedNotification === "function") {
    // Only show the language change notification if notifications are enabled
    if (
      typeof window.notificationsEnabled !== "undefined" &&
      window.notificationsEnabled === false
    ) {
      // Don't show notification when notifications are disabled
      return;
    }

    const langName = currentLanguage === "ar" ? "العربية" : "English";
    showFixedNotification(
      getTranslation("changeLanguage"),
      `${getTranslation("languageChangedTo")} ${langName}`,
      "info",
      false // Don't force show when notifications are disabled
    );
  }
}

/**
 * Initialize i18n functionality
 */
function initI18n() {
  // Get the language from localStorage or use default
  currentLanguage = localStorage.getItem("public-language") || "ar";

  // Create language switcher button if it doesn't exist
  if (!document.getElementById("language-switcher")) {
    const languageSwitcher = document.createElement("button");
    languageSwitcher.id = "language-switcher";
    languageSwitcher.className = "language-switcher";
    languageSwitcher.textContent = getTranslation("switchLanguage");
    languageSwitcher.addEventListener("click", switchLanguage);

    // Add the button to the document
    document.body.appendChild(languageSwitcher);
  }

  // Apply initial translations
  applyTranslations();

  // Mark body as ready to show content
  document.body.classList.add("i18n-ready");

  // Set up specific page titles
  const currentPath = document.location.pathname;
  if (currentPath.includes("/cashier.html") || currentPath.includes("/pages/cashier.html")) {
    document.title = getTranslation("cashierPageTitle");
  } else if (currentPath.includes("/cart.html") || currentPath.includes("/pages/cart.html")) {
    document.title = getTranslation("cartPageTitle");
  } else if (currentPath.includes("/profile.html") || currentPath.includes("/pages/profile.html")) {
    document.title = getTranslation("profilePageTitle");
  } else if (currentPath.includes("/register.html") || currentPath.includes("/pages/register.html")) {
    document.title = getTranslation("pageTitle");
  } else if (
    currentPath.includes("/index.html") ||
    currentPath === "/" ||
    currentPath.endsWith("/")
  ) {
    // Index page or root path
    document.title = getTranslation("indexPageTitle");
  } else {
    // Default to index page title for any other page
    document.title = getTranslation("indexPageTitle");
  }

  // Update all data-i18n-title attributes
  const elementsWithTitleAttr = document.querySelectorAll("[data-i18n-title]");
  elementsWithTitleAttr.forEach((el) => {
    const titleKey = el.getAttribute("data-i18n-title");
    if (titleKey) {
      el.setAttribute("title", getTranslation(titleKey));
    }
  });

  // Listen for language change events
  document.addEventListener("language_changed", function (event) {
    console.log("Language changed to: " + event.detail.language);
  });
}

/**
 * Update directional styles based on current language
 */
function updateDirectionalStyles() {
  const isRTL = document.documentElement.dir === "rtl";

  // Adjust input icons
  const inputIcons = document.querySelectorAll(
    ".input-with-icon i:not(.fa-eye):not(.fa-eye-slash)"
  );
  inputIcons.forEach((icon) => {
    if (isRTL) {
      icon.style.right = "16px";
      icon.style.left = "auto";
    } else {
      icon.style.left = "16px";
      icon.style.right = "auto";
    }
  });

  // Adjust inputs padding
  const inputs = document.querySelectorAll(".input-with-icon input");
  inputs.forEach((input) => {
    if (isRTL) {
      input.style.paddingRight = "45px";
      input.style.paddingLeft = "15px";
    } else {
      input.style.paddingLeft = "45px";
      input.style.paddingRight = "15px";
    }
  });

  // Adjust password toggle button
  const toggleButtons = document.querySelectorAll(".toggle-password");
  toggleButtons.forEach((button) => {
    if (isRTL) {
      button.style.left = "16px";
      button.style.right = "auto";
      const eyeIcon = button.querySelector(".fa-eye, .fa-eye-slash");
      if (eyeIcon) {
        eyeIcon.style.right = "-14px";
      }
    } else {
      button.style.right = "16px";
      button.style.left = "auto";
      const eyeIcon = button.querySelector(".fa-eye, .fa-eye-slash");
      if (eyeIcon) {
        eyeIcon.style.right = "0px";
      }
    }
  });

  // Adjust button icons
  const buttonIcons = document.querySelectorAll(".auth-button i, .auth-link i");
  buttonIcons.forEach((icon) => {
    if (isRTL) {
      if (icon.classList.contains("fa-arrow-left")) {
        icon.classList.remove("fa-arrow-left");
        icon.classList.add("fa-arrow-right");
      }
      // Reset any inline transform styles
      icon.style.transform = "";
    } else {
      if (icon.classList.contains("fa-arrow-right")) {
        icon.classList.remove("fa-arrow-right");
        icon.classList.add("fa-arrow-left");
      }
      // Reset any inline transform styles
      icon.style.transform = "";
    }
  });

  // Adjust back button icon
  const backButtonIcon = document.querySelector("#back-to-home i");
  if (backButtonIcon) {
    if (isRTL) {
      if (backButtonIcon.classList.contains("fa-arrow-left")) {
        backButtonIcon.classList.remove("fa-arrow-left");
        backButtonIcon.classList.add("fa-arrow-right");
      }
      backButtonIcon.style.marginRight = "0";
      backButtonIcon.style.marginLeft = "9px";
      backButtonIcon.style.transform = "none";
    } else {
      if (backButtonIcon.classList.contains("fa-arrow-right")) {
        backButtonIcon.classList.remove("fa-arrow-right");
        backButtonIcon.classList.add("fa-arrow-left");
      }
      backButtonIcon.style.marginRight = "9px";
      backButtonIcon.style.marginLeft = "0";
      backButtonIcon.style.transform = "translateX(-3px)";

      // Add hover effect for English language
      const backButton = document.querySelector("#back-to-home");
      if (backButton) {
        backButton.addEventListener("mouseenter", function () {
          backButtonIcon.style.transform = "translateX(-6px)";
        });
        backButton.addEventListener("mouseleave", function () {
          backButtonIcon.style.transform = "translateX(-3px)";
        });
      }
    }
  }

  // Adjust checkbox margins in form-check based on language direction
  const formCheckInputs = document.querySelectorAll(".form-check input");
  formCheckInputs.forEach((input) => {
    if (isRTL) {
      input.style.marginLeft = "8px";
      input.style.marginRight = "10px";
    } else {
      input.style.marginLeft = "10px";
      input.style.marginRight = "8px";
    }
  });

  // Style the language switcher
  const languageSwitcher = document.getElementById("language-switcher");
  if (languageSwitcher) {
    Object.assign(languageSwitcher.style, {
      position: "fixed",
      top: "20px",
      [isRTL ? "left" : "right"]: "20px",
      [isRTL ? "right" : "left"]: "auto",
      padding: "8px 15px",
      backgroundColor: "#131c32",
      color: "#ffffff",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "8px",
      cursor: "pointer",
      zIndex: "1000",
      fontWeight: "600",
      fontSize: "0.9rem",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
      transition: "all 0.3s ease",
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initI18n);

// Export functions for use in other files
window.i18n = {
  getTranslation,
  switchLanguage,
  applyTranslations,
  getCurrentLanguage,
  reloadDynamicContent,
};

// Also export switchLanguage as a standalone function for direct access
window.switchLanguage = switchLanguage;

/**
 * Reload dynamic content after language change
 */
function reloadDynamicContent() {
  // Note: Categories and products are updated via language_changed event listener
  // in script.js using fast update functions (no API reload needed)

  // Reload active orders if the function exists
  if (typeof loadActiveOrders === "function") {
    console.log("Reloading active orders after language change");
    loadActiveOrders();
  }

  // Reload recent activity if the function exists
  if (typeof loadRecentActivity === "function") {
    console.log("Reloading recent activity after language change");
    loadRecentActivity();
  }

  // Reload reservations if the function exists
  if (typeof loadReservationsForDate === "function") {
    console.log("Reloading reservations after language change");
    const reservationDateInput = document.getElementById("reservation-date");
    if (reservationDateInput && reservationDateInput.value) {
      loadReservationsForDate(reservationDateInput.value);
    }
  }

  // Reload menu items if the function exists
  if (typeof loadMenuItems === "function") {
    console.log("Reloading menu items after language change");
    loadMenuItems();
  }

  // Reload cart items if the function exists
  if (typeof updateCartDisplay === "function") {
    console.log("Reloading cart display after language change");
    updateCartDisplay();
  }

  // Update any notification button states
  const notificationBtn = document.getElementById("notification-toggle-btn");
  if (notificationBtn) {
    const isEnabled = !notificationBtn.classList.contains("disabled");
    const titleKey = isEnabled ? "notificationsOff" : "notificationsOn";
    notificationBtn.setAttribute("title", getTranslation(titleKey));
  }
}

// Export functions for use in other files
window.i18n = {
  getTranslation,
  switchLanguage,
  applyTranslations,
  getCurrentLanguage,
  reloadDynamicContent,
};
