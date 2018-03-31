'use strict';

const mdcSelect = require('@material/select');
const mdcAutoInit = require('@material/auto-init').default;
mdcAutoInit.register('MDCSelect', mdcSelect.MDCSelect);

const constants = require('constants');
const filters = require('filters');

module.exports = {
  name: 'rules-list',

  computed: {
    expressionTypes() {
      return Object.keys(constants.EXPRESSION_TYPES).map(key => {
        const typeId = constants.EXPRESSION_TYPES[key];

        return {
          id: typeId,
          name: filters.i18n(`expression_type_${typeId}`)
        };
      });
    },

    rules() {
      return this.$store.state.rules;
    }
  },

  updated() {
    mdcAutoInit(document.getElementById('_rules-container'), () => {});
  }
};
