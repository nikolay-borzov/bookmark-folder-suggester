require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({28:[function(require,module,exports){
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
let currentBookmark = null;

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
   * @return {Promise.<Object>}
   */
  getBookmarkByUrl(url) {
    return new Promise(resolve => {
      chrome.bookmarks.search({ url: url }, treeNodes => {
        resolve(treeNodes[0] || null);
      });
    });
  },

  /**
   * @param {string} folderId
   * @return {Promise.<BookmarkTreeNode>}
   */
  createBookmark(folderId, bookmark) {
    return new Promise(resolve => {
      // Move the bookmark if it was created before
      if (bookmark) {
        chrome.bookmarks.move(bookmark.id, {
          parentId: folderId
        }, resolve);
      } else {
        chrome.bookmarks.create({
          url: currentTab.url,
          title: currentTab.title,
          parentId: folderId,
        }, resolve);
      }
    }).then(newBookmark => {
      // Keep bookmark
      currentBookmark = newBookmark;

      return newBookmark;
    });
  },

  /**
   * Removes previously added bookmark
   * @return {Promise}
   */
  removeBookmark(bookmark) {
    return new Promise(resolve => {
      if (bookmark) {
        chrome.bookmarks.remove(bookmark.id, resolve);
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
   * @param {BookmarkTreeNode} bookmark
   */
  suggestions(rules, bookmark) {
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
   * @param {BookmarkTreeNode} bookmark
   */
  bookmarkSuggestion(event, bookmark) {
    let row = event.target.closest('.js-suggestion-row');
    let folderId = row.dataset.folderId;

    if (row.classList.contains('is-selected')) {
      helpers.removeBookmark(currentBookmark)
        .then(() => {
          row.classList.remove('is-selected');
          currentBookmark = null;
        });
    } else {
      helpers.createBookmark(folderId, bookmark)
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
   * @param {BookmarkTreeNode} bookmark
   */
  addRule(bookmark) {
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
  elements.body = document.body;

  let addRuleLink = document.getElementById('add-rule-button');
  addRuleLink.addEventListener('click', () => actions.addRule(currentBookmark));

  $.delegate(elements.suggestionsContainer,
             'click',
             '.js-suggestion-row',
             (event) => actions.bookmarkSuggestion(event, currentBookmark));

  getCurrentTab().then(tab => {
    // Keep current tab info
    currentTab = tab;

    Promise.all([
      rulesEngine.match({ url: tab.url, title: tab.title }),
      helpers.getBookmarkByUrl(tab.url),
      settings.get('autoBookmark')
    ]).then(([rules, bookmark, { autoBookmark: autoBookmark }]) => {
      // Keep current page bookmark
      currentBookmark = bookmark;

      // Auto Bookmark first suggestion
      if (rules.length && !bookmark && autoBookmark) {
        helpers.createBookmark(rules[0].folder.id, bookmark)
          .then((newBookmark) => {
            render.suggestions(rules, newBookmark);
          });
      } else {
        render.suggestions(rules, bookmark);
      }
    });
  });
});

},{"constants":11,"dom-helper":12,"rules-engine":15,"settings":16}]},{},[28]);
