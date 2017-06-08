'use strict';

const settings = require('settings');
const mutationTypes = require('options/mutation-types');

module.exports = {
  name: 'app',

  data() {
    return {
      storageTotal: 0,
      storageInUse: 0
    };
  },

  filters: {
    sizeInKb(sizeInBytes) {
      return Math.floor(sizeInBytes / 1000).toLocaleString();
    }
  },

  computed: {
    tab1Active() {
      return this.activeTabIndex === 0;
    },

    tab2Active() {
      return this.activeTabIndex === 1;
    },

    activeTabIndex() {
      return this.$store.state.activeTabIndex;
    },

    /**
     * Storage in use in percent
     * @return {Number}
     */
    storeInUsePercent() {
      return Math.floor((100 * this.storageInUse) / this.storageQuota);
    },

    autoBookmark: {
      get() {
        return this.$store.state.autoBookmark;
      },
      set(value) {
        this.$store.commit(mutationTypes.SET_AUTO_BOOKMARK, value);
      }
    }
  },

  created() {
    this.storageTotal = settings.getStorageQuotaBytes();

    let updateStorageInUse = () => {
      settings.getStorageBytesInUse().then(bytesInUse => {
        this.storageInUse = bytesInUse;
      });
    };

    updateStorageInUse();

    // Listen to future storage changes
    settings.onStorageChange(updateStorageInUse);
  }
};
