'use strict';

const Vue = require('vue');
const Vuex = require('vuex');

const mutationTypes = require('options/mutation-types');

Vue.use(Vuex);

module.exports = new Vuex.Store({
  state: {
    rules: [],
    autoBookmark: true,
    activeTabIndex: 0
  },

  getters: {
    settings(state) {
      return {
        rules: state.rules,
        autoBookmark: state.autoBookmark
      };
    }
  },

  mutations: {
    [mutationTypes.SET_SETTINGS](state, settingsObj) {
      state.rules = settingsObj.rules;
      state.autoBookmark = settingsObj.autoBookmark;
    },

    [mutationTypes.SET_TAB_INDEX](state, index) {
      state.activeTabIndex = index;
    },

    [mutationTypes.SET_AUTO_BOOKMARK](state, autoBookmark) {
      state.autoBookmark = autoBookmark;
    }
  }
});
