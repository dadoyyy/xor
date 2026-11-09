const SUPPORTED_IANA_TIMEZONES: ReadonlySet<string> = (() => {
  try {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return new Set(["UTC", "Etc/UTC", "Etc/GMT", ...list]);
  } catch {
    return new Set(["UTC", "Etc/UTC", "Etc/GMT"]);
  }
})();

export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  if (/^(posix|right|SystemV)\//i.test(tz)) return false;
  if (tz !== "UTC" && tz !== "Etc/UTC" && tz !== "Etc/GMT" && !/^[A-Za-z]+\/[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)?$/.test(tz)) {
    return false;
  }
  if (SUPPORTED_IANA_TIMEZONES.size > 3 && !SUPPORTED_IANA_TIMEZONES.has(tz)) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

