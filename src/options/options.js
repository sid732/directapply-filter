const STORAGE_KEY = "directApplySettings";

const customBlocklist = document.querySelector("#customBlocklist");
const whitelist = document.querySelector("#whitelist");
const keywordFilters = document.querySelector("#keywordFilters");
const save = document.querySelector("#save");
const restoreDefaults = document.querySelector("#restoreDefaults");
const status = document.querySelector("#status");

const asTextareaValue = (items) => items.join("\n");

const showStatus = (message) => {
  status.textContent = message;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => {
    status.textContent = "";
  }, 1800);
};

const load = async () => {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const settings = window.DirectApplyMatcher.mergeSettings(result[STORAGE_KEY]);

  customBlocklist.value = asTextareaValue(settings.customBlocklist);
  whitelist.value = asTextareaValue(settings.whitelist);
  keywordFilters.value = asTextareaValue(settings.keywordFilters);
};

const saveLists = async () => {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const settings = window.DirectApplyMatcher.mergeSettings(result[STORAGE_KEY]);

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...settings,
      customBlocklist: window.DirectApplyMatcher.toList(customBlocklist.value),
      whitelist: window.DirectApplyMatcher.toList(whitelist.value),
      keywordFilters: window.DirectApplyMatcher.toList(keywordFilters.value)
    }
  });

  showStatus("Saved");
};

const restore = async () => {
  const defaults = window.DirectApplyMatcher.DEFAULT_SETTINGS;

  customBlocklist.value = asTextareaValue(defaults.customBlocklist);
  whitelist.value = asTextareaValue(defaults.whitelist);
  keywordFilters.value = asTextareaValue(defaults.keywordFilters);

  await saveLists();
};

save.addEventListener("click", saveLists);
restoreDefaults.addEventListener("click", restore);

load();
