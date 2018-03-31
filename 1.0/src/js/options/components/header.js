'use strict';

const mdcDialog = require('@material/dialog');
const mdcTabs = require('@material/tabs');

const mutationTypes = require('options/mutation-types');

const settings = require('settings');
const notifier = require('notifier');

const rulesGrid = require('rules-grid');

let helpDialog = null;

let elements = {
  importFileInput: null
};

module.exports = {
  name: 'options-header',

  methods: {
    /**
     * Saves options
     * @return {Promise}
     */
    saveSettings() {
      notifier.progressStart('Saving...');

      // TODO: Temporary. Remove when rulesGrid writes rules into the store
      this.$store.commit(mutationTypes.SET_SETTINGS, {
        rules: rulesGrid.getRules(),
        autoBookmark: true
      });

      settings.set(this.$store.getters.settings)
        .then(() => notifier.success('Saved'))
        .catch(notifier.error)
        .then(notifier.progressEnd);
    },

     /**
     * Exports settings to file
     */
    exportSettings() {
      // TODO: Temporary. Remove when rulesGrid writes rules into the store
      this.$store.commit(mutationTypes.SET_SETTINGS, {
        rules: rulesGrid.getRules(),
        autoBookmark: true
      });

      // Save before exporting
      settings.set(this.$store.getters.settings)
        .then(settingsObj => {
          notifier.progressStart('Exporting...');

          settings.exportToFile(settingsObj)
            .then(notifier.progressEnd);
        })
        .catch(notifier.error);
    },

    /**
     * Imports settings from file
     */
    selectFile() {
      elements.importFileInput.click();
    },

    /**
     * Read selected file
     * @param {Event} event
     */
    readFile(event) {
      settings.importFromFile(event.target.files[0])
        .then(settingsObj => {
          this.$store.commit(mutationTypes.SET_SETTINGS, settingsObj);
          // TODO: Temporary
          rulesGrid.addRules(settingsObj.rules);
        })
        .catch(() => notifier.error('Cannot import settings file'));
    },

    /**
     * Show help dialog
     */
    showHelp() {
      if (!helpDialog) {
        helpDialog = new mdcDialog.MDCDialog(document.getElementById('help-dialog'));
      }

      helpDialog.show();
    }
  },

  mounted() {
    elements.importFileInput = document.getElementById('import-file-input');

    let tabBar = window.dynamicTabBar = new mdcTabs.MDCTabBar(document.getElementById('tabs-bar'));
    tabBar.preventDefaultOnClick = true;

    tabBar.listen('MDCTabBar:change', ({ detail: tabs }) => {
      this.$store.commit(mutationTypes.SET_TAB_INDEX, tabs.activeTabIndex);
    });
  }
};
