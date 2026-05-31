const STORAGE_KEY = "directApplySettings";
const PAGE_STATS_KEY = "directApplyPageStats";

const enabled = document.querySelector("#enabled");
const showHiddenPlaceholders = document.querySelector("#showHiddenPlaceholders");
const vanishHiddenJobs = document.querySelector("#vanishHiddenJobs");
const useBuiltInStaffingList = document.querySelector("#useBuiltInStaffingList");
const hidePromotedJobs = document.querySelector("#hidePromotedJobs");
const hiddenCount = document.querySelector("#hiddenCount");
const openOptions = document.querySelector("#openOptions");
const resetStats = document.querySelector("#resetStats");

const getActiveStatsKey = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0] && tabs[0].url;
  return window.DirectApplyMatcher.getStatsKey(url);
};

const getStoredState = async () => {
  const result = await chrome.storage.local.get([STORAGE_KEY, PAGE_STATS_KEY]);
  return {
    settings: window.DirectApplyMatcher.mergeSettings(result[STORAGE_KEY]),
    stats: result[PAGE_STATS_KEY] || {}
  };
};

const saveSettings = async (patch) => {
  const { settings } = await getStoredState();
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...settings,
      ...patch
    }
  });
};

const render = async () => {
  const statsKey = await getActiveStatsKey();
  const { settings, stats } = await getStoredState();

  enabled.checked = settings.enabled;
  showHiddenPlaceholders.checked = settings.showHiddenPlaceholders;
  showHiddenPlaceholders.disabled = settings.vanishHiddenJobs;
  vanishHiddenJobs.checked = settings.vanishHiddenJobs;
  useBuiltInStaffingList.checked = settings.useBuiltInStaffingList;
  hidePromotedJobs.checked = settings.hidePromotedJobs;
  hiddenCount.textContent = String(statsKey && stats[statsKey] ? stats[statsKey].hidden : 0);
};

enabled.addEventListener("change", () => saveSettings({ enabled: enabled.checked }));
showHiddenPlaceholders.addEventListener("change", () =>
  saveSettings({ showHiddenPlaceholders: showHiddenPlaceholders.checked })
);
vanishHiddenJobs.addEventListener("change", () => saveSettings({ vanishHiddenJobs: vanishHiddenJobs.checked }));
useBuiltInStaffingList.addEventListener("change", () =>
  saveSettings({ useBuiltInStaffingList: useBuiltInStaffingList.checked })
);
hidePromotedJobs.addEventListener("change", () => saveSettings({ hidePromotedJobs: hidePromotedJobs.checked }));

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

resetStats.addEventListener("click", async () => {
  const statsKey = await getActiveStatsKey();
  const result = await chrome.storage.local.get([PAGE_STATS_KEY]);
  const stats = result[PAGE_STATS_KEY] || {};

  if (statsKey) {
    stats[statsKey] = {
      hidden: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  await chrome.storage.local.set({ [PAGE_STATS_KEY]: stats });
  await render();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes[PAGE_STATS_KEY] || changes[STORAGE_KEY])) {
    render();
  }
});

render();
