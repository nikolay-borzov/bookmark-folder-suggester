<template>
  <button type="button" class="mdc-button" :class="classObject">
    <icon v-if="iconType" :type="iconType" :size="iconSize"/>
    <slot><!--Button Text--></slot>
  </button>
</template>

<script src="./mdc-button.js"></script>