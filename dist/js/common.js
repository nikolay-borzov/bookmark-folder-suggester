require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({10:[function(require,module,exports){
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

},{"constants":7,"settings":11}],11:[function(require,module,exports){
'use strict';

/**
 * @typedef {Object} Settings
 * @property {Array.<Rule>} rules
 * @property {boolean} autoBookmark
 */

let storage = chrome.storage.local;

const defaultSettings = {
  rules: [],
  autoBookmark: true
};

/**
 * Restores settings from the storage
 * @param {string|Array.<string>} [key] - Settings key(s)
 * @return {Promise.<Settings>}
 */
function get(key) {
  return new Promise(resolve => {
    storage.get(key || defaultSettings, resolve);
  });
}

/**
 * Saves settings to the storage
 * @param {Settings} settings
 * @return {Promise.<Settings>}
 */
function set(settings) {
  return new Promise((resolve, reject) => {
    storage.set(settings, function() {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(settings);
      }
    });
  });
}

/**
 * Exports settings to file
 * @param {Settings} settings
 * @return {Promise}
 */
function exportToFile(settings) {
  return new Promise(resolve => {
    let settingsJSONString = JSON.stringify(settings, null, 2);
    let blob = new Blob([settingsJSONString], { type: 'application/json' });
    let url = window.URL.createObjectURL(blob);

    // Date and time (e.g. '2017-04-27_1842')
    let dateString = new Date().toISOString()
      .slice(0, 16)
      .replace(':', '')
      .replace('T', '_');

    let fileName = `bookmark-suggester-settings-${dateString}.json`;

    let a = $.create('a', {
      'href': url,
      'download': fileName,
      'type': 'text/plain'
    });

    // Download file
    a.dispatchEvent(new MouseEvent('click'));
    // Release URL object
    window.URL.revokeObjectURL(blob);

    resolve();
  });
}

/**
 * Gets settings from file
 * @param {File} file
 * @this Event
 */
function importFromFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();

    reader.onload = event => {
      let settingsJSONString = event.target.result;

      try {
        let settingsObj = JSON.parse(settingsJSONString);
        resolve(settingsObj);
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsText(file);
  });
}

/**
 * Saves data needed for creating suggested rule
 * @param {Object} data
 * @param {Object} data.currentTab - Current tab info
 * @param {Object} data.bookmarkFolder - Bookmark folder for the current tab
 * @param {string} data.bookmarkFolder.id
 * @return {Promise}
 */
function setRuleSuggestData(data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, resolve);
  });
}

/**
 * Gets data needed for creating suggested rule
 * @return {Promise.<Object>}
 */
function getRuleSuggestData() {
  let emptyValue = {
    currentTab: null,
    bookmarkFolder: null
  };

  return new Promise(resolve => {
    chrome.storage.local.get(emptyValue, (data) => {
      // Erase data since it's not needed anymore
      if (data.currentTab) {
        chrome.storage.local.set(emptyValue);
      }

      resolve(data);
    });
  });
}

/**
 * Gets storage bytes in use
 * @return {Promise.<Object>}
 */
function getStorageBytesInUse() {
  return new Promise(resolve => {
    storage.getBytesInUse(null, resolve);
  });
}

/**
 * Gets storage quota bytes
 * @return {number}
 */
function getStorageQuotaBytes() {
  return storage.QUOTA_BYTES;
}

module.exports = {
  get,
  set,
  exportToFile,
  importFromFile,
  setRuleSuggestData,
  getRuleSuggestData,
  getStorageBytesInUse,
  getStorageQuotaBytes
};

},{}],8:[function(require,module,exports){
'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const ICON_SIZE_CLASS_MAP = {
  1: 'icon-size-18',
  2: 'icon-size-24',
  3: 'icon-size-36',
  4: 'icon-size-48'
};

let create = {
  /**
   * @param {Object|string} params - icon parameters. If string specified - Icon ID
   * @param {string} params.id - Icon ID
   * @param {string} [params.className='']
   * @param {number} [params.size=2] - Icon size 1-4
   */
  icon(params) {
    const iconId = typeof params === 'string' ? params : params.id;
    const iconSize = params.size !== 2 && params.size;
    const iconSizeClass = iconSize && ICON_SIZE_CLASS_MAP[iconSize];

    let svgElem = document.createElementNS(SVG_NS, 'svg');
    svgElem.classList.add('icon');

    if (params.className) {
      params.className.split(' ')
        .forEach(className => svgElem.classList.add(className));
    }

    if (iconSizeClass) {
      svgElem.classList.add(iconSizeClass);
    }

    let useElem = document.createElementNS(svgElem.namespaceURI, 'use');
    useElem.setAttributeNS(XLINK_NS, 'href', `icons.svg#${iconId}`);

    svgElem.appendChild(useElem);

    return svgElem;
  }
};


module.exports = {
  create
};

},{}],7:[function(require,module,exports){
'use strict';

const EXPRESSION_TYPES = {
  urlStartsWith: 'urlStartsWith',
  urlIsOnDomain: 'urlIsOnDomain',
  urlContains: 'urlContains',
  titleContains: 'titleContains'
};

const EXPRESSION_TYPES_NAMES_MAP = {
  [EXPRESSION_TYPES.urlStartsWith]: 'URL starts with',
  [EXPRESSION_TYPES.urlIsOnDomain]: 'URL is on domain',
  [EXPRESSION_TYPES.urlContains]: 'URL contains',
  [EXPRESSION_TYPES.titleContains]: 'Title contains',
};

module.exports = {
  EXPRESSION_TYPES,
  EXPRESSION_TYPES_NAMES_MAP,

  EXPRESSION_TYPE_ITEMS: Object.keys(EXPRESSION_TYPES)
    .map(type => ({
      id: type,
      name: EXPRESSION_TYPES_NAMES_MAP[type]
    })),

  icons: {
    folder: 'folder',
    folderOpen: 'folder-open',
    expander: 'arrow-right',
    delete: 'delete',
    close: 'close',
    add: 'add',
    star: 'star',
    starBorder: 'star-border',
    help: 'help'
  }
};

},{}]},{},[]);
