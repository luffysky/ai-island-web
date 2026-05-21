export function parseDevice(userAgent: string | null) {
  const ua = userAgent ?? "";
  const lower = ua.toLowerCase();

  const device_type = /ipad|tablet/.test(lower)
    ? "tablet"
    : /mobi|iphone|android/.test(lower)
      ? "mobile"
      : "desktop";

  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /chrome|crios/i.test(ua)
      ? "Chrome"
      : /safari/i.test(ua) && !/chrome|crios/i.test(ua)
        ? "Safari"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /opr\//i.test(ua)
            ? "Opera"
            : "Other";

  const os = /windows/i.test(ua)
    ? "Windows"
    : /iphone|ipad|ios/i.test(ua)
      ? "iOS"
      : /android/i.test(ua)
        ? "Android"
        : /mac os|macintosh/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "Other";

  return { device_type, browser, os };
}
