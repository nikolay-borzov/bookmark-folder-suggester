<template>
  <button type="button" class="mdc-button" v-bind:class="classObject">
    <icon v-if="iconType" v-bind:type="iconType"></icon>
    <slot><!--Button Text--></slot>
  </button>
</template>

<script src="./mdc-button.js"></script>