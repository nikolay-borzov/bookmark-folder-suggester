<template>
  <div id="_rules-container" class="rules-container">
    <button id="add-rule-button"
            class="add-rule-button mdc-fab"
            :title="'rules_list_add_btn_title' | i18n"
            :aria-label="'rules_list_add_btn_title' | i18n">
      <icon type="add"/>
    </button>

    <div v-for="rule in rules" class="rule-row mdc-card">
      <div class="mdc-card__horizontal-block">
        <section class="mdc-card__primary">
          <!-- Bookmark folder -->
          <div>
            <div class="folder-link-wrapper">
              <mdc-button :title="rule.folder.title"
                          icon-type="folder" :icon-size="1"
                          :compact="true" :dense="true" :raised="true"
                          :primary="!rule.folder.id">
                <span class="folder-name">
                  {{ rule.folder.title || ('rules_list_select_folder_btn' | i18n) }}
                </span>
              </mdc-button>
              <div class="folder-path" :title="rule.folder.path">
                {{ rule.folder.path }}
              </div>
            </div>
          </div>
          <!-- Expressions -->
          <div class="rule-field-expressions mdc-card">
            <section class="mdc-card__primary">
              <!-- TODO: Expression Rows -->
              <div v-for="expression in rule.expressions" class="expression-row">
                <div class="expression-field">
                  <div class="mdc-select" role="listbox" tabindex="0"
                       data-mdc-auto-init="MDCSelect"
                       :aria-label="'rules_list_expression_type_label' | i18n">
                    <span class="mdc-select__selected-text">
                      {{ `expression_type_${expression.typeId}` | i18n }}
                    </span>
                    <div class="mdc-simple-menu mdc-select__menu">
                      <ul class="mdc-list mdc-simple-menu__items">
                        <li v-for="expressionType in expressionTypes"
                            class="mdc-list-item" role="option" tabindex="0"
                            :id="expressionType.id"
                            :aria-selected="expression.typeId === expressionType.id">
                          {{ expressionType.name }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="expression-field expression-field-value">
                  <div class="mdc-textfield">
                    <input type="text" class="mdc-textfield__input" v-model="expression.value"
                           :aria-label="'rules_list_expression_value_label' | i18n"/>
                  </div>
                </div>
                <div class="expression-field">
                  <mdc-button class="mdc-card__action"
                              :icon-only="true" icon-type="delete" :icon-size="1"
                              :title="'rules_list_delete_expression_btn_title' | i18n"
                              :aria-label="'rules_list_delete_expression_btn_title' | i18n"/>
                </div>
              </div>
            </section>
            <section class="mdc-card__actions mdc-card__actions--vertical">
              <mdc-button class="mdc-card__action" :compact="true" :dense="true"
                          icon-type="add" :icon-size="1">
                {{ 'rules_list_add_expression_btn' | i18n }}
              </mdc-button>
            </section>
          </div>
        </section>
        <section class="mdc-card__actions mdc-card__actions--vertical">
          <mdc-button class="mdc-card__action" :compact="true"
                      :icon-only="true" icon-type="delete"
                      :title="'rules_list_delete_rule_btn_title' | i18n"
                      :aria-label="'rules_list_delete_rule_btn_title' | i18n"/>
        </section>
      </div>
    </div>

  </div>
</template>

<script src="./rules-list.js"></script>