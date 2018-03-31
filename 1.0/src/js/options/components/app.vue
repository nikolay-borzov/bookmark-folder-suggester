<template>
  <div>
    <options-header/>
    <main class="panels-container mdc-toolbar-fixed-adjust">
      <div class="tab-panel" role="tabpanel"
           :class="{ 'is-active': tab1Active }" :aria-hidden="!tab1Active">
        <rules-list />
      </div>
      <div class="tab-panel" role="tabpanel" :aria-hidden="!tab2Active"
           :class="{ 'is-active': tab2Active }">
        <div class="mdc-card other-settings-panel">
          <section>
            <div class="mdc-form-field">
              <div class="mdc-checkbox">
                <input type="checkbox" id="auto-bookmark-checkbox"
                       class="mdc-checkbox__native-control" v-model="autoBookmark"/>
                <div class="mdc-checkbox__background">
                  <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24">
                    <path class="mdc-checkbox__checkmark__path"
                          fill="none" stroke="white"
                          d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
                  </svg>
                  <div class="mdc-checkbox__mixedmark"></div>
                </div>
              </div>
              <label for="auto-bookmark-checkbox">
                {{ 'options_auto_bookmark_label' | i18n }}
              </label>
            </div>
          </section>

          <section class="storage-used-row">
            <div class="mdc-form-field">
              <label>{{ 'options_storage_used_label' | i18n }}</label>:
            </div>
            <div class="mdc-form-field storage-used-field">
              <div class="progress">
                <div class="progress-bar" :style="{ width: storeInUsePercent + '%'  }">
                  <div class="progress-label">
                    {{ storageInUse | sizeInKb }} / {{ storageTotal | sizeInKb }}
                    {{ 'options_size_kb' | i18n }}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
    <help-dialog/>
  </div>
</template>

<script src="./app.js"></script>