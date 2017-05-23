'use strict';

/**
 * @typedef {Object} Settings
 * @property {Array.<Rule>} rules
 * @property {boolean} autoBookmark
 */

let storage = chrome.storage.local;

const defaultSettings = {
  rules: [],
  autoBookmark: true
};

/**
 * Restores settings from the storage
 * @param {string|Array.<string>} [key] - Settings key(s)
 * @return {Promise.<Settings>}
 */
function get(key) {
  return new Promise(resolve => {
    storage.get(key || defaultSettings, resolve);
  });
}

/**
 * Saves settings to the storage
 * @param {Settings} settings
 * @return {Promise.<Settings>}
 */
function set(settings) {
  return new Promise((resolve, reject) => {
    storage.set(settings, function() {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(settings);
      }
    });
  });
}

/**
 * Exports settings to file
 * @param {Settings} settings
 * @return {Promise}
 */
function exportToFile(settings) {
  return new Promise(resolve => {
    let settingsJSONString = JSON.stringify(settings, null, 2);
    let blob = new Blob([settingsJSONString], { type: 'application/json' });
    let url = window.URL.createObjectURL(blob);

    // Date and time (e.g. '2017-04-27_1842')
    let dateString = new Date().toISOString()
      .slice(0, 16)
      .replace(':', '')
      .replace('T', '_');

    let fileName = `bookmark-suggester-settings-${dateString}.json`;

    let a = $.create('a', {
      'href': url,
      'download': fileName,
      'type': 'text/plain'
    });

    // Download file
    a.dispatchEvent(new MouseEvent('click'));
    // Release URL object
    window.URL.revokeObjectURL(blob);

    resolve();
  });
}

/**
 * Gets settings from file
 * @param {File} file
 * @this Event
 */
function importFromFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();

    reader.onload = event => {
      let settingsJSONString = event.target.result;

      try {
        let settingsObj = JSON.parse(settingsJSONString);
        resolve(settingsObj);
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsText(file);
  });
}

/**
 * Saves data needed for creating suggested rule
 * @param {Object} data
 * @param {Object} data.currentTab - Current tab info
 * @param {Object} data.bookmarkFolder - Bookmark folder for the current tab
 * @param {string} data.bookmarkFolder.id
 * @return {Promise}
 */
function setRuleSuggestData(data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, resolve);
  });
}

/**
 * Gets data needed for creating suggested rule
 * @return {Promise.<Object>}
 */
function getRuleSuggestData() {
  let emptyValue = {
    currentTab: null,
    bookmarkFolder: null
  };

  return new Promise(resolve => {
    chrome.storage.local.get(emptyValue, (data) => {
      // Erase data since it's not needed anymore
      if (data.currentTab) {
        chrome.storage.local.set(emptyValue);
      }

      resolve(data);
    });
  });
}

/**
 * Gets storage bytes in use
 * @return {Promise.<Object>}
 */
function getStorageBytesInUse() {
  return new Promise(resolve => {
    storage.getBytesInUse(null, resolve);
  });
}

/**
 * Gets storage quota bytes
 * @return {number}
 */
function getStorageQuotaBytes() {
  return storage.QUOTA_BYTES;
}

module.exports = {
  get,
  set,
  exportToFile,
  importFromFile,
  setRuleSuggestData,
  getRuleSuggestData,
  getStorageBytesInUse,
  getStorageQuotaBytes
};
