'use strict';

/**
 * @typedef {Object} Rule
 * @property {Object} folder
 * @property {string} folder.id
 * @property {string} folder.title
 * @property {string} folder.path
 * @property {Array.<Expression>} expressions
 */

/**
 * @typedef {Object} Expression
 * @property {string} typeId
 * @property {string} value
 */

const constants = require('constants');
const settings = require('settings');

let expressionMatchers = {
  [constants.EXPRESSION_TYPES.urlStartsWith]: (params, value) => {
    return params.url.href.startsWith(value);
  },

  [constants.EXPRESSION_TYPES.urlIsOnDomain]: (params, value) => {
    return params.url.hostname === value;
  },

  [constants.EXPRESSION_TYPES.urlContains]: (params, value) => {
    return params.url.href.includes(value);
  },

  [constants.EXPRESSION_TYPES.titleContains]: (params, value) => {
    return params.title.includes(value.toLowerCase());
  }
};

/**
 * Checks if parameters satisfy specified rule
 * @param {Rule} rule
 * @param {Object} parameters
 */
function isRuleMatch(rule, parameters) {
  return rule.expressions.reduce((acc, exp) => {
    return acc && expressionMatchers[exp.typeId](parameters, exp.value);
  }, true);
}

/**
 * Transform parameters to simplify matching logic
 * @param {Object} rawParams
 */
function getMatchParams(rawParams) {
  return {
    // Lowercase string parameters because 'includes' is case-sensitive
    title: rawParams.title.toLowerCase(),
    // Transform url string into URL object
    url: new URL(rawParams.url)
  };
}

/**
 * Returns rules matched specified parameters
 * @param {Object} parameters
 * @param {string} parameters.url
 * @param {string} parameters.title
 * @return {Promise.<Array.<Rule>>}
 */
function match(parameters) {
  let matchParams = getMatchParams(parameters);

  return new Promise(resolve => {
    settings.get().then(settingsObj => {
      let matchedFolderIds = [];

      let matchedRules = settingsObj.rules.filter(rule => {
        // Skip match if a folder is already matched
        if (matchedFolderIds.includes(rule.folder.id)) {
          return false;
        }

        let isMatch = isRuleMatch(rule, matchParams);

        if (isMatch) {
          matchedFolderIds.push(rule.folder.id);
        }

        return isMatch;
      });

      resolve(matchedRules);
    });
  });
}

/**
 * Creates rule using tab's data and it's bookmark
 * @param {Object} parameters
 * @param {Tab} parameters.currentTab - Tab info
 * @param {Object} parameters.bookmarkFolder - Bookmark folder for the tab
 * @param {string} parameters.bookmarkFolder.id
 * @param {string} parameters.bookmarkFolder.title
 * @param {string} parameters.bookmarkFolder.path
 * @return {Rule}
 */
function createSuggestedRule(parameters) {
  if (!parameters.currentTab) {
    return null;
  }

  let folder = parameters.bookmarkFolder;

  // Create a rule using tab title and url as values for expressions
  let rule = {
    folder: {
      id: '0'
    },
    expressions: [{
      typeId: constants.EXPRESSION_TYPES.urlStartsWith,
      value: parameters.currentTab.url
    }, {
      typeId: constants.EXPRESSION_TYPES.titleContains,
      value: parameters.currentTab.title
    }]
  };

  if (folder) {
    rule.folder = {
      id: folder.id,
      title: folder.title,
      path: folder.path
    };
  }

  return rule;
}

module.exports = {
  match,
  createSuggestedRule
};
