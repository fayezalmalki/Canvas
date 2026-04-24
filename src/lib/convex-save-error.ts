type Locale = "en" | "ar";

const SAVE_FUNCTION_NAMES = [
  "crawls:createCrawl",
  "crawls:addPagesToCrawl",
  "crawls:updateCrawlMetadata",
];

const DRIFT_PATTERNS = [
  /Could not find function/i,
  /Could not find public function/i,
  /Unknown function/i,
  /unrecognized function/i,
];

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}

function isBackendDriftError(message: string): boolean {
  return DRIFT_PATTERNS.some((pattern) => pattern.test(message)) ||
    SAVE_FUNCTION_NAMES.some((name) => message.includes(name));
}

export function getConvexSaveErrorMessage(error: unknown, locale: Locale): string {
  const message = toMessage(error);

  if (isBackendDriftError(message)) {
    return locale === "ar"
      ? "واجهة التطبيق أحدث من خادم Convex الحالي. حدّث Convex production ثم أعد المحاولة."
      : "The app frontend is newer than the current Convex backend. Deploy Convex production, then retry.";
  }

  if (message) return message;

  return locale === "ar"
    ? "حدث خطأ أثناء حفظ نتيجة الفحص."
    : "Something went wrong while saving the crawl result.";
}

export async function runGuardedConvexSave<T>(
  task: () => Promise<T>,
  locale: Locale
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    throw new Error(getConvexSaveErrorMessage(error, locale));
  }
}
