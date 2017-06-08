'use strict';

const ICON_SIZE_CLASS_MAP = {
  1: 'icon-size-20',
  2: 'icon-size-24',
  3: 'icon-size-36',
  4: 'icon-size-48'
};

module.exports = {
  props: {
    'type': String,
    'size': Number
  },
  computed: {
    sizeClass() {
      return ICON_SIZE_CLASS_MAP[this.size] || '';
    }
  }
};
