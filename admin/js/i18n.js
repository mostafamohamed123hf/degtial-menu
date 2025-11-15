/**
 * i18n.js - Internationalization for admin pages
 * Handles language switching between Arabic and English
 */

// Add a debounce flag at the top of the file
let isLanguageSwitchInProgress = false;

// Default language is Arabic
let currentLanguage = localStorage.getItem("admin-language") || "ar";

// Translations object
const translations = {
  ar: {
    // Document attributes
    htmlAttributes: {
      lang: "ar",
      dir: "rtl",
    },

    // Login page
    pageTitle: "تسجيل الدخول | لوحة التحكم",
    loginTitle: "تسجيل الدخول للوحة التحكم",
    loginSubtitle: "أدخل بيانات الدخول للوصول للوحة التحكم",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    rememberMe: "تذكرني",
    loginButton: '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول',
    backToMenu: '<i class="fas fa-arrow-right"></i> العودة للقائمة الرئيسية',
    checkingServer: "جاري التحقق من اتصال الخادم...",

    // Dashboard title
    dashboardTitle: "لوحة تحكم القائمة الرقمية",
    dashboardDescription:
      "قم بإدارة منتجاتك وعروضك والمزيد من خلال لوحة التحكم الخاصة بك",

    // Features
    featureReports: "تقارير وإحصائيات متقدمة",
    featureSales: "مراقبة المبيعات والإحصائيات",
    featureProducts: "إدارة المنتجات والفئات",
    featureOffers: "إدارة العروض والخصومات",
    featureQR: "إنشاء رموز QR للطاولات",

    // Form placeholders
    usernamePlaceholder: "أدخل اسم المستخدم",
    passwordPlaceholder: "أدخل كلمة المرور",

    // Error messages
    invalidCredentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
    serverConnectionError: "يرجى التحقق من اتصالك بالخادم",
    loginError: "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.",

    // Server status messages
    serverOnline: "الخادم متصل ويعمل بشكل طبيعي",
    serverOffline: "لا يمكن الاتصال بالخادم",
    serverError: "تم الاتصال بالخادم ولكن هناك مشكلة",

    // Success messages
    loginSuccess:
      '<i class="fas fa-check-circle success-checkmark"></i> تم تسجيل الدخول بنجاح. جاري التحويل...',
    loginSuccessRedirect: "تم تسجيل الدخول بنجاح. جاري التحويل...",
    loginSuccessViaRole: "تم تسجيل الدخول بنجاح عبر صلاحيات الدور: ",
    loggingIn: '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...',

    // Admin settings messages
    formFieldsNotFound: "لم يتم العثور على حقول النموذج",
    fillAllRequiredFields: "يرجى تعبئة جميع الحقول المطلوبة",
    adminDataSavedSuccessfully: "تم حفظ بيانات المدير بنجاح",
    adminDataNotFound: "لم يتم العثور على بيانات المدير. يرجى تسجيل الخروج وإعادة تسجيل الدخول.",
    currentPasswordIncorrect: "كلمة المرور الحالية غير صحيحة",
    newPasswordMinLength: "يجب أن تكون كلمة المرور الجديدة 4 أحرف على الأقل",
    passwordsDoNotMatch: "كلمة المرور الجديدة وتأكيدها غير متطابقين",

    // Language switcher
    switchLanguage: "English",

    // Admin Dashboard
    adminDashboard: "لوحة التحكم",
    adminGreeting: "مرحباً،",
    adminLogout: "تسجيل الخروج",
    overview: "نظرة عامة",
    products: "المنتجات",
    categories: "الفئات",
    vouchers: "القسائم",
    offers: "العروض",
    tax: "الضريبة",
    qrCodes: "رموز QR",
    reservations: "الحجوزات",
    loyaltyPoints: "نقاط الولاء",
    customerAccounts: "حسابات العملاء",
    adminSettings: "إعدادات المدير",
    globalSettings: "الإعدادات العامة",
    menuPage: "صفحة القائمة",
    cashierSystem: "نظام الكاشير",
    submenuMode: "وضع القوائم الفرعية",

    // Dashboard Stats
    totalRevenue: "إجمالي الإيرادات",
    ordersCount: "عدد الطلبات",
    totalProducts: "إجمالي المنتجات",
    discountVouchers: "قسائم الخصم",
    averageOrderValue: "متوسط قيمة الطلب",
    todayStats: "إحصائيات اليوم",
    todayOrders: "طلبات اليوم",
    todayRevenue: "إيرادات اليوم",
    salesAnalysis: "تحليل المبيعات",
    weekly: "أسبوعي",
    monthly: "شهري",
    quarterly: "ربع سنوي",
    yearly: "سنوي",
    customRange: "نطاق مخصص",
    recentOrders: "آخر الطلبات",
    filterByDate: "تصفية حسب التاريخ:",
    filterByStatus: "تصفية حسب الحالة:",
    allStatuses: "جميع الحالات",
    clear: "مسح",
    noRecentOrders: "لا توجد طلبات حديثة",
    ordersFilterApplied: "تم تطبيق التصفية على الطلبات",
    ordersStatusUpdated: "تم تحديث حالة الطلبات",
    noOrdersOnDate: "لا توجد طلبات في هذا التاريخ",
    noOrdersForFilters: "لا توجد طلبات مطابقة لمعايير التصفية",
    bestProducts: "المنتجات الأكثر طلباً",
    noOrderedProducts: "لا توجد منتجات مطلوبة حتى الآن",
    resetStats: "إعادة تعيين الإحصائيات",
    orderText: "طلب",
    noProducts: "لا توجد منتجات",

    // Crowded Hours
    crowdedHoursTitle: "ساعات الذروة",
    crowdedHoursDescription: "أكثر الساعات ازدحاماً خلال اليوم",
    morningPeriod: "الصباح",
    afternoonPeriod: "الظهيرة",
    eveningPeriod: "المساء",
    nightPeriod: "الليل",
    lowTraffic: "منخفض",
    moderateTraffic: "متوسط",
    highTraffic: "مرتفع",
    veryHighTraffic: "مرتفع جداً",
    trafficLevel: "مستوى الازدحام",
    timeSlot: "الفترة الزمنية",
    noTrafficData: "لا توجد بيانات ازدحام متاحة",

    // Products Management
    productsManagement: "إدارة المنتجات",
    addNewProduct: "إضافة منتج جديد",
    globalDiscount: "تطبيق خصم على جميع المنتجات",
    discountPercentage: "نسبة الخصم:",
    applyDiscount: "تطبيق الخصم",
    cancelDiscount: "إلغاء الخصم",

    // Categories Management
    categoriesManagement: "إدارة الفئات",
    addNewCategory: "إضافة فئة جديدة",
    categoryNameArLabel: "اسم الفئة :",
    categoryNameEnLabel: "اسم الفئة :",
    categoryNamePlaceholder: "اكتب اسم الفئة بالعربية",
    categoryNameEnPlaceholder: "اكتب الاسم باللغة الإنجليزية",
    categoryValue: "قيمة الفئة:",
    categoryValuePlaceholder: "مثال: pizza, burger, drink",
    categoryValueHint: "استخدم أحرف إنجليزية صغيرة بدون مسافات",
    categoryIcon: "أيقونة الفئة:",
    categoryIconPlaceholder: "fas fa-utensils",
    categoryIconHint: "استخدم فئة أيقونة Font Awesome (اختياري)",
    categorySortOrder: "ترتيب العرض:",
    categorySortOrderHint: "الأرقام الأقل تظهر أولاً (0، 1، 2، ...)",
    sortOrder: "ترتيب العرض",
    categoryNames: "أسماء الفئات",
    categoryDisplay: "عرض الفئة",
    chooseIcon: "اختر أيقونة",
    popularIcons: "أيقونات شائعة",
    saveCategory: "حفظ الفئة",
    editCategory: "تعديل الفئة",
    deleteCategory: "حذف الفئة",
    categoryAdded: "تم إضافة الفئة بنجاح",
    categoryUpdated: "تم تحديث الفئة بنجاح",
    categoryDeleted: "تم حذف الفئة بنجاح",
    confirmDeleteCategory: "هل أنت متأكد من حذف هذه الفئة؟",
    noCategories: "لا توجد فئات",

    // Voucher Management
    vouchersManagement: "إدارة القسائم",
    addNewVoucher: "إضافة قسيمة جديدة",

    // Offers Management
    offersManagement: "إدارة العروض",
    addNewOffer: "إضافة عرض جديد",
    editOffer: "تعديل العرض",
    noOffers: "لا توجد عروض",
    titleArabic: "العنوان (عربي)",
    titleEnglish: "العنوان (إنجليزي)",
    descriptionArabic: "الوصف (عربي)",
    descriptionEnglish: "الوصف (إنجليزي)",
    originalPrice: "السعر الأصلي",
    discountedPrice: "السعر بعد الخصم",
    discountPercentage: "نسبة الخصم (%)",
    imageUrl: "رابط الصورة",
    category: "الفئة",
    allCategories: "جميع الفئات",
    newOffers: "جديد",
    weeklyOffers: "عروض أسبوعية",
    specialOffers: "عروض خاصة",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    userLimit: "حد المستخدمين",
    unlimitedIfEmpty: "غير محدود إذا كان فارغاً",
    userLimitHint: "اترك فارغاً للسماح لعدد غير محدود من المستخدمين",
    minimumPurchase: "الحد الأدنى للشراء",
    noMinimumIfEmpty: "لا يوجد حد أدنى إذا كان فارغاً",
    minPurchaseHint: "اترك فارغاً إذا لم يكن هناك حد أدنى للشراء",
    customerEligibility: "أهلية العملاء",
    allCustomers: "جميع العملاء",
    newCustomersOnly: "العملاء الجدد فقط",
    existingCustomersOnly: "العملاء الحاليون فقط",
    loyaltyMembersOnly: "أعضاء الولاء فقط",
    customerEligibilityHint: "حدد من يمكنه استخدام هذا العرض",
    eligibilityHintAll: "متاح لجميع العملاء بدون قيود",
    eligibilityHintNew: "متاح فقط للعملاء الذين يقومون بالطلب لأول مرة",
    eligibilityHintExisting: "متاح فقط للعملاء الذين لديهم طلبات سابقة",
    eligibilityHintLoyalty: "متاح فقط للعملاء المسجلين في برنامج الولاء",
    active: "نشط",
    inactive: "غير نشط",
    featured: "مميز",
    status: "الحالة",
    all: "الكل",
    activate: "تفعيل",
    deactivate: "إلغاء التفعيل",
    basicInformation: "المعلومات الأساسية",
    pricingInformation: "معلومات التسعير",
    offerDuration: "مدة العرض",
    offerRestrictions: "قيود العرض",
    offerStatus: "حالة العرض",
    noImagePreview: "لا توجد معاينة للصورة",
    imageLoadError: "فشل تحميل الصورة",
    autoCalculated: "محسوب تلقائياً",
    activeHint: "العرض مرئي للعملاء",
    featuredHint: "عرض مميز في الصفحة الرئيسية",
    offerUpdatedSuccess: "تم تحديث العرض بنجاح",
    offerAddedSuccess: "تم إضافة العرض بنجاح",
    offerSaveFailed: "فشل حفظ العرض",
    offerStatusUpdated: "تم تحديث حالة العرض بنجاح",
    offerStatusUpdateFailed: "فشل تحديث حالة العرض",
    offerDeletedSuccess: "تم حذف العرض بنجاح",
    offerDeleteFailed: "فشل حذف العرض",
    confirmDeleteOffer: 'هل أنت متأكد من حذف العرض "{title}"؟',
    
    // Offers - New Features
    bulkActions: "إجراءات جماعية",
    totalOffers: "إجمالي العروض",
    activeOffers: "العروض النشطة",
    featuredOffers: "العروض المميزة",
    expiredOffers: "العروض المنتهية",
    avgDiscount: "متوسط الخصم",
    searchOffers: "ابحث عن عرض...",
    sortBy: "ترتيب حسب",
    newest: "الأحدث",
    oldest: "الأقدم",
    discountHighToLow: "الخصم (الأعلى للأقل)",
    discountLowToHigh: "الخصم (الأقل للأعلى)",
    priceHighToLow: "السعر (الأعلى للأقل)",
    priceLowToHigh: "السعر (الأقل للأعلى)",
    viewMode: "وضع العرض",
    resetFilters: "إعادة تعيين الفلاتر",
    selected: "محدد",
    makeFeatured: "جعل مميز",
    duplicate: "نسخ",
    preview: "معاينة",
    copy: "نسخة",
    previewOffer: "معاينة العرض",
    confirmBulkActivate: "هل تريد تفعيل العروض المحددة؟",
    confirmBulkDeactivate: "هل تريد إلغاء تفعيل العروض المحددة؟",
    confirmBulkFeature: "هل تريد جعل العروض المحددة مميزة؟",
    confirmBulkDelete: "هل تريد حذف العروض المحددة؟ لا يمكن التراجع عن هذا الإجراء.",
    bulkActivateSuccess: "تم تفعيل العروض بنجاح",
    bulkActivateFailed: "فشل تفعيل العروض",
    bulkDeactivateSuccess: "تم إلغاء تفعيل العروض بنجاح",
    bulkDeactivateFailed: "فشل إلغاء تفعيل العروض",
    bulkFeatureSuccess: "تم جعل العروض مميزة بنجاح",
    bulkFeatureFailed: "فشل جعل العروض مميزة",
    bulkDeleteSuccess: "تم حذف العروض بنجاح",
    bulkDeleteFailed: "فشل حذف العروض",

    // Tax Settings
    taxSettings: "إعدادات الضريبة",
    taxRate: "نسبة الضريبة:",
    enableTax: "تفعيل الضريبة:",
    serviceTaxRate: "نسبة ضريبة الخدمة:",
    enableServiceTax: "تفعيل ضريبة الخدمة:",
    saveSettings: "حفظ الإعدادات",

    // Reservations
    reservationsManagement: "إدارة الحجوزات",
    reservationStatus: "حالة الحجز:",
    all: "الكل",
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    completed: "مكتمل",
    cancelled: "ملغي",
    date: "التاريخ:",
    clearFilters: "مسح التصفية",
    name: "الاسم",
    phoneNumber: "رقم الهاتف",
    guestsCount: "عدد الضيوف",
    time: "الوقت",
    status: "الحالة",
    notes: "ملاحظات",
    idCard: "بطاقة الهوية",
    actions: "الإجراءات",
    noReservations: "لا توجد حجوزات",

    // Loyalty Points
    loyaltyPointsManagement: "إدارة نقاط الولاء",
    resetPoints: "إعادة تعيين النقاط",
    resetPointsDesc: "إعادة تعيين نقاط الولاء لعميل محدد أو لجميع العملاء",
    customer: "العميل:",
    allCustomers: "جميع العملاء",
    reset: "إعادة تعيين",
    adjustPoints: "تعديل النقاط",
    adjustPointsDesc: "إضافة أو خصم نقاط الولاء لعميل محدد",
    value: "القيمة:",
    points: "نقطة",
    negativeForDeduction: "استخدم قيمة سالبة للخصم",
    apply: "تطبيق",
    processingAction: "جاري المعالجة...",
    customDiscount: "خصم مخصص",
    customDiscountDesc: "تمكين الخصم المخصص في سلة التسوق بناءً على النقاط",
    discountPerPoint: "نسبة الخصم لكل نقطة:",
    maxDiscount: "الحد الأقصى للخصم:",
    minPointsForDiscount: "الحد الأدنى للنقاط:",
    enableCustomDiscount: "تفعيل الخصم المخصص",
    pointsSettings: "إعدادات النقاط",
    pointsSettingsDesc: "تكوين معدل اكتساب النقاط وصلاحيتها",
    pointsExchangeRate: "كل (ج.م) يساوي:",
    pointsPerEGP: "عدد النقاط المكتسبة عند إنفاق 1 جنيه مصري",
    pointsExpiryDays: "انتهاء صلاحية النقاط بعد:",
    day: "يوم",
    noExpiryHint: "تعيين لـ 0 لجعل النقاط غير منتهية الصلاحية",
    freeItems: "العناصر المجانية",
    freeItemsDesc:
      "تمكين العملاء من الحصول على عناصر مجانية عند جمع نقاط كافية",
    noFreeItems: "لا توجد عناصر مجانية محددة",
    product: "المنتج:",
    requiredPoints: "النقاط المطلوبة:",
    addFreeItem: "إضافة عنصر مجاني",

    // Customer Accounts
    accountsManagement: "إدارة الحسابات",
    searchCustomer: "البحث عن عميل بالاسم أو البريد الإلكتروني...",
    search: "بحث",
    manageRoles: "إدارة الأدوار",
    filter: "تصفية",
    refresh: "تحديث",
    email: "البريد الإلكتروني",
    role: "الدور",
    registrationDate: "تاريخ التسجيل",

    // Admin Settings
    displayName: "الاسم الظاهر:",
    currentPassword: "كلمة المرور الحالية:",
    newPassword: "كلمة المرور الجديدة:",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة:",
    leaveEmptyHint: "اترك فارغاً إذا لم ترد التغيير",
    saveAdminData: "حفظ بيانات المدير",
    securityTips: "نصائح الأمان:",
    securityTip1: "استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز.",
    securityTip2: "لا تشارك بيانات الدخول مع أي شخص غير مصرح له.",
    securityTip3: "قم بتغيير كلمة المرور بشكل دوري للحفاظ على أمان حسابك.",

    // Global Settings
    generalSettings: "الإعدادات العامة",
    bannerSettings: "إعدادات البانر",
    heroBannerSettings: "إعدادات البانر الرئيسي",
    enableHeroBanner: "تفعيل البانر الرئيسي",
    workingHours: "ساعات العمل",
    startTime: "وقت البدء",
    endTime: "وقت الانتهاء",
    workingDays: "أيام العمل",
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
    contactInformation: "معلومات الاتصال",
    whatsappNumber: "رقم الواتساب",
    emailAddress: "البريد الإلكتروني",
    currencySettings: "إعدادات العملة",
    currencyCode: "رمز العملة",
    currencyAutoHint: "سيتم عرض العملة تلقائياً باللغة المناسبة",
    restaurantInformation: "معلومات المطعم",
    restaurantNameAr: "اسم المطعم (عربي)",
    restaurantNameEn: "اسم المطعم (إنجليزي)",
    restaurantAddressAr: "العنوان (عربي)",
    restaurantAddressEn: "العنوان (إنجليزي)",
    socialMedia: "وسائل التواصل الاجتماعي",
    facebookPage: "صفحة الفيسبوك",
    instagramPage: "صفحة الإنستجرام",
    twitterPage: "صفحة تويتر",
    resetToDefault: "إعادة تعيين",
    saveSettings: "حفظ الإعدادات",
    settingsInfo: "معلومات الإعدادات",
    settingsInfoItem1: "هذه الإعدادات سيتم تطبيقها على النظام بالكامل",
    settingsInfoItem2: "ساعات العمل سيتم عرضها للعملاء في صفحة القائمة",
    settingsInfoItem3: "معلومات الاتصال ستكون متاحة لاستفسارات العملاء",
    settingsInfoItem4: "إعدادات العملة ستؤثر على جميع الأسعار المعروضة في النظام",
    bannerSettingsInfo: "معلومات إعدادات البانر",
    bannerInfoItem1: "سيتم عرض البانر الرئيسي في أعلى صفحة القائمة",
    bannerInfoItem2: "صورة البانر اختيارية - سيتم استخدام خلفية متدرجة افتراضية إذا لم يتم توفير صورة",
    bannerInfoItem3: "معرف الفئة سيقوم بتصفية المنتجات عندما ينقر العملاء على 'اطلب الآن'",
    bannerInfoItem4: "سيتم عرض المحتوى العربي والإنجليزي بناءً على اللغة المختارة",
    bannerTitleAr: "عنوان البانر (عربي)",
    bannerTitleEn: "عنوان البانر (إنجليزي)",
    bannerDescriptionAr: "وصف البانر (عربي)",
    bannerDescriptionEn: "وصف البانر (إنجليزي)",
    bannerCategory: "فئة البانر",
    bannerCategoryHint: "أدخل معرف الفئة (مثال: burger, pizza)",
    bannerImageUrl: "رابط صورة البانر",
    bannerImageHint: "أدخل رابط الصورة أو اتركه فارغاً لاستخدام الخلفية الافتراضية",
    bannerPreview: "معاينة البانر",
    confirmResetSettings: "هل أنت متأكد من إعادة تعيين الإعدادات إلى القيم الافتراضية؟",
    settingsLoaded: "تم تحميل الإعدادات بنجاح",
    errorLoadingSettings: "خطأ في تحميل الإعدادات",
    settingsSaved: "تم حفظ الإعدادات بنجاح!",
    errorSavingSettings: "خطأ في حفظ الإعدادات: ",
    settingsReset: "تم إعادة تعيين الإعدادات إلى القيم الافتراضية!",
    errorResettingSettings: "خطأ في إعادة تعيين الإعدادات: ",

    // Chart Data Summary
    totalSales: "إجمالي المبيعات",
    avgSale: "متوسط المبيعات",
    highestDay: "أعلى يوم مبيعات",
    exportOrdersReport: "تصدير تقرير الطلبات",

    // QR Code Generator
    qrGenerator: "توليد رموز QR للطاولات",
    tableNumber: "رقم الطاولة:",
    createQR: "إنشاء رمز QR",
    qrPlaceholder: "الرجاء إدخال رقم الطاولة لإنشاء رمز QR",
    generatedQRCodes: "رموز QR المُنشأة",
    noQrCodes: "لم يتم إنشاء أي رموز QR بعد",
    createdQrCodes: "رموز QR المُنشأة",

    // Modals
    addProduct: "إضافة منتج جديد",
    editProduct: "تعديل المنتج",
    productName: "اسم المنتج:",
    productNameArLabel: "اسم المنتج:",
    productNamePlaceholder: "اكتب اسم المنتج بالعربية",
    productNameEnLabel: "اسم المنتج :",
    productNameEnPlaceholder: "Example: Classic Pepperoni",
    category: "الفئة:",
    productDescription: "وصف المنتج:",
    productDescriptionArLabel: "وصف المنتج :",
    productDescriptionPlaceholder: "اكتب وصف المنتج بالعربية",
    productDescriptionEnLabel: "الوصف :",
    productDescriptionEnPlaceholder: "Describe the product in English",
    price: "السعر:",
    currency: "جنية",
    productImage: "صورة المنتج:",
    imageLink: "رابط صورة",
    uploadImage: "رفع صورة",
    preview: "معاينة",
    dragDropImage: "اضغط لاختيار صورة أو اسحب وأفلت الصورة هنا",
    noPreview: "لا توجد معاينة",
    addons: "الإضافات:",
    noAddons: "لا توجد إضافات لهذا المنتج",
    addNewSection: "إضافة قسم جديد",
    addAddonOption: "إضافة خيار جديد",
    required: "إجباري",
    singleChoice: "خيار واحد فقط",
    saveProduct: "حفظ المنتج",
    languageArabic: "عربي",
    languageEnglish: "إنجليزي",
    optionalLabel: "اختياري",

    // Voucher Modal
    addVoucher: "إضافة قسيمة جديدة",
    editVoucher: "تعديل القسيمة",
    voucherCode: "كود القسيمة:",
    generate: "توليد",
    discountPercentage: "نسبة الخصم:",
    minOrder: "الحد الأدنى للطلب:",
    leaveZeroHint: "اترك القيمة 0 لعدم تحديد حد أدنى للطلب",
    targetCategory: "الفئة المستهدفة:",
    allCategories: "جميع الفئات",
    expiryDate: "تاريخ انتهاء الصلاحية:",
    saveVoucher: "حفظ القسيمة",
    expired: "منتهي",
    active: "ساري",

    // Voucher card details and QR
    discountWord: "خصم",
    expiryDateLabel: "تاريخ الانتهاء:",
    tableNumberLabel: "رقم الطاولة:",
    minOrderCardLabel: "الحد الأدنى:",
    tableWord: "طاولة",
    saveQr: "حفظ رمز QR",

    // Offline warning
    offlineWarning:
      "أنت حالياً غير متصل بالإنترنت. بعض الميزات قد لا تعمل حتى تستعيد الاتصال.",

    // Chart translations
    salesRevenue: "إيرادات المبيعات",
    // currencySymbol: "جنية", // Now loaded dynamically from global settings
    noWeeklyData: "لا توجد بيانات مبيعات للأسبوع الماضي",
    noMonthlyData: "لا توجد بيانات مبيعات للشهر الماضي",
    noQuarterlyData: "لا توجد بيانات مبيعات للربع الحالي",
    noYearlyData: "لا توجد بيانات مبيعات للسنة الحالية",

    // Day names
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",

    // Month names
    january: "يناير",
    february: "فبراير",
    march: "مارس",
    april: "أبريل",
    may: "مايو",
    june: "يونيو",
    july: "يوليو",
    august: "أغسطس",
    september: "سبتمبر",
    october: "أكتوبر",
    november: "نوفمبر",
    december: "ديسمبر",

    // Week labels for monthly chart
    week1: "الأسبوع الأول",
    week2: "الأسبوع الثاني",
    week3: "الأسبوع الثالث",
    week4: "الأسبوع الرابع",
    week5: "الأسبوع الخامس",

    // Order statuses
    orderStatusCompleted: "مكتمل",
    orderStatusPending: "قيد الانتظار",
    orderStatusCancelled: "ملغي",
    orderStatusProcessing: "قيد التنفيذ",

    // Account Permissions Modal
    manageUserPermissions: "إدارة صلاحيات المستخدم",
    permissionsIntro:
      "تحديد صلاحيات الوصول لمختلف أقسام وميزات النظام. الرجاء تحديد الصلاحيات المناسبة للمستخدم.",
    pageAccessPermissions: "صلاحيات الوصول للصفحات",
    adminPanelAccess: "الوصول للوحة التحكم",
    cashierAccess: "الوصول لصفحة الكاشير",
    adminPanelPermissions: "صلاحيات لوحة التحكم",
    viewStats: "عرض الإحصائيات",
    viewProducts: "عرض المنتجات",
    editProducts: "تعديل المنتجات",
    viewVouchers: "عرض القسائم",
    editVouchers: "تعديل القسائم",
    manageReservations: "إدارة الحجوزات",
    manageTax: "إدارة الضريبة",
    managePoints: "إدارة نقاط الولاء",
    manageAccounts: "إدارة الحسابات",
    manageQrCodes: "إدارة رموز QR",
    cancel: "إلغاء",
    savePermissions: "حفظ الصلاحيات",
    saving: "جاري الحفظ...",

    // Unauthorized Access Messages
    unauthorizedAccessToSection: "ليس لديك صلاحية للوصول إلى هذا القسم",
    unauthorizedAccessTo: "ليس لديك صلاحية للوصول إلى",
    unauthorizedAccessMessage:
      "تحتاج إلى صلاحيات إضافية للوصول إلى هذه البيانات",
    unauthorizedAccessToCustomerAccounts:
      "غير مصرح بالوصول لإدارة حسابات العملاء",
    contactAdministratorForPermissions:
      "يرجى التواصل مع المسؤول للحصول على الصلاحيات اللازمة",
    thisSection: "هذا القسم",

    // Permission Tooltips
    noPermissionToAddProducts: "ليس لديك صلاحية إضافة منتجات",
    noPermissionToEditProducts: "ليس لديك صلاحية تعديل المنتجات",
    noPermissionToDeleteProducts: "ليس لديك صلاحية حذف المنتجات",
    noPermissionToAddVouchers: "ليس لديك صلاحية إضافة قسائم",
    noPermissionToEditVouchers: "ليس لديك صلاحية تعديل القسائم",
    noPermissionToDeleteVouchers: "ليس لديك صلاحية حذف القسائم",
    noPermissionToEditGlobalDiscount: "ليس لديك صلاحية تعديل الخصم العام",
    noPermissionToEditTaxSettings: "ليس لديك صلاحية تعديل إعدادات الضريبة",
    noPermissionToCreateQR: "ليس لديك صلاحية إنشاء رموز QR",
    noPermissionToManageLoyaltyPoints: "ليس لديك صلاحية إدارة نقاط الولاء",
    noPermissionToAddUsers: "ليس لديك صلاحية إضافة مستخدمين",
    noPermissionToManageUsers: "ليس لديك صلاحية إدارة المستخدمين",
    noPermissionToEditProductsNotification: "ليس لديك صلاحية لتعديل المنتجات",
    noPermissionToDeleteProductsNotification: "ليس لديك صلاحية لحذف المنتجات",
    noPermissionToEditTaxSettingsNotification:
      "ليس لديك صلاحية لتعديل إعدادات الضريبة",
    noPermissionToEditVouchersNotification: "ليس لديك صلاحية لتعديل القسائم",
    noPermissionToDeleteVouchersNotification: "ليس لديك صلاحية لحذف القسائم",
    permissionsUpdatedSuccessfully: "تم تحديث الصلاحيات وتطبيقها بنجاح",

    // Role Management
    roleManagement: "إدارة الأدوار",
    rolesIntro: "إنشاء وإدارة الأدوار المخصصة مع تحديد الصلاحيات لكل دور.",
    currentRoles: "الأدوار الحالية",
    noRolesMessage:
      "لا توجد أدوار مخصصة. أضف أدوار جديدة باستخدام النموذج أدناه.",
    addNewRole: "إضافة دور جديد",
    roleName: "اسم الدور:",
    roleNamePlaceholder: "مثال: مدير المبيعات، مشرف المطعم، إلخ.",
    cancelEdit: "إلغاء التعديل",
    saveRole: "حفظ الدور",

    // Assign Role
    assignRoleToUser: "تعيين دور للمستخدم",
    chooseAppropriateRole: "اختر الدور المناسب للمستخدم من القائمة التالية:",
    selectRole: "-- اختر دورًا --",
    cancelAssign: "إلغاء",
    assignRole: "تعيين الدور",

    // ID Card Modal
    idCardImage: "صورة بطاقة الهوية",
    notVerified: "لم يتم التحقق من الهوية بعد",
    approve: "موافقة",
    reject: "رفض",
    ownerName: "اسم الشخص:",
    uploadDate: "تاريخ الرفع:",
    fileSize: "حجم الملف:",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    rotateLeft: "تدوير لليسار",
    rotateRight: "تدوير لليمين",
    resetView: "إعادة العرض",
    download: "تنزيل",

    // Date Range Modal
    selectDateRange: "اختر نطاق التاريخ",
    lastWeek: "آخر أسبوع",
    lastMonth: "آخر شهر",
    lastQuarter: "آخر 3 أشهر",
    customRangeMessage: "اختر نطاق تاريخ مخصص لعرض بيانات المبيعات",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    apply: "تطبيق",

    // QR Code Generator
    qrCodeGenerator: "توليد رموز QR للطاولات",
    createQrCode: "إنشاء رمز QR",

    // Product Addons
    productAddons: "الإضافات",

    // Order details modal
    orderDetails: "تفاصيل الطلب",
    orderItems: "العناصر المطلوبة",
    orderSummary: "ملخص الطلب",
    customerComment: "تعليق العميل",
    dateAndTime: "التاريخ والوقت",
    tableNumber: "رقم الطاولة",
    customerName: "اسم العميل",
    orderRating: "تقييم الطلب",
    orderStatus: "حالة الطلب",
    rated: "تم التقييم",
    notRated: "غير مُقيّم",
    subtotal: "المجموع الفرعي",
    addonsTotal: "إجمالي الإضافات",
    tax: "الضريبة",
    serviceTax: "ضريبة الخدمة",
    discount: "الخصم",
    total: "الإجمالي",
    noItemsAvailable: "لا توجد عناصر متاحة لهذا الطلب",
    unspecified: "غير محدد",

    // Voucher Modal
    minimumOrder: "الحد الأدنى للطلب:",
    // currencyEGP: "جنية", // Now loaded dynamically from global settings
    minOrderHint: "اترك القيمة 0 لعدم تحديد حد أدنى للطلب",
    pizza: "بيتزا",
    burger: "برجر",
    sandwich: "سندوتش",
    drinks: "مشروبات",

    // Date Range Modal
    selectDateRange: "اختر نطاق التاريخ",
    lastWeek: "آخر أسبوع",
    lastMonth: "آخر شهر",
    lastQuarter: "آخر 3 أشهر",
    customRangeMessage: "اختر نطاق تاريخ مخصص لعرض بيانات المبيعات",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",

    // Negative value hint
    negativeValueHint: "استخدم قيمة سالبة للخصم",
    days: "يوم",
    minPoints: "الحد الأدنى للنقاط:",
    pointsExchangeHint: "عدد النقاط المكتسبة عند إنفاق 1 جنيه مصري",
    pointsExpiry: "انتهاء صلاحية النقاط بعد:",
    expiryHint: "تعيين لـ 0 لجعل النقاط غير منتهية الصلاحية",

    // Common actions
    save: "حفظ",
    edit: "تعديل",
    delete: "حذف",
    cancel: "إلغاء",

    // Missing keys used in admin.html
    basicInfo: "المعلومات الأساسية",
    description: "الوصف",
    pricing: "التسعير",
    imageUrl: "رابط صورة",
    productNameEn: "الاسم بالإنجليزية",
    productDescriptionEn: "الوصف بالإنجليزية",
    // Ensure both singular and plural category keys resolve in Arabic
    drink: "مشروبات",
    // Role management English-name helpers
    roleNameEn: "اسم الدور (إنجليزي):",
    roleNameEnPlaceholder: "مثال: مدير المبيعات، مشرف المطعم، إلخ.",
    // ID verification labels alignment
    idNotVerified: "لم يتم التحقق من الهوية بعد",
    personName: "اسم الشخص:",

    // Account actions
    permissions: "الصلاحيات",
    suspend: "إيقاف",
    viewIdCard: "عرض بطاقة الهوية",
    permissionsCount: "عدد الصلاحيات:",

    // Role appearance customization
    roleAppearance: "مظهر الدور",
    roleColor: "لون الدور",
    roleIcon: "أيقونة الدور",
    rolePreview: "معاينة الدور",

    // Notification messages
    offlineModeEnabled: "تم تفعيل وضع عدم الاتصال. سيتم استخدام البيانات المحلية فقط.",
    welcomeMessage: "مرحباً {name}، تم تسجيل الدخول بنجاح",
    fillRequiredFields: "يرجى إدخال المعلومات المطلوبة",
    loginViaRole: "تم تسجيل الدخول عبر صلاحيات الدور: {role}",
    updateAvailable: "تحديث جديد متاح. انقر هنا للتحديث.",
    statsResetSuccess: "تم إعادة تعيين الإحصائيات بنجاح",
    statsResetFailed: "فشل في إعادة تعيين الإحصائيات",
    statsResetError: "حدث خطأ أثناء إعادة تعيين الإحصائيات",
    globalDiscountActive: "يوجد خصم عام مطبق بنسبة {percent}%",
    enterImageLinkFirst: "يرجى إدخال رابط الصورة أولاً",
    cannotLoadImage: "لا يمكن تحميل الصورة، تأكد من صحة الرابط",
    imageLoadedForPreview: "تم تحميل الصورة للمعاينة (سيتم حفظها عند حفظ المنتج)",
    invalidImageFormat: "تنسيق رابط الصورة غير صالح",
    invalidFileType: "نوع الملف غير صالح. يرجى اختيار صورة صالحة",
    fileTooLarge: "حجم الملف كبير جداً. الحد الأقصى هو 2 ميجابايت",
    imageSelectedSuccess: "تم اختيار الصورة بنجاح",
    errorProcessingImage: "حدث خطأ أثناء معالجة الصورة",
    errorReadingFile: "حدث خطأ أثناء قراءة الملف",
    productUpdatedSuccess: "تم تحديث المنتج بنجاح",
    productAddedSuccess: "تم إضافة المنتج بنجاح",
    errorSavingProduct: "حدث خطأ أثناء حفظ المنتج: {error}",
    productDeletedSuccess: "تم حذف المنتج بنجاح",
    errorDeletingProduct: "حدث خطأ أثناء حذف المنتج: {error}",
    errorUpdatingProductsUI: "حدث خطأ أثناء تحديث واجهة المنتجات: {error}",
    taxElementsNotFound: "لم يتم العثور على عناصر إعدادات الضريبة",
    invalidTaxRate: "الرجاء إدخال نسبة ضريبة صحيحة (0-100)",
    invalidServiceRate: "الرجاء إدخال نسبة خدمة صحيحة (0-100)",
    taxSettingsSaved: "تم حفظ إعدادات الضريبة بنجاح",
    taxSettingsSaveFailed: "فشل في حفظ إعدادات الضريبة في قاعدة البيانات",
    taxSettingsSaveError: "حدث خطأ أثناء حفظ إعدادات الضريبة في قاعدة البيانات",
    noOrdersForReport: "لا توجد طلبات لإنشاء تقرير",
    fillAllVoucherData: "يرجى إدخال جميع البيانات المطلوبة",
    voucherDeletedSuccess: "تم حذف القسيمة بنجاح",
    voucherEditedSuccess: "تم تعديل القسيمة بنجاح",
    voucherAddedSuccess: "تم إضافة القسيمة بنجاح",
    discountAppliedSuccess: "تم تطبيق خصم {percent}% على جميع المنتجات",
    errorDeletingVoucher: "حدث خطأ أثناء حذف القسيمة",
    errorConnectingServer: "حدث خطأ أثناء الاتصال بالخادم",
    voucherDeletedLocally: "تم حذف القسيمة محلياً فقط",
    unexpectedError: "حدث خطأ غير متوقع",
    enterValidTableNumber: "الرجاء إدخال رقم طاولة صحيح",
    qrCodeUpdated: "تم تحديث رمز QR للطاولة رقم {table}",
    qrCodeSaved: "تم حفظ رمز QR للطاولة رقم {table}",
    qrCodeNotFound: "لم يتم العثور على رمز QR للطاولة المحددة",
    qrCodeDeleted: "تم حذف رمز QR للطاولة رقم {table}",
    enterValidDiscountRange: "يرجى إدخال نسبة خصم صالحة بين 0 و 90%",
    enterDiscountGreaterThanZero: "يرجى إدخال نسبة خصم أكبر من 0%",
    errorApplyingDiscount: "حدث خطأ أثناء تطبيق الخصم: {error}",
    discountCancelledPricesRestored: "تم إلغاء الخصم وإعادة الأسعار الأصلية",
    errorCancellingDiscount: "حدث خطأ أثناء إلغاء الخصم: {error}",
    taxSettingsUpdated: "تم تحديث إعدادات الضريبة",
    errorResettingPoints: "حدث خطأ أثناء إعادة تعيين النقاط",
    resetAllPointsSuccess: "تم إعادة تعيين نقاط الولاء لجميع العملاء بنجاح",
    resetPointsSuccess: "تم إعادة تعيين نقاط الولاء للعميل بنجاح",
    resetPointsFailed: "فشل في إعادة تعيين النقاط",
    pointsAdded: "تم إضافة {points} نقطة بنجاح",
    pointsDeducted: "تم خصم {points} نقطة بنجاح",
    pleaseSelectCustomer: "الرجاء اختيار عميل",
    enterValidPointsValue: "الرجاء إدخال قيمة صالحة للنقاط",
    failedToAdjustPoints: "فشل في تعديل النقاط",
    errorAdjustingPoints: "حدث خطأ أثناء تعديل النقاط",
    enterValidMaxDiscount: "الرجاء إدخال قيمة صالحة للحد الأقصى للخصم (1-100)",
    enterValidPointsRequired: "الرجاء إدخال قيمة صالحة للنقاط (الحد الأدنى 50)",
    enterValidDiscountPerPoint: "الرجاء إدخال قيمة صالحة لنسبة الخصم لكل نقطة",
    enterValidMinPoints: "الرجاء إدخال قيمة صالحة للحد الأدنى للنقاط",
    discountSettingsSaved: "تم حفظ إعدادات الخصم بنجاح",
    errorSavingSettings: "حدث خطأ أثناء حفظ الإعدادات",
    pleaseSelectProduct: "الرجاء اختيار منتج",
    freeItemAdded: "تمت إضافة العنصر المجاني بنجاح",
    freeItemDeleted: "تم حذف العنصر المجاني بنجاح",
    loadRoleManagementFirst: "يجب تحميل ملف إدارة الأدوار أولاً",
    errorOpeningPermissionsModal: "حدث خطأ أثناء محاولة فتح إعدادات الصلاحيات",
    userPermissionsUpdated: "تم تحديث صلاحيات المستخدم بنجاح",
    errorSavingPermissions: "حدث خطأ أثناء محاولة حفظ الصلاحيات",
    cannotOpenFilterModal: "تعذر فتح نافذة التصفية",
    customerListRefreshed: "تم تحديث قائمة العملاء بنجاح",
    errorRefreshingCustomers: "حدث خطأ أثناء تحديث قائمة العملاء",
    enterValidExchangeRate: "الرجاء إدخال قيمة صالحة لمعدل النقاط",
    enterValidExpiryDays: "الرجاء إدخال قيمة صالحة لأيام انتهاء الصلاحية",
    pointsSettingsSaved: "تم حفظ إعدادات النقاط بنجاح",
    permissionsUpdatedFromDB: "تم تحديث الصلاحيات من قاعدة البيانات",
    failedToCreateDefaultRoles: "فشل في إنشاء الأدوار الافتراضية",
    errorLoadingRoles: "حدث خطأ أثناء تحميل الأدوار",
    enterRoleName: "يرجى إدخال اسم الدور",
    roleUpdatedSuccess: "تم تحديث دور \"{name}\" بنجاح",
    roleCreatedSuccess: "تم إنشاء دور \"{name}\" بنجاح",
    roleBadgesUpdated: "تم تحديث شارات الأدوار في قسم الحسابات",
    errorSavingRole: "حدث خطأ أثناء حفظ الدور",
    roleNotFound: "دور غير موجود",
    roleDeletedSuccess: "تم حذف دور \"{name}\" بنجاح",
    errorDeletingRole: "حدث خطأ أثناء حذف الدور",
    pleaseSelectRole: "يرجى اختيار دور",
    rolesUpdatedWithDefaults: "تم تحديث {count} أدوار بالألوان والأيقونات الافتراضية",
    errorUpdatingRoles: "حدث خطأ أثناء تحديث الأدوار",
    
    // Confirm dialogs
    confirmDeleteProduct: "هل أنت متأكد من حذف هذا المنتج؟",
    confirmDeleteVoucher: "هل أنت متأكد من حذف هذه القسيمة؟",
    confirmDeleteQRCode: "هل أنت متأكد من حذف رمز QR للطاولة رقم {table}؟",
    confirmApplyDiscount: "هل أنت متأكد من تطبيق خصم {percent}% على جميع المنتجات؟",
    confirmCancelDiscount: "هل أنت متأكد من إلغاء الخصم العام وإعادة الأسعار الأصلية؟",
    confirmDeleteSection: "هل أنت متأكد من حذف هذا القسم؟",
    confirmDeleteReservation: "هل أنت متأكد من حذف هذا الحجز؟",
    confirmDeleteFreeItem: "هل أنت متأكد من حذف هذا العنصر المجاني؟",
    confirmDeleteRole: "هل أنت متأكد من حذف هذا الدور؟",
    modalLoadError: "عذراً، حدث خطأ في تحميل الشاشة المنبثقة",
    
    // Status messages
    invalidFileTypeStatus: "نوع الملف غير صالح. يرجى اختيار صورة (JPG, PNG, GIF, WEBP)",
    fileTooLargeStatus: "حجم الملف كبير جداً. الحد الأقصى هو 2 ميجابايت",
    processingImage: "جاري معالجة الصورة...",
    imageSelectedSuccessStatus: "تم اختيار الصورة بنجاح (سيتم حفظها عند حفظ المنتج)",
    errorProcessingImageStatus: "حدث خطأ أثناء معالجة الصورة: {error}",
    errorReadingFileStatus: "حدث خطأ أثناء قراءة الملف",
    unexpectedErrorProcessingFile: "حدث خطأ غير متوقع أثناء معالجة الملف",
    clickOrDragImage: "اضغط لاختيار صورة أو اسحب وأفلت الصورة هنا",
    imageUploadedSuccess: "تم تحميل الصورة بنجاح",
  },
  en: {
    // Document attributes
    htmlAttributes: {
      lang: "en",
      dir: "ltr",
    },

    // Currency - now loaded dynamically from global settings
    // currencyEGP: "EGP",

    // Login page
    pageTitle: "Login | Admin Dashboard",
    loginTitle: "Admin Dashboard Login",
    loginSubtitle: "Enter your credentials to access the admin dashboard",
    username: "Username",
    password: "Password",
    rememberMe: "Remember me",
    loginButton: '<i class="fas fa-sign-in-alt"></i> Login',
    backToMenu: '<i class="fas fa-arrow-left"></i> Back to Main Menu',
    checkingServer: "Checking server connection...",

    // Date Range Modal
    selectDateRange: "Select Date Range",
    lastWeek: "Last Week",
    lastMonth: "Last Month",
    lastQuarter: "Last 3 Months",
    customRangeMessage: "Select a custom date range to view sales data",
    startDate: '<i class="fas fa-calendar-alt"></i> Start Date',
    endDate: '<i class="fas fa-calendar-alt"></i> End Date',
    cancel: "Cancel",
    apply: "Apply",

    // Dashboard title
    dashboardTitle: "Digital Menu Dashboard",
    dashboardDescription:
      "Manage your products, offers, and more through your admin dashboard",

    // Features
    featureReports: "Advanced Reports & Statistics",
    featureSales: "Monitor Sales & Analytics",
    featureProducts: "Manage Products & Categories",
    featureOffers: "Manage Offers & Discounts",
    featureQR: "Create QR Codes for Tables",

    // Voucher Card
    noVouchers: "No vouchers available. Add new vouchers.",
    discountPercent: "${discount}% discount",
    expiryDate: "Expiry Date: ${date}",
    minOrder: "Min Order: ${amount} EGP",
    expired: "Expired",
    active: "Active",

    // Voucher card details and QR
    discountWord: "discount",
    expiryDateLabel: "Expiry Date:",
    tableNumberLabel: "Table Number:",
    minOrderCardLabel: "Min Order:",
    tableWord: "Table",
    saveQr: "Save QR Code",

    // Form placeholders
    usernamePlaceholder: "Enter username",
    passwordPlaceholder: "Enter password",

    // Error messages
    invalidCredentials: "Invalid username or password",
    serverConnectionError: "Please check your server connection",
    loginError: "An error occurred during login. Please try again.",

    // Server status messages
    serverOnline: "Server is connected and working normally",
    serverOffline: "Cannot connect to server",
    serverError: "Connected to server but there's an issue",

    // Success messages
    loginSuccess:
      '<i class="fas fa-check-circle success-checkmark"></i> Login successful. Redirecting...',
    loginSuccessRedirect: "Login successful. Redirecting...",
    loginSuccessViaRole: "Login successful via role permissions: ",
    loggingIn: '<i class="fas fa-spinner fa-spin"></i> Logging in...',

    // Admin settings messages
    formFieldsNotFound: "Form fields not found",
    fillAllRequiredFields: "Please fill all required fields",
    adminDataSavedSuccessfully: "Admin data saved successfully",
    adminDataNotFound: "Admin data not found. Please logout and login again.",
    currentPasswordIncorrect: "Current password is incorrect",
    newPasswordMinLength: "New password must be at least 4 characters",
    passwordsDoNotMatch: "New password and confirmation do not match",

    // Language switcher
    switchLanguage: "العربية",

    // Admin Dashboard
    adminDashboard: "Admin Dashboard",
    adminGreeting: "Hello,",
    adminLogout: "Logout",
    overview: "Overview",
    products: "Products",
    categories: "Categories",
    vouchers: "Vouchers",
    offers: "Offers",
    tax: "Tax",
    qrCodes: "QR Codes",
    reservations: "Reservations",
    loyaltyPoints: "Loyalty Points",
    customerAccounts: "Customer Accounts",
    adminSettings: "Admin Settings",
    globalSettings: "Global Settings",
    menuPage: "Menu Page",
    cashierSystem: "Cashier System",
    submenuMode: "Submenu Mode",

    // Dashboard Stats
    totalRevenue: "Total Revenue",
    ordersCount: "Orders Count",
    totalProducts: "Total Products",
    discountVouchers: "Discount Vouchers",
    averageOrderValue: "Average Order Value",
    todayStats: "Today's Statistics",
    todayOrders: "Today's Orders",
    todayRevenue: "Today's Revenue",
    salesAnalysis: "Sales Analysis",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    customRange: "Custom Range",
    recentOrders: "Recent Orders",
    filterByDate: "Filter by Date:",
    filterByStatus: "Filter by Status:",
    allStatuses: "All Statuses",
    clear: "Clear",
    noRecentOrders: "No recent orders",
    ordersFilterApplied: "Order filters applied",
    ordersStatusUpdated: "Order status filter updated",
    noOrdersOnDate: "No orders on this date",
    noOrdersForFilters: "No orders match the selected filters",
    bestProducts: "Best Selling Products",
    noOrderedProducts: "No ordered products yet",
    resetStats: "Reset Statistics",
    orderText: "orders",
    noProducts: "No products",

    // Crowded Hours
    crowdedHoursTitle: "Peak Hours",
    crowdedHoursDescription: "Most crowded hours during the day",
    morningPeriod: "Morning",
    afternoonPeriod: "Afternoon",
    eveningPeriod: "Evening",
    nightPeriod: "Night",
    lowTraffic: "Low",
    moderateTraffic: "Moderate",
    highTraffic: "High",
    veryHighTraffic: "Very High",
    trafficLevel: "Traffic Level",
    timeSlot: "Time Slot",
    noTrafficData: "No traffic data available",

    // Products Management
    productsManagement: "Products Management",
    addNewProduct: "Add New Product",
    globalDiscount: "Apply Discount to All Products",
    discountPercentage: "Discount Percentage:",
    applyDiscount: "Apply Discount",
    cancelDiscount: "Cancel Discount",

    // Categories Management
    categoriesManagement: "Categories Management",
    addNewCategory: "Add New Category",
    categoryNameArLabel: "Category Name :",
    categoryNameEnLabel: "Category Name :",
    categoryNamePlaceholder: "Enter the category name in Arabic",
    categoryNameEnPlaceholder: "Enter the category name in English",
    categoryValue: "Category Value:",
    categoryValuePlaceholder: "Example: pizza, burger, drink",
    categoryValueHint: "Use lowercase English letters without spaces",
    categoryIcon: "Category Icon:",
    categoryIconPlaceholder: "fas fa-utensils",
    categoryIconHint: "Use Font Awesome icon class (optional)",
    categorySortOrder: "Sort Order:",
    categorySortOrderHint: "Lower numbers appear first (0, 1, 2, ...)",
    sortOrder: "Sort Order",
    categoryNames: "Category Names",
    categoryDisplay: "Category Display",
    chooseIcon: "Choose Icon",
    popularIcons: "Popular Icons",
    saveCategory: "Save Category",
    editCategory: "Edit Category",
    deleteCategory: "Delete Category",
    categoryAdded: "Category added successfully",
    categoryUpdated: "Category updated successfully",
    categoryDeleted: "Category deleted successfully",
    confirmDeleteCategory: "Are you sure you want to delete this category?",
    noCategories: "No categories",

    // Voucher Management
    vouchersManagement: "Voucher Management",
    addNewVoucher: "Add New Voucher",

    // Offers Management
    offersManagement: "Offers Management",
    addNewOffer: "Add New Offer",
    editOffer: "Edit Offer",
    noOffers: "No Offers",
    titleArabic: "Title (Arabic)",
    titleEnglish: "Title (English)",
    descriptionArabic: "Description (Arabic)",
    descriptionEnglish: "Description (English)",
    originalPrice: "Original Price",
    discountedPrice: "Discounted Price",
    discountPercentage: "Discount Percentage (%)",
    imageUrl: "Image URL",
    category: "Category",
    allCategories: "All Categories",
    newOffers: "New",
    weeklyOffers: "Weekly Offers",
    specialOffers: "Special Offers",
    startDate: "Start Date",
    endDate: "End Date",
    userLimit: "User Limit",
    unlimitedIfEmpty: "Unlimited if empty",
    userLimitHint: "Leave empty to allow unlimited users",
    minimumPurchase: "Minimum Purchase",
    noMinimumIfEmpty: "No minimum if empty",
    minPurchaseHint: "Leave empty if there is no minimum purchase requirement",
    customerEligibility: "Customer Eligibility",
    allCustomers: "All Customers",
    newCustomersOnly: "New Customers Only",
    existingCustomersOnly: "Existing Customers Only",
    loyaltyMembersOnly: "Loyalty Members Only",
    customerEligibilityHint: "Specify who can use this offer",
    eligibilityHintAll: "Available to all customers without restrictions",
    eligibilityHintNew: "Available only to customers placing their first order",
    eligibilityHintExisting: "Available only to customers with previous orders",
    eligibilityHintLoyalty: "Available only to customers enrolled in the loyalty program",
    active: "Active",
    inactive: "Inactive",
    featured: "Featured",
    status: "Status",
    all: "All",
    activate: "Activate",
    deactivate: "Deactivate",
    basicInformation: "Basic Information",
    pricingInformation: "Pricing Information",
    offerDuration: "Offer Duration",
    offerRestrictions: "Offer Restrictions",
    offerStatus: "Offer Status",
    noImagePreview: "No image preview",
    imageLoadError: "Failed to load image",
    autoCalculated: "Auto-calculated",
    activeHint: "Offer is visible to customers",
    featuredHint: "Featured offer on homepage",
    offerUpdatedSuccess: "Offer updated successfully",
    offerAddedSuccess: "Offer added successfully",
    offerSaveFailed: "Failed to save offer",
    offerStatusUpdated: "Offer status updated successfully",
    offerStatusUpdateFailed: "Failed to update offer status",
    offerDeletedSuccess: "Offer deleted successfully",
    offerDeleteFailed: "Failed to delete offer",
    confirmDeleteOffer: 'Are you sure you want to delete the offer "{title}"?',
    
    // Offers - New Features
    bulkActions: "Bulk Actions",
    totalOffers: "Total Offers",
    activeOffers: "Active Offers",
    featuredOffers: "Featured Offers",
    expiredOffers: "Expired Offers",
    avgDiscount: "Avg. Discount",
    searchOffers: "Search for an offer...",
    sortBy: "Sort By",
    newest: "Newest",
    oldest: "Oldest",
    discountHighToLow: "Discount (High to Low)",
    discountLowToHigh: "Discount (Low to High)",
    priceHighToLow: "Price (High to Low)",
    priceLowToHigh: "Price (Low to High)",
    viewMode: "View Mode",
    resetFilters: "Reset Filters",
    selected: "Selected",
    makeFeatured: "Make Featured",
    duplicate: "Duplicate",
    preview: "Preview",
    copy: "Copy",
    previewOffer: "Preview Offer",
    confirmBulkActivate: "Do you want to activate the selected offers?",
    confirmBulkDeactivate: "Do you want to deactivate the selected offers?",
    confirmBulkFeature: "Do you want to make the selected offers featured?",
    confirmBulkDelete: "Do you want to delete the selected offers? This action cannot be undone.",
    bulkActivateSuccess: "Offers activated successfully",
    bulkActivateFailed: "Failed to activate offers",
    bulkDeactivateSuccess: "Offers deactivated successfully",
    bulkDeactivateFailed: "Failed to deactivate offers",
    bulkFeatureSuccess: "Offers made featured successfully",
    bulkFeatureFailed: "Failed to make offers featured",
    bulkDeleteSuccess: "Offers deleted successfully",
    bulkDeleteFailed: "Failed to delete offers",

    // Tax Settings
    taxSettings: "Tax Settings",
    taxRate: "Tax Rate:",
    enableTax: "Enable Tax:",
    serviceTaxRate: "Service Tax Rate:",
    enableServiceTax: "Enable Service Tax:",
    saveSettings: "Save Settings",

    // Reservations
    reservationsManagement: "Reservations Management",
    reservationStatus: "Reservation Status:",
    all: "All",
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    date: "Date:",
    clearFilters: "Clear Filters",
    name: "Name",
    phoneNumber: "Phone Number",
    guestsCount: "Guests Count",
    time: "Time",
    status: "Status",
    notes: "Notes",
    idCard: "ID Card",
    actions: "Actions",
    noReservations: "No reservations",

    // Loyalty Points
    loyaltyPointsManagement: "Loyalty Points Management",
    resetPoints: "Reset Points",
    resetPointsDesc:
      "Reset loyalty points for a specific customer or all customers",
    customer: "Customer:",
    allCustomers: "All Customers",
    reset: "Reset",
    adjustPoints: "Adjust Points",
    adjustPointsDesc: "Add or deduct loyalty points for a specific customer",
    value: "Value:",
    points: "points",
    negativeForDeduction: "Use negative value for deduction",
    apply: "Apply",
    processingAction: "Processing...",
    customDiscount: "Custom Discount",
    customDiscountDesc: "Enable custom discount in cart based on points",
    discountPerPoint: "Discount per point:",
    maxDiscount: "Maximum discount:",
    minPointsForDiscount: "Minimum points:",
    enableCustomDiscount: "Enable custom discount",
    pointsSettings: "Points Settings",
    pointsSettingsDesc: "Configure points earning rate and expiration",
    pointsExchangeRate: "Each (EGP) equals:",
    pointsPerEGP: "Number of points earned when spending 1 EGP",
    pointsExpiryDays: "Points expire after:",
    day: "days",
    noExpiryHint: "Set to 0 to make points never expire",
    freeItems: "Free Items",
    freeItemsDesc:
      "Enable customers to get free items when collecting enough points",
    noFreeItems: "No free items specified",
    product: "Product:",
    requiredPoints: "Required Points:",
    addFreeItem: "Add Free Item",

    // Customer Accounts
    accountsManagement: "Accounts Management",
    searchCustomer: "Search for customer by name or email...",
    search: "Search",
    manageRoles: "Manage Roles",
    filter: "Filter",
    refresh: "Refresh",
    email: "Email",
    role: "Role",
    registrationDate: "Registration Date",

    // Admin Settings
    displayName: "Display Name:",
    currentPassword: "Current Password:",
    newPassword: "New Password:",
    confirmNewPassword: "Confirm New Password:",
    leaveEmptyHint: "Leave empty if you don't want to change it",
    saveAdminData: "Save Admin Data",
    securityTips: "Security Tips:",
    securityTip1:
      "Use a strong password containing letters, numbers, and symbols.",
    securityTip2:
      "Don't share your login credentials with unauthorized persons.",
    securityTip3:
      "Change your password periodically to maintain account security.",

    // Global Settings
    generalSettings: "General Settings",
    bannerSettings: "Banner Settings",
    heroBannerSettings: "Hero Banner Settings",
    enableHeroBanner: "Enable Hero Banner",
    workingHours: "Working Hours",
    startTime: "Start Time",
    endTime: "End Time",
    workingDays: "Working Days",
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    contactInformation: "Contact Information",
    whatsappNumber: "WhatsApp Number",
    emailAddress: "Email Address",
    currencySettings: "Currency Settings",
    currencyCode: "Currency Code",
    currencyAutoHint: "Currency will be displayed automatically in the appropriate language",
    restaurantInformation: "Restaurant Information",
    restaurantNameAr: "Restaurant Name (Arabic)",
    restaurantNameEn: "Restaurant Name (English)",
    restaurantAddressAr: "Address (Arabic)",
    restaurantAddressEn: "Address (English)",
    socialMedia: "Social Media",
    facebookPage: "Facebook Page",
    instagramPage: "Instagram Page",
    twitterPage: "X Page",
    resetToDefault: "Reset to Default",
    saveSettings: "Save Settings",
    settingsInfo: "Settings Information",
    settingsInfoItem1: "These settings will be applied across the entire system",
    settingsInfoItem2: "Working hours will be displayed to customers on the menu page",
    settingsInfoItem3: "Contact information will be available for customer inquiries",
    settingsInfoItem4: "Currency settings will affect all prices displayed in the system",
    bannerSettingsInfo: "Banner Settings Information",
    bannerInfoItem1: "The hero banner will be displayed at the top of the menu page",
    bannerInfoItem2: "Banner image is optional - a default gradient background will be used if no image is provided",
    bannerInfoItem3: "The category slug will filter products when customers click 'Order Now'",
    bannerInfoItem4: "Both Arabic and English content will be displayed based on the selected language",
    bannerTitleAr: "Banner Title (Arabic)",
    bannerTitleEn: "Banner Title (English)",
    bannerDescriptionAr: "Banner Description (Arabic)",
    bannerDescriptionEn: "Banner Description (English)",
    bannerCategory: "Banner Category",
    bannerCategoryHint: "Enter category slug (e.g., burger, pizza)",
    bannerImageUrl: "Banner Image URL",
    bannerImageHint: "Enter image URL or leave empty for default background",
    bannerPreview: "Banner Preview",
    confirmResetSettings: "Are you sure you want to reset to default settings?",
    settingsLoaded: "Settings loaded successfully",
    errorLoadingSettings: "Error loading settings",
    settingsSaved: "Settings saved successfully!",
    errorSavingSettings: "Error saving settings: ",
    settingsReset: "Settings reset to default!",
    errorResettingSettings: "Error resetting settings: ",

    // Chart Data Summary
    totalSales: "Total Sales",
    avgSale: "Average Sales",
    highestDay: "Highest Sales Day",
    exportOrdersReport: "Export Orders Report",

    // QR Code Generator
    qrGenerator: "Generate QR Codes for Tables",
    tableNumber: "Table Number:",
    createQR: "Create QR Code",
    qrPlaceholder: "Please enter a table number to create a QR code",
    generatedQRCodes: "Generated QR Codes",
    noQrCodes: "No QR codes have been created yet",
    createdQrCodes: "Created QR Codes",
    noItemsAvailable: "No items available for this order",

    // Order details modal
    orderDetails: "Order Details",
    orderItems: "Order Items",
    orderSummary: "Order Summary",
    customerComment: "Customer Comment",
    dateAndTime: "Date & Time",
    tableNumber: "Table Number",
    customerName: "Customer Name",
    orderRating: "Order Rating",
    orderStatus: "Order Status",
    rated: "Rated",
    notRated: "Not Rated",
    subtotal: "Subtotal",
    addonsTotal: "Add-ons Total",
    tax: "Tax",
    serviceTax: "Service Tax",
    discount: "Discount",
    total: "Total",
    noItemsAvailable: "No items available for this order",
    unspecified: "Unspecified",

    // Modals
    addProduct: "Add New Product",
    editProduct: "Edit Product",
    productName: "Product Name:",
    category: "Category:",
    productDescription: "Product Description:",
    price: "Price:",
    currency: "EGP",
    productImage: "Product Image:",
    imageLink: "Image URL",
    uploadImage: "Upload Image",
    preview: "Preview",
    dragDropImage: "Click to select an image or drag and drop it here",
    noPreview: "No preview",
    addons: "Add-ons:",
    noAddons: "No add-ons for this product",
    addNewSection: "Add New Section",
    addAddonOption: "Add New Option",
    required: "Required",
    singleChoice: "Single Choice",
    saveProduct: "Save Product",
    languageArabic: "Arabic",
    languageEnglish: "English",
    optionalLabel: "Optional",

    // Voucher Modal
    addVoucher: "Add New Voucher",
    editVoucher: "Edit Voucher",
    voucherCode: "Voucher Code:",
    generate: "Generate",
    discountPercentage: "Discount Percentage:",
    minOrder: "Minimum Order:",
    leaveZeroHint: "Leave as 0 for no minimum order requirement",
    targetCategory: "Target Category:",
    allCategories: "All Categories",
    expiryDate: "Expiry Date:",
    saveVoucher: "Save Voucher",

    // Account Permissions
    manageUserPermissions: "Manage User Permissions",
    permissionsIntro:
      "Set access permissions for various sections and features of the system. Please select appropriate permissions for the user.",
    pageAccessPermissions: "Page Access Permissions",
    adminPanelAccess: "Admin Panel Access",
    cashierAccess: "Cashier Page Access",
    adminPanelPermissions: "Admin Panel Permissions",
    viewStats: "View Statistics",
    viewProducts: "View Products",
    editProducts: "Edit Products",
    viewVouchers: "View Vouchers",
    editVouchers: "Edit Vouchers",
    manageReservations: "Manage Reservations",
    manageTax: "Manage Tax",
    managePoints: "Manage Loyalty Points",
    manageAccounts: "Manage Accounts",
    manageQrCodes: "Manage QR Codes",
    cancel: "Cancel",
    savePermissions: "Save Permissions",
    saving: "Saving...",

    // Unauthorized Access Messages
    unauthorizedAccessToSection:
      "You don't have permission to access this section",
    unauthorizedAccessTo: "You don't have permission to access",
    unauthorizedAccessMessage:
      "You need additional permissions to access this data",
    unauthorizedAccessToCustomerAccounts:
      "Unauthorized access to customer accounts management",
    contactAdministratorForPermissions:
      "Please contact the administrator for the necessary permissions",
    thisSection: "this section",

    // Permission Tooltips
    noPermissionToAddProducts: "You don't have permission to add products",
    noPermissionToEditProducts: "You don't have permission to edit products",
    noPermissionToDeleteProducts:
      "You don't have permission to delete products",
    noPermissionToAddVouchers: "You don't have permission to add vouchers",
    noPermissionToEditVouchers: "You don't have permission to edit vouchers",
    noPermissionToDeleteVouchers:
      "You don't have permission to delete vouchers",
    noPermissionToEditGlobalDiscount:
      "You don't have permission to edit global discount",
    noPermissionToEditTaxSettings:
      "You don't have permission to edit tax settings",
    noPermissionToCreateQR: "You don't have permission to create QR codes",
    noPermissionToManageLoyaltyPoints:
      "You don't have permission to manage loyalty points",
    noPermissionToAddUsers: "You don't have permission to add users",
    noPermissionToManageUsers: "You don't have permission to manage users",
    noPermissionToEditProductsNotification:
      "You don't have permission to edit products",
    noPermissionToDeleteProductsNotification:
      "You don't have permission to delete products",
    noPermissionToEditTaxSettingsNotification:
      "You don't have permission to edit tax settings",
    noPermissionToEditVouchersNotification:
      "You don't have permission to edit vouchers",
    noPermissionToDeleteVouchersNotification:
      "You don't have permission to delete vouchers",
    permissionsUpdatedSuccessfully:
      "Permissions updated and applied successfully",

    // Role Management
    roleManagement: "Role Management",
    rolesIntro:
      "Create and manage custom roles with specific permissions for each role.",
    currentRoles: "Current Roles",
    noRolesMessage: "No custom roles. Add new roles using the form below.",
    addNewRole: "Add New Role",
    roleName: "Role Name:",
    roleNamePlaceholder: "Example: Sales Manager, Restaurant Supervisor, etc.",
    cancelEdit: "Cancel Edit",
    saveRole: "Save Role",

    // Assign Role
    assignRoleToUser: "Assign Role to User",
    chooseAppropriateRole:
      "Choose the appropriate role for the user from the following list:",
    selectRole: "-- Select a role --",
    cancelAssign: "Cancel",
    assignRole: "Assign Role",

    // ID Card Modal
    idCardImage: "ID Card Image",
    notVerified: "ID not verified yet",
    approve: "Approve",
    reject: "Reject",
    ownerName: "Person's Name:",
    uploadDate: "Upload Date:",
    fileSize: "File Size:",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    rotateLeft: "Rotate Left",
    rotateRight: "Rotate Right",
    resetView: "Reset View",
    download: "Download",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",

    // Date Range Modal
    selectDateRange: "Select Date Range",
    lastWeek: "Last Week",
    lastMonth: "Last Month",
    lastQuarter: "Last 3 Months",
    customRangeMessage: "Choose a custom date range to view sales data",
    startDate: "Start Date",
    endDate: "End Date",
    apply: "Apply",

    // Offline warning
    offlineWarning:
      "You are currently offline. Some features may not work until you regain connection.",

    // Chart translations
    salesRevenue: "Sales Revenue",
    // currencySymbol: "EGP", // Now loaded dynamically from global settings
    noWeeklyData: "No sales data for the past week",
    noMonthlyData: "No sales data for the past month",
    noQuarterlyData: "No sales data for the current quarter",
    noYearlyData: "No sales data for the current year",

    // Day names
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",

    // Month names
    january: "January",
    february: "February",
    march: "March",
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    december: "December",

    // Week labels for monthly chart
    week1: "Week 1",
    week2: "Week 2",
    week3: "Week 3",
    week4: "Week 4",
    week5: "Week 5",

    // Order statuses
    orderStatusCompleted: "Completed",
    orderStatusPending: "Pending",
    orderStatusCancelled: "Cancelled",
    orderStatusProcessing: "Processing",

    // QR Code Generator
    qrCodeGenerator: "Generate QR Codes for Tables",
    createQrCode: "Create QR Code",

    // Product Addons
    productAddons: "Add-ons",

    // Voucher Modal
    minimumOrder: "Minimum Order:",
    // currencyEGP: "EGP", // Now loaded dynamically from global settings
    minOrderHint: "Leave value as 0 for no minimum order requirement",
    pizza: "Pizza",
    burger: "Burger",
    sandwich: "Sandwich",
    drinks: "Drinks",

    // Date Range Modal
    selectDateRange: "Select Date Range",
    lastWeek: "Last Week",
    lastMonth: "Last Month",
    lastQuarter: "Last 3 Months",
    customRangeMessage: "Select a custom date range to view sales data",
    startDate: "Start Date",
    endDate: "End Date",

    // Negative value hint
    negativeValueHint: "Use negative value for deduction",
    days: "days",
    minPoints: "Minimum points:",
    pointsExchangeHint:
      "Number of points earned when spending 1 Egyptian pound",
    pointsExpiry: "Points expire after:",
    expiryHint: "Set to 0 for non-expiring points",

    // Missing keys used in admin.html
    basicInfo: "Basic Information",
    description: "Description",
    pricing: "Pricing",
    imageUrl: "Image URL",
    productNameEn: "English Name:",
    productNameArLabel: "Product Name :",
    productNamePlaceholder: "Enter the product name in Arabic",
    productNameEnLabel: "Product Name :",
    productNameEnPlaceholder: "Example: Classic Pepperoni",
    productDescriptionEn: "English Description:",
    productDescriptionArLabel: "Description :",
    productDescriptionPlaceholder: "Describe the product in Arabic",
    productDescriptionEnLabel: "Description :",
    productDescriptionEnPlaceholder: "Describe the product in English",
    // Support both keys for category option
    drink: "Drinks",
    // Role management English-name helpers
    roleNameEn: "Role Name (English):",
    roleNameEnPlaceholder:
      "Example: Sales Manager, Restaurant Supervisor, etc.",
    // ID verification labels alignment
    idNotVerified: "ID not verified yet",
    personName: "Person Name:",

    // Account actions
    permissions: "Permissions",
    suspend: "Suspend",
    viewIdCard: "View ID Card",
    permissionsCount: "Permissions Count:",

    // Role appearance customization
    roleAppearance: "Role Appearance",
    roleColor: "Role Color",
    roleIcon: "Role Icon",
    rolePreview: "Role Preview",

    // Notification messages
    offlineModeEnabled: "Offline mode enabled. Only local data will be used.",
    welcomeMessage: "Welcome {name}, logged in successfully",
    fillRequiredFields: "Please enter the required information",
    loginViaRole: "Logged in via role permissions: {role}",
    updateAvailable: "New update available. Click here to update.",
    statsResetSuccess: "Statistics reset successfully",
    statsResetFailed: "Failed to reset statistics",
    statsResetError: "Error occurred while resetting statistics",
    globalDiscountActive: "Global discount of {percent}% is applied",
    enterImageLinkFirst: "Please enter the image link first",
    cannotLoadImage: "Cannot load image, check the link validity",
    imageLoadedForPreview: "Image loaded for preview (will be saved when product is saved)",
    invalidImageFormat: "Invalid image link format",
    invalidFileType: "Invalid file type. Please select a valid image",
    fileTooLarge: "File size is too large. Maximum is 2 MB",
    imageSelectedSuccess: "Image selected successfully",
    errorProcessingImage: "Error processing image",
    errorReadingFile: "Error reading file",
    productUpdatedSuccess: "Product updated successfully",
    productAddedSuccess: "Product added successfully",
    errorSavingProduct: "Error saving product: {error}",
    productDeletedSuccess: "Product deleted successfully",
    errorDeletingProduct: "Error deleting product: {error}",
    errorUpdatingProductsUI: "Error updating products UI: {error}",
    taxElementsNotFound: "Tax settings elements not found",
    invalidTaxRate: "Please enter a valid tax rate (0-100)",
    invalidServiceRate: "Please enter a valid service rate (0-100)",
    taxSettingsSaved: "Tax settings saved successfully",
    taxSettingsSaveFailed: "Failed to save tax settings to database",
    taxSettingsSaveError: "Error saving tax settings to database",
    noOrdersForReport: "No orders to create report",
    fillAllVoucherData: "Please enter all required data",
    voucherDeletedSuccess: "Voucher deleted successfully",
    voucherEditedSuccess: "Voucher edited successfully",
    voucherAddedSuccess: "Voucher added successfully",
    discountAppliedSuccess: "{percent}% discount applied to all products",
    errorDeletingVoucher: "Error deleting voucher",
    errorConnectingServer: "Error connecting to server",
    voucherDeletedLocally: "Voucher deleted locally only",
    unexpectedError: "An unexpected error occurred",
    enterValidTableNumber: "Please enter a valid table number",
    qrCodeUpdated: "QR code updated for table {table}",
    qrCodeSaved: "QR code saved for table {table}",
    qrCodeNotFound: "QR code not found for the selected table",
    qrCodeDeleted: "QR code deleted for table {table}",
    enterValidDiscountRange: "Please enter a valid discount between 0 and 90%",
    enterDiscountGreaterThanZero: "Please enter a discount greater than 0%",
    errorApplyingDiscount: "Error applying discount: {error}",
    discountCancelledPricesRestored: "Discount cancelled and original prices restored",
    errorCancellingDiscount: "Error cancelling discount: {error}",
    taxSettingsUpdated: "Tax settings updated",
    errorResettingPoints: "Error resetting loyalty points",
    resetAllPointsSuccess: "Loyalty points reset successfully for all customers",
    resetPointsSuccess: "Loyalty points reset successfully for customer",
    resetPointsFailed: "Failed to reset points",
    pointsAdded: "{points} points added successfully",
    pointsDeducted: "{points} points deducted successfully",
    pleaseSelectCustomer: "Please select a customer",
    enterValidPointsValue: "Please enter a valid points value",
    failedToAdjustPoints: "Failed to adjust points",
    errorAdjustingPoints: "Error adjusting points",
    enterValidMaxDiscount: "Please enter a valid maximum discount value (1-100)",
    enterValidPointsRequired: "Please enter a valid points value (minimum 50)",
    enterValidDiscountPerPoint: "Please enter a valid discount per point value",
    enterValidMinPoints: "Please enter a valid minimum points value",
    discountSettingsSaved: "Discount settings saved successfully",
    errorSavingSettings: "Error saving settings",
    pleaseSelectProduct: "Please select a product",
    freeItemAdded: "Free item added successfully",
    freeItemDeleted: "Free item deleted successfully",
    loadRoleManagementFirst: "Role management file must be loaded first",
    errorOpeningPermissionsModal: "Error opening permissions settings",
    userPermissionsUpdated: "User permissions updated successfully",
    errorSavingPermissions: "Error saving permissions",
    cannotOpenFilterModal: "Cannot open filter modal",
    customerListRefreshed: "Customer list refreshed successfully",
    errorRefreshingCustomers: "Error refreshing customer list",
    enterValidExchangeRate: "Please enter a valid points exchange rate",
    enterValidExpiryDays: "Please enter a valid expiry days value",
    pointsSettingsSaved: "Points settings saved successfully",
    permissionsUpdatedFromDB: "Permissions updated from database",
    failedToCreateDefaultRoles: "Failed to create default roles",
    errorLoadingRoles: "Error loading roles",
    enterRoleName: "Please enter role name",
    roleUpdatedSuccess: "Role \"{name}\" updated successfully",
    roleCreatedSuccess: "Role \"{name}\" created successfully",
    roleBadgesUpdated: "Role badges updated in accounts section",
    errorSavingRole: "Error saving role",
    roleNotFound: "Role not found",
    roleDeletedSuccess: "Role \"{name}\" deleted successfully",
    errorDeletingRole: "Error deleting role",
    pleaseSelectRole: "Please select a role",
    rolesUpdatedWithDefaults: "Updated {count} roles with default colors and icons",
    errorUpdatingRoles: "Error updating roles",
    
    // Confirm dialogs
    confirmDeleteProduct: "Are you sure you want to delete this product?",
    confirmDeleteVoucher: "Are you sure you want to delete this voucher?",
    confirmDeleteQRCode: "Are you sure you want to delete QR code for table {table}?",
    confirmApplyDiscount: "Are you sure you want to apply {percent}% discount to all products?",
    confirmCancelDiscount: "Are you sure you want to cancel the global discount and restore original prices?",
    confirmDeleteSection: "Are you sure you want to delete this section?",
    confirmDeleteReservation: "Are you sure you want to delete this reservation?",
    confirmDeleteFreeItem: "Are you sure you want to delete this free item?",
    confirmDeleteRole: "Are you sure you want to delete this role?",
    modalLoadError: "Sorry, an error occurred while loading the modal",
    
    // Status messages
    invalidFileTypeStatus: "Invalid file type. Please select an image (JPG, PNG, GIF, WEBP)",
    fileTooLargeStatus: "File size is too large. Maximum is 2 MB",
    processingImage: "Processing image...",
    imageSelectedSuccessStatus: "Image selected successfully (will be saved when product is saved)",
    errorProcessingImageStatus: "Error processing image: {error}",
    errorReadingFileStatus: "Error reading file",
    unexpectedErrorProcessingFile: "Unexpected error processing file",
    clickOrDragImage: "Click to select image or drag and drop image here",
    imageUploadedSuccess: "Image uploaded successfully",
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
  console.log("Applying translations for language:", currentLanguage);

  // Update document language and direction
  document.documentElement.lang =
    translations[currentLanguage].htmlAttributes.lang;
  document.documentElement.dir =
    translations[currentLanguage].htmlAttributes.dir;

  // Update page title based on current page
  const currentPath = window.location.pathname;
  if (currentPath.includes("admin.html") || currentPath.includes("admin/")) {
    // Admin dashboard page
    if (translations[currentLanguage]["adminDashboard"]) {
      document.title = getTranslation("adminDashboard") + " | Digital Menu";
    }
  } else if (currentPath.includes("admin-login.html")) {
    // Login page
    if (translations[currentLanguage]["pageTitle"]) {
      document.title = getTranslation("pageTitle");
    }
  }

  // Update all elements with data-i18n attribute
  const elements = document.querySelectorAll("[data-i18n]");
  console.log(`Found ${elements.length} elements with data-i18n attribute`);

  elements.forEach((element) => {
    const key = element.getAttribute("data-i18n");

    // Determine the translated value first
    let translatedValue = null;
    if (currentLanguage === "en" && element.hasAttribute("data-i18n-en")) {
      console.log(
        `Setting English text for element with key ${key}: ${element.getAttribute(
          "data-i18n-en"
        )}`
      );
      translatedValue = element.getAttribute("data-i18n-en");
    } else if (translations[currentLanguage][key]) {
      translatedValue = translations[currentLanguage][key];
    }

    if (translatedValue != null) {
      const allowHtml = element.hasAttribute("data-i18n-allow-html");
      const containsHtml = /<[^>]+>/.test(translatedValue);
      if (allowHtml || containsHtml) {
        element.innerHTML = translatedValue;
      } else {
        element.textContent = translatedValue;
      }
    } else {
      console.warn(`Translation key not found: ${key}`);
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

  // Handle English-specific placeholders when in English mode
  if (currentLanguage === "en") {
    const enPlaceholderElements = document.querySelectorAll(
      "[data-i18n-en-placeholder]"
    );
    enPlaceholderElements.forEach((element) => {
      element.placeholder = element.getAttribute("data-i18n-en-placeholder");
    });
  }

  // Handle select options with data-i18n attributes
  const selectOptions = document.querySelectorAll("select option[data-i18n]");
  selectOptions.forEach((option) => {
    const key = option.getAttribute("data-i18n");

    // Check if we're in English mode and element has a direct English translation
    if (currentLanguage === "en" && option.hasAttribute("data-i18n-en")) {
      option.textContent = option.getAttribute("data-i18n-en");
      console.log(
        `Setting English text for option: ${option.getAttribute(
          "data-i18n-en"
        )}`
      );
    } else if (translations[currentLanguage][key]) {
      option.textContent = translations[currentLanguage][key];
    }
  });

  // Force refresh select options to ensure they display correctly
  refreshSelectOptions();

  // Special handling for server status element
  if (typeof updateServerStatusText === "function") {
    updateServerStatusText();
  }

  // Update directional styles
  updateDirectionalStyles();

  // Update admin dashboard dynamic UI snippets that aren't pure data-i18n
  try {
    updateAdminDynamicTexts();
  } catch (e) {}

  // Handle language-specific text spans
  const arTexts = document.querySelectorAll(".lang-text.ar-text");
  const enTexts = document.querySelectorAll(".lang-text.en-text");

  if (currentLanguage === "ar") {
    arTexts.forEach((el) => (el.style.display = "inline"));
    enTexts.forEach((el) => (el.style.display = "none"));
  } else {
    arTexts.forEach((el) => (el.style.display = "none"));
    enTexts.forEach((el) => (el.style.display = "inline"));
  }

  // Special handling for account action buttons - process their title attributes
  const accountActionBtns = document.querySelectorAll(".account-action-btn");
  accountActionBtns.forEach((btn) => {
    if (currentLanguage === "en" && btn.hasAttribute("data-i18n-en-title")) {
      btn.title = btn.getAttribute("data-i18n-en-title");
      console.log(`Updated button title to: ${btn.title}`);
    } else if (btn.hasAttribute("data-i18n-title")) {
      const titleKey = btn.getAttribute("data-i18n-title");
      if (translations[currentLanguage][titleKey]) {
        btn.title = translations[currentLanguage][titleKey];
      }
    }

    // Also handle span elements inside buttons
    const spanElement = btn.querySelector("span[data-i18n]");
    if (spanElement) {
      if (
        currentLanguage === "en" &&
        spanElement.hasAttribute("data-i18n-en")
      ) {
        spanElement.textContent = spanElement.getAttribute("data-i18n-en");
        console.log(`Updated button span text to: ${spanElement.textContent}`);
      } else {
        const spanKey = spanElement.getAttribute("data-i18n");
        if (translations[currentLanguage][spanKey]) {
          spanElement.textContent = translations[currentLanguage][spanKey];
        }
      }
    }
  });
}

/**
 * Force refresh select options to ensure they display in the correct language
 */
function refreshSelectOptions() {
  // Handle all select options with data-i18n-en attributes when in English mode
  if (currentLanguage === "en") {
    const enSelectOptions = document.querySelectorAll(
      "select option[data-i18n-en]"
    );
    enSelectOptions.forEach((option) => {
      option.textContent = option.getAttribute("data-i18n-en");
      console.log(`Refreshed option text to: ${option.textContent}`);
    });
  }

  // Special handling for specific elements that might not get updated
  const allCustomersOption = document.querySelector(
    "#reset-points-customer option[value='all']"
  );
  if (allCustomersOption) {
    if (
      currentLanguage === "en" &&
      allCustomersOption.hasAttribute("data-i18n-en")
    ) {
      allCustomersOption.textContent =
        allCustomersOption.getAttribute("data-i18n-en");
      console.log(
        `Refreshed All Customers option to: ${allCustomersOption.textContent}`
      );
    } else if (currentLanguage === "ar") {
      allCustomersOption.textContent = "جميع العملاء";
    }
  }
}

/**
 * Update unauthorized sections with current language
 */
function updateUnauthorizedSections() {
  // Update unauthorized section messages
  const unauthorizedSections = document.querySelectorAll(
    ".unauthorized-section"
  );
  unauthorizedSections.forEach((section) => {
    const unauthorizedMessage = getTranslation("unauthorizedAccessToSection");
    if (unauthorizedMessage) {
      section.setAttribute("data-unauthorized-message", unauthorizedMessage);
    }
  });

  // Update unauthorized tab tooltips
  const unauthorizedTabs = document.querySelectorAll(".unauthorized-tab");
  unauthorizedTabs.forEach((tab) => {
    const sectionName =
      tab.querySelector("span")?.textContent ||
      getTranslation("thisSection") ||
      "هذا القسم";
    const unauthorizedAccessTo = getTranslation("unauthorizedAccessTo");
    if (unauthorizedAccessTo) {
      tab.setAttribute("title", `${unauthorizedAccessTo} ${sectionName}`);
    }
  });
}

/**
 * Switch between Arabic and English languages
 */
function switchLanguage() {
  // Prevent multiple language switches in quick succession
  if (isLanguageSwitchInProgress) {
    console.log("Language switch already in progress, ignoring request");
    return;
  }

  isLanguageSwitchInProgress = true;
  console.log("Switching language from", currentLanguage);
  currentLanguage = currentLanguage === "ar" ? "en" : "ar";
  localStorage.setItem("admin-language", currentLanguage);
  console.log("Language switched to", currentLanguage);

  // Update document language and direction
  document.documentElement.lang =
    translations[currentLanguage].htmlAttributes.lang;
  document.documentElement.dir =
    translations[currentLanguage].htmlAttributes.dir;

  // Apply translations to all elements
  applyTranslations();

  // Update unauthorized sections with new language
  updateUnauthorizedSections();

  // Specifically update account action buttons
  updateAccountActionButtons();

  // Update modal button texts
  updateModalButtonTexts();

  // Force direct text update for select options
  if (currentLanguage === "en") {
    const allCustomersOption = document.querySelector(
      "#reset-points-customer option[value='all']"
    );
    if (allCustomersOption) {
      allCustomersOption.textContent = "All Customers";
      console.log("Directly forced All Customers option to English text");
    }

    // Update all options with data-i18n-en attributes
    document
      .querySelectorAll("select option[data-i18n-en]")
      .forEach((option) => {
        option.textContent = option.getAttribute("data-i18n-en");
        console.log(`Directly forced option text to: ${option.textContent}`);
      });

    // Directly update edit buttons
    document
      .querySelectorAll(".edit-button span[data-i18n='edit']")
      .forEach((span) => {
        span.textContent = "Edit";
        console.log("Directly forced edit button text to English");
      });
  } else {
    // If switching back to Arabic
    document
      .querySelectorAll(".edit-button span[data-i18n='edit']")
      .forEach((span) => {
        span.textContent = "تعديل";
        console.log("Directly forced edit button text to Arabic");
      });
  }

  // Update language switcher text
  const languageSwitcher = document.getElementById("language-switcher");
  if (languageSwitcher) {
    languageSwitcher.textContent = getTranslation("switchLanguage");
    console.log(
      "Updated language switcher text to:",
      getTranslation("switchLanguage")
    );
  } else {
    console.warn("Language switcher button not found");
  }

  // Update currency text elements
  const currencyElements = document.querySelectorAll(".currency-text");
  const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLanguage === "ar" ? "جنية" : "EGP");

  currencyElements.forEach((element) => {
    element.textContent = currencyText;
  });

  // Refresh dynamic texts that depend on language
  try {
    updateAdminDynamicTexts();
  } catch (e) {}

  // Update directional styles if needed
  updateDirectionalStyles();

  // Force refresh select options
  refreshSelectOptions();

  // Force refresh of any components that might need it
  const event = new CustomEvent("languageChanged", {
    detail: { language: currentLanguage },
  });
  document.dispatchEvent(event);

  // Reset the flag after a short delay
  setTimeout(() => {
    isLanguageSwitchInProgress = false;
    console.log("Language switch completed");
  }, 500);
}

/**
 * Update account action buttons text based on current language
 */
function updateAccountActionButtons() {
  console.log("Updating account action buttons for language:", currentLanguage);
  const isEnglish = currentLanguage === "en";

  // Process all account action buttons
  const accountActionBtns = document.querySelectorAll(".account-action-btn");
  accountActionBtns.forEach((btn) => {
    // Update button title
    if (isEnglish && btn.hasAttribute("data-i18n-en-title")) {
      btn.title = btn.getAttribute("data-i18n-en-title");
    } else if (btn.hasAttribute("data-i18n-title")) {
      const titleKey = btn.getAttribute("data-i18n-title");
      if (translations[currentLanguage][titleKey]) {
        btn.title = translations[currentLanguage][titleKey];
      }
    }

    // Update span text inside button
    const spanElement = btn.querySelector("span[data-i18n]");
    if (spanElement) {
      if (isEnglish && spanElement.hasAttribute("data-i18n-en")) {
        spanElement.textContent = spanElement.getAttribute("data-i18n-en");
        console.log(`Updated button span text to: ${spanElement.textContent}`);
      } else {
        const spanKey = spanElement.getAttribute("data-i18n");
        if (translations[currentLanguage][spanKey]) {
          spanElement.textContent = translations[currentLanguage][spanKey];
        }
      }
    }
  });

  // Handle specific buttons by class
  const permissionsBtns = document.querySelectorAll(".permissions-btn span");
  permissionsBtns.forEach((span) => {
    span.textContent = isEnglish ? "Permissions" : "الصلاحيات";
  });

  const suspendBtns = document.querySelectorAll(".suspend-btn span");
  suspendBtns.forEach((span) => {
    span.textContent = isEnglish ? "Suspend" : "إيقاف";
  });

  const activateBtns = document.querySelectorAll(".activate-btn span");
  activateBtns.forEach((span) => {
    span.textContent = isEnglish ? "Activate" : "تنشيط";
  });

  const deleteBtns = document.querySelectorAll(".delete-btn span");
  deleteBtns.forEach((span) => {
    span.textContent = isEnglish ? "Delete" : "حذف";
  });

  const assignRoleBtns = document.querySelectorAll(".assign-role-btn span");
  assignRoleBtns.forEach((span) => {
    span.textContent = isEnglish ? "Assign Role" : "تعيين دور";
  });

  // Fix edit buttons specifically
  const editBtns = document.querySelectorAll(
    ".edit-button span[data-i18n='edit']"
  );
  editBtns.forEach((span) => {
    span.textContent = isEnglish ? "Edit" : "تعديل";
    console.log(`Updated edit button text to: ${span.textContent}`);
  });
}

/**
 * Update modal button texts based on current language
 */
function updateModalButtonTexts() {
  console.log("Updating modal button texts for language:", currentLanguage);

  // Update save permissions button
  const savePermissionsBtn = document.getElementById("save-permissions");
  if (savePermissionsBtn) {
    const savePermissionsText =
      getTranslation("savePermissions") || "حفظ الصلاحيات";
    savePermissionsBtn.innerHTML = `<i class="fas fa-save"></i> ${savePermissionsText}`;
    console.log(
      "Updated save permissions button text to:",
      savePermissionsText
    );
  }

  // Update cancel button
  const cancelBtn = document.getElementById("cancel-permissions");
  if (cancelBtn) {
    const cancelText = getTranslation("cancel") || "إلغاء";
    cancelBtn.innerHTML = `<i class="fas fa-times"></i> ${cancelText}`;
    console.log("Updated cancel button text to:", cancelText);
  }

  // Update any other modal buttons that might need language updates
  const modalButtons = document.querySelectorAll(".modal button[data-i18n]");
  modalButtons.forEach((button) => {
    const i18nKey = button.getAttribute("data-i18n");
    if (i18nKey && translations[currentLanguage][i18nKey]) {
      const icon = button.querySelector("i");
      const iconHtml = icon ? icon.outerHTML + " " : "";
      button.innerHTML = iconHtml + translations[currentLanguage][i18nKey];
      console.log(
        `Updated modal button ${i18nKey} to:`,
        translations[currentLanguage][i18nKey]
      );
    }
  });

  console.log("Modal button texts updated for language:", currentLanguage);
}

/**
 * Fix edit buttons language
 */
function fixEditButtons() {
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";

  // Fix edit buttons text based on current language
  const editBtns = document.querySelectorAll(
    ".edit-button span[data-i18n='edit']"
  );
  editBtns.forEach((span) => {
    span.textContent = isEnglish ? "Edit" : "تعديل";
    console.log(`Fixed edit button text to: ${span.textContent}`);
  });
}

/**
 * Initialize i18n functionality
 */
function initI18n() {
  console.log("Initializing i18n with language:", currentLanguage);

  // Apply translations on page load
  applyTranslations();
  
  // Mark body as ready to show content
  document.body.classList.add('i18n-ready');

  // Specifically update account action buttons
  updateAccountActionButtons();

  // Fix edit buttons specifically
  fixEditButtons();

  // Add listener for products tab click to fix edit buttons
  const productsTab = document.querySelector('a[href="#products-section"]');
  if (productsTab) {
    productsTab.addEventListener("click", function () {
      // Use setTimeout to ensure DOM is updated before fixing buttons
      setTimeout(fixEditButtons, 100);
    });
  }

  // Add event listener for language changes
  document.addEventListener("languageChanged", function (e) {
    console.log("Language changed event detected, fixing edit buttons");
    setTimeout(fixEditButtons, 100);
  });

  // Add event listener to language switcher button
  const languageSwitcher = document.getElementById("language-switcher");
  if (languageSwitcher) {
    // Remove any existing event listeners to avoid duplicates
    const newLanguageSwitcher = languageSwitcher.cloneNode(true);
    languageSwitcher.parentNode.replaceChild(
      newLanguageSwitcher,
      languageSwitcher
    );

    // Set label from translations
    newLanguageSwitcher.textContent = getTranslation("switchLanguage");

    // Add the event listener
    newLanguageSwitcher.addEventListener("click", function () {
      switchLanguage();

      // Dispatch event for other modules to react to language change
      const event = new CustomEvent("languageChanged", {
        detail: { language: currentLanguage },
      });
      document.dispatchEvent(event);
    });

    // Make the function globally available
    window.globalSwitchLanguage = function () {
      switchLanguage();

      // Dispatch event for other modules to react to language change
      const event = new CustomEvent("languageChanged", {
        detail: { language: currentLanguage },
      });
      document.dispatchEvent(event);
    };
  } else {
    // Auto-create a language switcher for pages that don't include it
    const createdSwitcher = document.createElement("button");
    createdSwitcher.id = "language-switcher";
    createdSwitcher.className = "language-switcher";
    createdSwitcher.type = "button";
    createdSwitcher.textContent = getTranslation("switchLanguage");
    createdSwitcher.addEventListener("click", function () {
      switchLanguage();
      const event = new CustomEvent("languageChanged", {
        detail: { language: currentLanguage },
      });
      document.dispatchEvent(event);
    });
    document.body.appendChild(createdSwitcher);
    // Ensure it appears in the correct place for current direction
    updateDirectionalStyles();
  }

  // Fix specific sections that need special handling
  fixLoyaltyPointsSection();
}

/**
 * Update directional styles based on current language
 */
function updateDirectionalStyles() {
  const isRTL = document.documentElement.dir === "rtl";
  const loginPanel = document.querySelector(".login-panel");

  // Add or remove ltr-layout class based on direction
  if (isRTL) {
    document.body.classList.remove("ltr-layout");
  } else {
    document.body.classList.add("ltr-layout");
  }

  if (loginPanel) {
    // Adjust login panel direction
    loginPanel.style.flexDirection = isRTL ? "row-reverse" : "row";
  }

  // Adjust input icons
  const inputIcons = document.querySelectorAll(
    ".input-with-icon i:not(.fa-eye)"
  );
  inputIcons.forEach((icon) => {
    if (isRTL) {
      icon.style.right = "15px";
      icon.style.left = "auto";
    } else {
      icon.style.left = "15px";
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
      button.style.left = "15px";
      button.style.right = "auto";
    } else {
      button.style.right = "15px";
      button.style.left = "auto";
    }
  });

  // Position language switcher and theme toggle
  const languageSwitcher = document.getElementById("language-switcher");
  const themeToggle = document.getElementById("theme-toggle");

  if (languageSwitcher) {
    if (isRTL) {
      languageSwitcher.style.left = "20px";
      languageSwitcher.style.right = "auto";
    } else {
      languageSwitcher.style.right = "20px";
      languageSwitcher.style.left = "auto";
    }
  }

  if (themeToggle) {
    if (isRTL) {
      themeToggle.style.right = "20px";
      themeToggle.style.left = "auto";
    } else {
      themeToggle.style.left = "20px";
      themeToggle.style.right = "auto";
    }
  }

  // Position close-modal buttons based on language direction
  const closeModalButtons = document.querySelectorAll(".close-modal");
  closeModalButtons.forEach((button) => {
    if (isRTL) {
      button.style.left = "20px";
      button.style.right = "auto";
    } else {
      button.style.right = "20px";
      button.style.left = "auto";
    }
  });

  // Adjust back-to-menu link icon margin
  const backLink = document.querySelector(".back-link i");
  if (backLink) {
    if (isRTL) {
      if (backLink.classList.contains("fa-arrow-right")) {
        backLink.style.marginLeft = "8px";
        backLink.style.marginRight = "0";
      }
    } else {
      if (backLink.classList.contains("fa-arrow-left")) {
        backLink.style.marginRight = "8px";
        backLink.style.marginLeft = "0";
      }
    }
  }

  // Login form feature icons alignment
  const loginFeatures = document.querySelectorAll(".login-feature");
  loginFeatures.forEach((feature) => {
    if (isRTL) {
      feature.style.textAlign = "right";
      feature.style.flexDirection = "row-reverse";
    } else {
      feature.style.textAlign = "left";
      feature.style.flexDirection = "row";
    }
  });

  // Update admin-specific elements
  if (!isRTL) {
    // For LTR mode
    const adminContent = document.querySelector(".admin-content");
    if (adminContent) {
      adminContent.style.marginLeft = "250px";
      adminContent.style.marginRight = "0";
    }

    const adminTabs = document.querySelector(".admin-tabs");
    if (adminTabs) {
      adminTabs.style.left = "0";
      adminTabs.style.right = "auto";
    }

   

    // Adjust form elements for LTR
    const formGroups = document.querySelectorAll(
      ".form-group label, .setting-group label"
    );
    formGroups.forEach((label) => {
      label.style.textAlign = "left";
    });
  } else {
    // For RTL mode
    const adminContent = document.querySelector(".admin-content");
    if (adminContent) {
      adminContent.style.marginRight = "250px";
      adminContent.style.marginLeft = "0";
    }

    const adminTabs = document.querySelector(".admin-tabs");
    if (adminTabs) {
      adminTabs.style.right = "0";
      adminTabs.style.left = "auto";
    }



    // Adjust form elements for RTL
    const formGroups = document.querySelectorAll(
      ".form-group label, .setting-group label"
    );
    formGroups.forEach((label) => {
      label.style.textAlign = "right";
    });
  }
}

/**
 * Update server status text based on current state
 */
function updateServerStatusText() {
  const serverStatus = document.getElementById("server-status");
  if (serverStatus) {
    if (serverStatus.classList.contains("online")) {
      serverStatus.textContent = getTranslation("serverOnline");
    } else if (serverStatus.classList.contains("offline")) {
      // If it contains "checking" text (in either language), use checkingServer translation
      if (
        serverStatus.textContent.includes("Checking") ||
        serverStatus.textContent.includes("جاري التحقق")
      ) {
        serverStatus.textContent = getTranslation("checkingServer");
      } else {
        // Otherwise use serverOffline or serverError based on content
        if (
          serverStatus.textContent.includes("Cannot connect") ||
          serverStatus.textContent.includes("لا يمكن الاتصال")
        ) {
          serverStatus.textContent = getTranslation("serverOffline");
        } else if (
          serverStatus.textContent.includes("problem") ||
          serverStatus.textContent.includes("مشكلة")
        ) {
          serverStatus.textContent = getTranslation("serverError");
        } else {
          serverStatus.textContent = getTranslation("serverOffline");
        }
      }
    }
  }
}

/**
 * Fix loyalty points section translations
 */
function fixLoyaltyPointsSection() {
  if (currentLanguage === "en") {
    // Specifically target the reset-points-customer dropdown
    const allCustomersOption = document.querySelector(
      "#reset-points-customer option[value='all']"
    );
    if (allCustomersOption) {
      allCustomersOption.textContent = "All Customers";
      console.log("Fixed All Customers option in loyalty points section");
    }
  }
}

// Add a MutationObserver to watch for changes in the DOM
const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    // If nodes were added and we're in English mode
    if (mutation.addedNodes.length > 0 && currentLanguage === "en") {
      // Check if any of the added nodes contain our target select
      mutation.addedNodes.forEach((node) => {
        if (
          node.nodeType === 1 &&
          (node.id === "loyalty-points-section" ||
            node.querySelector("#reset-points-customer"))
        ) {
          console.log(
            "Loyalty points section was added to DOM, fixing translations"
          );
          setTimeout(fixLoyaltyPointsSection, 100);
        }
      });
    }
  });
});

// Start observing the document body for changes
document.addEventListener("DOMContentLoaded", function () {
  observer.observe(document.body, { childList: true, subtree: true });
});

// Auto-initialize when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded - initializing i18n");
  console.log(
    "Current language from localStorage:",
    localStorage.getItem("admin-language")
  );

  // Initialize i18n
  initI18n();

  // Directly fix the "All Customers" option if language is English
  if (currentLanguage === "en") {
    setTimeout(function () {
      const allCustomersOption = document.querySelector(
        "#reset-points-customer option[value='all']"
      );
      if (allCustomersOption) {
        allCustomersOption.textContent = "All Customers";
        console.log("Fixed All Customers option text on page load");
      }

      // Check all select options with data-i18n-en attributes
      const enSelectOptions = document.querySelectorAll(
        "select option[data-i18n-en]"
      );
      enSelectOptions.forEach((option) => {
        option.textContent = option.getAttribute("data-i18n-en");
        console.log(`Fixed option text to: ${option.textContent}`);
      });
    }, 100);
  }

  // Add event listener to the loyalty points tab
  const loyaltyPointsTab = document.querySelector(
    'a[href="#loyalty-points-section"]'
  );
  if (loyaltyPointsTab) {
    loyaltyPointsTab.addEventListener("click", function () {
      console.log("Loyalty points tab clicked");
      if (currentLanguage === "en") {
        setTimeout(fixLoyaltyPointsSection, 100);
      }
    });
  }

  // Add event listener to language switcher if it exists in the HTML
  const languageSwitcher = document.getElementById("language-switcher");
  if (languageSwitcher) {
    console.log("Found language switcher button, adding click event listener");
    languageSwitcher.addEventListener("click", function () {
      console.log("Language switcher clicked");
      switchLanguage();
    });
  } else {
    // Create one if not present
    const createdSwitcher = document.createElement("button");
    createdSwitcher.id = "language-switcher";
    createdSwitcher.className = "language-switcher";
    createdSwitcher.type = "button";
    createdSwitcher.textContent = getTranslation("switchLanguage");
    createdSwitcher.addEventListener("click", function () {
      switchLanguage();
    });
    document.body.appendChild(createdSwitcher);
    updateDirectionalStyles();
  }

  // Debug function to test language switching
  window.testLanguageSwitch = function () {
    console.log("Testing language switch");
    switchLanguage();
    return "Language switched to " + currentLanguage;
  };
});

// Export functions for use in other scripts
window.getTranslation = getTranslation;
window.getCurrentLanguage = getCurrentLanguage;
window.applyTranslations = applyTranslations;
window.switchLanguage = switchLanguage;
window.initI18n = initI18n;

// Make the switchLanguage function globally accessible
window.globalSwitchLanguage = switchLanguage;

/**
 * Update dynamic admin UI texts that don't use data-i18n attributes
 * Ensures immediate reflection on language change without full reload
 */
function updateAdminDynamicTexts() {
  const isEnglish = currentLanguage === "en";

  // Data cards titles
  document.querySelectorAll("#total-sales .data-card-title").forEach((el) => {
    const span = el.querySelector("[data-i18n]");
    if (span) span.textContent = getTranslation(span.getAttribute("data-i18n"));
  });
  document.querySelectorAll("#avg-sale .data-card-title").forEach((el) => {
    const span = el.querySelector("[data-i18n]");
    if (span) span.textContent = getTranslation(span.getAttribute("data-i18n"));
  });
  document.querySelectorAll("#highest-day .data-card-title").forEach((el) => {
    const span = el.querySelector("[data-i18n]");
    if (span) span.textContent = getTranslation(span.getAttribute("data-i18n"));
  });

  // Summary titles (crowded hours, recent orders, etc.) are data-i18n backed in HTML
  // But ensure any dynamically created ones are corrected
  document.querySelectorAll(".summary-title[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = getTranslation(key);
  });

  // Order status badge text standardization
  document.querySelectorAll(".order-status-badge").forEach((badge) => {
    const status = (badge.className.match(
      /\b(completed|pending|cancelled|processing)\b/
    ) || [])[0];
    if (!status) return;
    let key = null;
    if (status === "completed") key = "orderStatusCompleted";
    else if (status === "pending") key = "orderStatusPending";
    else if (status === "cancelled") key = "orderStatusCancelled";
    else if (status === "processing") key = "orderStatusProcessing";
    if (key) {
      // Preserve icon if present
      const icon = badge.querySelector("i");
      const label = getTranslation(key);
      badge.textContent = "";
      if (icon) badge.appendChild(icon);
      badge.appendChild(document.createTextNode(" " + label));
    }
  });

  // Order totals currency label handled elsewhere; ensure consistency
  document.querySelectorAll(".order-total").forEach((el) => {
    // Example format: "123.00 <span class=currency-text>EGP</span>"
    const currencySpan = el.querySelector(".currency-text");
    if (currencySpan) {
      currencySpan.textContent = typeof getCurrencyText === "function" ? getCurrencyText() : (isEnglish ? "EGP" : "جنية");
    }
  });

  // Best product stats labels (if any text nodes present)
  document.querySelectorAll(".best-product-stat[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = getTranslation(key);
  });
  document
    .querySelectorAll(".best-product-price .currency-text")
    .forEach((el) => {
      el.textContent = typeof getCurrencyText === "function" ? getCurrencyText() : (isEnglish ? "EGP" : "جنية");
    });
  document
    .querySelectorAll(".best-product-name[data-name-ar]")
    .forEach((el) => {
      const arName = el.getAttribute("data-name-ar") || "منتج غير معروف";
      const enName = el.getAttribute("data-name-en") || arName;
      el.textContent = isEnglish ? enName : arName;
    });

  // Export buttons
  document.querySelectorAll(".export-button[data-i18n]").forEach((btn) => {
    const key = btn.getAttribute("data-i18n");
    if (!key) return;
    const icon = btn.querySelector("i");
    const text = getTranslation(key);
    btn.textContent = "";
    if (icon) btn.appendChild(icon);
    btn.appendChild(document.createTextNode(" " + text));
  });

  // Voucher details and expiry statuses
  document.querySelectorAll(".voucher-detail[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = getTranslation(key);
  });
  document.querySelectorAll(".expiry-status").forEach((el) => {
    const isExpired = el.classList.contains("expired");
    const label = getTranslation(isExpired ? "expired" : "active");
    el.textContent = label;
  });

  // Addon editors
  document
    .querySelectorAll(".add-addon-option-btn[data-i18n]")
    .forEach((btn) => {
      const key = btn.getAttribute("data-i18n");
      if (!key) return;
      const icon = btn.querySelector("i");
      const text = getTranslation(key);
      btn.textContent = "";
      if (icon) btn.appendChild(icon);
      btn.appendChild(document.createTextNode(" " + text));
    });
  document
    .querySelectorAll(".addon-section-toggle[data-i18n]")
    .forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = getTranslation(key);
    });

  // Reservation status pills
  document.querySelectorAll(".reservation-status").forEach((el) => {
    const cls = (el.className.match(
      /\b(status-pending|status-confirmed|status-completed|status-cancelled)\b/
    ) || [])[0];
    if (!cls) return;
    let key = null;
    if (cls.includes("pending")) key = "pending";
    else if (cls.includes("confirmed")) key = "confirmed";
    else if (cls.includes("completed")) key = "completed";
    else if (cls.includes("cancelled")) key = "cancelled";
    if (key) el.textContent = getTranslation(key);
  });

  // Products names if they carry data-i18n
  document.querySelectorAll(".best-product-name[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = getTranslation(key);
  });
}

// Expose i18n functions to global window object for use in other scripts
window.i18n = {
  getTranslation: getTranslation,
  getCurrentLanguage: getCurrentLanguage,
  switchLanguage: switchLanguage,
  applyTranslations: applyTranslations
};
