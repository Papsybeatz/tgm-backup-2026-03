// ED/utils/sanitizeBrowserTabs.js

export function sanitizeBrowserTabs(tabs) {
  if (!Array.isArray(tabs)) return [];

  return tabs.map(tab => {
    const clean = {};

    clean.pageTitle = sanitizeString(tab.pageTitle);
    clean.pageUrl = sanitizeString(tab.pageUrl);
    clean.tabId = typeof tab.tabId === "number" ? tab.tabId : -1;
    clean.isCurrent = Boolean(tab.isCurrent);

    return clean;
  });
}

function sanitizeString(str) {
  if (typeof str !== "string") return "";

  // Remove <WebsiteContent_...> tags
  str = str.replace(/<WebsiteContent_[^>]+>/g, "");
  str = str.replace(/<\/WebsiteContent_[^>]+>/g, "");

  // Remove invalid escape sequences
  str = str.replace(/\\u(?![0-9A-Fa-f]{4})/g, "");

  // Remove any stray backslashes that break JSON
  str = str.replace(/\\(?!["\\/bfnrtu])/g, "");

  return str.trim();
}
