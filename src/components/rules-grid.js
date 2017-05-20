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
      textContent: constants.EXPRESSION_TYPES_NAMES_MAP[expression.typeId],
      'aria-label': 'Expression Type'
    };

    return {
      tag: 'div',
      className: 'mdc-select js-expression-type',
      'data-mdc-auto-init': 'MDCSelect',
      role: 'listbox',
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
