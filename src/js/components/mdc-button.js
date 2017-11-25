'use strict';

module.exports = {
  name: 'mdc-button',

  props: {
    'compact': Boolean,
    'dense': Boolean,
    'primary': Boolean,
    'raised': Boolean,
    'icon-type': String,
    'icon-size': Number,
    'icon-only': Boolean
  },

  computed: {
    classObject() {
      return {
        'mdc-button--compact': this.compact,
        'mdc-button--dense': this.dense,
        'mdc-button--primary': this.primary,
        'mdc-button--raised': this.raised,
        'mdc-button--icon-align': !this.iconOnly,
        'mdc-button--icon': this.iconOnly
      };
    }
  }
};
