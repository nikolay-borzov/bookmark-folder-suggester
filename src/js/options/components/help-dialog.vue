<template>
  <aside id="help-dialog"  v-once
         class="mdc-dialog"
         role="alertdialog"
         aria-labelledby="help-dialog-header"
         aria-describedby="help-dialog-body">
    <div class="mdc-dialog__surface">
      <header class="mdc-dialog__header mdc-theme--primary-bg">
        <h2 id="help-dialog-header" class="mdc-dialog__header__title">
          {{ 'help_dialog_title' | i18n }}
        </h2>
      </header>
      <section id="help-dialog-body"
               class="mdc-dialog__body mdc-dialog__body--scrollable">
        <h3 class="mdc-typography--subheading2">
          {{ 'help_dialog_create_rule_header' | i18n }}
        </h3>
        <ol>
          <li>{{ 'help_dialog_create_rule_step1' | i18n }}</li>
          <li>{{ 'help_dialog_create_rule_step2' | i18n }}</li>
          <li>{{ 'help_dialog_create_rule_step3' | i18n }}
            <div class="mdc-theme--text-hint-on-light">
              {{ 'help_dialog_create_rule_step3_hint1' | i18n  }} 
            </div>
            <ol>
              <li>{{ 'help_dialog_create_rule_step3_1' | i18n }}</li>
              <li>
                {{ 'help_dialog_create_rule_step3_2' | i18n }}
                <div class="mdc-theme--text-hint-on-light">
                  {{ 'help_dialog_create_rule_step3_2_example' | i18n }}:
                  <ul>
                    <li>{{ 'help_dialog_create_rule_step3_2_example_value1' | i18n }}</li>
                    <li>{{ 'help_dialog_create_rule_step3_2_example_value2' | i18n }}</li>
                  </ul>
                </div>
                <div class="mdc-theme--text-hint-on-light">
                  {{ 'help_dialog_create_rule_step3_2_hint' | i18n }}
                </div>
              </li>
            </ol>
          </li>
        </ol>

        <h3 class="mdc-typography--subheading2">
          {{ 'help_dialog_create_rule_for_page_header' | i18n }}
        </h3>
        <p class="mdc-typography--body1">
          {{ 'help_dialog_create_rule_for_page' | i18n }}
        </p>

        <h3 class="mdc-typography--subheading2">
          {{ 'help_dialog_expression_types_header' | i18n }}
        </h3>
        <ul>
          <li>
            {{ 'help_dialog_expression_types_type1' | i18n }}
          </li>
          <li>
            {{ 'help_dialog_expression_types_type2' | i18n }}
          </li>
          <li>
            {{ 'help_dialog_expression_types_type3' | i18n }}
          </li>
          <li>
            {{ 'help_dialog_expression_types_type4' | i18n }}
          </li>
        </ul>
      </section>
      <footer class="mdc-dialog__footer mdc-theme--primary-bg">
        <mdc-button class="mdc-dialog__footer__button mdc-dialog__footer__button--cancel">
          {{ 'help_dialog_close_btn' | i18n }}
        </mdc-button>
      </footer>
    </div>
    <div class="mdc-dialog__backdrop"></div>
  </aside>
</template>