const STORAGE_KEY = "directApplySettings";
const SESSION_KEY = "directApplySessionStats";

const enabled = document.querySelector("#enabled");
const showHiddenPlaceholders = document.querySelector("#showHiddenPlaceholders");
const useBuiltInStaffingList = document.querySelector("#useBuiltInStaffingList");
const hidePromotedJobs = document.querySelector("#hidePromotedJobs");
const hiddenCount = document.querySelector("#hiddenCount");
const openOptions = document.querySelector("#openOptions");
const resetStats = document.querySelector("#resetStats");

const getActiveHost = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0] && tabs[0].url;

  try {
    return new URL(url).hostname;
  } catch (_error) {
    return "";
  }
};

const getStoredState = async () => {
  const result = await chrome.storage.local.get([STORAGE_KEY, SESSION_KEY]);
  return {
    settings: window.DirectApplyMatcher.mergeSettings(result[STORAGE_KEY]),
    stats: result[SESSION_KEY] || {}
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
  const host = await getActiveHost();
  const { settings, stats } = await getStoredState();

  enabled.checked = settings.enabled;
  showHiddenPlaceholders.checked = settings.showHiddenPlaceholders;
  useBuiltInStaffingList.checked = settings.useBuiltInStaffingList;
  hidePromotedJobs.checked = settings.hidePromotedJobs;
  hiddenCount.textContent = String(host && stats[host] ? stats[host].hidden : 0);
};

enabled.addEventListener("change", () => saveSettings({ enabled: enabled.checked }));
showHiddenPlaceholders.addEventListener("change", () =>
  saveSettings({ showHiddenPlaceholders: showHiddenPlaceholders.checked })
);
useBuiltInStaffingList.addEventListener("change", () =>
  saveSettings({ useBuiltInStaffingList: useBuiltInStaffingList.checked })
);
hidePromotedJobs.addEventListener("change", () => saveSettings({ hidePromotedJobs: hidePromotedJobs.checked }));

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

resetStats.addEventListener("click", async () => {
  const host = await getActiveHost();
  const result = await chrome.storage.local.get([SESSION_KEY]);
  const stats = result[SESSION_KEY] || {};

  if (host) {
    delete stats[host];
  }

  await chrome.storage.local.set({ [SESSION_KEY]: stats });
  await render();
});

render();
