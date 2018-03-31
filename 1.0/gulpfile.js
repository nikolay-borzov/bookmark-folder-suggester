'use strict';

let gulp = require('gulp');
let svgstore = require('gulp-svgstore');
let svgmin = require('gulp-svgmin');
let path = require('path');

gulp.task('svgstore', function() {
  return gulp
    .src('src/icons/*.svg')
    .pipe(svgmin(function(file) {
      var prefix = path.basename(file.relative, path.extname(file.relative));

      return { plugins: [{ nupIDs: { prefix: prefix + '-', minify: true } }] };
    }))
    .pipe(svgstore({ inlineSvg: false }))
    .pipe(gulp.dest('dist'));
});
