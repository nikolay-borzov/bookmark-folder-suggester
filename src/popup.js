'use strict';

const constants = require('constants');
const rulesEngine = require('rules-engine');
const settings = require('settings');
const domHelper = require('dom-helper');

// Query filter for getting current tab
const CURRENT_TAB_QUERY_INFO = {
  active: true,
  currentWindow: true
};

/**
 * Current tab info
 */
let currentTab = {
  url: null,
  title: null
};

/**
 * Current bookmark if set
 */
let bookmark = null;

/** DOM elements */
let elements = {
  suggestionsContainer: null,
  body: null
};

let helpers = {
  /**
   * Sets pop-up state
   * @param {string} state - State CSS class
   */
  setState(state) {
    $.set(elements.body, {
      className: state
    });
  },

  /**
   * Searches bookmark by URL
   * @param {string} url
   * @return {Promise}
   */
  getBookmarkByUrl(url) {
    return new Promise(resolve => {
      chrome.bookmarks.search({ url: url }, treeNodes => {
        // Keep the bookmark
        bookmark = treeNodes[0] || null;
        resolve(bookmark);
      });
    });
  },

  /**
   * @param {string} folderId
   * @return {Promise}
   */
  createBookmark(folderId) {
    return new Promise(resolve => {
      // Move the bookmark if it was created before
      if (bookmark) {
        chrome.bookmarks.move(bookmark.id, {
          parentId: folderId
        }, treeNode => {
          // Keep the bookmark
          bookmark = treeNode;
          resolve();
        });
      } else {
        chrome.bookmarks.create({
          url: currentTab.url,
          title: currentTab.title,
          parentId: folderId,
        }, treeNode => {
          // Keep the bookmark in case we need to move it later
          bookmark = treeNode;
          resolve();
        });
      }
    });
  },

  /**
   * Removes previously added bookmark
   * @return {Promise}
   */
  removeBookmark() {
    return new Promise(resolve => {
      if (bookmark) {
        chrome.bookmarks.remove(bookmark.id, () => {
          resolve();
          bookmark = null;
        });
      } else {
        resolve();
      }
    });
  }
};

/**
 * Retrieves current tab
 * @return {Promise.<Tab>}
 */
function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query(CURRENT_TAB_QUERY_INFO, tabs => resolve(tabs[0]));
  });
}

/** Element generation methods */
let render = {
  /**
   * Matched rules
   * @param {Array.<Rule>} rules
   */
  suggestions(rules) {
    if (!rules.length) {
      helpers.setState('no-match');

      return;
    }

    let documentFragment = document.createDocumentFragment();
    let bookmarkFolderId = bookmark ? bookmark.parentId : null;

    let lastRuleIndex = rules.length - 1;

    rules.forEach((rule, index) => {
      let isSelected = bookmarkFolderId === rule.folder.id;

      let folderIcon = domHelper.create.icon({
        id: constants.icons.folder,
        className: 'mdc-list-item__start-detail'
      });

      let folder = {
        tag: 'span',
        className: 'mdc-list-item__text',
        contents: [{
          tag: 'span',
          className: 'folder-name',
          textContent: rule.folder.title,
          title: rule.folder.title
        }, {
          tag: 'span',
          className: 'folder-name mdc-list-item__text__secondary mdc-theme--text-hint-on-background',
          textContent: rule.folder.path,
          title: rule.folder.path
        }]
      };

      let bookmarkIcon = {
        tag: 'span',
        className: 'mdc-list-item__end-detail',
        contents: [
          domHelper.create.icon({
            id: constants.icons.starBorder,
            className: 'bookmark-icon'
          }),
          domHelper.create.icon({
            id: constants.icons.star,
            className: 'bookmark-icon-selected'
          })
        ]
      };

      let row = $.create('li', {
        className: `mdc-list-item suggestion-row js-suggestion-row ${isSelected ? 'is-selected' : ''}`,
        'data-folder-id': rule.folder.id,
        contents: [
          folderIcon,
          folder,
          bookmarkIcon
        ]
      });

      documentFragment.appendChild(row);

      if (lastRuleIndex !== index) {
        documentFragment.appendChild($.create('li', {
          className: 'mdc-list-divider',
          role: 'separator'
        }));
      }
    });

    elements.suggestionsContainer.appendChild(documentFragment);

    helpers.setState('has-match');
  }
};

let actions = {
  /**
   * Creates a bookmark inside selected folder for current tab
   * @param {Event} event
   */
  bookmarkSuggestion(event) {
    let row = event.target.closest('.js-suggestion-row');
    let folderId = row.dataset.folderId;

    if (row.classList.contains('is-selected')) {
      helpers.removeBookmark()
        .then(() => row.classList.remove('is-selected'));
    } else {
      helpers.createBookmark(folderId)
        .then(() => {
          // Clear selection
          $$('.js-suggestion-row', elements.suggestionsContainer)
            .forEach(row => row.classList.remove('is-selected'));

          row.classList.add('is-selected');
        });
    }
  },

  /**
   * Adds rule using current tab's data
   * @param {Event} event
   */
  addRule(event) {
    event.preventDefault();

    let message = { currentTab };

    if (bookmark) {
      message.bookmarkFolder = { id: bookmark.parentId };
    }

    /*
      There are two cases:
      1. Options page isn't open - add a rule during initialization
      2. Options page is open - add a rule on message receiving
    */
    settings.setRuleSuggestData(message).then(() => {
      // Callback won't work here because pop-up is closed
      chrome.runtime.openOptionsPage();

      // Send message to options page. Works only if page is already opened
      chrome.runtime.sendMessage({ addSuggestedRule: true });
    });
  }
};

$.ready().then(() => {
  elements.suggestionsContainer = document.getElementById('suggestions');
  elements.body = document.getElementsByTagName('body')[0];

  let addRuleLink = document.getElementById('add-rule-button');
  addRuleLink.addEventListener('click', actions.addRule);

  $.delegate(elements.suggestionsContainer,
             'click',
             '.js-suggestion-row',
             actions.bookmarkSuggestion);

  getCurrentTab().then(tab => {
    // Keep current tab info
    currentTab = tab;

    Promise.all([
      rulesEngine.match({ url: tab.url, title: tab.title }),
      helpers.getBookmarkByUrl(tab.url)
    ]).then(results => {
      let rules = results[0];
      render.suggestions(rules);
    });
  });
});
