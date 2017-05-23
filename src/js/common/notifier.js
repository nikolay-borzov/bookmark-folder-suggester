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
