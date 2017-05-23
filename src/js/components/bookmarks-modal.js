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
