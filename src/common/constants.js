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
    starBorder: 'star-border'
  }
};
