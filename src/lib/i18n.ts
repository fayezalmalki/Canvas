export type Locale = "en" | "ar";

const en: Record<string, string> = {
  // Homepage
  "home.brand": "بصيـــرة",
  "home.brandSub": "Baseera",
  "home.description": "Crawl any website to analyze its SEO, content, and products",
  "home.placeholder": "example.com",
  "home.analyze": "Analyze Site",
  "home.crawling": "Crawling...",
  "home.advanced": "Advanced options",
  "home.maxDepth": "Max Depth",
  "home.maxPages": "Max Pages",
  "home.screenshots": "Capture page screenshots (slower but provides visual previews)",
  "home.invalidUrl": "Please enter a valid URL",
  "home.crawled": "Crawled {current} of {total} pages",
  "home.discovered": "Discovered {total} URLs total ({remaining} remaining)",
  "home.patience": "This may take a few minutes depending on the site size",
  "home.recentSites": "Recent Sites",
  "home.crawledCount": "crawled",
  "home.foundCount": "found",
  "home.justNow": "just now",

  // Header
  "header.backToHome": "Back to Home",
  "header.pages": "pages",
  "header.hideImages": "Hide images",
  "header.showImages": "Show images",
  "header.seoAdvisor": "SEO Advisor",
  "header.copied": "Copied!",
  "header.copyLink": "Copy link",
  "header.language": "Language",

  // Sidebar
  "sidebar.sitemap": "Sitemap",
  "sidebar.filterPages": "Filter pages...",
  "sidebar.searchProducts": "Search products...",
  "sidebar.pagesCrawled": "{count} pages crawled",
  "sidebar.productsFound": "{count} products found",
  "sidebar.noMatches": "No matches",
  "sidebar.noProductsMatch": "No products match",
  "sidebar.noProductsFound": "No products found",
  "sidebar.pages": "Pages",
  "sidebar.products": "Products",

  // Overview
  "overview.title": "Site Overview",
  "overview.pagesLabel": "pages",
  "overview.avgWords": "avg {count} words/page",
  "overview.avgResponse": "avg {time}ms response",
  "overview.moreDiscovered": "{count} more pages discovered",
  "overview.crawledOf": "{crawled} pages crawled out of {total} found on the site",
  "overview.crawlRemaining": "Crawl Remaining",

  // Stats
  "stats.pages": "Pages",
  "stats.avgSeoScore": "Avg SEO Score",
  "stats.internalLinks": "Internal Links",
  "stats.externalLinks": "External Links",
  "stats.images": "Images",
  "stats.missingAlt": "Missing Alt",
  "stats.noMetaDesc": "No Meta Desc",
  "stats.brokenLinks": "Broken Links",
  "stats.avgResponse": "Avg Response",

  // Tabs
  "tabs.pages": "Pages",
  "tabs.seoGuide": "SEO Guide",
  "tabs.internalLinks": "Internal Links",
  "tabs.externalLinks": "External Links",
  "tabs.images": "Images",
  "tabs.linksHealth": "Links Health",
  "tabs.contentIssues": "Content Issues",
  "tabs.i18n": "i18n",
  "tabs.products": "Products",

  // Sort
  "sort.smart": "Smart (Recommended)",
  "sort.route": "Group by Route",
  "sort.seoScore": "SEO Score (High → Low)",
  "sort.responseTime": "Response Time (Fast → Slow)",
  "sort.wordCount": "Word Count (Most → Least)",

  // Page detail
  "page.overview": "Overview",
  "page.notFound": "Page not found in crawl data",
  "page.seoScore": "SEO Score",
  "page.viewAnalysis": "View Full Analysis",
  "page.seoOverview": "SEO Overview",
  "page.links": "Links",
  "page.previous": "Previous",
  "page.next": "Next",
  "page.untitled": "Untitled",
  "page.aiAnalysis": "AI Analysis",
  "page.words": "words",
  "page.linksLabel": "links",
  "page.imgs": "imgs",

  // SEO Overview
  "seo.metaTags": "Meta Tags",
  "seo.metaDescription": "Meta Description",
  "seo.keywords": "Keywords",
  "seo.canonical": "Canonical",
  "seo.robots": "Robots",
  "seo.ogTitle": "OG Title",
  "seo.ogDescription": "OG Description",
  "seo.ogImage": "OG Image",
  "seo.ogImagePreview": "OG Image Preview",
  "seo.ogImageFailed": "Failed to load OG image",
  "seo.language": "Language",
  "seo.headingStructure": "Heading Structure",
  "seo.hasStructuredData": "Has structured data",
  "seo.performance": "Performance",
  "seo.responseTime": "Response Time",
  "seo.htmlSize": "HTML Size",
  "seo.compression": "Compression",
  "seo.cacheControl": "Cache-Control",
  "seo.yes": "Yes",
  "seo.no": "No",
  "seo.set": "Set",
  "seo.notSet": "Not set",
  "seo.server": "Server:",
  "seo.i18n": "Internationalization",
  "seo.direction": "Direction:",
  "seo.arabicContent": "Arabic content:",
  "seo.arabicNoRtl": "Arabic content detected but no dir=\"rtl\" attribute",
  "seo.hreflang": "Hreflang alternates:",
  "seo.structuredData": "Structured Data",
  "seo.productsLabel": "Products",
  "seo.inStock": "In Stock",
  "seo.outOfStock": "Out of Stock",
  "seo.limited": "Limited",
  "seo.preOrder": "PreOrder",
  "seo.backOrder": "BackOrder",
  "seo.quickChecks": "Quick Checks",
  "seo.metaDesc": "Meta Description",
  "seo.canonicalUrl": "Canonical URL",
  "seo.openGraph": "Open Graph",
  "seo.singleH1": "Single H1",
  "seo.allImagesAlt": "All Images Have Alt",
  "seo.viewportSet": "Viewport Set",
  "seo.languageSet": "Language Set",

  // Link list
  "links.noOutgoing": "No outgoing links found",
  "links.nav": "nav",
  "links.header": "header",
  "links.footer": "footer",
  "links.main": "main",
  "links.other": "other",

  // Broken links
  "broken.noIssues": "No broken links or redirect chains found",
  "broken.brokenLinks": "Broken Links",
  "broken.redirectChains": "Redirect Chains",
  "broken.linkedFrom": "Linked from:",
  "broken.hops": "hops",
  "broken.reduceRedirect": "consider reducing to a single redirect",

  // Content issues
  "content.noIssues": "No content issues detected",
  "content.thinPages": "Thin Pages",
  "content.under100": "Under 100 words",
  "content.duplicateTitles": "Duplicate Titles",
  "content.duplicateDescriptions": "Duplicate Descriptions",
  "content.similarContent": "Similar Content",
  "content.similar": "% similar",

  // SEO Guide
  "guide.title": "SEO Improvement Guide",
  "guide.overallHealth": "Overall SEO Health",
  "guide.critical": "Critical",
  "guide.important": "Important",
  "guide.niceToHave": "Nice to have",
  "guide.searchIssues": "Search issues...",
  "guide.allCategories": "All",
  "guide.noIssues": "No SEO issues detected",
  "guide.allGood": "All pages are following SEO best practices",
  "guide.howToFix": "How to fix",
  "guide.affectedPages": "Affected pages",
  "guide.showMore": "Show {count} more pages",
  "guide.showFewer": "Show fewer",
  "guide.noMatch": "No issues match your search",

  // Internal links panel
  "internal.title": "Internal Links Overview",
  "internal.uniqueTargets": "Unique Targets",
  "internal.avgPerPage": "Avg Links/Page",
  "internal.orphanPages": "Orphan Pages",
  "internal.searchPlaceholder": "Search links...",

  // External links panel
  "external.title": "External Links Overview",
  "external.totalLinks": "Total Links",
  "external.domains": "Domains",
  "external.topDomain": "Top Domain",
  "external.searchPlaceholder": "Search links...",

  // Images panel
  "images.title": "Images Overview",
  "images.totalImages": "Total Images",
  "images.missingAlt": "Missing Alt",
  "images.coverage": "Alt Coverage",
  "images.searchPlaceholder": "Search pages...",
  "images.sortByImages": "Most Images",
  "images.sortByMissing": "Most Missing Alt",

  // i18n summary
  "i18n.arabicPages": "Arabic Pages",
  "i18n.rtlConfigured": "RTL Configured",
  "i18n.hasHreflang": "Has Hreflang",
  "i18n.missingRtl": "Missing RTL",
  "i18n.arabicWithoutRtl": "Arabic pages without dir=\"rtl\"",
  "i18n.allArabicPages": "All Arabic Content Pages",

  // Error page
  "error.title": "Site not found",
  "error.description": "This audit may have been deleted or the link is invalid.",
  "error.tryAgain": "Try Again",
  "error.goHome": "Go Home",

  // Export
  "export.button": "Export PDF",
  "export.exporting": "Exporting...",
  "export.exported": "Exported!",

  // Bot protection
  "bot.detected": "Bot detection active",
  "bot.warning": "This page is protected by bot detection. The crawler received a challenge page instead of the actual content. SEO data may be inaccurate.",

  // SERP Preview
  "serp.title": "SERP Preview",

  // Common
  "common.page": "page",
  "common.pages": "pages",
  "common.words": "words",
  "common.schema": "Schema",
  "common.noMetaDesc": "No meta desc",
  "common.noOgTags": "No OG tags",
  "common.imgNoAlt": "img no alt",
  "common.noRtl": "No RTL",
  "common.rtl": "RTL",
};

const ar: Record<string, string> = {
  // Homepage
  "home.brand": "بصيـــرة",
  "home.brandSub": "Baseera",
  "home.description": "تحليل شامل لأي موقع من حيث السيو والمحتوى والمنتجات",
  "home.placeholder": "example.com",
  "home.analyze": "تحليل الموقع",
  "home.crawling": "جارٍ الفحص...",
  "home.advanced": "خيارات متقدمة",
  "home.maxDepth": "أقصى عمق",
  "home.maxPages": "أقصى عدد صفحات",
  "home.screenshots": "التقاط صور للصفحات (أبطأ لكن يوفر معاينة بصرية)",
  "home.invalidUrl": "يرجى إدخال رابط صحيح",
  "home.crawled": "تم فحص {current} من {total} صفحة",
  "home.discovered": "تم اكتشاف {total} رابط ({remaining} متبقية)",
  "home.patience": "قد يستغرق هذا بضع دقائق حسب حجم الموقع",
  "home.recentSites": "المواقع الأخيرة",
  "home.crawledCount": "تم فحصها",
  "home.foundCount": "تم العثور عليها",
  "home.justNow": "الآن",

  // Header
  "header.backToHome": "العودة للرئيسية",
  "header.pages": "صفحة",
  "header.hideImages": "إخفاء الصور",
  "header.showImages": "إظهار الصور",
  "header.seoAdvisor": "مستشار السيو",
  "header.copied": "تم النسخ!",
  "header.copyLink": "نسخ الرابط",
  "header.language": "اللغة",

  // Sidebar
  "sidebar.sitemap": "خريطة الموقع",
  "sidebar.filterPages": "تصفية الصفحات...",
  "sidebar.searchProducts": "البحث في المنتجات...",
  "sidebar.pagesCrawled": "تم فحص {count} صفحة",
  "sidebar.productsFound": "تم العثور على {count} منتج",
  "sidebar.noMatches": "لا توجد نتائج",
  "sidebar.noProductsMatch": "لا توجد منتجات مطابقة",
  "sidebar.noProductsFound": "لم يتم العثور على منتجات",
  "sidebar.pages": "الصفحات",
  "sidebar.products": "المنتجات",

  // Overview
  "overview.title": "نظرة عامة على الموقع",
  "overview.pagesLabel": "صفحة",
  "overview.avgWords": "متوسط {count} كلمة/صفحة",
  "overview.avgResponse": "متوسط {time}مللي ثانية استجابة",
  "overview.moreDiscovered": "تم اكتشاف {count} صفحة إضافية",
  "overview.crawledOf": "تم فحص {crawled} صفحة من أصل {total} صفحة",
  "overview.crawlRemaining": "فحص المتبقي",

  // Stats
  "stats.pages": "الصفحات",
  "stats.avgSeoScore": "متوسط نقاط السيو",
  "stats.internalLinks": "الروابط الداخلية",
  "stats.externalLinks": "الروابط الخارجية",
  "stats.images": "الصور",
  "stats.missingAlt": "نص بديل مفقود",
  "stats.noMetaDesc": "بدون وصف ميتا",
  "stats.brokenLinks": "روابط معطلة",
  "stats.avgResponse": "متوسط الاستجابة",

  // Tabs
  "tabs.pages": "الصفحات",
  "tabs.seoGuide": "دليل السيو",
  "tabs.internalLinks": "الروابط الداخلية",
  "tabs.externalLinks": "الروابط الخارجية",
  "tabs.images": "الصور",
  "tabs.linksHealth": "صحة الروابط",
  "tabs.contentIssues": "مشاكل المحتوى",
  "tabs.i18n": "التدويل",
  "tabs.products": "المنتجات",

  // Sort
  "sort.smart": "ذكي (موصى به)",
  "sort.route": "تجميع حسب المسار",
  "sort.seoScore": "نقاط السيو (الأعلى → الأقل)",
  "sort.responseTime": "وقت الاستجابة (الأسرع → الأبطأ)",
  "sort.wordCount": "عدد الكلمات (الأكثر → الأقل)",

  // Page detail
  "page.overview": "نظرة عامة",
  "page.notFound": "الصفحة غير موجودة في بيانات الفحص",
  "page.seoScore": "نقاط السيو",
  "page.viewAnalysis": "عرض التحليل الكامل",
  "page.seoOverview": "نظرة عامة على السيو",
  "page.links": "الروابط",
  "page.previous": "السابق",
  "page.next": "التالي",
  "page.untitled": "بدون عنوان",
  "page.aiAnalysis": "تحليل الذكاء الاصطناعي",
  "page.words": "كلمة",
  "page.linksLabel": "رابط",
  "page.imgs": "صورة",

  // SEO Overview
  "seo.metaTags": "وسوم الميتا",
  "seo.metaDescription": "وصف الميتا",
  "seo.keywords": "الكلمات المفتاحية",
  "seo.canonical": "الرابط الأساسي",
  "seo.robots": "Robots",
  "seo.ogTitle": "عنوان OG",
  "seo.ogDescription": "وصف OG",
  "seo.ogImage": "صورة OG",
  "seo.ogImagePreview": "معاينة صورة OG",
  "seo.ogImageFailed": "فشل تحميل صورة OG",
  "seo.language": "اللغة",
  "seo.headingStructure": "هيكل العناوين",
  "seo.hasStructuredData": "يحتوي على بيانات منظمة",
  "seo.performance": "الأداء",
  "seo.responseTime": "وقت الاستجابة",
  "seo.htmlSize": "حجم HTML",
  "seo.compression": "الضغط",
  "seo.cacheControl": "التحكم بالتخزين المؤقت",
  "seo.yes": "نعم",
  "seo.no": "لا",
  "seo.set": "مُعيّن",
  "seo.notSet": "غير مُعيّن",
  "seo.server": "الخادم:",
  "seo.i18n": "التدويل",
  "seo.direction": "الاتجاه:",
  "seo.arabicContent": "محتوى عربي:",
  "seo.arabicNoRtl": "تم اكتشاف محتوى عربي بدون سمة dir=\"rtl\"",
  "seo.hreflang": "بدائل Hreflang:",
  "seo.structuredData": "البيانات المنظمة",
  "seo.productsLabel": "المنتجات",
  "seo.inStock": "متوفر",
  "seo.outOfStock": "غير متوفر",
  "seo.limited": "محدود",
  "seo.preOrder": "طلب مسبق",
  "seo.backOrder": "طلب لاحق",
  "seo.quickChecks": "فحوصات سريعة",
  "seo.metaDesc": "وصف الميتا",
  "seo.canonicalUrl": "الرابط الأساسي",
  "seo.openGraph": "Open Graph",
  "seo.singleH1": "H1 واحد",
  "seo.allImagesAlt": "جميع الصور لها نص بديل",
  "seo.viewportSet": "Viewport مُعيّن",
  "seo.languageSet": "اللغة مُعيّنة",

  // Link list
  "links.noOutgoing": "لا توجد روابط خارجة",
  "links.nav": "تنقل",
  "links.header": "رأس",
  "links.footer": "تذييل",
  "links.main": "رئيسي",
  "links.other": "أخرى",

  // Broken links
  "broken.noIssues": "لا توجد روابط معطلة أو سلاسل إعادة توجيه",
  "broken.brokenLinks": "الروابط المعطلة",
  "broken.redirectChains": "سلاسل إعادة التوجيه",
  "broken.linkedFrom": "مرتبط من:",
  "broken.hops": "قفزة",
  "broken.reduceRedirect": "يُنصح بتقليلها إلى إعادة توجيه واحدة",

  // Content issues
  "content.noIssues": "لا توجد مشاكل في المحتوى",
  "content.thinPages": "صفحات ضعيفة",
  "content.under100": "أقل من 100 كلمة",
  "content.duplicateTitles": "عناوين مكررة",
  "content.duplicateDescriptions": "أوصاف مكررة",
  "content.similarContent": "محتوى متشابه",
  "content.similar": "% تشابه",

  // SEO Guide
  "guide.title": "دليل تحسين السيو",
  "guide.overallHealth": "الصحة العامة للسيو",
  "guide.critical": "حرج",
  "guide.important": "مهم",
  "guide.niceToHave": "مستحسن",
  "guide.searchIssues": "البحث في المشاكل...",
  "guide.allCategories": "الكل",
  "guide.noIssues": "لا توجد مشاكل سيو",
  "guide.allGood": "جميع الصفحات تتبع أفضل ممارسات السيو",
  "guide.howToFix": "كيفية الإصلاح",
  "guide.affectedPages": "الصفحات المتأثرة",
  "guide.showMore": "عرض {count} صفحات إضافية",
  "guide.showFewer": "عرض أقل",
  "guide.noMatch": "لا توجد مشاكل مطابقة لبحثك",

  // Internal links panel
  "internal.title": "نظرة عامة على الروابط الداخلية",
  "internal.uniqueTargets": "أهداف فريدة",
  "internal.avgPerPage": "متوسط الروابط/صفحة",
  "internal.orphanPages": "صفحات يتيمة",
  "internal.searchPlaceholder": "البحث في الروابط...",

  // External links panel
  "external.title": "نظرة عامة على الروابط الخارجية",
  "external.totalLinks": "إجمالي الروابط",
  "external.domains": "النطاقات",
  "external.topDomain": "أكثر نطاق",
  "external.searchPlaceholder": "البحث في الروابط...",

  // Images panel
  "images.title": "نظرة عامة على الصور",
  "images.totalImages": "إجمالي الصور",
  "images.missingAlt": "نص بديل مفقود",
  "images.coverage": "تغطية النص البديل",
  "images.searchPlaceholder": "البحث في الصفحات...",
  "images.sortByImages": "الأكثر صوراً",
  "images.sortByMissing": "الأكثر نقصاً",

  // i18n summary
  "i18n.arabicPages": "صفحات عربية",
  "i18n.rtlConfigured": "RTL مُهيأ",
  "i18n.hasHreflang": "يحتوي Hreflang",
  "i18n.missingRtl": "RTL مفقود",
  "i18n.arabicWithoutRtl": "صفحات عربية بدون dir=\"rtl\"",
  "i18n.allArabicPages": "جميع الصفحات ذات المحتوى العربي",

  // Error page
  "error.title": "الموقع غير موجود",
  "error.description": "ربما تم حذف هذا التدقيق أو أن الرابط غير صالح.",
  "error.tryAgain": "إعادة المحاولة",
  "error.goHome": "العودة للرئيسية",

  // Export
  "export.button": "تصدير PDF",
  "export.exporting": "جارٍ التصدير...",
  "export.exported": "تم التصدير!",

  // Bot protection
  "bot.detected": "حماية ضد الروبوتات نشطة",
  "bot.warning": "هذه الصفحة محمية بنظام كشف الروبوتات. حصل الفاحص على صفحة تحدي بدلاً من المحتوى الفعلي. قد تكون بيانات السيو غير دقيقة.",

  // SERP Preview
  "serp.title": "معاينة نتائج البحث",

  // Common
  "common.page": "صفحة",
  "common.pages": "صفحات",
  "common.words": "كلمة",
  "common.schema": "بيانات منظمة",
  "common.noMetaDesc": "بدون وصف ميتا",
  "common.noOgTags": "بدون وسوم OG",
  "common.imgNoAlt": "صورة بدون نص بديل",
  "common.noRtl": "بدون RTL",
  "common.rtl": "RTL",
};

export const translations: Record<Locale, Record<string, string>> = { en, ar };

/**
 * Get a translated string. Supports {placeholder} interpolation.
 */
export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  let str = translations[locale][key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
