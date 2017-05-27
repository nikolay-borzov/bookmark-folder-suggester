<template>
  <svg class="icon" v-bind:class="sizeClass">
    <use xmlns:xlink="http://www.w3.org/1999/xlink"
         v-bind:xlink:href="'icons.svg#' + type"></use>
  </svg>
</template>

<script src="./icon.js"></script>