<template>
  <header class="mdc-toolbar mdc-toolbar--fixed"  v-once>
    <div class="mdc-toolbar__row mdc-toolbar__row--fluid-height mdc-toolbar__row--dense">
      <section class="mdc-toolbar__section mdc-toolbar__section--align-start mdc-toolbar__section--shrink-to-fit">
        <mdc-button id="export-button"
                    :title="'options_export_btn_title' | i18n"
                    @click.native="exportSettings" :compact="true" icon-type="download">
          {{ 'options_export_btn' | i18n }}
        </mdc-button>

        <mdc-button id="import-button" 
                    :title="'options_import_btn_title' | i18n"
                    @click.native="selectFile" :compact="true" icon-type="upload">
          {{ 'options_import_btn' | i18n }}
        </mdc-button>
        <input type="file" id="import-file-input" accept=".json"
               @change="readFile" style="display:none">

        <mdc-button id="help-button" 
                    :title="'options_help_btn_title' | i18n"
                    :aria-label="'options_help_btn_title' | i18n"
                    @click.native="showHelp" :icon-only="true" icon-type="help"/>
      </section>

      <section class="mdc-toolbar__section">
        <nav id="tabs-bar" class="mdc-tab-bar" role="tablist">
          <a class="mdc-tab mdc-tab--active" role="tab">
            {{ 'options_tab_rules' | i18n }}
          </a>
          <a class="mdc-tab" role="tab">
            {{ 'options_tab_other_settings' | i18n }}
          </a>
          <span class="mdc-tab-bar__indicator"></span>
        </nav>
      </section>

      <section class="mdc-toolbar__section mdc-toolbar__section--align-end mdc-toolbar__section--shrink-to-fit">
        <mdc-button id="save-button"
                    @click.native="saveSettings" :compact="true" icon-type="save">
          {{ 'options_save_btn' | i18n }}
        </mdc-button>
      </section>
    </div>
  </header>
</template>

<script src="./header.js"></script>