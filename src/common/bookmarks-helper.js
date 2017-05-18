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
