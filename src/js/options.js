'use strict';

const Vue = require('vue');

const settings = require('settings');
const rulesGrid = require('rules-grid');
const rulesEngine = require('rules-engine');
const bookmarksHelper = require('bookmarks-helper');
const notifier = require('notifier');
const filters = require('filters');

Vue.component('icon', require('components/icon'));
Vue.component('mdc-button', require('components/mdc-button'));
Vue.component('options-header', require('options/components/header'));
Vue.component('help-dialog', require('options/components/help-dialog'));
Vue.component('rules-list', require('options/components/rules-list'));

const store = require('options/store');
const app = require('options/components/app');

const mutationTypes = require('options/mutation-types');

/**
 * Restores options
 */
function restore(settingsObj) {
  let restoreSettings = settingsObj => {
    rulesGrid.addRules(settingsObj.rules);

    // Add suggested rule if one exists
    addSuggestedRule();

    // Elements.autoBookmarkCheckbox.checked = settingsObj.autoBookmark;

    // TODO: Temporary
    store.commit(mutationTypes.SET_SETTINGS, settingsObj);
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

$.ready().then(() => {
  rulesGrid.init();

  // Listen to message in case options page is already open
  chrome.runtime.onMessage.addListener(request => {
    if (request.addSuggestedRule) {
      addSuggestedRule();
    }
  });

  restore();
});

/* Vue.config.errorHandler = function() {
  notifier.error('Vue error. See console for details');
};*/

filters.register();

new Vue({
  el: '#app',
  store,
  render: h => h(app)
});
