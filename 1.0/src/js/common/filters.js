'use strict';

const Vue = require('vue');

function i18n(key) {
  return chrome.i18n.getMessage(key);
}

module.exports = {
  i18n,

  register() {
    Vue.filter('i18n', i18n);
  }
};
