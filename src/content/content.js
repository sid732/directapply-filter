(function () {
  const STORAGE_KEY = "directApplySettings";
  const SESSION_KEY = "directApplySessionStats";
  const HIDE_ANIMATION_MS = 180;
  const CARD_SELECTOR = [
    "[data-job-id]",
    "[data-occludable-job-id]",
    ".job_seen_beacon",
    ".jobs-search-results__list-item",
    ".job-card-container",
    ".jobsearch-ResultsList > li",
    ".react-job-listing",
    "article",
    "li"
  ].join(",");
  const CARD_ROOT_SELECTOR = [
    "[data-occludable-job-id]",
    ".jobs-search-results__list-item",
    ".job-card-container",
    ".jobsearch-ResultsList > li",
    ".react-job-listing",
    ".job_seen_beacon",
    "[data-job-id]"
  ].join(",");
  const LINKEDIN_LIST_SELECTOR = ".scaffold-layout__list";
  const LINKEDIN_ROW_SELECTOR = [
    `${LINKEDIN_LIST_SELECTOR} [data-occludable-job-id]`,
    `${LINKEDIN_LIST_SELECTOR} .jobs-search-results__list-item`
  ].join(",");
  const DETAIL_SELECTOR = [
    ".jobs-search__job-details--container",
    ".jobs-search__job-details",
    ".job-view-layout",
    ".jobs-details"
  ].join(",");
  const PROMOTED_LABELS = new Set([
    "promoted",
    "sponsored",
    "promoted by hirer",
    "promoted by job poster"
  ]);

  let settings = window.DirectApplyMatcher.mergeSettings();
  let builtInCompanies = [];
  let scanTimer = null;
  let hiddenCards = new WeakMap();

  const storageGet = (keys) =>
    new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });

  const storageSet = (value) =>
    new Promise((resolve) => {
      chrome.storage.local.set(value, resolve);
    });

  const loadBuiltInCompanies = async () => {
    if (!settings.useBuiltInStaffingList) {
      builtInCompanies = [];
      return;
    }

    try {
      const url = chrome.runtime.getURL("data/staffing_companies.json");
      const response = await fetch(url);
      builtInCompanies = await response.json();
    } catch (_error) {
      builtInCompanies = [];
    }
  };

  const getCompanyName = (card) => {
    const selectors = [
      "[data-testid='company-name']",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name",
      ".job-details-jobs-unified-top-card__primary-description-container a",
      ".job-card-container__primary-description",
      ".job-card-container__company-name",
      ".artdeco-entity-lockup__subtitle",
      ".base-search-card__subtitle",
      ".companyName",
      ".css-1x7z1ps",
      ".job-search-card__subtitle",
      "[class*='company']"
    ];

    for (const selector of selectors) {
      const node = card.querySelector(selector);
      const text = node && node.textContent.replace(/\s+/g, " ").trim();
      if (text && text.length <= 140) {
        return text;
      }
    }

    const lines = String(card.textContent || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const viaLine = lines.find((line) => /^jobs?\s+via\b/i.test(line));

    if (viaLine) {
      return viaLine;
    }

    const aria = card.getAttribute("aria-label") || "";
    const companyMatch = aria.match(/(?:at|company)\s+([^,]+)/i);
    return companyMatch ? companyMatch[1].trim() : "";
  };

  const getCardRoot = (card) => {
    if (location.hostname.includes("linkedin.com")) {
      const linkedInRow = card.closest(LINKEDIN_ROW_SELECTOR);

      if (linkedInRow) {
        return linkedInRow;
      }
    }

    return card.closest(CARD_ROOT_SELECTOR) || card;
  };

  const getCards = () => {
    const uniqueCards = new Set();

    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      uniqueCards.add(getCardRoot(card));
    });

    return Array.from(uniqueCards).filter(looksLikeJobCard);
  };

  const getDetails = () => {
    const detailsNodes = Array.from(document.querySelectorAll(DETAIL_SELECTOR));

    return detailsNodes.filter((details) => {
      if (detailsNodes.some((node) => node !== details && node.contains(details))) {
        return false;
      }

      const text = details.textContent || "";
      return text.length >= 25 && text.length <= 20000;
    });
  };

  const getTextLines = (node) =>
    String(node.innerText || node.textContent || "")
      .split(/\r?\n|·|•/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

  const isPromotedJob = (node) => {
    if (!location.hostname.includes("linkedin.com")) {
      return false;
    }

    return getTextLines(node).some((line) => {
      const normalizedLine = window.DirectApplyMatcher.normalize(line);
      return PROMOTED_LABELS.has(normalizedLine) || /^promoted by\b/.test(normalizedLine);
    });
  };

  const looksLikeJobCard = (card) => {
    const text = card.textContent || "";
    if (text.length < 25 || text.length > 5000) {
      return false;
    }

    return Boolean(
      card.matches("[data-job-id], [data-occludable-job-id], .job_seen_beacon, .jobs-search-results__list-item, .job-card-container, .react-job-listing") ||
        card.querySelector("a[href*='job'], a[href*='jobs'], [class*='title'], [class*='company']")
    );
  };

  const createPlaceholder = (card, reason) => {
    const placeholder = document.createElement("div");
    placeholder.className = "directapply-placeholder";

    const label = document.createElement("span");
    label.textContent = `Hidden by DirectApply Filter: ${reason}`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Show";
    button.addEventListener("click", () => {
      card.classList.remove("directapply-hiding-job");
      card.classList.remove("directapply-hidden-job");
      placeholder.remove();
    });

    placeholder.append(label, button);
    return placeholder;
  };

  const hideCard = (card, reason) => {
    if (hiddenCards.has(card)) {
      return false;
    }

    card.classList.add("directapply-hiding-job");
    window.setTimeout(() => {
      if (card.classList.contains("directapply-hiding-job")) {
        card.classList.add("directapply-hidden-job");
      }
    }, HIDE_ANIMATION_MS);

    if (settings.showHiddenPlaceholders && !settings.vanishHiddenJobs) {
      const placeholder = createPlaceholder(card, reason);
      card.insertAdjacentElement("beforebegin", placeholder);
      hiddenCards.set(card, placeholder);
    } else {
      hiddenCards.set(card, null);
    }

    return true;
  };

  const resetHiddenCards = () => {
    document.querySelectorAll(".directapply-hidden-job, .directapply-hiding-job").forEach((card) => {
      card.classList.remove("directapply-hiding-job");
      card.classList.remove("directapply-hidden-job");
    });

    document.querySelectorAll(".directapply-placeholder").forEach((node) => {
      node.remove();
    });
  };

  const recordStats = async (hiddenCount) => {
    if (!hiddenCount) {
      return;
    }

    const result = await storageGet([SESSION_KEY]);
    const stats = result[SESSION_KEY] || {};
    const host = location.hostname;
    const current = stats[host] || { hidden: 0, lastUpdated: null };

    await storageSet({
      [SESSION_KEY]: {
        ...stats,
        [host]: {
          hidden: current.hidden + hiddenCount,
          lastUpdated: new Date().toISOString()
        }
      }
    });
  };

  const scan = async () => {
    if (!settings.enabled) {
      resetHiddenCards();
      return;
    }

    const cards = getCards();
    let hiddenCount = 0;

    for (const card of cards) {
      if (settings.hidePromotedJobs && isPromotedJob(card)) {
        if (hideCard(card, "Promoted job")) {
          hiddenCount += 1;
        }

        continue;
      }

      const match = window.DirectApplyMatcher.findMatch(
        {
          companyName: getCompanyName(card),
          text: card.textContent
        },
        settings,
        builtInCompanies
      );

      if (match.action === "hide" && hideCard(card, match.reason)) {
        hiddenCount += 1;
      }
    }

    for (const details of getDetails()) {
      if (settings.hidePromotedJobs && isPromotedJob(details)) {
        hideCard(details, "Promoted job");
        continue;
      }

      const match = window.DirectApplyMatcher.findMatch(
        {
          companyName: getCompanyName(details),
          text: details.textContent
        },
        settings,
        builtInCompanies
      );

      if (match.action === "hide") {
        hideCard(details, match.reason);
      }
    }

    await recordStats(hiddenCount);
  };

  const scheduleScan = () => {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 250);
  };

  const loadSettings = async () => {
    const result = await storageGet([STORAGE_KEY]);
    settings = window.DirectApplyMatcher.mergeSettings(result[STORAGE_KEY]);
    await loadBuiltInCompanies();
  };

  const start = async () => {
    await loadSettings();
    await scan();

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_KEY]) {
        return;
      }

      resetHiddenCards();
      hiddenCards = new WeakMap();
      await loadSettings();
      scheduleScan();
    });
  };

  start();
})();
