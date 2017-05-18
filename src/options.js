'use strict';

const settings = require('settings');
const rulesGrid = require('rules-grid');
const rulesEngine = require('rules-engine');
const bookmarksHelper = require('bookmarks-helper');
const notifier = require('notifier');

const STORAGE_SIZE_EXCEEDED_ERROR_KEY = 'QUOTA_BYTES_PER_ITEM';

/** DOM elements */
let elements = {
  saveButton: null,
  exportButton: null,
  importButton: null
};

/**
 * Restores options
 */
function restore(settingsObj) {
  let addRules = settingsObj => {
    rulesGrid.addRules(settingsObj.rules);

    // Add suggested rule if one exists
    addSuggestedRule();
  };

  if (settingsObj) {
    addRules(settingsObj);
  } else {
    settings.get().then(addRules);
  }
}

/**
 * Checks if there is a suggested rule data in storage and creates the rule
 * @return {Promise}
 */
function addSuggestedRule() {
  return new Promise(resolve => {
    settings.getRuleSuggestData()
      .then(ruleData => {
        if (!ruleData.bookmarkFolder) {
          return ruleData;
        }

        // Gather bookmark folder info if it's specified
        let bookmarkFolderId = ruleData.bookmarkFolder.id;

        return Promise.all([
          bookmarksHelper.getBookmark(bookmarkFolderId),
          bookmarksHelper.getBookmarkPath(bookmarkFolderId)
        ]).then(results => {
          let bookmark = results[0];
          let path = results[1];

          ruleData.bookmarkFolder.title = bookmark.title;
          ruleData.bookmarkFolder.path = path;

          return ruleData;
        });
      })
      .then(ruleData => {
        let rule = rulesEngine.createSuggestedRule(ruleData);

        if (rule) {
          rulesGrid.addRule(rule);
        }

        resolve();
      });
  });
}

let actions = {
  /**
   * Saves options
   * @return {Promise}
   */
  save() {
    notifier.progressStart('Saving...');
    let rules = rulesGrid.getRules();

    return settings.set({ rules })
      .then(settingsObj => {
        notifier.success('Saved');

        return settingsObj;
      })
      .catch(error => {
        if (error.message.includes(STORAGE_SIZE_EXCEEDED_ERROR_KEY)) {
          notifier.error('Storage size limit is exceeded');
        } else {
          notifier.error('Unexpected error');
        }
      })
      .then(notifier.progressEnd);
  },

  /**
   * Exports settings to file
   */
  export() {
    // Save before exporting
    settings.set({ rules: rulesGrid.getRules() })
      .then(settingsObj => {
        notifier.progressStart('Exporting...');

        settings.exportToFile(settingsObj)
          .then(notifier.progressEnd);
      });
  },

  /**
   * Imports settings from file
   * @this Event
   */
  import() {
    settings.importFromFile(this.files[0])
      .then(restore)
      .catch(() => notifier.error('Cannot import settings file'));
  }
};

$.ready().then(() => {
  rulesGrid.init();

  // Save settings
  let saveButton = document.getElementById('save-button');
  saveButton.addEventListener('click', actions.save);
  elements.saveButton = saveButton;

  // Export settings to file
  let exportButton = document.getElementById('export-button');
  exportButton.addEventListener('click', actions.export);
  elements.exportButton = exportButton;

  // Process selected settings files
  let importFileInput = document.getElementById('import-file-input');
  importFileInput.addEventListener('change', actions.import);

  // Open file selection dialog on import button click
  let importButton = document.getElementById('import-button');
  importButton.addEventListener('click', () => {
    importFileInput.click();
  });

  // Listen to message in case options page is already open
  chrome.runtime.onMessage.addListener(request => {
    if (request.addSuggestedRule) {
      addSuggestedRule();
    }
  });

  restore();
});
