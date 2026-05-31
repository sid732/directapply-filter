(function () {
  const DEFAULT_SETTINGS = {
    enabled: true,
    showHiddenPlaceholders: true,
    useBuiltInStaffingList: true,
    hidePromotedJobs: true,
    customBlocklist: [],
    whitelist: [],
    keywordFilters: [
      "staffing",
      "recruiting",
      "recruiter",
      "contract",
      "contract-to-hire"
    ]
  };

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const toList = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    return String(value || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const readListSetting = (stored, key) => {
    if (stored && Object.prototype.hasOwnProperty.call(stored, key)) {
      return toList(stored[key]);
    }

    return toList(DEFAULT_SETTINGS[key]);
  };

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const containsPhrase = (haystack, phrase) => {
    const normalizedHaystack = normalize(haystack);
    const normalizedPhrase = normalize(phrase);

    if (!normalizedPhrase) {
      return false;
    }

    return new RegExp(`(^| )${escapeRegExp(normalizedPhrase)}( |$)`).test(normalizedHaystack);
  };

  const cleanSourceName = (value) =>
    String(value || "")
      .replace(/\b(today|now)\b.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();

  const getSourceSignals = (text) => {
    const allText = String(text || "");
    const signals = [];
    const patterns = [/\bjobs?\s+via\s+([^\n\r·•|,.]+)/gi, /\bapply\s+via\s+([^\n\r·•|,.]+)/gi];

    for (const pattern of patterns) {
      let match = pattern.exec(allText);

      while (match) {
        const source = cleanSourceName(match[1]);

        if (source) {
          signals.push(source);
        }

        match = pattern.exec(allText);
      }
    }

    return signals;
  };

  const mergeSettings = (stored) => ({
    ...DEFAULT_SETTINGS,
    ...(stored || {}),
    customBlocklist: readListSetting(stored, "customBlocklist"),
    whitelist: readListSetting(stored, "whitelist"),
    keywordFilters: readListSetting(stored, "keywordFilters")
  });

  const findMatch = ({ companyName, text }, settings, builtInCompanies) => {
    const company = companyName || "";
    const allText = text || "";
    const companySignals = [company, ...getSourceSignals(allText)].filter(Boolean);

    const whitelistMatch = settings.whitelist.find((entry) =>
      companySignals.some((signal) => containsPhrase(signal, entry))
    );
    if (whitelistMatch) {
      return { action: "allow", reason: `Whitelisted: ${whitelistMatch}` };
    }

    const customCompanyMatch = settings.customBlocklist.find((entry) =>
      companySignals.some((signal) => containsPhrase(signal, entry))
    );
    if (customCompanyMatch) {
      return { action: "hide", reason: `Blocked company: ${customCompanyMatch}` };
    }

    if (settings.useBuiltInStaffingList) {
      const builtInMatch = builtInCompanies.find((entry) =>
        companySignals.some((signal) => containsPhrase(signal, entry))
      );
      if (builtInMatch) {
        return { action: "hide", reason: `Staffing company: ${builtInMatch}` };
      }
    }

    const keywordMatch = settings.keywordFilters.find((entry) => containsPhrase(allText, entry));
    if (keywordMatch) {
      return { action: "hide", reason: `Keyword: ${keywordMatch}` };
    }

    return { action: "allow", reason: "" };
  };

  window.DirectApplyMatcher = {
    DEFAULT_SETTINGS,
    findMatch,
    mergeSettings,
    normalize,
    getSourceSignals,
    toList
  };
})();
