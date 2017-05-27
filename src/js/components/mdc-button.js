'use strict';

const Vue = require('vue');

Vue.component('icon', require('components/icon'));

module.exports = {
  props: {
    'compact': Boolean,
    'icon-type': String,
    'icon-only': Boolean
  },
  computed: {
    classObject: function() {
      return {
        'mdc-button--compact': this.compact,
        'mdc-button--icon-align': !this.iconOnly,
        'mdc-button--icon': this.iconOnly
      };
    }
  }
};
