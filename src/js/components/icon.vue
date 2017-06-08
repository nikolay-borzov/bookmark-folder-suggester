<template>
  <svg class="icon" :class="sizeClass">
    <use xmlns:xlink="http://www.w3.org/1999/xlink"
         :xlink:href="'icons.svg#' + type"></use>
  </svg>
</template>

<script src="./icon.js"></script>