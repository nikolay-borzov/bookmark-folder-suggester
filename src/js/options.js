'use strict';

const Vue = require('vue');

const mdcDialog = require('@material/dialog');
const mdcTabs = require('@material/tabs');

const settings = require('settings');
const rulesGrid = require('rules-grid');
const rulesEngine = require('rules-engine');
const bookmarksHelper = require('bookmarks-helper');
const notifier = require('notifier');

const STORAGE_SIZE_EXCEEDED_ERROR_KEY = 'QUOTA_BYTES_PER_ITEM';

let helpDialog = null;

let elements = {
  autoBookmarkCheckbox: null,
  storageUsedText: null,
  storageProgressBar: null
};

function initTabs() {
  let tabBar = window.dynamicTabBar = new mdcTabs.MDCTabBar(document.getElementById('tabs-bar'));
  tabBar.preventDefaultOnClick = true;

  let panelsContainer = document.getElementById('panels-container');

  let selectPanel = (activeTabIndex) => {
    let activePanel = $('.tab-panel.is-active', panelsContainer);
    activePanel.classList.remove('is-active');
    $.set(activePanel, {
      'aria-hidden': true
    });

    let panel = $(`.tab-panel:nth-child(${activeTabIndex + 1})`, panelsContainer);
    panel.classList.add('is-active');
    $.set(panel, {
      'aria-hidden': false
    });
  };

  tabBar.listen('MDCTabBar:change', ({ detail: tabs }) => {
    selectPanel(tabs.activeTabIndex);
  });
}

/**
 * Restores options
 */
function restore(settingsObj) {
  let restoreSettings = settingsObj => {
    rulesGrid.addRules(settingsObj.rules);

    // Add suggested rule if one exists
    addSuggestedRule();

    elements.autoBookmarkCheckbox.checked = settingsObj.autoBookmark;

    settings.getStorageBytesInUse().then(bytesInUse => {
      const quota = settings.getStorageQuotaBytes();

      let inUseKb = Math.floor(bytesInUse / 1000).toLocaleString();
      let quotaKb = Math.floor(quota / 1000).toLocaleString();

      let usagePercent = Math.floor((100 * bytesInUse) / quota);

      elements.storageUsedText.innerText = `${inUseKb}/${quotaKb} Kb`;
      $.style(elements.storageProgressBar, { width: `${usagePercent}%` });
    });
  };

  if (settingsObj) {
    restoreSettings(settingsObj);
  } else {
    settings.get().then(restoreSettings);
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
    let settingsObj = {
      rules: rulesGrid.getRules(),
      autoBookmark: elements.autoBookmarkCheckbox.checked
    };

    return settings.set(settingsObj)
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
  },

  getHelp() {
    if (!helpDialog) {
      helpDialog = new mdcDialog.MDCDialog(document.getElementById('help-dialog'));
    }

    helpDialog.show();
  }
};

$.ready().then(() => {
  rulesGrid.init();

  elements.autoBookmarkCheckbox = document.getElementById('auto-bookmark-checkbox');
  elements.storageUsedText = document.getElementById('storage-used-text');
  elements.storageProgressBar = document.getElementById('storage-used-progress-bar');

  // Save settings
  let saveButton = document.getElementById('save-button');
  saveButton.addEventListener('click', actions.save);

  // Export settings to file
  let exportButton = document.getElementById('export-button');
  exportButton.addEventListener('click', actions.export);

  // Process selected settings files
  let importFileInput = document.getElementById('import-file-input');
  importFileInput.addEventListener('change', actions.import);

  // Open file selection dialog on import button click
  let importButton = document.getElementById('import-button');
  importButton.addEventListener('click', () => {
    importFileInput.click();
  });

  let helpButton = document.getElementById('help-button');
  helpButton.addEventListener('click', actions.getHelp);

  // Listen to message in case options page is already open
  chrome.runtime.onMessage.addListener(request => {
    if (request.addSuggestedRule) {
      addSuggestedRule();
    }
  });

  initTabs();
  restore();
});

Vue.component('options-header', require('components/options-header'));
Vue.component('icon', require('components/icon'));
Vue.component('mdc-button', require('components/mdc-button'));

const app = require('components/options-app');

new Vue({
  el: '#app',
  render: h => h(app)/* ,
  data: {
    input: '# hello'
  },
  computed: {
    compiledMarkdown: function() {
      return this.input;
    }
  }*/
});
