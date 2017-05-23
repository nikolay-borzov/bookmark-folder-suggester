require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({14:[function(require,module,exports){
'use strict';

const mdcDialog = require('@material/dialog');
const mdcTabs = require('@material/tabs');

const settings = require('settings');
const rulesGrid = require('rules-grid');
const rulesEngine = require('rules-engine');
const bookmarksHelper = require('bookmarks-helper');
const notifier = require('notifier');

const STORAGE_SIZE_EXCEEDED_ERROR_KEY = 'QUOTA_BYTES_PER_ITEM';

let helpDialog = null;

let elements = {
  autoBookmarkCheckbox: null,
  storageUsedText: null,
  storageProgressBar: null
};

function initTabs() {
  let tabBar = window.dynamicTabBar = new mdcTabs.MDCTabBar(document.getElementById('tabs-bar'));
  tabBar.preventDefaultOnClick = true;

  let panelsContainer = document.getElementById('panels-container');

  let selectPanel = (activeTabIndex) => {
    let activePanel = $('.tab-panel.is-active', panelsContainer);
    activePanel.classList.remove('is-active');
    $.set(activePanel, {
      'aria-hidden': true
    });

    let panel = $(`.tab-panel:nth-child(${activeTabIndex + 1})`, panelsContainer);
    panel.classList.add('is-active');
    $.set(panel, {
      'aria-hidden': false
    });
  };

  tabBar.listen('MDCTabBar:change', ({ detail: tabs }) => {
    selectPanel(tabs.activeTabIndex);
  });
}

/**
 * Restores options
 */
function restore(settingsObj) {
  let restoreSettings = settingsObj => {
    rulesGrid.addRules(settingsObj.rules);

    // Add suggested rule if one exists
    addSuggestedRule();

    elements.autoBookmarkCheckbox.checked = settingsObj.autoBookmark;

    settings.getStorageBytesInUse().then(bytesInUse => {
      const quota = settings.getStorageQuotaBytes();

      let inUseKb = Math.floor(bytesInUse / 1000).toLocaleString();
      let quotaKb = Math.floor(quota / 1000).toLocaleString();

      let usagePercent = Math.floor((100 * bytesInUse) / quota);

      elements.storageUsedText.innerText = `${inUseKb}/${quotaKb} Kb`;
      $.style(elements.storageProgressBar, { width: `${usagePercent}%` });
    });
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

let actions = {
  /**
   * Saves options
   * @return {Promise}
   */
  save() {
    notifier.progressStart('Saving...');
    let settingsObj = {
      rules: rulesGrid.getRules(),
      autoBookmark: elements.autoBookmarkCheckbox.checked
    };

    return settings.set(settingsObj)
      .then(settingsObj => {
        notifier.success('Saved');

        return settingsObj;
      })
      .catch(error => {
        if (error.message.includes(STORAGE_SIZE_EXCEEDED_ERROR_KEY)) {
          notifier.error('Storage size limit is exceeded');
        } else {
          notifier.error('Unexpected error');
        }
      })
      .then(notifier.progressEnd);
  },

  /**
   * Exports settings to file
   */
  export() {
    // Save before exporting
    settings.set({ rules: rulesGrid.getRules() })
      .then(settingsObj => {
        notifier.progressStart('Exporting...');

        settings.exportToFile(settingsObj)
          .then(notifier.progressEnd);
      });
  },

  /**
   * Imports settings from file
   * @this Event
   */
  import() {
    settings.importFromFile(this.files[0])
      .then(restore)
      .catch(() => notifier.error('Cannot import settings file'));
  },

  getHelp() {
    if (!helpDialog) {
      helpDialog = new mdcDialog.MDCDialog(document.getElementById('help-dialog'));
    }

    helpDialog.show();
  }
};

$.ready().then(() => {
  rulesGrid.init();

  elements.autoBookmarkCheckbox = document.getElementById('auto-bookmark-checkbox');
  elements.storageUsedText = document.getElementById('storage-used-text');
  elements.storageProgressBar = document.getElementById('storage-used-progress-bar');

  // Save settings
  let saveButton = document.getElementById('save-button');
  saveButton.addEventListener('click', actions.save);

  // Export settings to file
  let exportButton = document.getElementById('export-button');
  exportButton.addEventListener('click', actions.export);

  // Process selected settings files
  let importFileInput = document.getElementById('import-file-input');
  importFileInput.addEventListener('change', actions.import);

  // Open file selection dialog on import button click
  let importButton = document.getElementById('import-button');
  importButton.addEventListener('click', () => {
    importFileInput.click();
  });

  let helpButton = document.getElementById('help-button');
  helpButton.addEventListener('click', actions.getHelp);

  // Listen to message in case options page is already open
  chrome.runtime.onMessage.addListener(request => {
    if (request.addSuggestedRule) {
      addSuggestedRule();
    }
  });

  initTabs();
  restore();
});

},{"@material/dialog":2,"@material/tabs":5,"bookmarks-helper":6,"notifier":9,"rules-engine":10,"rules-grid":13,"settings":11}],13:[function(require,module,exports){
'use strict';

const mdcSelect = require('@material/select');
const mdcAutoInit = require('@material/auto-init').default;
mdcAutoInit.register('MDCSelect', mdcSelect.MDCSelect);

const bookmarksModal = require('bookmarks-modal');
const constants = require('constants');
const domHelper = require('dom-helper');

/** DOM elements */
let elements = {
  rulesContainer: null
};

let helpers = {
  /**
   * @return {Object}
   */
  getEmptyRule() {
    return {
      expressions: [helpers.getEmptyExpression()]
    };
  },

  /**
   * @return {Object}
   */
  getEmptyExpression() {
    return {
      typeId: constants.EXPRESSION_TYPE_ITEMS[0].id,
      value: ''
    };
  },

  removeElement(element) {
    $.transition(element, { opacity: 0 }).then(() => element.remove());
  },

  /**
   * Traverses DOM to collect rules data
   * @returns {Array.<Rule>} - Rules data Array
  */
  collectRules() {
    let rules = $$('.js-rule-row', elements.rulesContainer)
      .map(ruleRow => {
        let folderLink = $('.js-select-folder-button', ruleRow);

        let folder = JSON.parse(folderLink.dataset.bookmark);

        if (!folder) {
          return null;
        }

        let expressions = $$('.js-expression-row', ruleRow)
          .map(expressionRow => ({
            typeId: $('.js-expression-type', expressionRow).MDCSelect.value,
            value: $('.js-expression-value', expressionRow).value
          }))
          // Exclude expressions with empty values
          .filter(expression => expression.value);

        if (!expressions.length) {
          return null;
        }

        return { folder, expressions };
      })
      // Exclude rules without folder specified
      .filter(rule => rule !== null);

    return rules;
  }
};

function init() {
  let rulesContainer = document.getElementById('rules-container');

  document.getElementById('add-rule-button')
    .addEventListener('click', () => actions.addRuleRow());

  $.delegate(rulesContainer, 'click', {
    '.js-rule-delete-button': actions.deleteRule,
    '.js-select-folder-button': actions.selectFolder,
    '.js-expression-add-button': actions.addExpression,
    '.js-expression-delete-button': actions.deleteExpression
  });

  elements.rulesContainer = rulesContainer;
}

/** Element generation methods */
let render = {
  /**
   * @param {Rule} rule
   */
  ruleRow(rule) {
    let deleteRuleButton = {
      tag: 'button',
      className: 'js-rule-delete-button mdc-button mdc-button--icon mdc-button--compact mdc-card__action',
      title: 'Delete Rule',
      'aria-label': 'Delete Rule',
      contents: domHelper.create.icon(constants.icons.delete)
    };

    let actionsSection = {
      tag: 'section',
      className: 'mdc-card__actions mdc-card__actions--vertical',
      contents: deleteRuleButton
    };

    let primarySection = {
      tag: 'section',
      className: 'mdc-card__primary',
      contents: [
        render.bookmarkSection(rule),
        render.expressionsSection(rule)
      ]
    };

    return $.create('div', {
      className: 'rule-row js-rule-row mdc-card',
      contents: {
        tag: 'div',
        className: 'mdc-card__horizontal-block',
        contents: [primarySection, actionsSection]
      }
    });
  },

  /**
   * Bookmark folder name and path
   * @param {Rule} rule
   */
  bookmarkSection(rule) {
    let folder = rule.folder || { title: '' };
    let isFolderSet = !!folder.id;
    let bookmarkData = isFolderSet ? JSON.stringify(folder) : null;

    let folderIcon = domHelper.create.icon(constants.icons.folder);

    let folderName = folder.title || 'Select folder';
    let folderNameElement = {
      tag: 'span',
      className: 'folder-name js-folder-name',
      textContent: folderName
    };

    return {
      tag: 'div',
      contents: [{
        tag: 'div',
        className: 'folder-link-wrapper js-folder-link-wrapper',
        contents: [{
          tag: 'button',
          className: `js-select-folder-button mdc-button ${isFolderSet ? '' : 'mdc-button--primary'} mdc-button--raised mdc-button--icon-align mdc-button--compact mdc-button--dense`,
          title: folderName,
          'data-bookmark': bookmarkData,
          contents: [folderIcon, folderNameElement]
        }, {
          tag: 'div',
          className: 'folder-path js-folder-path',
          'aria-label': 'Folder path',
          title: folder.path,
          contents: folder.path
        }]
      }]
    };
  },

  /**
   * Rule expressions
   * @param {Rule} rule
   */
  expressionsSection(rule) {
    let addExpressionButton = {
      tag: 'button',
      className: 'js-expression-add-button mdc-button mdc-button--icon-align mdc-button--dense mdc-button--compact mdc-card__action',
      contents: [
        domHelper.create.icon({
          id: constants.icons.add
        }),
        'Add Expression'
      ]
    };

    let actionsSection = {
      tag: 'section',
      className: 'mdc-card__actions mdc-card__actions--vertical',
      contents: addExpressionButton
    };

    let expressionRows = rule.expressions.map(render.expressionRow);

    let primarySection = {
      tag: 'section',
      className: 'js-expressions-container mdc-card__primary',
      contents: expressionRows
    };

    return {
      tag: 'div',
      className: 'rule-field-expressions js-rule-field-expressions mdc-card',
      contents: [primarySection, actionsSection]
    };
  },

  expressionRow(expression) {
    let expressionDeleteButton = {
      tag: 'button',
      className: 'js-expression-delete-button mdc-button mdc-button--icon icon-size-18',
      title: 'Delete Expression',
      'aria-label': 'Delete Expression',
      contents: domHelper.create.icon({
        id: constants.icons.delete,
        size: 1
      })
    };

    let valueField = {
      tag: 'div',
      className: 'mdc-textfield',
      contents: [{
        tag: 'input',
        type: 'text',
        className: 'mdc-textfield__input js-expression-value',
        value: expression.value,
        'aria-label': 'Expression'
      }]
    };

    return {
      tag: 'div',
      className: 'expression-row js-expression-row',
      contents: [{
        tag: 'div',
        className: 'expression-field',
        contents: render.expressionTypeSelect(expression)
      }, {
        tag: 'div',
        className: 'expression-field expression-field-value',
        contents: valueField
      }, {
        tag: 'div',
        className: 'expression-field',
        contents: expressionDeleteButton
      }]
    };
  },

  expressionTypeSelect(expression) {
    let selectOptions = constants.EXPRESSION_TYPE_ITEMS.map(type => {
      let option = {
        tag: 'li',
        className: 'mdc-list-item',
        role: 'option',
        tabindex: 0,
        id: type.id,
        textContent: type.name
      };

      if (type.id === expression.typeId) {
        // Mark as selected
        option['aria-selected'] = true;
      }

      return option;
    });

    let selectedOption = {
      tag: 'span',
      className: 'mdc-select__selected-text',
      textContent: constants.EXPRESSION_TYPES_NAMES_MAP[expression.typeId]
    };

    return {
      tag: 'div',
      className: 'mdc-select js-expression-type',
      'data-mdc-auto-init': 'MDCSelect',
      role: 'listbox',
      'aria-label': 'Expression type',
      tabindex: 0,
      contents: [selectedOption, {
        tag: 'div',
        className: 'mdc-simple-menu mdc-select__menu',
        contents: {
          tag: 'ul',
          className: 'mdc-list mdc-simple-menu__items',
          contents: selectOptions
        }
      }]
    };
  }
};

let actions = {
  /**
   * @param {Array.<Rule>} [rules=[]]
   */
  addRuleRows(rules = []) {
    if (!rules.length) {
      actions.addRuleRow();

      return;
    }

    let documentFragment = document.createDocumentFragment();

    rules.forEach(rule => {
      documentFragment.appendChild(render.ruleRow(rule));
    });

    elements.rulesContainer.appendChild(documentFragment);
    // Init MDC controls
    mdcAutoInit(elements.rulesContainer, () => {});
  },

  /**
   * @param {Rule} rule
   */
  addRuleRow(rule) {
    let ruleRow = render.ruleRow(rule || helpers.getEmptyRule());

    // Highlight new row
    ruleRow.classList.add('is-new');

    elements.rulesContainer.appendChild(ruleRow);

    // Init MDC controls
    mdcAutoInit(ruleRow, () => {});

    ruleRow.scrollIntoView();

    ruleRow.classList.remove('is-new');

    $('.js-select-folder-button', ruleRow).focus();
  },

  /**
   * @param {Event} event
   */
  deleteRule(event) {
    helpers.removeElement(event.target.closest('.js-rule-row'));
  },

  /**
   * @param {Event} event
   */
  selectFolder(event) {
    let button = event.target.closest('.js-select-folder-button');
    let bookmarkFolder = JSON.parse(button.dataset.bookmark);

    let onSelect = bookmarkFolder => {
      $.set(button, {
        'data-bookmark': JSON.stringify(bookmarkFolder),
        title: bookmarkFolder.title
      });

      button.classList.remove('mdc-button--primary');

      let folderName = $('.js-folder-name', button);
      $.set(folderName, {
        textContent: bookmarkFolder.title,
      });

      let path = $('.js-folder-path', button.closest('.js-folder-link-wrapper'));
      $.set(path, {
        textContent: bookmarkFolder.path,
        title: bookmarkFolder.path
      });
    };

    bookmarksModal.open(bookmarkFolder, onSelect);
  },

  /**
   * @param {Event} event
   */
  addExpression(event) {
    let container = $('.js-expressions-container', event.target.closest('.js-rule-field-expressions'));
    let expressionRow = $.create(render.expressionRow(helpers.getEmptyExpression()));

    container.appendChild(expressionRow);
    // Init MDC controls
    mdcAutoInit(expressionRow, () => {});
  },

  /**
   * @param {Event} event
   */
  deleteExpression(event) {
    helpers.removeElement(event.target.closest('.js-expression-row'));
  }
};

module.exports = {
  init: init,
  getRules: helpers.collectRules,
  addRules: actions.addRuleRows,
  addRule: actions.addRuleRow
};

},{"@material/auto-init":1,"@material/select":3,"bookmarks-modal":12,"constants":7,"dom-helper":8}],12:[function(require,module,exports){
'use strict';

const mdcDialog = require('@material/dialog');

const constants = require('constants');
const bookmarksHelper = require('bookmarks-helper');
const domHelper = require('dom-helper');
const notifier = require('notifier');

let dialog = null;

/* DOM elements */
let elements = {
  treeContainer: null,
  confirmButton: null
};

let state = {
  onSelectCallback: null,
  selectedFolderElement: null,
  isInitialized: false
};

let helpers = {
  /**
   * Returns id for folder DOM element
   * @param {string} bookmarkId
   */
  getFolderElementId: bookmarkId => `bookmark_${bookmarkId}`,

  /**
   * Returns folder element
   * @param {string} bookmarkId
   */
  getFolderElement: bookmarkId => {
    let folderElementId = helpers.getFolderElementId(bookmarkId);

    return elements.treeContainer.querySelector(`#${folderElementId}`);
  },

  getFolderExpanderIcon: () => ({
    tag: 'button',
    className: 'bookmark-folder-expander js-bookmark-folder-expander mdc-button mdc-button--icon icon-size-18',
    'aria-label': 'Expand / Collapse',
    contents: domHelper.create.icon({
      id: constants.icons.expander,
      className: '',
      size: 1
    })
  }),

  getFolderIcon: () => domHelper.create.icon({
    id: constants.icons.folder,
    className: 'bookmark-folder-icon',
    size: 1
  }),

  getFolderOpenIcon: () => domHelper.create.icon({
    id: constants.icons.folderOpen,
    className: 'bookmark-folder-icon-open',
    size: 1
  })
};

/** Folder element related methods */
let folder = {
  /**
   * @param {Event} event
   */
  expandCollapse(event) {
    event.target.closest('li').classList.toggle('is-expanded');
  },

  /**
   * @param {Element} target
    */
  highlight(target) {
    target.classList.add('is-active');
  },

  /**
   * Scrolls folder element into middle of the view
   * @param {Element} folderElement
   */
  scrollTo(folderElement) {
    setTimeout(() => {
      let clientHeight = elements.treeContainer.clientHeight;

      // Scroll to the bottom
      folderElement.scrollIntoView(false);

      // Scroll further for a half of the view port
      elements.treeContainer.scrollTop += (clientHeight / 2);
    }, 0);
  },

  /**
   * @param {Event}
   */
  select(event) {
    let element = event.target;

    folder.clearSelection();
    folder.highlight(element);

    state.selectedFolderElement = element;
  },

  /**
   * Clears folder element selection
   */
  clearSelection() {
    $$('.is-active', elements.treeContainer)
      .forEach(element => element.classList.remove('is-active'));
  },

  /**
   * Restores bookmarks tree state
   * @param {Object} selectedFolder
   */
  restoreSelection(selectedFolder) {
    // Collapse all nodes
    $$('.is-expanded', elements.treeContainer)
      .forEach(element => element.classList.remove('is-expanded'));

    if (!selectedFolder) {
      return;
    }

    // Clear folder highlight
    folder.clearSelection();

    // Highlight selected folder
    let folderElement = helpers.getFolderElement(selectedFolder.id);

    if (folderElement) {
      folder.highlight(folderElement);

      // Expand nodes containing selected folder
      let currentNode = folderElement.closest('li.js-bookmark-node');

      while (currentNode) {
        currentNode.classList.add('is-expanded');
        currentNode = currentNode.parentElement.closest('li.js-bookmark-node');
      }

      folder.scrollTo(folderElement);
    } else {
      notifier.warning('Folder not found');
    }
  }
};

/** Element generation methods */
let render = {
  /**
   * Renders tree
   */
  tree(bookmarkFolder) {
    chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
      let docFragment = document.createDocumentFragment();

      // Root is nameless, skip it
      let rootNodes = bookmarkTreeNodes[0].children;

      docFragment.appendChild(render.treeNodes(rootNodes));

      let treeRoot = elements.treeContainer;
      treeRoot.innerHTML = '';
      treeRoot.appendChild(docFragment);

      folder.restoreSelection(bookmarkFolder);
    });
  },

  /**
   * Renders tree nodes - ul element
   * @param {Array.<Element>} nodes
   */
  treeNodes(nodes) {
    let list = $.create('ul', {
      className: 'bookmark-node-list'
    });

    // Only include bookmark folders. Ones don't have 'url' specified
    nodes
      .filter(node => !node.url)
      .forEach(node => list.appendChild(render.node(node)));

    return list;
  },

  /**
   * Renders tree node - li element
   * @param {BookmarkTreeNode} node
   */
  node(node) {
    let hasChildren = false;

    if (node.children && node.children.length > 0) {
      hasChildren = node.children.some(node => !node.url);
    }

    let folderItemContents = [
      helpers.getFolderIcon(),
      helpers.getFolderOpenIcon(),
      {
        tag: 'a',
        textContent: node.title,
        id: helpers.getFolderElementId(node.id),
        className: 'bookmark-folder js-bookmark-folder',
        'data-bookmark': JSON.stringify({ id: node.id, title: node.title })
      }];

    if (hasChildren) {
      folderItemContents.splice(0, 0, helpers.getFolderExpanderIcon());
    }

    let folderItem = $.create('div', {
      className: 'bookmark-folder-wrapper',
      contents: folderItemContents
    });

    let li = $.create('li', {
      className: 'bookmark-node js-bookmark-node',
      contents: folderItem
    });

    if (hasChildren) {
      li.appendChild(render.treeNodes(node.children));
    }

    return li;
  }
};

/**
 * Initialize dialog
 */
function init(bookmarkFolder) {
  if (state.isInitialized) {
    dialog.show();
    folder.restoreSelection(bookmarkFolder);

    return;
  }

  dialog = new mdcDialog.MDCDialog(document.getElementById('bookmarks-tree-dialog'));

  elements.treeContainer = document.getElementById('bookmarks-tree');

  $.delegate(elements.treeContainer, 'click', {
    '.js-bookmark-folder-expander': folder.expandCollapse,
    '.js-bookmark-folder': folder.select
  });

  // On folder select confirmation
  dialog.listen('MDCDialog:accept', () => {
    if (!state.selectedFolderElement) {
      dialog.close();
    }

    let selectedFolder = JSON.parse(state.selectedFolderElement.dataset.bookmark);

    bookmarksHelper.getBookmarkPath(selectedFolder.id)
      .then(folderPath => {
        if (state.selectedFolderElement) {
          selectedFolder.path = folderPath;
          state.onSelectCallback(selectedFolder);
        }

        dialog.close();
      });
  });

  render.tree(bookmarkFolder);
  dialog.show();

  state.isInitialized = true;
}

/**
 * Opens bookmarks modal
 * @param {object} bookmarkFolder - Bookmark folder object
 * @param {Function} onSelect - Bookmark folder selection callback
 */
function open(bookmarkFolder, onSelect) {
  state.onSelectCallback = onSelect;

  init(bookmarkFolder);
}

module.exports = {
  open: open
};

},{"@material/dialog":2,"bookmarks-helper":6,"constants":7,"dom-helper":8,"notifier":9}],9:[function(require,module,exports){
'use strict';

const mdcSnackbar = require('@material/snackbar');

// Delay to show progress notification
const PROGRESS_SHOW_DELAY = 500;
const DEFAULT_TIMEOUT = 2750;
const WARNING_TIMEOUT = Math.floor(DEFAULT_TIMEOUT * 1.5);
const ERROR_TIMEOUT = Math.floor(DEFAULT_TIMEOUT * 2);
const PROGRESS_TIMEOUT = Math.floor(DEFAULT_TIMEOUT / 2);

// Body element loading CSS class
const LOADING_CLASS = 'is-loading';

// Notification type CSS classes
const WARNING_CLASS = 'is-warning';
const ERROR_CLASS = 'is-error';
const TYPE_CLASS_LIST = [WARNING_CLASS, ERROR_CLASS];

// Notification class instance
let snackbar;
let foundation;

let progressState = {
  isActive: false,
  timeoutId: null
};

/**
 * Sets notification type CSS class
 * @param {string} [className]
 */
function setTypeCssClass(className) {
  // Clear type classes assigned previously
  TYPE_CLASS_LIST.forEach(typeClassName => foundation.removeClass(typeClassName));

  if (className) {
    foundation.addClass(className);
  }
}

$.ready().then(() => {
  snackbar = new mdcSnackbar.MDCSnackbar(document.getElementById('notification-bar'));
  foundation = snackbar.getDefaultFoundation().adapter_;
});

module.exports = {
  /**
   * Shows success notification
   * @param {string} message
   */
  success: message => {
    setTypeCssClass();
    snackbar.show({
      message,
      timeout: PROGRESS_TIMEOUT
    });
  },

  /**
   * Shows warning notification
   * @param {string} message
   */
  warning: message => {
    setTypeCssClass(WARNING_CLASS);

    snackbar.show({
      message,
      timeout: WARNING_TIMEOUT
    });
  },

  /**
   * Shows error notification
   * @param {string} message
   */
  error: message => {
    setTypeCssClass(ERROR_CLASS);

    snackbar.show({
      message,
      timeout: ERROR_TIMEOUT
    });
  },

  /**
   * Shows progress notification and add overlay after some delay
   * @param {string} message
   */
  progressStart: message => {
    let showNotification = () => {
      setTypeCssClass();

      window.document.body.classList.add(LOADING_CLASS);

      snackbar.show({
        message,
        timeout: PROGRESS_TIMEOUT
      });

      progressState.isActive = true;
    };

    progressState.timeoutId = setTimeout(showNotification, PROGRESS_SHOW_DELAY);
  },

  /**
   * Cleans after 'progressStart' call
   */
  progressEnd: () => {
    clearTimeout(progressState.timeoutId);

    if (progressState.isActive) {
      window.document.body.classList.remove(LOADING_CLASS);
      progressState.isActive = false;
    }
  }
};

},{"@material/snackbar":4}],6:[function(require,module,exports){
'use strict';

/**
 * @typedef {Object} BookmarkTreeNode
 * @property {string} id
 * @property {string} parentId
 * @property {string} url
 * @property {string} title
 */

/**
 * Retrieves bookmark
 * @param {string} id - Bookmark id
 * @return {Promise.<BookmarkTreeNode>}
 */
function getBookmark(id) {
  return new Promise(resolve => {
    chrome.bookmarks.get(id, bookmarkNodes => {
      resolve(bookmarkNodes[0] || null);
    });
  });
}

/**
 * Builds path to bookmark moving up to the tree root
 * @param {string} bookmarkId
 * @return {Promise.<string>}
 */
function getBookmarkPath(bookmarkId) {
  return new Promise(resolve => {
    let pathParts = [];

    let processNode = id => {
      return getBookmark(id).then(node => {
        if (node.title) {
          pathParts.push(node.title);
        }

        if (node.parentId) {
          return processNode(node.parentId);
        }
      });
    };

    processNode(bookmarkId).then(() => {
      resolve(pathParts.reverse().join('/'));
    });
  });
}

module.exports = {
  getBookmark,
  getBookmarkPath
};

},{}],5:[function(require,module,exports){
/*!
 Material Components for the web
 Copyright (c) 2017 Google Inc.
 License: Apache-2.0
*/
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.tabs=e():(t.mdc=t.mdc||{},t.mdc.tabs=e())}(this,function(){return function(t){function e(i){if(n[i])return n[i].exports;var r=n[i]={i:i,l:!1,exports:{}};return t[i].call(r.exports,r,r.exports,e),r.l=!0,r.exports}var n={};return e.m=t,e.c=n,e.i=function(t){return t},e.d=function(t,n,i){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:i})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="/assets/",e(e.s=80)}({0:function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var i=n(1);n.d(e,"MDCFoundation",function(){return i.a});var r=n(2);n.d(e,"MDCComponent",function(){return r.a})},1:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),a=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};i(this,t),this.adapter_=e}return r(t,null,[{key:"cssClasses",get:function(){return{}}},{key:"strings",get:function(){return{}}},{key:"numbers",get:function(){return{}}},{key:"defaultAdapter",get:function(){return{}}}]),r(t,[{key:"init",value:function(){}},{key:"destroy",value:function(){}}]),t}();e.a=a},15:function(t,e,n){"use strict";n.d(e,"b",function(){return i}),n.d(e,"a",function(){return r});var i={UPGRADED:"mdc-tab-bar-upgraded"},r={TAB_SELECTOR:".mdc-tab",INDICATOR_SELECTOR:".mdc-tab-bar__indicator"}},16:function(t,e,n){"use strict";n.d(e,"a",function(){return i});var i={ACTIVE:"mdc-tab--active"}},17:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var o=n(2),u=n(4),s=n(16),c=n(58);n.d(e,"a",function(){return c.a}),n.d(e,"b",function(){return l});var f=function t(e,n,i){null===e&&(e=Function.prototype);var r=Object.getOwnPropertyDescriptor(e,n);if(void 0===r){var a=Object.getPrototypeOf(e);return null===a?void 0:t(a,n,i)}if("value"in r)return r.value;var o=r.get;if(void 0!==o)return o.call(i)},d=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),l=function(t){function e(){var t;i(this,e);for(var n=arguments.length,a=Array(n),o=0;o<n;o++)a[o]=arguments[o];var s=r(this,(t=e.__proto__||Object.getPrototypeOf(e)).call.apply(t,[this].concat(a)));return s.ripple_=u.MDCRipple.attachTo(s.root_),s}return a(e,t),d(e,[{key:"computedWidth",get:function(){return this.foundation_.getComputedWidth()}},{key:"computedLeft",get:function(){return this.foundation_.getComputedLeft()}},{key:"isActive",get:function(){return this.foundation_.isActive()},set:function(t){this.foundation_.setActive(t)}},{key:"preventDefaultOnClick",get:function(){return this.foundation_.preventsDefaultOnClick()},set:function(t){this.foundation_.setPreventDefaultOnClick(t)}}],[{key:"attachTo",value:function(t){return new e(t)}}]),d(e,[{key:"destroy",value:function(){this.ripple_.destroy(),f(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"destroy",this).call(this)}},{key:"getDefaultFoundation",value:function(){var t=this;return new c.a({addClass:function(e){return t.root_.classList.add(e)},removeClass:function(e){return t.root_.classList.remove(e)},registerInteractionHandler:function(e,n){return t.root_.addEventListener(e,n)},deregisterInteractionHandler:function(e,n){return t.root_.removeEventListener(e,n)},getOffsetWidth:function(){return t.root_.offsetWidth},getOffsetLeft:function(){return t.root_.offsetLeft},notifySelected:function(){return t.emit("MDCTab:selected",{tab:t},!0)}})}},{key:"initialSyncWithDOM",value:function(){this.isActive=this.root_.classList.contains(s.a.ACTIVE)}},{key:"measureSelf",value:function(){this.foundation_.measureSelf()}}]),e}(o.a)},2:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r=n(1),a=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),o=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:void 0;i(this,t),this.root_=e;for(var r=arguments.length,a=Array(r>2?r-2:0),o=2;o<r;o++)a[o-2]=arguments[o];this.initialize.apply(this,a),this.foundation_=void 0===n?this.getDefaultFoundation():n,this.foundation_.init(),this.initialSyncWithDOM()}return a(t,null,[{key:"attachTo",value:function(e){return new t(e,new r.a)}}]),a(t,[{key:"initialize",value:function(){}},{key:"getDefaultFoundation",value:function(){throw new Error("Subclasses must override getDefaultFoundation to return a properly configured foundation class")}},{key:"initialSyncWithDOM",value:function(){}},{key:"destroy",value:function(){this.foundation_.destroy()}},{key:"listen",value:function(t,e){this.root_.addEventListener(t,e)}},{key:"unlisten",value:function(t,e){this.root_.removeEventListener(t,e)}},{key:"emit",value:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]&&arguments[2],i=void 0;"function"==typeof CustomEvent?i=new CustomEvent(t,{detail:e,bubbles:n}):(i=document.createEvent("CustomEvent"),i.initCustomEvent(t,n,!1,e)),this.root_.dispatchEvent(i)}}]),t}();e.a=o},28:function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var i=n(17);n.d(e,"MDCTabFoundation",function(){return i.a}),n.d(e,"MDCTab",function(){return i.b});var r=n(57);n.d(e,"MDCTabBarFoundation",function(){return r.a}),n.d(e,"MDCTabBar",function(){return r.b})},3:function(t,e,n){"use strict";function i(t){if(t.CSS&&"function"==typeof t.CSS.supports){var e=t.CSS.supports("--css-vars","yes"),n=t.CSS.supports("(--css-vars: yes)")&&t.CSS.supports("color","#00000000");return e||n}}function r(t){return["webkitMatchesSelector","msMatchesSelector","matches"].filter(function(e){return e in t}).pop()}function a(t,e,n){var i=e.x,r=e.y,a=i+n.left,o=r+n.top,u=void 0,s=void 0;return"touchstart"===t.type?(u=t.changedTouches[0].pageX-a,s=t.changedTouches[0].pageY-o):(u=t.pageX-a,s=t.pageY-o),{x:u,y:s}}e.b=i,e.a=r,e.c=a},4:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}Object.defineProperty(e,"__esModule",{value:!0});var o=n(0),u=n(6),s=n(3);n.d(e,"MDCRippleFoundation",function(){return u.a}),n.d(e,"MDCRipple",function(){return f});var c=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),f=function(t){function e(){return i(this,e),r(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return a(e,t),c(e,[{key:"activate",value:function(){this.foundation_.activate()}},{key:"deactivate",value:function(){this.foundation_.deactivate()}},{key:"getDefaultFoundation",value:function(){return new u.a(e.createAdapter(this))}},{key:"initialSyncWithDOM",value:function(){this.unbounded="mdcRippleIsUnbounded"in this.root_.dataset}},{key:"unbounded",get:function(){return this.unbounded_},set:function(t){var e=u.a.cssClasses.UNBOUNDED;this.unbounded_=Boolean(t),this.unbounded_?this.root_.classList.add(e):this.root_.classList.remove(e)}}],[{key:"attachTo",value:function(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},i=n.isUnbounded,r=void 0===i?void 0:i,a=new e(t);return void 0!==r&&(a.unbounded=r),a}},{key:"createAdapter",value:function(t){var e=n.i(s.a)(HTMLElement.prototype);return{browserSupportsCssVars:function(){return n.i(s.b)(window)},isUnbounded:function(){return t.unbounded},isSurfaceActive:function(){return t.root_[e](":active")},isSurfaceDisabled:function(){return t.disabled},addClass:function(e){return t.root_.classList.add(e)},removeClass:function(e){return t.root_.classList.remove(e)},registerInteractionHandler:function(e,n){return t.root_.addEventListener(e,n)},deregisterInteractionHandler:function(e,n){return t.root_.removeEventListener(e,n)},registerResizeHandler:function(t){return window.addEventListener("resize",t)},deregisterResizeHandler:function(t){return window.removeEventListener("resize",t)},updateCssVariable:function(e,n){return t.root_.style.setProperty(e,n)},computeBoundingRect:function(){return t.root_.getBoundingClientRect()},getWindowPageOffset:function(){return{x:window.pageXOffset,y:window.pageYOffset}}}}}]),e}(o.MDCComponent)},5:function(t,e,n){"use strict";n.d(e,"a",function(){return i}),n.d(e,"b",function(){return r}),n.d(e,"c",function(){return a});var i={ROOT:"mdc-ripple-upgraded",UNBOUNDED:"mdc-ripple-upgraded--unbounded",BG_FOCUSED:"mdc-ripple-upgraded--background-focused",BG_ACTIVE_FILL:"mdc-ripple-upgraded--background-active-fill",FG_ACTIVATION:"mdc-ripple-upgraded--foreground-activation",FG_DEACTIVATION:"mdc-ripple-upgraded--foreground-deactivation"},r={VAR_SURFACE_WIDTH:"--mdc-ripple-surface-width",VAR_SURFACE_HEIGHT:"--mdc-ripple-surface-height",VAR_FG_SIZE:"--mdc-ripple-fg-size",VAR_LEFT:"--mdc-ripple-left",VAR_TOP:"--mdc-ripple-top",VAR_FG_SCALE:"--mdc-ripple-fg-scale",VAR_FG_TRANSLATE_START:"--mdc-ripple-fg-translate-start",VAR_FG_TRANSLATE_END:"--mdc-ripple-fg-translate-end"},a={PADDING:10,INITIAL_ORIGIN_SCALE:.6,DEACTIVATION_TIMEOUT_MS:300}},56:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var o=n(1),u=n(7),s=n(15),c=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},f=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),d=function(t){function e(t){i(this,e);var n=r(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,c(e.defaultAdapter,t)));return n.isIndicatorShown_=!1,n.computedWidth_=0,n.computedLeft_=0,n.activeTabIndex_=0,n.layoutFrame_=0,n.resizeHandler_=function(){return n.layout()},n}return a(e,t),f(e,null,[{key:"cssClasses",get:function(){return s.b}},{key:"strings",get:function(){return s.a}},{key:"defaultAdapter",get:function(){return{addClass:function(){},removeClass:function(){},bindOnMDCTabSelectedEvent:function(){},unbindOnMDCTabSelectedEvent:function(){},registerResizeHandler:function(){},deregisterResizeHandler:function(){},getOffsetWidth:function(){return 0},setStyleForIndicator:function(){},getOffsetWidthForIndicator:function(){return 0},notifyChange:function(){},getNumberOfTabs:function(){return 0},isTabActiveAtIndex:function(){return!1},setTabActiveAtIndex:function(){},isDefaultPreventedOnClickForTabAtIndex:function(){return!1},setPreventDefaultOnClickForTabAtIndex:function(){},measureTabAtIndex:function(){},getComputedWidthForTabAtIndex:function(){return 0},getComputedLeftForTabAtIndex:function(){return 0}}}}]),f(e,[{key:"init",value:function(){this.adapter_.addClass(s.b.UPGRADED),this.adapter_.bindOnMDCTabSelectedEvent(),this.adapter_.registerResizeHandler(this.resizeHandler_);var t=this.findActiveTabIndex_();t>=0&&(this.activeTabIndex_=t),this.layout()}},{key:"destroy",value:function(){this.adapter_.removeClass(s.b.UPGRADED),this.adapter_.unbindOnMDCTabSelectedEvent(),this.adapter_.deregisterResizeHandler(this.resizeHandler_)}},{key:"layoutInternal_",value:function(){var t=this;this.forEachTabIndex_(function(e){return t.adapter_.measureTabAtIndex(e)}),this.computedWidth_=this.adapter_.getOffsetWidth(),this.layoutIndicator_()}},{key:"layoutIndicator_",value:function(){var t=!this.isIndicatorShown_;t&&this.adapter_.setStyleForIndicator("transition","none");var e=this.adapter_.getComputedLeftForTabAtIndex(this.activeTabIndex_),i=this.adapter_.getComputedWidthForTabAtIndex(this.activeTabIndex_)/this.adapter_.getOffsetWidth(),r="translateX("+e+"px) scale("+i+", 1)";this.adapter_.setStyleForIndicator(n.i(u.getCorrectPropertyName)(window,"transform"),r),t&&(this.adapter_.getOffsetWidthForIndicator(),this.adapter_.setStyleForIndicator("transition",""),this.adapter_.setStyleForIndicator("visibility","visible"),this.isIndicatorShown_=!0)}},{key:"findActiveTabIndex_",value:function(){var t=this,e=-1;return this.forEachTabIndex_(function(n){if(t.adapter_.isTabActiveAtIndex(n))return e=n,!0}),e}},{key:"forEachTabIndex_",value:function(t){for(var e=this.adapter_.getNumberOfTabs(),n=0;n<e;n++){if(t(n))break}}},{key:"layout",value:function(){var t=this;this.layoutFrame_&&cancelAnimationFrame(this.layoutFrame_),this.layoutFrame_=requestAnimationFrame(function(){t.layoutInternal_(),t.layoutFrame_=0})}},{key:"switchToTabAtIndex",value:function(t,e){var n=this;if(t!==this.activeTabIndex_){if(t<0||t>=this.adapter_.getNumberOfTabs())throw new Error("Out of bounds index specified for tab: "+t);var i=this.activeTabIndex_;this.activeTabIndex_=t,requestAnimationFrame(function(){i>=0&&n.adapter_.setTabActiveAtIndex(i,!1),n.adapter_.setTabActiveAtIndex(n.activeTabIndex_,!0),n.layoutIndicator_(),e&&n.adapter_.notifyChange({activeTabIndex:n.activeTabIndex_})})}}},{key:"getActiveTabIndex",value:function(){return this.findActiveTabIndex_()}}]),e}(o.a);e.a=d},57:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var o=n(2),u=n(17),s=n(15),c=n(56);n.d(e,"a",function(){return c.a}),n.d(e,"b",function(){return d});var f=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),d=function(t){function e(){return i(this,e),r(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return a(e,t),f(e,[{key:"initialize",value:function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:function(t){return new u.b(t)};this.indicator_=this.root_.querySelector(s.a.INDICATOR_SELECTOR),this.tabs_=this.gatherTabs_(e),this.tabSelectedHandler_=function(e){var n=e.detail,i=n.tab;t.setActiveTab_(i,!0)}}},{key:"getDefaultFoundation",value:function(){var t=this;return new c.a({addClass:function(e){return t.root_.classList.add(e)},removeClass:function(e){return t.root_.classList.remove(e)},bindOnMDCTabSelectedEvent:function(){return t.listen("MDCTab:selected",t.tabSelectedHandler_)},unbindOnMDCTabSelectedEvent:function(){return t.unlisten("MDCTab:selected",t.tabSelectedHandler_)},registerResizeHandler:function(t){return window.addEventListener("resize",t)},deregisterResizeHandler:function(t){return window.removeEventListener("resize",t)},getOffsetWidth:function(){return t.root_.offsetWidth},setStyleForIndicator:function(e,n){return t.indicator_.style.setProperty(e,n)},getOffsetWidthForIndicator:function(){return t.indicator_.offsetWidth},notifyChange:function(e){return t.emit("MDCTabBar:change",e)},getNumberOfTabs:function(){return t.tabs.length},isTabActiveAtIndex:function(e){return t.tabs[e].isActive},setTabActiveAtIndex:function(e,n){t.tabs[e].isActive=n},isDefaultPreventedOnClickForTabAtIndex:function(e){return t.tabs[e].preventDefaultOnClick},setPreventDefaultOnClickForTabAtIndex:function(e,n){t.tabs[e].preventDefaultOnClick=n},measureTabAtIndex:function(e){return t.tabs[e].measureSelf()},getComputedWidthForTabAtIndex:function(e){return t.tabs[e].computedWidth},getComputedLeftForTabAtIndex:function(e){return t.tabs[e].computedLeft}})}},{key:"gatherTabs_",value:function(t){return[].slice.call(this.root_.querySelectorAll(s.a.TAB_SELECTOR)).map(function(e){return t(e)})}},{key:"setActiveTabIndex_",value:function(t,e){this.foundation_.switchToTabAtIndex(t,e)}},{key:"layout",value:function(){this.foundation_.layout()}},{key:"setActiveTab_",value:function(t,e){var n=this.tabs.indexOf(t);if(n<0)throw new Error("Invalid tab component given as activeTab: Tab not found within this component's tab list");this.setActiveTabIndex_(n,e)}},{key:"tabs",get:function(){return this.tabs_}},{key:"activeTab",get:function(){var t=this.foundation_.getActiveTabIndex();return this.tabs[t]},set:function(t){this.setActiveTab_(t,!1)}},{key:"activeTabIndex",get:function(){return this.foundation_.getActiveTabIndex()},set:function(t){this.setActiveTabIndex_(t,!1)}}],[{key:"attachTo",value:function(t){return new e(t)}}]),e}(o.a)},58:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var o=n(16),u=n(1),s=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},c=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),f=function(t){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};i(this,e);var n=r(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,s(e.defaultAdapter,t)));return n.computedWidth_=0,n.computedLeft_=0,n.isActive_=!1,n.preventDefaultOnClick_=!1,n.clickHandler_=function(t){n.preventDefaultOnClick_&&t.preventDefault(),n.adapter_.notifySelected()},n.keydownHandler_=function(t){(t.key&&"Enter"===t.key||13===t.keyCode)&&n.adapter_.notifySelected()},n}return a(e,t),c(e,null,[{key:"cssClasses",get:function(){return o.a}},{key:"defaultAdapter",get:function(){return{addClass:function(){},removeClass:function(){},registerInteractionHandler:function(){},deregisterInteractionHandler:function(){},getOffsetWidth:function(){return 0},getOffsetLeft:function(){return 0},notifySelected:function(){}}}}]),c(e,[{key:"init",value:function(){this.adapter_.registerInteractionHandler("click",this.clickHandler_),this.adapter_.registerInteractionHandler("keydown",this.keydownHandler_)}},{key:"destroy",value:function(){this.adapter_.deregisterInteractionHandler("click",this.clickHandler_),this.adapter_.deregisterInteractionHandler("keydown",this.keydownHandler_)}},{key:"getComputedWidth",value:function(){return this.computedWidth_}},{key:"getComputedLeft",value:function(){return this.computedLeft_}},{key:"isActive",value:function(){return this.isActive_}},{key:"setActive",value:function(t){this.isActive_=t,this.isActive_?this.adapter_.addClass(o.a.ACTIVE):this.adapter_.removeClass(o.a.ACTIVE)}},{key:"preventsDefaultOnClick",value:function(){return this.preventDefaultOnClick_}},{key:"setPreventDefaultOnClick",value:function(t){this.preventDefaultOnClick_=t}},{key:"measureSelf",value:function(){this.computedWidth_=this.adapter_.getOffsetWidth(),this.computedLeft_=this.adapter_.getOffsetLeft()}}]),e}(u.a);e.a=f},6:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var o=n(0),u=n(5),s=n(3),c=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},f=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),d={mouseup:"mousedown",pointerup:"pointerdown",touchend:"touchstart",keyup:"keydown",blur:"focus"},l=function(t){function e(t){i(this,e);var n=r(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,c(e.defaultAdapter,t)));return n.layoutFrame_=0,n.frame_={width:0,height:0},n.activationState_=n.defaultActivationState_(),n.xfDuration_=0,n.initialSize_=0,n.maxRadius_=0,n.listenerInfos_=[{activate:"touchstart",deactivate:"touchend"},{activate:"pointerdown",deactivate:"pointerup"},{activate:"mousedown",deactivate:"mouseup"},{activate:"keydown",deactivate:"keyup"},{focus:"focus",blur:"blur"}],n.listeners_={activate:function(t){return n.activate_(t)},deactivate:function(t){return n.deactivate_(t)},focus:function(){return requestAnimationFrame(function(){return n.adapter_.addClass(e.cssClasses.BG_FOCUSED)})},blur:function(){return requestAnimationFrame(function(){return n.adapter_.removeClass(e.cssClasses.BG_FOCUSED)})}},n.resizeHandler_=function(){return n.layout()},n.unboundedCoords_={left:0,top:0},n.fgScale_=0,n.activationTimer_=0,n.activationAnimationHasEnded_=!1,n.activationTimerCallback_=function(){n.activationAnimationHasEnded_=!0,n.runDeactivationUXLogicIfReady_()},n}return a(e,t),f(e,[{key:"isSupported_",get:function(){return this.adapter_.browserSupportsCssVars()}}],[{key:"cssClasses",get:function(){return u.a}},{key:"strings",get:function(){return u.b}},{key:"numbers",get:function(){return u.c}},{key:"defaultAdapter",get:function(){return{browserSupportsCssVars:function(){},isUnbounded:function(){},isSurfaceActive:function(){},isSurfaceDisabled:function(){},addClass:function(){},removeClass:function(){},registerInteractionHandler:function(){},deregisterInteractionHandler:function(){},registerResizeHandler:function(){},deregisterResizeHandler:function(){},updateCssVariable:function(){},computeBoundingRect:function(){},getWindowPageOffset:function(){}}}}]),f(e,[{key:"defaultActivationState_",value:function(){return{isActivated:!1,hasDeactivationUXRun:!1,wasActivatedByPointer:!1,wasElementMadeActive:!1,activationStartTime:0,activationEvent:null,isProgrammatic:!1}}},{key:"init",value:function(){var t=this;if(this.isSupported_){this.addEventListeners_();var n=e.cssClasses,i=n.ROOT,r=n.UNBOUNDED;requestAnimationFrame(function(){t.adapter_.addClass(i),t.adapter_.isUnbounded()&&t.adapter_.addClass(r),t.layoutInternal_()})}}},{key:"addEventListeners_",value:function(){var t=this;this.listenerInfos_.forEach(function(e){Object.keys(e).forEach(function(n){t.adapter_.registerInteractionHandler(e[n],t.listeners_[n])})}),this.adapter_.registerResizeHandler(this.resizeHandler_)}},{key:"activate_",value:function(t){var e=this;if(!this.adapter_.isSurfaceDisabled()){var n=this.activationState_;n.isActivated||(n.isActivated=!0,n.isProgrammatic=null===t,n.activationEvent=t,n.wasActivatedByPointer=!n.isProgrammatic&&("mousedown"===t.type||"touchstart"===t.type||"pointerdown"===t.type),n.activationStartTime=Date.now(),requestAnimationFrame(function(){n.wasElementMadeActive=!t||"keydown"!==t.type||e.adapter_.isSurfaceActive(),n.wasElementMadeActive?e.animateActivation_():e.activationState_=e.defaultActivationState_()}))}}},{key:"activate",value:function(){this.activate_(null)}},{key:"animateActivation_",value:function(){var t=this,n=e.strings,i=n.VAR_FG_TRANSLATE_START,r=n.VAR_FG_TRANSLATE_END,a=e.cssClasses,o=a.BG_ACTIVE_FILL,u=a.FG_DEACTIVATION,s=a.FG_ACTIVATION,c=e.numbers.DEACTIVATION_TIMEOUT_MS,f="",d="";if(!this.adapter_.isUnbounded()){var l=this.getFgTranslationCoordinates_(),p=l.startPoint,v=l.endPoint;f=p.x+"px, "+p.y+"px",d=v.x+"px, "+v.y+"px"}this.adapter_.updateCssVariable(i,f),this.adapter_.updateCssVariable(r,d),clearTimeout(this.activationTimer_),this.rmBoundedActivationClasses_(),this.adapter_.removeClass(u),this.adapter_.computeBoundingRect(),this.adapter_.addClass(o),this.adapter_.addClass(s),this.activationTimer_=setTimeout(function(){return t.activationTimerCallback_()},c)}},{key:"getFgTranslationCoordinates_",value:function(){var t=this.activationState_,e=t.activationEvent,i=t.wasActivatedByPointer,r=void 0;return r=i?n.i(s.c)(e,this.adapter_.getWindowPageOffset(),this.adapter_.computeBoundingRect()):{x:this.frame_.width/2,y:this.frame_.height/2},r={x:r.x-this.initialSize_/2,y:r.y-this.initialSize_/2},{startPoint:r,endPoint:{x:this.frame_.width/2-this.initialSize_/2,y:this.frame_.height/2-this.initialSize_/2}}}},{key:"runDeactivationUXLogicIfReady_",value:function(){var t=e.cssClasses.FG_DEACTIVATION,n=this.activationState_,i=n.hasDeactivationUXRun,r=n.isActivated;(i||!r)&&this.activationAnimationHasEnded_&&(this.rmBoundedActivationClasses_(),this.adapter_.addClass(t))}},{key:"rmBoundedActivationClasses_",value:function(){var t=e.cssClasses,n=t.BG_ACTIVE_FILL,i=t.FG_ACTIVATION;this.adapter_.removeClass(n),this.adapter_.removeClass(i),this.activationAnimationHasEnded_=!1,this.adapter_.computeBoundingRect()}},{key:"deactivate_",value:function(t){var e=this,n=this.activationState_;if(n.isActivated){if(n.isProgrammatic){return requestAnimationFrame(function(){return e.animateDeactivation_(null,c({},n))}),void(this.activationState_=this.defaultActivationState_())}var i=d[t.type],r=n.activationEvent.type,a=i===r,o=a;n.wasActivatedByPointer&&(o="mouseup"===t.type);var u=c({},n);requestAnimationFrame(function(){a&&(e.activationState_.hasDeactivationUXRun=!0,e.animateDeactivation_(t,u)),o&&(e.activationState_=e.defaultActivationState_())})}}},{key:"deactivate",value:function(){this.deactivate_(null)}},{key:"animateDeactivation_",value:function(t,n){var i=n.wasActivatedByPointer,r=n.wasElementMadeActive,a=e.cssClasses.BG_FOCUSED;(i||r)&&(this.adapter_.removeClass(a),this.runDeactivationUXLogicIfReady_())}},{key:"destroy",value:function(){var t=this;if(this.isSupported_){this.removeEventListeners_();var n=e.cssClasses,i=n.ROOT,r=n.UNBOUNDED;requestAnimationFrame(function(){t.adapter_.removeClass(i),t.adapter_.removeClass(r),t.removeCssVars_()})}}},{key:"removeEventListeners_",value:function(){var t=this;this.listenerInfos_.forEach(function(e){Object.keys(e).forEach(function(n){t.adapter_.deregisterInteractionHandler(e[n],t.listeners_[n])})}),this.adapter_.deregisterResizeHandler(this.resizeHandler_)}},{key:"removeCssVars_",value:function(){var t=this,n=e.strings;Object.keys(n).forEach(function(e){0===e.indexOf("VAR_")&&t.adapter_.updateCssVariable(n[e],null)})}},{key:"layout",value:function(){var t=this;this.layoutFrame_&&cancelAnimationFrame(this.layoutFrame_),this.layoutFrame_=requestAnimationFrame(function(){t.layoutInternal_(),t.layoutFrame_=0})}},{key:"layoutInternal_",value:function(){this.frame_=this.adapter_.computeBoundingRect();var t=Math.max(this.frame_.height,this.frame_.width),n=Math.sqrt(Math.pow(this.frame_.width,2)+Math.pow(this.frame_.height,2));this.initialSize_=t*e.numbers.INITIAL_ORIGIN_SCALE,this.maxRadius_=n+e.numbers.PADDING,this.fgScale_=this.maxRadius_/this.initialSize_,this.xfDuration_=1e3*Math.sqrt(this.maxRadius_/1024),this.updateLayoutCssVars_()}},{key:"updateLayoutCssVars_",value:function(){var t=e.strings,n=t.VAR_SURFACE_WIDTH,i=t.VAR_SURFACE_HEIGHT,r=t.VAR_FG_SIZE,a=t.VAR_LEFT,o=t.VAR_TOP,u=t.VAR_FG_SCALE;this.adapter_.updateCssVariable(n,this.frame_.width+"px"),this.adapter_.updateCssVariable(i,this.frame_.height+"px"),this.adapter_.updateCssVariable(r,this.initialSize_+"px"),this.adapter_.updateCssVariable(u,this.fgScale_),this.adapter_.isUnbounded()&&(this.unboundedCoords_={left:Math.round(this.frame_.width/2-this.initialSize_/2),top:Math.round(this.frame_.height/2-this.initialSize_/2)},this.adapter_.updateCssVariable(a,this.unboundedCoords_.left+"px"),this.adapter_.updateCssVariable(o,this.unboundedCoords_.top+"px"))}}]),e}(o.MDCFoundation);e.a=l},7:function(t,e,n){"use strict";function i(t){return void 0!==t.document&&"function"==typeof t.document.createElement}function r(t){return t in c||t in f}function a(t,e,n){return e[t].styleProperty in n.style?e[t].noPrefix:e[t].webkitPrefix}function o(t,e){if(!i(t)||!r(e))return e;var n=e in c?c:f,o=t.document.createElement("div");return n===c?a(e,n,o):n[e].noPrefix in o.style?n[e].noPrefix:n[e].webkitPrefix}function u(t,e){return o(t,e)}function s(t,e){return o(t,e)}Object.defineProperty(e,"__esModule",{value:!0}),e.getCorrectEventName=u,e.getCorrectPropertyName=s;var c={animationstart:{noPrefix:"animationstart",webkitPrefix:"webkitAnimationStart",styleProperty:"animation"},animationend:{noPrefix:"animationend",webkitPrefix:"webkitAnimationEnd",styleProperty:"animation"},animationiteration:{noPrefix:"animationiteration",webkitPrefix:"webkitAnimationIteration",styleProperty:"animation"},transitionend:{noPrefix:"transitionend",webkitPrefix:"webkitTransitionEnd",styleProperty:"transition"}},f={animation:{noPrefix:"animation",webkitPrefix:"-webkit-animation"},transform:{noPrefix:"transform",webkitPrefix:"-webkit-transform"},transition:{noPrefix:"transition",webkitPrefix:"-webkit-transition"}}},80:function(t,e,n){t.exports=n(28)}})});
},{}],4:[function(require,module,exports){
/*!
 Material Components for the web
 Copyright (c) 2017 Google Inc.
 License: Apache-2.0
*/
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.snackbar=e():(t.mdc=t.mdc||{},t.mdc.snackbar=e())}(this,function(){return function(t){function e(i){if(n[i])return n[i].exports;var r=n[i]={i:i,l:!1,exports:{}};return t[i].call(r.exports,r,r.exports,e),r.l=!0,r.exports}var n={};return e.m=t,e.c=n,e.i=function(t){return t},e.d=function(t,n,i){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:i})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="/assets/",e(e.s=79)}({0:function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var i=n(1);n.d(e,"MDCFoundation",function(){return i.a});var r=n(2);n.d(e,"MDCComponent",function(){return r.a})},1:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),o=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};i(this,t),this.adapter_=e}return r(t,null,[{key:"cssClasses",get:function(){return{}}},{key:"strings",get:function(){return{}}},{key:"numbers",get:function(){return{}}},{key:"defaultAdapter",get:function(){return{}}}]),r(t,[{key:"init",value:function(){}},{key:"destroy",value:function(){}}]),t}();e.a=o},2:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r=n(1),o=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),a=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:void 0;i(this,t),this.root_=e;for(var r=arguments.length,o=Array(r>2?r-2:0),a=2;a<r;a++)o[a-2]=arguments[a];this.initialize.apply(this,o),this.foundation_=void 0===n?this.getDefaultFoundation():n,this.foundation_.init(),this.initialSyncWithDOM()}return o(t,null,[{key:"attachTo",value:function(e){return new t(e,new r.a)}}]),o(t,[{key:"initialize",value:function(){}},{key:"getDefaultFoundation",value:function(){throw new Error("Subclasses must override getDefaultFoundation to return a properly configured foundation class")}},{key:"initialSyncWithDOM",value:function(){}},{key:"destroy",value:function(){this.foundation_.destroy()}},{key:"listen",value:function(t,e){this.root_.addEventListener(t,e)}},{key:"unlisten",value:function(t,e){this.root_.removeEventListener(t,e)}},{key:"emit",value:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]&&arguments[2],i=void 0;"function"==typeof CustomEvent?i=new CustomEvent(t,{detail:e,bubbles:n}):(i=document.createEvent("CustomEvent"),i.initCustomEvent(t,n,!1,e)),this.root_.dispatchEvent(i)}}]),t}();e.a=a},27:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function o(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}Object.defineProperty(e,"__esModule",{value:!0});var a=n(0),u=n(55),c=n(7);n.d(e,"MDCSnackbarFoundation",function(){return u.a}),n.d(e,"MDCSnackbar",function(){return f});var s=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),f=function(t){function e(){return i(this,e),r(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return o(e,t),s(e,[{key:"show",value:function(t){this.foundation_.show(t)}},{key:"getDefaultFoundation",value:function(){var t=this,e=u.a.strings,i=e.TEXT_SELECTOR,r=e.ACTION_BUTTON_SELECTOR,o=function(){return t.root_.querySelector(i)},a=function(){return t.root_.querySelector(r)};return new u.a({addClass:function(e){return t.root_.classList.add(e)},removeClass:function(e){return t.root_.classList.remove(e)},setAriaHidden:function(){return t.root_.setAttribute("aria-hidden","true")},unsetAriaHidden:function(){return t.root_.removeAttribute("aria-hidden")},setActionAriaHidden:function(){return a().setAttribute("aria-hidden","true")},unsetActionAriaHidden:function(){return a().removeAttribute("aria-hidden")},setActionText:function(t){a().textContent=t},setMessageText:function(t){o().textContent=t},registerActionClickHandler:function(t){return a().addEventListener("click",t)},deregisterActionClickHandler:function(t){return a().removeEventListener("click",t)},registerTransitionEndHandler:function(e){return t.root_.addEventListener(n.i(c.getCorrectEventName)(window,"transitionend"),e)},deregisterTransitionEndHandler:function(e){return t.root_.removeEventListener(n.i(c.getCorrectEventName)(window,"transitionend"),e)}})}}],[{key:"attachTo",value:function(t){return new e(t)}}]),e}(a.MDCComponent)},54:function(t,e,n){"use strict";n.d(e,"a",function(){return i}),n.d(e,"b",function(){return r}),n.d(e,"c",function(){return o});var i={ROOT:"mdc-snackbar",TEXT:"mdc-snackbar__text",ACTION_WRAPPER:"mdc-snackbar__action-wrapper",ACTION_BUTTON:"mdc-snackbar__action-button",ACTIVE:"mdc-snackbar--active",MULTILINE:"mdc-snackbar--multiline",ACTION_ON_BOTTOM:"mdc-snackbar--action-on-bottom"},r={TEXT_SELECTOR:".mdc-snackbar__text",ACTION_WRAPPER_SELECTOR:".mdc-snackbar__action-wrapper",ACTION_BUTTON_SELECTOR:".mdc-snackbar__action-button"},o={MESSAGE_TIMEOUT:2750}},55:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function o(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var a=n(0),u=n(54),c=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},s=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),f=function(t){function e(t){i(this,e);var n=r(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,c(e.defaultAdapter,t)));return n.active_=!1,n.queue_=[],n.actionClickHandler_=function(){return n.invokeAction_()},n}return o(e,t),s(e,[{key:"active",get:function(){return this.active_}}],[{key:"cssClasses",get:function(){return u.a}},{key:"strings",get:function(){return u.b}},{key:"defaultAdapter",get:function(){return{addClass:function(){},removeClass:function(){},setAriaHidden:function(){},unsetAriaHidden:function(){},setMessageText:function(){},setActionText:function(){},setActionAriaHidden:function(){},unsetActionAriaHidden:function(){},registerActionClickHandler:function(){},deregisterActionClickHandler:function(){},registerTransitionEndHandler:function(){},deregisterTransitionEndHandler:function(){}}}}]),s(e,[{key:"init",value:function(){this.adapter_.registerActionClickHandler(this.actionClickHandler_),this.adapter_.setAriaHidden(),this.adapter_.setActionAriaHidden()}},{key:"destroy",value:function(){this.adapter_.deregisterActionClickHandler(this.actionClickHandler_)}},{key:"show",value:function(t){if(!t)throw new Error("Please provide a data object with at least a message to display.");if(!t.message)throw new Error("Please provide a message to be displayed.");if(t.actionHandler&&!t.actionText)throw new Error("Please provide action text with the handler.");if(this.active)return void this.queue_.push(t);var e=u.a.ACTIVE,n=u.a.MULTILINE,i=u.a.ACTION_ON_BOTTOM,r=u.c.MESSAGE_TIMEOUT;this.adapter_.setMessageText(t.message),t.multiline&&(this.adapter_.addClass(n),t.actionOnBottom&&this.adapter_.addClass(i)),t.actionHandler?(this.adapter_.setActionText(t.actionText),this.actionHandler_=t.actionHandler,this.setActionHidden_(!1)):(this.setActionHidden_(!0),this.actionHandler_=null,this.adapter_.setActionText(null)),this.active_=!0,this.adapter_.addClass(e),this.adapter_.unsetAriaHidden(),setTimeout(this.cleanup_.bind(this),t.timeout||r)}},{key:"invokeAction_",value:function(){this.actionHandler_&&this.actionHandler_()}},{key:"cleanup_",value:function(){var t=this,e=u.a.ACTIVE,n=u.a.MULTILINE,i=u.a.ACTION_ON_BOTTOM;this.adapter_.removeClass(e);var r=function e(){t.adapter_.deregisterTransitionEndHandler(e),t.adapter_.removeClass(n),t.adapter_.removeClass(i),t.setActionHidden_(!0),t.adapter_.setMessageText(null),t.adapter_.setActionText(null),t.adapter_.setAriaHidden(),t.active_=!1,t.showNext_()};this.adapter_.registerTransitionEndHandler(r)}},{key:"showNext_",value:function(){this.queue_.length&&this.show(this.queue_.shift())}},{key:"setActionHidden_",value:function(t){t?this.adapter_.setActionAriaHidden():this.adapter_.unsetActionAriaHidden()}}]),e}(a.MDCFoundation);e.a=f},7:function(t,e,n){"use strict";function i(t){return void 0!==t.document&&"function"==typeof t.document.createElement}function r(t){return t in s||t in f}function o(t,e,n){return e[t].styleProperty in n.style?e[t].noPrefix:e[t].webkitPrefix}function a(t,e){if(!i(t)||!r(e))return e;var n=e in s?s:f,a=t.document.createElement("div");return n===s?o(e,n,a):n[e].noPrefix in a.style?n[e].noPrefix:n[e].webkitPrefix}function u(t,e){return a(t,e)}function c(t,e){return a(t,e)}Object.defineProperty(e,"__esModule",{value:!0}),e.getCorrectEventName=u,e.getCorrectPropertyName=c;var s={animationstart:{noPrefix:"animationstart",webkitPrefix:"webkitAnimationStart",styleProperty:"animation"},animationend:{noPrefix:"animationend",webkitPrefix:"webkitAnimationEnd",styleProperty:"animation"},animationiteration:{noPrefix:"animationiteration",webkitPrefix:"webkitAnimationIteration",styleProperty:"animation"},transitionend:{noPrefix:"transitionend",webkitPrefix:"webkitTransitionEnd",styleProperty:"transition"}},f={animation:{noPrefix:"animation",webkitPrefix:"-webkit-animation"},transform:{noPrefix:"transform",webkitPrefix:"-webkit-transform"},transition:{noPrefix:"transition",webkitPrefix:"-webkit-transition"}}},79:function(t,e,n){t.exports=n(27)}})});
},{}],3:[function(require,module,exports){
/*!
 Material Components for the web
 Copyright (c) 2017 Google Inc.
 License: Apache-2.0
*/
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.select=t():(e.mdc=e.mdc||{},e.mdc.select=t())}(this,function(){return function(e){function t(r){if(n[r])return n[r].exports;var i=n[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,t),i.l=!0,i.exports}var n={};return t.m=e,t.c=n,t.i=function(e){return e},t.d=function(e,n,r){t.o(e,n)||Object.defineProperty(e,n,{configurable:!1,enumerable:!0,get:r})},t.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(n,"a",n),n},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="/assets/",t(t.s=78)}({0:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(1);n.d(t,"MDCFoundation",function(){return r.a});var i=n(2);n.d(t,"MDCComponent",function(){return i.a})},1:function(e,t,n){"use strict";function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var i=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),o=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};r(this,e),this.adapter_=t}return i(e,null,[{key:"cssClasses",get:function(){return{}}},{key:"strings",get:function(){return{}}},{key:"numbers",get:function(){return{}}},{key:"defaultAdapter",get:function(){return{}}}]),i(e,[{key:"init",value:function(){}},{key:"destroy",value:function(){}}]),e}();t.a=o},10:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var r=n(14);n.d(t,"MDCSimpleMenu",function(){return r.a}),n.d(t,"MDCSimpleMenuFoundation",function(){return r.b})},12:function(e,t,n){"use strict";n.d(t,"a",function(){return r}),n.d(t,"b",function(){return i}),n.d(t,"c",function(){return o});var r={ROOT:"mdc-simple-menu",OPEN:"mdc-simple-menu--open",ANIMATING:"mdc-simple-menu--animating",TOP_RIGHT:"mdc-simple-menu--open-from-top-right",BOTTOM_LEFT:"mdc-simple-menu--open-from-bottom-left",BOTTOM_RIGHT:"mdc-simple-menu--open-from-bottom-right"},i={ITEMS_SELECTOR:".mdc-simple-menu__items"},o={SELECTED_TRIGGER_DELAY:50,TRANSITION_DURATION_MS:300,TRANSITION_SCALE_ADJUSTMENT_X:.5,TRANSITION_SCALE_ADJUSTMENT_Y:.2,TRANSITION_X1:0,TRANSITION_Y1:0,TRANSITION_X2:.2,TRANSITION_Y2:1}},13:function(e,t,n){"use strict";function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function o(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function a(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}var s=n(0),u=n(12),c=n(8),l=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},d=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),f=function(e){function t(e){i(this,t);var n=o(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,l(t.defaultAdapter,e)));return n.clickHandler_=function(e){return n.handlePossibleSelected_(e)},n.keydownHandler_=function(e){return n.handleKeyboardDown_(e)},n.keyupHandler_=function(e){return n.handleKeyboardUp_(e)},n.documentClickHandler_=function(){n.adapter_.notifyCancel(),n.close()},n.isOpen_=!1,n.startScaleX_=0,n.startScaleY_=0,n.targetScale_=1,n.scaleX_=0,n.scaleY_=0,n.running_=!1,n.selectedTriggerTimerId_=0,n.animationRequestId_=0,n}return a(t,e),d(t,null,[{key:"cssClasses",get:function(){return u.a}},{key:"strings",get:function(){return u.b}},{key:"numbers",get:function(){return u.c}},{key:"defaultAdapter",get:function(){return{addClass:function(){},removeClass:function(){},hasClass:function(){},hasNecessaryDom:function(){return!1},getInnerDimensions:function(){return{}},hasAnchor:function(){return!1},getAnchorDimensions:function(){return{}},getWindowDimensions:function(){return{}},setScale:function(){},setInnerScale:function(){},getNumberOfItems:function(){return 0},registerInteractionHandler:function(){},deregisterInteractionHandler:function(){},registerDocumentClickHandler:function(){},deregisterDocumentClickHandler:function(){},getYParamsForItemAtIndex:function(){return{}},setTransitionDelayForItemAtIndex:function(){},getIndexForEventTarget:function(){return 0},notifySelected:function(){},notifyCancel:function(){},saveFocus:function(){},restoreFocus:function(){},isFocused:function(){return!1},focus:function(){},getFocusedItemIndex:function(){return-1},focusItemAtIndex:function(){},isRtl:function(){return!1},setTransformOrigin:function(){},setPosition:function(){},getAccurateTime:function(){return 0}}}}]),d(t,[{key:"init",value:function(){var e=t.cssClasses,n=e.ROOT,r=e.OPEN;if(!this.adapter_.hasClass(n))throw new Error(n+" class required in root element.");if(!this.adapter_.hasNecessaryDom())throw new Error("Required DOM nodes missing in "+n+" component.");this.adapter_.hasClass(r)&&(this.isOpen_=!0),this.adapter_.registerInteractionHandler("click",this.clickHandler_),this.adapter_.registerInteractionHandler("keyup",this.keyupHandler_),this.adapter_.registerInteractionHandler("keydown",this.keydownHandler_)}},{key:"destroy",value:function(){clearTimeout(this.selectedTriggerTimerId_),cancelAnimationFrame(this.animationRequestId_),this.adapter_.deregisterInteractionHandler("click",this.clickHandler_),this.adapter_.deregisterInteractionHandler("keyup",this.keyupHandler_),this.adapter_.deregisterInteractionHandler("keydown",this.keydownHandler_),this.adapter_.deregisterDocumentClickHandler(this.documentClickHandler_)}},{key:"applyTransitionDelays_",value:function(){for(var e=t.cssClasses,n=e.BOTTOM_LEFT,r=e.BOTTOM_RIGHT,i=this.adapter_.getNumberOfItems(),o=this.dimensions_.height,a=t.numbers.TRANSITION_DURATION_MS/1e3,s=t.numbers.TRANSITION_SCALE_ADJUSTMENT_Y,u=0;u<i;u++){var c=this.adapter_.getYParamsForItemAtIndex(u),l=c.top,d=c.height;this.itemHeight_=d;var f=l/o;(this.adapter_.hasClass(n)||this.adapter_.hasClass(r))&&(f=(o-l-d)/o);var p=(s+f*(1-s))*a;this.adapter_.setTransitionDelayForItemAtIndex(u,p.toFixed(3)+"s")}}},{key:"removeTransitionDelays_",value:function(){for(var e=this.adapter_.getNumberOfItems(),t=0;t<e;t++)this.adapter_.setTransitionDelayForItemAtIndex(t,null)}},{key:"animationLoop_",value:function(){var e=this,r=this.adapter_.getAccurateTime(),i=t.numbers,o=i.TRANSITION_DURATION_MS,a=i.TRANSITION_X1,s=i.TRANSITION_Y1,u=i.TRANSITION_X2,l=i.TRANSITION_Y2,d=i.TRANSITION_SCALE_ADJUSTMENT_X,f=i.TRANSITION_SCALE_ADJUSTMENT_Y,p=n.i(c.b)((r-this.startTime_)/o),h=n.i(c.b)((p-d)/(1-d)),_=p,m=this.startScaleY_;1===this.targetScale_&&(this.itemHeight_&&(m=Math.max(this.itemHeight_/this.dimensions_.height,m)),h=n.i(c.b)(p+d),_=n.i(c.b)((p-f)/(1-f)));var y=n.i(c.c)(h,a,s,u,l),g=n.i(c.c)(_,a,s,u,l);this.scaleX_=this.startScaleX_+(this.targetScale_-this.startScaleX_)*y;var v=1/(0===this.scaleX_?1:this.scaleX_);this.scaleY_=m+(this.targetScale_-m)*g;var I=1/(0===this.scaleY_?1:this.scaleY_);this.adapter_.setScale(this.scaleX_,this.scaleY_),this.adapter_.setInnerScale(v,I),p<1?this.animationRequestId_=requestAnimationFrame(function(){return e.animationLoop_()}):(this.animationRequestId_=0,this.running_=!1,this.adapter_.removeClass(t.cssClasses.ANIMATING))}},{key:"animateMenu_",value:function(){var e=this;this.startTime_=this.adapter_.getAccurateTime(),this.startScaleX_=this.scaleX_,this.startScaleY_=this.scaleY_,this.targetScale_=this.isOpen_?1:0,this.running_||(this.running_=!0,this.animationRequestId_=requestAnimationFrame(function(){return e.animationLoop_()}))}},{key:"focusOnOpen_",value:function(e){null===e?(this.adapter_.focus(),this.adapter_.isFocused()||this.adapter_.focusItemAtIndex(0)):this.adapter_.focusItemAtIndex(e)}},{key:"handleKeyboardDown_",value:function(e){if(e.altKey||e.ctrlKey||e.metaKey)return!0;var t=e.keyCode,n=e.key,r=e.shiftKey,i="Tab"===n||9===t,o="ArrowUp"===n||38===t,a="ArrowDown"===n||40===t,s="Space"===n||32===t,u=this.adapter_.getFocusedItemIndex(),c=this.adapter_.getNumberOfItems()-1;return r&&i&&0===u?(this.adapter_.focusItemAtIndex(c),e.preventDefault(),!1):!r&&i&&u===c?(this.adapter_.focusItemAtIndex(0),e.preventDefault(),!1):((o||a||s)&&e.preventDefault(),o?0===u||this.adapter_.isFocused()?this.adapter_.focusItemAtIndex(c):this.adapter_.focusItemAtIndex(u-1):a&&(u===c||this.adapter_.isFocused()?this.adapter_.focusItemAtIndex(0):this.adapter_.focusItemAtIndex(u+1)),!0)}},{key:"handleKeyboardUp_",value:function(e){if(e.altKey||e.ctrlKey||e.metaKey)return!0;var t=e.keyCode,n=e.key,r="Enter"===n||13===t,i="Space"===n||32===t,o="Escape"===n||27===t;return(r||i)&&this.handlePossibleSelected_(e),o&&(this.adapter_.notifyCancel(),this.close()),!0}},{key:"handlePossibleSelected_",value:function(e){var t=this,n=this.adapter_.getIndexForEventTarget(e.target);n<0||this.selectedTriggerTimerId_||(this.selectedTriggerTimerId_=setTimeout(function(){t.selectedTriggerTimerId_=0,t.close(),t.adapter_.notifySelected({index:n})},u.c.SELECTED_TRIGGER_DELAY))}},{key:"autoPosition_",value:function(){var e;if(this.adapter_.hasAnchor()){var t="top",n="left",i=this.adapter_.getAnchorDimensions(),o=this.adapter_.getWindowDimensions(),a=i.top+this.dimensions_.height-o.height,s=this.dimensions_.height-i.bottom;a>0&&s<a&&(t="bottom");var u=i.left+this.dimensions_.width-o.width,c=this.dimensions_.width-i.right,l=u>0,d=c>0;this.adapter_.isRtl()?(n="right",d&&u<c&&(n="left")):l&&c<u&&(n="right");var f=(e={},r(e,n,"0"),r(e,t,"0"),e);this.adapter_.setTransformOrigin(t+" "+n),this.adapter_.setPosition(f)}}},{key:"open",value:function(){var e=this,n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r=n.focusIndex,i=void 0===r?null:r;this.adapter_.saveFocus(),this.adapter_.addClass(t.cssClasses.ANIMATING),this.animationRequestId_=requestAnimationFrame(function(){e.dimensions_=e.adapter_.getInnerDimensions(),e.applyTransitionDelays_(),e.autoPosition_(),e.animateMenu_(),e.adapter_.addClass(t.cssClasses.OPEN),e.focusOnOpen_(i),e.adapter_.registerDocumentClickHandler(e.documentClickHandler_)}),this.isOpen_=!0}},{key:"close",value:function(){var e=this;this.adapter_.deregisterDocumentClickHandler(this.documentClickHandler_),this.adapter_.addClass(t.cssClasses.ANIMATING),requestAnimationFrame(function(){e.removeTransitionDelays_(),e.animateMenu_(),e.adapter_.removeClass(t.cssClasses.OPEN)}),this.isOpen_=!1,this.adapter_.restoreFocus()}},{key:"isOpen",value:function(){return this.isOpen_}}]),t}(s.MDCFoundation);t.a=f},14:function(e,t,n){"use strict";function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function o(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}var a=n(0),s=n(13),u=n(8);n.d(t,"b",function(){return s.a}),n.d(t,"a",function(){return l});var c=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),l=function(e){function t(){return r(this,t),i(this,(t.__proto__||Object.getPrototypeOf(t)).apply(this,arguments))}return o(t,e),c(t,[{key:"show",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=e.focusIndex,n=void 0===t?null:t;this.foundation_.open({focusIndex:n})}},{key:"hide",value:function(){this.foundation_.close()}},{key:"getDefaultFoundation",value:function(){var e=this;return new s.a({addClass:function(t){return e.root_.classList.add(t)},removeClass:function(t){return e.root_.classList.remove(t)},hasClass:function(t){return e.root_.classList.contains(t)},hasNecessaryDom:function(){return Boolean(e.itemsContainer_)},getInnerDimensions:function(){var t=e.itemsContainer_;return{width:t.offsetWidth,height:t.offsetHeight}},hasAnchor:function(){return e.root_.parentElement&&e.root_.parentElement.classList.contains("mdc-menu-anchor")},getAnchorDimensions:function(){return e.root_.parentElement.getBoundingClientRect()},getWindowDimensions:function(){return{width:window.innerWidth,height:window.innerHeight}},setScale:function(t,r){e.root_.style[n.i(u.a)(window)]="scale("+t+", "+r+")"},setInnerScale:function(t,r){e.itemsContainer_.style[n.i(u.a)(window)]="scale("+t+", "+r+")"},getNumberOfItems:function(){return e.items.length},registerInteractionHandler:function(t,n){return e.root_.addEventListener(t,n)},deregisterInteractionHandler:function(t,n){return e.root_.removeEventListener(t,n)},registerDocumentClickHandler:function(e){return document.addEventListener("click",e)},deregisterDocumentClickHandler:function(e){return document.removeEventListener("click",e)},getYParamsForItemAtIndex:function(t){var n=e.items[t];return{top:n.offsetTop,height:n.offsetHeight}},setTransitionDelayForItemAtIndex:function(t,n){return e.items[t].style.setProperty("transition-delay",n)},getIndexForEventTarget:function(t){return e.items.indexOf(t)},notifySelected:function(t){return e.emit("MDCSimpleMenu:selected",{index:t.index,item:e.items[t.index]})},notifyCancel:function(){return e.emit("MDCSimpleMenu:cancel")},saveFocus:function(){e.previousFocus_=document.activeElement},restoreFocus:function(){e.previousFocus_&&e.previousFocus_.focus()},isFocused:function(){return document.activeElement===e.root_},focus:function(){return e.root_.focus()},getFocusedItemIndex:function(){return e.items.indexOf(document.activeElement)},focusItemAtIndex:function(t){return e.items[t].focus()},isRtl:function(){return"rtl"===getComputedStyle(e.root_).getPropertyValue("direction")},setTransformOrigin:function(t){e.root_.style[n.i(u.a)(window)+"-origin"]=t},setPosition:function(t){e.root_.style.left="left"in t?t.left:null,e.root_.style.right="right"in t?t.right:null,e.root_.style.top="top"in t?t.top:null,e.root_.style.bottom="bottom"in t?t.bottom:null},getAccurateTime:function(){return window.performance.now()}})}},{key:"open",get:function(){return this.foundation_.isOpen()},set:function(e){e?this.foundation_.open():this.foundation_.close()}},{key:"itemsContainer_",get:function(){return this.root_.querySelector(s.a.strings.ITEMS_SELECTOR)}},{key:"items",get:function(){var e=this.itemsContainer_;return[].slice.call(e.querySelectorAll(".mdc-list-item[role]"))}}],[{key:"attachTo",value:function(e){return new t(e)}}]),t}(a.MDCComponent)},2:function(e,t,n){"use strict";function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var i=n(1),o=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),a=function(){function e(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:void 0;r(this,e),this.root_=t;for(var i=arguments.length,o=Array(i>2?i-2:0),a=2;a<i;a++)o[a-2]=arguments[a];this.initialize.apply(this,o),this.foundation_=void 0===n?this.getDefaultFoundation():n,this.foundation_.init(),this.initialSyncWithDOM()}return o(e,null,[{key:"attachTo",value:function(t){return new e(t,new i.a)}}]),o(e,[{key:"initialize",value:function(){}},{key:"getDefaultFoundation",value:function(){throw new Error("Subclasses must override getDefaultFoundation to return a properly configured foundation class")}},{key:"initialSyncWithDOM",value:function(){}},{key:"destroy",value:function(){this.foundation_.destroy()}},{key:"listen",value:function(e,t){this.root_.addEventListener(e,t)}},{key:"unlisten",value:function(e,t){this.root_.removeEventListener(e,t)}},{key:"emit",value:function(e,t){var n=arguments.length>2&&void 0!==arguments[2]&&arguments[2],r=void 0;"function"==typeof CustomEvent?r=new CustomEvent(e,{detail:t,bubbles:n}):(r=document.createEvent("CustomEvent"),r.initCustomEvent(e,n,!1,t)),this.root_.dispatchEvent(r)}}]),e}();t.a=a},26:function(e,t,n){"use strict";function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function o(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}Object.defineProperty(t,"__esModule",{value:!0});var a=n(0),s=n(10),u=n(53);n.d(t,"MDCSelectFoundation",function(){return u.a}),n.d(t,"MDCSelect",function(){return l});var c=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),l=function(e){function t(){return r(this,t),i(this,(t.__proto__||Object.getPrototypeOf(t)).apply(this,arguments))}return o(t,e),c(t,[{key:"item",value:function(e){return this.options[e]||null}},{key:"nameditem",value:function(e){for(var t,n=0,r=this.options;t=r[n];n++)if(t.id===e||t.getAttribute("name")===e)return t;return null}},{key:"initialize",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:function(e){return new s.MDCSimpleMenu(e)};this.menuEl_=this.root_.querySelector(".mdc-select__menu"),this.menu_=e(this.menuEl_),this.selectedText_=this.root_.querySelector(".mdc-select__selected-text")}},{key:"getDefaultFoundation",value:function(){var e=this;return new u.a({addClass:function(t){return e.root_.classList.add(t)},removeClass:function(t){return e.root_.classList.remove(t)},setAttr:function(t,n){return e.root_.setAttribute(t,n)},rmAttr:function(t,n){return e.root_.removeAttribute(t,n)},computeBoundingRect:function(){return e.root_.getBoundingClientRect()},registerInteractionHandler:function(t,n){return e.root_.addEventListener(t,n)},deregisterInteractionHandler:function(t,n){return e.root_.removeEventListener(t,n)},focus:function(){return e.root_.focus()},makeTabbable:function(){e.root_.tabIndex=0},makeUntabbable:function(){e.root_.tabIndex=-1},getComputedStyleValue:function(t){return window.getComputedStyle(e.root_).getPropertyValue(t)},setStyle:function(t,n){return e.root_.style.setProperty(t,n)},create2dRenderingContext:function(){return document.createElement("canvas").getContext("2d")},setMenuElStyle:function(t,n){return e.menuEl_.style.setProperty(t,n)},setMenuElAttr:function(t,n){return e.menuEl_.setAttribute(t,n)},rmMenuElAttr:function(t){return e.menuEl_.removeAttribute(t)},getMenuElOffsetHeight:function(){return e.menuEl_.offsetHeight},openMenu:function(t){return e.menu_.show({focusIndex:t})},isMenuOpen:function(){return e.menu_.open},setSelectedTextContent:function(t){e.selectedText_.textContent=t},getNumberOfOptions:function(){return e.options.length},getTextForOptionAtIndex:function(t){return e.options[t].textContent},getValueForOptionAtIndex:function(t){return e.options[t].id||e.options[t].textContent},setAttrForOptionAtIndex:function(t,n,r){return e.options[t].setAttribute(n,r)},rmAttrForOptionAtIndex:function(t,n){return e.options[t].removeAttribute(n)},getOffsetTopForOptionAtIndex:function(t){return e.options[t].offsetTop},registerMenuInteractionHandler:function(t,n){return e.menu_.listen(t,n)},deregisterMenuInteractionHandler:function(t,n){return e.menu_.unlisten(t,n)},notifyChange:function(){return e.emit("MDCSelect:change",e)},getWindowInnerHeight:function(){return window.innerHeight}})}},{key:"initialSyncWithDOM",value:function(){var e=this.selectedOptions[0],t=e?this.options.indexOf(e):-1;t>=0&&(this.selectedIndex=t),"true"===this.root_.getAttribute("aria-disabled")&&(this.disabled=!0)}},{key:"value",get:function(){return this.foundation_.getValue()}},{key:"options",get:function(){return this.menu_.items}},{key:"selectedOptions",get:function(){return this.root_.querySelectorAll("[aria-selected]")}},{key:"selectedIndex",get:function(){return this.foundation_.getSelectedIndex()},set:function(e){this.foundation_.setSelectedIndex(e)}},{key:"disabled",get:function(){return this.foundation_.isDisabled()},set:function(e){this.foundation_.setDisabled(e)}}],[{key:"attachTo",value:function(e){return new t(e)}}]),t}(a.MDCComponent)},52:function(e,t,n){"use strict";n.d(t,"a",function(){return r});var r={ROOT:"mdc-select",OPEN:"mdc-select--open",DISABLED:"mdc-select--disabled"}},53:function(e,t,n){"use strict";function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function o(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}var a=n(0),s=n(52),u=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},c=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),l=[{key:"ArrowUp",keyCode:38,forType:"keydown"},{key:"ArrowDown",keyCode:40,forType:"keydown"},{key:"Space",keyCode:32,forType:"keyup"}],d=function(e){function t(e){r(this,t);var n=i(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,u(t.defaultAdapter,e)));return n.ctx_=null,n.selectedIndex_=-1,n.disabled_=!1,n.displayHandler_=function(e){e.preventDefault(),n.adapter_.isMenuOpen()||n.open_()},n.displayViaKeyboardHandler_=function(e){return n.handleDisplayViaKeyboard_(e)},n.selectionHandler_=function(e){var t=e.detail,r=t.index;n.close_(),r!==n.selectedIndex_&&(n.setSelectedIndex(r),n.adapter_.notifyChange())},n.cancelHandler_=function(){n.close_()},n}return o(t,e),c(t,null,[{key:"cssClasses",get:function(){return s.a}},{key:"defaultAdapter",get:function(){return{addClass:function(){},removeClass:function(){},setAttr:function(){},rmAttr:function(){},computeBoundingRect:function(){return{left:0,top:0}},registerInteractionHandler:function(){},deregisterInteractionHandler:function(){},focus:function(){},makeTabbable:function(){},makeUntabbable:function(){},getComputedStyleValue:function(){return""},setStyle:function(){},create2dRenderingContext:function(){return{font:"",measureText:function(){return{width:0}}}},setMenuElStyle:function(){},setMenuElAttr:function(){},rmMenuElAttr:function(){},getMenuElOffsetHeight:function(){return 0},openMenu:function(){},isMenuOpen:function(){return!1},setSelectedTextContent:function(){},getNumberOfOptions:function(){return 0},getTextForOptionAtIndex:function(){return""},getValueForOptionAtIndex:function(){return""},setAttrForOptionAtIndex:function(){},rmAttrForOptionAtIndex:function(){},getOffsetTopForOptionAtIndex:function(){return 0},registerMenuInteractionHandler:function(){},deregisterMenuInteractionHandler:function(){},notifyChange:function(){},getWindowInnerHeight:function(){return 0}}}}]),c(t,[{key:"init",value:function(){this.ctx_=this.adapter_.create2dRenderingContext(),this.adapter_.registerInteractionHandler("click",this.displayHandler_),this.adapter_.registerInteractionHandler("keydown",this.displayViaKeyboardHandler_),this.adapter_.registerInteractionHandler("keyup",this.displayViaKeyboardHandler_),this.adapter_.registerMenuInteractionHandler("MDCSimpleMenu:selected",this.selectionHandler_),this.adapter_.registerMenuInteractionHandler("MDCSimpleMenu:cancel",this.cancelHandler_),this.resize()}},{key:"destroy",value:function(){this.ctx_=null,this.adapter_.deregisterInteractionHandler("click",this.displayHandler_),this.adapter_.deregisterInteractionHandler("keydown",this.displayViaKeyboardHandler_),this.adapter_.deregisterInteractionHandler("keyup",this.displayViaKeyboardHandler_),this.adapter_.deregisterMenuInteractionHandler("MDCSimpleMenu:selected",this.selectionHandler_),this.adapter_.deregisterMenuInteractionHandler("MDCSimpleMenu:cancel",this.cancelHandler_)}},{key:"getValue",value:function(){return this.selectedIndex_>=0?this.adapter_.getValueForOptionAtIndex(this.selectedIndex_):""}},{key:"getSelectedIndex",value:function(){return this.selectedIndex_}},{key:"setSelectedIndex",value:function(e){this.selectedIndex_>=0&&this.adapter_.rmAttrForOptionAtIndex(this.selectedIndex_,"aria-selected"),this.selectedIndex_=e>=0&&e<this.adapter_.getNumberOfOptions()?e:-1;var t="";this.selectedIndex_>=0&&(t=this.adapter_.getTextForOptionAtIndex(this.selectedIndex_).trim(),this.adapter_.setAttrForOptionAtIndex(this.selectedIndex_,"aria-selected","true")),this.adapter_.setSelectedTextContent(t)}},{key:"isDisabled",value:function(){return this.disabled_}},{key:"setDisabled",value:function(e){var n=t.cssClasses.DISABLED;this.disabled_=e,this.disabled_?(this.adapter_.addClass(n),this.adapter_.setAttr("aria-disabled","true"),this.adapter_.makeUntabbable()):(this.adapter_.removeClass(n),this.adapter_.rmAttr("aria-disabled"),this.adapter_.makeTabbable())}},{key:"resize",value:function(){var e=this.adapter_.getComputedStyleValue("font"),t=parseFloat(this.adapter_.getComputedStyleValue("letter-spacing"));if(e)this.ctx_.font=e;else{var n=this.adapter_.getComputedStyleValue("font-family").split(",")[0],r=this.adapter_.getComputedStyleValue("font-size");this.ctx_.font=r+" "+n}for(var i=0,o=0,a=this.adapter_.getNumberOfOptions();o<a;o++){var s=this.adapter_.getTextForOptionAtIndex(o).trim(),u=this.ctx_.measureText(s),c=u.width,l=t*s.length;i=Math.max(i,Math.ceil(c+l))}this.adapter_.setStyle("width",i+"px")}},{key:"open_",value:function(){var e=t.cssClasses.OPEN,n=this.selectedIndex_<0?0:this.selectedIndex_,r=this.computeMenuStylesForOpenAtIndex_(n),i=r.left,o=r.top,a=r.transformOrigin;this.adapter_.setMenuElStyle("left",i),this.adapter_.setMenuElStyle("top",o),this.adapter_.setMenuElStyle("transform-origin",a),this.adapter_.addClass(e),this.adapter_.openMenu(n)}},{key:"computeMenuStylesForOpenAtIndex_",value:function(e){var t=this.adapter_.getWindowInnerHeight(),n=this.adapter_.computeBoundingRect(),r=n.left,i=n.top;this.adapter_.setMenuElAttr("aria-hidden","true"),this.adapter_.setMenuElStyle("display","block");var o=this.adapter_.getMenuElOffsetHeight(),a=this.adapter_.getOffsetTopForOptionAtIndex(e);this.adapter_.setMenuElStyle("display",""),this.adapter_.rmMenuElAttr("aria-hidden");var s=i-a,u=o-a,c=s<0,l=s+u>t;return c?s=0:l&&(s=Math.max(0,s-u)),{left:r+"px",top:s+"px",transformOrigin:"center "+a+"px"}}},{key:"close_",value:function(){var e=t.cssClasses.OPEN;this.adapter_.removeClass(e),this.adapter_.focus()}},{key:"handleDisplayViaKeyboard_",value:function(e){if(2===e.eventPhase){"keydown"===e.type&&("Space"===e.key||32===e.keyCode)&&e.preventDefault();l.some(function(t){var n=t.key,r=t.keyCode,i=t.forType;return e.type===i&&(e.key===n||e.keyCode===r)})&&this.displayHandler_(e)}}}]),t}(a.MDCFoundation);t.a=d},78:function(e,t,n){e.exports=n(26)},8:function(e,t,n){"use strict";function r(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if(void 0===u||t){var n=e.document.createElement("div"),r="transform"in n.style?"transform":"webkitTransform";u=r}return u}function i(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1;return Math.min(n,Math.max(t,e))}function o(e,t,n,r,i){return a(s(e,t,r),n,i)}function a(e,t,n){if(0===e||1===e)return e;var r=e*t,i=t+e*(n-t),o=n+e*(1-n);return r+=e*(i-r),i+=e*(o-i),r+e*(i-r)}function s(e,t,n){if(e<=0)return 0;if(e>=1)return 1;for(var r=e,i=0,o=1,s=0,u=0;u<8;u++){s=a(r,t,n);var c=(a(r+1e-6,t,n)-s)/1e-6;if(Math.abs(s-e)<1e-6)return r;if(Math.abs(c)<1e-6)break;s<e?i=r:o=r,r-=(s-e)/c}for(var l=0;Math.abs(s-e)>1e-6&&l<8;l++)s<e?(i=r,r=(r+o)/2):(o=r,r=(r+i)/2),s=a(r,t,n);return r}t.a=r,t.b=i,t.c=o;var u=void 0}})});
},{}],2:[function(require,module,exports){
/*!
 Material Components for the web
 Copyright (c) 2017 Google Inc.
 License: Apache-2.0
*/
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.dialog=e():(t.mdc=t.mdc||{},t.mdc.dialog=e())}(this,function(){return function(t){function e(i){if(n[i])return n[i].exports;var r=n[i]={i:i,l:!1,exports:{}};return t[i].call(r.exports,r,r.exports,e),r.l=!0,r.exports}var n={};return e.m=t,e.c=n,e.i=function(t){return t},e.d=function(t,n,i){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:i})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="/assets/",e(e.s=70)}({0:function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var i=n(1);n.d(e,"MDCFoundation",function(){return i.a});var r=n(2);n.d(e,"MDCComponent",function(){return r.a})},1:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),a=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};i(this,t),this.adapter_=e}return r(t,null,[{key:"cssClasses",get:function(){return{}}},{key:"strings",get:function(){return{}}},{key:"numbers",get:function(){return{}}},{key:"defaultAdapter",get:function(){return{}}}]),r(t,[{key:"init",value:function(){}},{key:"destroy",value:function(){}}]),t}();e.a=a},2:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r=n(1),a=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),o=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:void 0;i(this,t),this.root_=e;for(var r=arguments.length,a=Array(r>2?r-2:0),o=2;o<r;o++)a[o-2]=arguments[o];this.initialize.apply(this,a),this.foundation_=void 0===n?this.getDefaultFoundation():n,this.foundation_.init(),this.initialSyncWithDOM()}return a(t,null,[{key:"attachTo",value:function(e){return new t(e,new r.a)}}]),a(t,[{key:"initialize",value:function(){}},{key:"getDefaultFoundation",value:function(){throw new Error("Subclasses must override getDefaultFoundation to return a properly configured foundation class")}},{key:"initialSyncWithDOM",value:function(){}},{key:"destroy",value:function(){this.foundation_.destroy()}},{key:"listen",value:function(t,e){this.root_.addEventListener(t,e)}},{key:"unlisten",value:function(t,e){this.root_.removeEventListener(t,e)}},{key:"emit",value:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]&&arguments[2],i=void 0;"function"==typeof CustomEvent?i=new CustomEvent(t,{detail:e,bubbles:n}):(i=document.createEvent("CustomEvent"),i.initCustomEvent(t,n,!1,e)),this.root_.dispatchEvent(i)}}]),t}();e.a=o},20:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}Object.defineProperty(e,"__esModule",{value:!0});var o=n(0),u=n(4),s=n(34),c=n(35);n.d(e,"MDCDialogFoundation",function(){return s.a}),n.d(e,"util",function(){return c}),n.d(e,"MDCDialog",function(){return f});var d=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),l=function t(e,n,i){null===e&&(e=Function.prototype);var r=Object.getOwnPropertyDescriptor(e,n);if(void 0===r){var a=Object.getPrototypeOf(e);return null===a?void 0:t(a,n,i)}if("value"in r)return r.value;var o=r.get;if(void 0!==o)return o.call(i)},f=function(t){function e(){return i(this,e),r(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return a(e,t),d(e,[{key:"initialize",value:function(){this.focusTrap_=c.createFocusTrapInstance(this.dialogSurface_,this.acceptButton_),this.footerBtnRipples_=[];for(var t,e=this.root_.querySelectorAll(".mdc-dialog__footer__button"),n=0;t=e[n];n++)this.footerBtnRipples_.push(new u.MDCRipple(t))}},{key:"destroy",value:function(){this.footerBtnRipples_.forEach(function(t){return t.destroy()}),l(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"destroy",this).call(this)}},{key:"show",value:function(){this.foundation_.open()}},{key:"close",value:function(){this.foundation_.close()}},{key:"getDefaultFoundation",value:function(){var t=this;return new s.a({addClass:function(e){return t.root_.classList.add(e)},removeClass:function(e){return t.root_.classList.remove(e)},setStyle:function(e,n){return t.root_.style.setProperty(e,n)},addBodyClass:function(t){return document.body.classList.add(t)},removeBodyClass:function(t){return document.body.classList.remove(t)},eventTargetHasClass:function(t,e){return t.classList.contains(e)},registerInteractionHandler:function(e,n){return t.root_.addEventListener(e,n)},deregisterInteractionHandler:function(e,n){return t.root_.removeEventListener(e,n)},registerSurfaceInteractionHandler:function(e,n){return t.dialogSurface_.addEventListener(e,n)},deregisterSurfaceInteractionHandler:function(e,n){return t.dialogSurface_.removeEventListener(e,n)},registerDocumentKeydownHandler:function(t){return document.addEventListener("keydown",t)},deregisterDocumentKeydownHandler:function(t){return document.removeEventListener("keydown",t)},notifyAccept:function(){return t.emit("MDCDialog:accept")},notifyCancel:function(){return t.emit("MDCDialog:cancel")},trapFocusOnSurface:function(){return t.focusTrap_.activate()},untrapFocusOnSurface:function(){return t.focusTrap_.deactivate()}})}},{key:"open",get:function(){return this.foundation_.isOpen()}},{key:"acceptButton_",get:function(){return this.root_.querySelector(s.a.strings.ACCEPT_SELECTOR)}},{key:"dialogSurface_",get:function(){return this.root_.querySelector(s.a.strings.DIALOG_SURFACE_SELECTOR)}}],[{key:"attachTo",value:function(t){return new e(t)}}]),e}(o.MDCComponent)},3:function(t,e,n){"use strict";function i(t){if(t.CSS&&"function"==typeof t.CSS.supports){var e=t.CSS.supports("--css-vars","yes"),n=t.CSS.supports("(--css-vars: yes)")&&t.CSS.supports("color","#00000000");return e||n}}function r(t){return["webkitMatchesSelector","msMatchesSelector","matches"].filter(function(e){return e in t}).pop()}function a(t,e,n){var i=e.x,r=e.y,a=i+n.left,o=r+n.top,u=void 0,s=void 0;return"touchstart"===t.type?(u=t.changedTouches[0].pageX-a,s=t.changedTouches[0].pageY-o):(u=t.pageX-a,s=t.pageY-o),{x:u,y:s}}e.b=i,e.a=r,e.c=a},33:function(t,e,n){"use strict";n.d(e,"a",function(){return i}),n.d(e,"b",function(){return r});var i={ROOT:"mdc-dialog",OPEN:"mdc-dialog--open",BACKDROP:"mdc-dialog__backdrop",SCROLL_LOCK:"mdc-dialog-scroll-lock",ACCEPT_BTN:"mdc-dialog__footer__button--accept",CANCEL_BTN:"mdc-dialog__footer__button--cancel"},r={OPEN_DIALOG_SELECTOR:".mdc-dialog--open",DIALOG_SURFACE_SELECTOR:".mdc-dialog__surface",ACCEPT_SELECTOR:".mdc-dialog__footer__button--accept"}},34:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var o=n(0),u=n(33),s=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},c=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),d=function(t){function e(t){i(this,e);var n=r(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,s(e.defaultAdapter,t)));return n.isOpen_=!1,n.componentClickHandler_=function(){return n.cancel(!0)},n.dialogClickHandler_=function(t){return n.handleDialogClick_(t)},n.documentKeydownHandler_=function(t){(t.key&&"Escape"===t.key||27===t.keyCode)&&n.cancel(!0)},n}return a(e,t),c(e,null,[{key:"cssClasses",get:function(){return u.a}},{key:"strings",get:function(){return u.b}},{key:"defaultAdapter",get:function(){return{addClass:function(){},removeClass:function(){},setStyle:function(){},addBodyClass:function(){},removeBodyClass:function(){},eventTargetHasClass:function(){return!1},registerInteractionHandler:function(){},deregisterInteractionHandler:function(){},registerSurfaceInteractionHandler:function(){},deregisterSurfaceInteractionHandler:function(){},registerDocumentKeydownHandler:function(){},deregisterDocumentKeydownHandler:function(){},notifyAccept:function(){},notifyCancel:function(){},trapFocusOnSurface:function(){},untrapFocusOnSurface:function(){}}}}]),c(e,[{key:"destroy",value:function(){this.close()}},{key:"open",value:function(){this.isOpen_=!0,this.disableScroll_(),this.adapter_.setStyle("visibility","visible"),this.adapter_.addClass(e.cssClasses.OPEN),this.adapter_.trapFocusOnSurface(),this.adapter_.registerDocumentKeydownHandler(this.documentKeydownHandler_),this.adapter_.registerSurfaceInteractionHandler("click",this.dialogClickHandler_),this.adapter_.registerInteractionHandler("click",this.componentClickHandler_)}},{key:"close",value:function(){this.isOpen_=!1,this.adapter_.untrapFocusOnSurface(),this.adapter_.removeClass(e.cssClasses.OPEN),this.adapter_.setStyle("visibility","hidden"),this.enableScroll_(),this.adapter_.deregisterSurfaceInteractionHandler("click",this.dialogClickHandler_),this.adapter_.deregisterDocumentKeydownHandler(this.documentKeydownHandler_),this.adapter_.deregisterInteractionHandler("click",this.componentClickHandler_)}},{key:"isOpen",value:function(){return this.isOpen_}},{key:"accept",value:function(t){t&&this.adapter_.notifyAccept(),this.close()}},{key:"cancel",value:function(t){t&&this.adapter_.notifyCancel(),this.close()}},{key:"handleDialogClick_",value:function(t){t.stopPropagation();var e=t.target;this.adapter_.eventTargetHasClass(e,u.a.ACCEPT_BTN)?this.accept(!0):this.adapter_.eventTargetHasClass(e,u.a.CANCEL_BTN)&&this.cancel(!0)}},{key:"disableScroll_",value:function(){this.adapter_.addBodyClass(u.a.SCROLL_LOCK)}},{key:"enableScroll_",value:function(){this.adapter_.removeBodyClass(u.a.SCROLL_LOCK)}}]),e}(o.MDCFoundation);e.a=d},35:function(t,e,n){"use strict";function i(t,e){return(arguments.length>2&&void 0!==arguments[2]?arguments[2]:a.a)(t,{initialFocus:e,clickOutsideDeactivates:!0})}Object.defineProperty(e,"__esModule",{value:!0});var r=n(64),a=n.n(r);e.createFocusTrapInstance=i},4:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}Object.defineProperty(e,"__esModule",{value:!0});var o=n(0),u=n(6),s=n(3);n.d(e,"MDCRippleFoundation",function(){return u.a}),n.d(e,"MDCRipple",function(){return d});var c=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),d=function(t){function e(){return i(this,e),r(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return a(e,t),c(e,[{key:"activate",value:function(){this.foundation_.activate()}},{key:"deactivate",value:function(){this.foundation_.deactivate()}},{key:"getDefaultFoundation",value:function(){return new u.a(e.createAdapter(this))}},{key:"initialSyncWithDOM",value:function(){this.unbounded="mdcRippleIsUnbounded"in this.root_.dataset}},{key:"unbounded",get:function(){return this.unbounded_},set:function(t){var e=u.a.cssClasses.UNBOUNDED;this.unbounded_=Boolean(t),this.unbounded_?this.root_.classList.add(e):this.root_.classList.remove(e)}}],[{key:"attachTo",value:function(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},i=n.isUnbounded,r=void 0===i?void 0:i,a=new e(t);return void 0!==r&&(a.unbounded=r),a}},{key:"createAdapter",value:function(t){var e=n.i(s.a)(HTMLElement.prototype);return{browserSupportsCssVars:function(){return n.i(s.b)(window)},isUnbounded:function(){return t.unbounded},isSurfaceActive:function(){return t.root_[e](":active")},isSurfaceDisabled:function(){return t.disabled},addClass:function(e){return t.root_.classList.add(e)},removeClass:function(e){return t.root_.classList.remove(e)},registerInteractionHandler:function(e,n){return t.root_.addEventListener(e,n)},deregisterInteractionHandler:function(e,n){return t.root_.removeEventListener(e,n)},registerResizeHandler:function(t){return window.addEventListener("resize",t)},deregisterResizeHandler:function(t){return window.removeEventListener("resize",t)},updateCssVariable:function(e,n){return t.root_.style.setProperty(e,n)},computeBoundingRect:function(){return t.root_.getBoundingClientRect()},getWindowPageOffset:function(){return{x:window.pageXOffset,y:window.pageYOffset}}}}}]),e}(o.MDCComponent)},5:function(t,e,n){"use strict";n.d(e,"a",function(){return i}),n.d(e,"b",function(){return r}),n.d(e,"c",function(){return a});var i={ROOT:"mdc-ripple-upgraded",UNBOUNDED:"mdc-ripple-upgraded--unbounded",BG_FOCUSED:"mdc-ripple-upgraded--background-focused",BG_ACTIVE_FILL:"mdc-ripple-upgraded--background-active-fill",FG_ACTIVATION:"mdc-ripple-upgraded--foreground-activation",FG_DEACTIVATION:"mdc-ripple-upgraded--foreground-deactivation"},r={VAR_SURFACE_WIDTH:"--mdc-ripple-surface-width",VAR_SURFACE_HEIGHT:"--mdc-ripple-surface-height",VAR_FG_SIZE:"--mdc-ripple-fg-size",VAR_LEFT:"--mdc-ripple-left",VAR_TOP:"--mdc-ripple-top",VAR_FG_SCALE:"--mdc-ripple-fg-scale",VAR_FG_TRANSLATE_START:"--mdc-ripple-fg-translate-start",VAR_FG_TRANSLATE_END:"--mdc-ripple-fg-translate-end"},a={PADDING:10,INITIAL_ORIGIN_SCALE:.6,DEACTIVATION_TIMEOUT_MS:300}},6:function(t,e,n){"use strict";function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function r(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function a(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var o=n(0),u=n(5),s=n(3),c=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},d=function(){function t(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,n,i){return n&&t(e.prototype,n),i&&t(e,i),e}}(),l={mouseup:"mousedown",pointerup:"pointerdown",touchend:"touchstart",keyup:"keydown",blur:"focus"},f=function(t){function e(t){i(this,e);var n=r(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,c(e.defaultAdapter,t)));return n.layoutFrame_=0,n.frame_={width:0,height:0},n.activationState_=n.defaultActivationState_(),n.xfDuration_=0,n.initialSize_=0,n.maxRadius_=0,n.listenerInfos_=[{activate:"touchstart",deactivate:"touchend"},{activate:"pointerdown",deactivate:"pointerup"},{activate:"mousedown",deactivate:"mouseup"},{activate:"keydown",deactivate:"keyup"},{focus:"focus",blur:"blur"}],n.listeners_={activate:function(t){return n.activate_(t)},deactivate:function(t){return n.deactivate_(t)},focus:function(){return requestAnimationFrame(function(){return n.adapter_.addClass(e.cssClasses.BG_FOCUSED)})},blur:function(){return requestAnimationFrame(function(){return n.adapter_.removeClass(e.cssClasses.BG_FOCUSED)})}},n.resizeHandler_=function(){return n.layout()},n.unboundedCoords_={left:0,top:0},n.fgScale_=0,n.activationTimer_=0,n.activationAnimationHasEnded_=!1,n.activationTimerCallback_=function(){n.activationAnimationHasEnded_=!0,n.runDeactivationUXLogicIfReady_()},n}return a(e,t),d(e,[{key:"isSupported_",get:function(){return this.adapter_.browserSupportsCssVars()}}],[{key:"cssClasses",get:function(){return u.a}},{key:"strings",get:function(){return u.b}},{key:"numbers",get:function(){return u.c}},{key:"defaultAdapter",get:function(){return{browserSupportsCssVars:function(){},isUnbounded:function(){},isSurfaceActive:function(){},isSurfaceDisabled:function(){},addClass:function(){},removeClass:function(){},registerInteractionHandler:function(){},deregisterInteractionHandler:function(){},registerResizeHandler:function(){},deregisterResizeHandler:function(){},updateCssVariable:function(){},computeBoundingRect:function(){},getWindowPageOffset:function(){}}}}]),d(e,[{key:"defaultActivationState_",value:function(){return{isActivated:!1,hasDeactivationUXRun:!1,wasActivatedByPointer:!1,wasElementMadeActive:!1,activationStartTime:0,activationEvent:null,isProgrammatic:!1}}},{key:"init",value:function(){var t=this;if(this.isSupported_){this.addEventListeners_();var n=e.cssClasses,i=n.ROOT,r=n.UNBOUNDED;requestAnimationFrame(function(){t.adapter_.addClass(i),t.adapter_.isUnbounded()&&t.adapter_.addClass(r),t.layoutInternal_()})}}},{key:"addEventListeners_",value:function(){var t=this;this.listenerInfos_.forEach(function(e){Object.keys(e).forEach(function(n){t.adapter_.registerInteractionHandler(e[n],t.listeners_[n])})}),this.adapter_.registerResizeHandler(this.resizeHandler_)}},{key:"activate_",value:function(t){var e=this;if(!this.adapter_.isSurfaceDisabled()){var n=this.activationState_;n.isActivated||(n.isActivated=!0,n.isProgrammatic=null===t,n.activationEvent=t,n.wasActivatedByPointer=!n.isProgrammatic&&("mousedown"===t.type||"touchstart"===t.type||"pointerdown"===t.type),n.activationStartTime=Date.now(),requestAnimationFrame(function(){n.wasElementMadeActive=!t||"keydown"!==t.type||e.adapter_.isSurfaceActive(),n.wasElementMadeActive?e.animateActivation_():e.activationState_=e.defaultActivationState_()}))}}},{key:"activate",value:function(){this.activate_(null)}},{key:"animateActivation_",value:function(){var t=this,n=e.strings,i=n.VAR_FG_TRANSLATE_START,r=n.VAR_FG_TRANSLATE_END,a=e.cssClasses,o=a.BG_ACTIVE_FILL,u=a.FG_DEACTIVATION,s=a.FG_ACTIVATION,c=e.numbers.DEACTIVATION_TIMEOUT_MS,d="",l="";if(!this.adapter_.isUnbounded()){var f=this.getFgTranslationCoordinates_(),p=f.startPoint,v=f.endPoint;d=p.x+"px, "+p.y+"px",l=v.x+"px, "+v.y+"px"}this.adapter_.updateCssVariable(i,d),this.adapter_.updateCssVariable(r,l),clearTimeout(this.activationTimer_),this.rmBoundedActivationClasses_(),this.adapter_.removeClass(u),this.adapter_.computeBoundingRect(),this.adapter_.addClass(o),this.adapter_.addClass(s),this.activationTimer_=setTimeout(function(){return t.activationTimerCallback_()},c)}},{key:"getFgTranslationCoordinates_",value:function(){var t=this.activationState_,e=t.activationEvent,i=t.wasActivatedByPointer,r=void 0;return r=i?n.i(s.c)(e,this.adapter_.getWindowPageOffset(),this.adapter_.computeBoundingRect()):{x:this.frame_.width/2,y:this.frame_.height/2},r={x:r.x-this.initialSize_/2,y:r.y-this.initialSize_/2},{startPoint:r,endPoint:{x:this.frame_.width/2-this.initialSize_/2,y:this.frame_.height/2-this.initialSize_/2}}}},{key:"runDeactivationUXLogicIfReady_",value:function(){var t=e.cssClasses.FG_DEACTIVATION,n=this.activationState_,i=n.hasDeactivationUXRun,r=n.isActivated;(i||!r)&&this.activationAnimationHasEnded_&&(this.rmBoundedActivationClasses_(),this.adapter_.addClass(t))}},{key:"rmBoundedActivationClasses_",value:function(){var t=e.cssClasses,n=t.BG_ACTIVE_FILL,i=t.FG_ACTIVATION;this.adapter_.removeClass(n),this.adapter_.removeClass(i),this.activationAnimationHasEnded_=!1,this.adapter_.computeBoundingRect()}},{key:"deactivate_",value:function(t){var e=this,n=this.activationState_;if(n.isActivated){if(n.isProgrammatic){return requestAnimationFrame(function(){return e.animateDeactivation_(null,c({},n))}),void(this.activationState_=this.defaultActivationState_())}var i=l[t.type],r=n.activationEvent.type,a=i===r,o=a;n.wasActivatedByPointer&&(o="mouseup"===t.type);var u=c({},n);requestAnimationFrame(function(){a&&(e.activationState_.hasDeactivationUXRun=!0,e.animateDeactivation_(t,u)),o&&(e.activationState_=e.defaultActivationState_())})}}},{key:"deactivate",value:function(){this.deactivate_(null)}},{key:"animateDeactivation_",value:function(t,n){var i=n.wasActivatedByPointer,r=n.wasElementMadeActive,a=e.cssClasses.BG_FOCUSED;(i||r)&&(this.adapter_.removeClass(a),this.runDeactivationUXLogicIfReady_())}},{key:"destroy",value:function(){var t=this;if(this.isSupported_){this.removeEventListeners_();var n=e.cssClasses,i=n.ROOT,r=n.UNBOUNDED;requestAnimationFrame(function(){t.adapter_.removeClass(i),t.adapter_.removeClass(r),t.removeCssVars_()})}}},{key:"removeEventListeners_",value:function(){var t=this;this.listenerInfos_.forEach(function(e){Object.keys(e).forEach(function(n){t.adapter_.deregisterInteractionHandler(e[n],t.listeners_[n])})}),this.adapter_.deregisterResizeHandler(this.resizeHandler_)}},{key:"removeCssVars_",value:function(){var t=this,n=e.strings;Object.keys(n).forEach(function(e){0===e.indexOf("VAR_")&&t.adapter_.updateCssVariable(n[e],null)})}},{key:"layout",value:function(){var t=this;this.layoutFrame_&&cancelAnimationFrame(this.layoutFrame_),this.layoutFrame_=requestAnimationFrame(function(){t.layoutInternal_(),t.layoutFrame_=0})}},{key:"layoutInternal_",value:function(){this.frame_=this.adapter_.computeBoundingRect();var t=Math.max(this.frame_.height,this.frame_.width),n=Math.sqrt(Math.pow(this.frame_.width,2)+Math.pow(this.frame_.height,2));this.initialSize_=t*e.numbers.INITIAL_ORIGIN_SCALE,this.maxRadius_=n+e.numbers.PADDING,this.fgScale_=this.maxRadius_/this.initialSize_,this.xfDuration_=1e3*Math.sqrt(this.maxRadius_/1024),this.updateLayoutCssVars_()}},{key:"updateLayoutCssVars_",value:function(){var t=e.strings,n=t.VAR_SURFACE_WIDTH,i=t.VAR_SURFACE_HEIGHT,r=t.VAR_FG_SIZE,a=t.VAR_LEFT,o=t.VAR_TOP,u=t.VAR_FG_SCALE;this.adapter_.updateCssVariable(n,this.frame_.width+"px"),this.adapter_.updateCssVariable(i,this.frame_.height+"px"),this.adapter_.updateCssVariable(r,this.initialSize_+"px"),this.adapter_.updateCssVariable(u,this.fgScale_),this.adapter_.isUnbounded()&&(this.unboundedCoords_={left:Math.round(this.frame_.width/2-this.initialSize_/2),top:Math.round(this.frame_.height/2-this.initialSize_/2)},this.adapter_.updateCssVariable(a,this.unboundedCoords_.left+"px"),this.adapter_.updateCssVariable(o,this.unboundedCoords_.top+"px"))}}]),e}(o.MDCFoundation);e.a=f},64:function(t,e,n){function i(t,e){function n(t){if(!E){var e={onActivate:t&&void 0!==t.onActivate?t.onActivate:w.onActivate};return E=!0,O=!1,C=document.activeElement,e.onActivate&&e.onActivate(),d(),S}}function i(t){if(E){var e={returnFocus:t&&void 0!==t.returnFocus?t.returnFocus:w.returnFocusOnDeactivate,onDeactivate:t&&void 0!==t.onDeactivate?t.onDeactivate:w.onDeactivate};return l(),e.onDeactivate&&e.onDeactivate(),e.returnFocus&&setTimeout(function(){a(C)},0),E=!1,O=!1,this}}function s(){!O&&E&&(O=!0,l())}function c(){O&&E&&(O=!1,d())}function d(){if(E)return u&&u.pause(),u=S,g(),a(p()),document.addEventListener("focus",h,!0),document.addEventListener("click",_,!0),document.addEventListener("mousedown",v,!0),document.addEventListener("touchstart",v,!0),document.addEventListener("keydown",y,!0),S}function l(){if(E&&u===S)return document.removeEventListener("focus",h,!0),document.removeEventListener("click",_,!0),document.removeEventListener("mousedown",v,!0),document.removeEventListener("touchstart",v,!0),document.removeEventListener("keydown",y,!0),u=null,S}function f(t){var e=w[t],n=e;if(!e)return null;if("string"==typeof e&&!(n=document.querySelector(e)))throw new Error("`"+t+"` refers to no known node");if("function"==typeof e&&!(n=e()))throw new Error("`"+t+"` did not return a node");return n}function p(){var t;if(!(t=null!==f("initialFocus")?f("initialFocus"):A.contains(document.activeElement)?document.activeElement:b[0]||f("fallbackFocus")))throw new Error("You can't have a focus-trap without at least one focusable element");return t}function v(t){w.clickOutsideDeactivates&&!A.contains(t.target)&&i({returnFocus:!1})}function _(t){w.clickOutsideDeactivates||A.contains(t.target)||(t.preventDefault(),t.stopImmediatePropagation())}function h(t){A.contains(t.target)||(t.preventDefault(),t.stopImmediatePropagation(),"function"==typeof t.target.blur&&t.target.blur())}function y(t){"Tab"!==t.key&&9!==t.keyCode||m(t),!1!==w.escapeDeactivates&&r(t)&&i()}function m(t){t.preventDefault(),g();var e=b.indexOf(t.target),n=b[b.length-1],i=b[0];return t.shiftKey?a(t.target===i||-1===b.indexOf(t.target)?n:b[e-1]):t.target===n?a(i):void a(b[e+1])}function g(){b=o(A)}var b=[],C=null,E=!1,O=!1,A="string"==typeof t?document.querySelector(t):t,w=e||{};w.returnFocusOnDeactivate=!e||void 0===e.returnFocusOnDeactivate||e.returnFocusOnDeactivate,w.escapeDeactivates=!e||void 0===e.escapeDeactivates||e.escapeDeactivates;var S={activate:n,deactivate:i,pause:s,unpause:c};return S}function r(t){return"Escape"===t.key||"Esc"===t.key||27===t.keyCode}function a(t){t&&t.focus&&(t.focus(),"input"===t.tagName.toLowerCase()&&t.select())}var o=n(65),u=null;t.exports=i},65:function(t,e){function n(){function t(n,i){if(n===document.documentElement)return!1;for(var r=0,a=e.length;r<a;r++)if(e[r][0]===n)return e[r][1];i=i||window.getComputedStyle(n);var o=!1;return"none"===i.display?o=!0:n.parentNode&&(o=t(n.parentNode)),e.push([n,o]),o}var e=[];return function(e){if(e===document.documentElement)return!1;var n=window.getComputedStyle(e);return!!t(e,n)||"hidden"===n.visibility}}t.exports=function(t){for(var e,i,r=[],a=[],o=n(),u=["input","select","a[href]","textarea","button","[tabindex]"],s=t.querySelectorAll(u),c=0,d=s.length;c<d;c++)e=s[c],(i=e.tabIndex)<0||"INPUT"===e.tagName&&"hidden"===e.type||e.disabled||o(e)||(0===i?r.push(e):a.push({tabIndex:i,node:e}));var l=a.sort(function(t,e){return t.tabIndex-e.tabIndex}).map(function(t){return t.node});return Array.prototype.push.apply(l,r),l}},70:function(t,e,n){t.exports=n(20)}})});
},{}],1:[function(require,module,exports){
/*!
 Material Components for the web
 Copyright (c) 2017 Google Inc.
 License: Apache-2.0
*/
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.autoInit=e():(t.mdc=t.mdc||{},t.mdc.autoInit=e())}(this,function(){return function(t){function e(o){if(n[o])return n[o].exports;var r=n[o]={i:o,l:!1,exports:{}};return t[o].call(r.exports,r,r.exports,e),r.l=!0,r.exports}var n={};return e.m=t,e.c=n,e.i=function(t){return t},e.d=function(t,n,o){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:o})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="/assets/",e(e.s=67)}({18:function(t,e,n){"use strict";function o(){for(var t,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:document,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:i,o=e.querySelectorAll("[data-mdc-auto-init]"),u=0;t=o[u];u++){var c=t.dataset.mdcAutoInit;if(!c)throw new Error("(mdc-auto-init) Constructor name must be given.");var a=r[c];if("function"!=typeof a)throw new Error("(mdc-auto-init) Could not find constructor in registry for "+c);if(t[c])n("(mdc-auto-init) Component already initialized for "+t+". Skipping...");else{var f=a.attachTo(t);Object.defineProperty(t,c,{value:f,writable:!1,enumerable:!1,configurable:!0})}}}Object.defineProperty(e,"__esModule",{value:!0}),e.default=o;var r=Object.create(null),i=console.warn.bind(console);o.register=function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:i;if("function"!=typeof e)throw new Error("(mdc-auto-init) Invalid Ctor value "+e+". Expected function");r[t]&&n("(mdc-auto-init) Overriding registration for "+t+" with "+e+". Was: "+r[t]),r[t]=e},o.deregister=function(t){delete r[t]},o.deregisterAll=function(){Object.keys(r).forEach(this.deregister,this)}},67:function(t,e,n){t.exports=n(18)}})});
},{}]},{},[14]);
