<template>
  <header class="mdc-toolbar mdc-toolbar--fixed">
    <div class="mdc-toolbar__row mdc-toolbar__row--fluid-height mdc-toolbar__row--dense">
      <section class="mdc-toolbar__section mdc-toolbar__section--align-start mdc-toolbar__section--shrink-to-fit">
        <mdc-button id="export-button" title="Export settings to file"
                    v-bind:compact="true" icon-type="download">
          Export
        </mdc-button>

        <mdc-button id="import-button" title="Import settings from file"
                    v-bind:compact="true" icon-type="upload">
          Import
        </mdc-button>
        <input type="file" id="import-file-input" accept=".json" style="display:none">

        <mdc-button id="help-button" title="Help" aria-label="Help"
                    v-bind:icon-only="true" icon-type="help"/>
      </section>

      <section class="mdc-toolbar__section">
        <nav id="tabs-bar" class="mdc-tab-bar" role="tablist">
          <a class="mdc-tab mdc-tab--active" role="tab">
            Rules
          </a>
          <a class="mdc-tab" role="tab">
            Other settings
          </a>
          <span class="mdc-tab-bar__indicator"></span>
        </nav>
      </section>

      <section class="mdc-toolbar__section mdc-toolbar__section--align-end mdc-toolbar__section--shrink-to-fit">
        <mdc-button id="save-button"
                    v-bind:compact="true" icon-type="save">
          Save
        </mdc-button>
      </section>
    </div>
  </header>
</template>

<script src="./options-header.js"></script>