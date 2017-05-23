# Bookmark Folder Suggester
Chrome extension that suggests folder for a bookmark using predefined rules.

Suggestion may be based on:
* Current tab's URL
* Current tab's title

## How to

1. Open extensions options

2. There is an empty rule - Select bookmark folder

3. Specify on or more expressions:
    * URL starts with
    * URL is on domain
    * URL contains
    * Title contains

4. Click on the app icon on the toolbar to get suggestions

## Features

* Suggest bookmark folder depending on a page's URL or Title
* Create rule for current tab
* Export/Import setting to file

## Built with

* [Node.js](https://nodejs.org/en/)
* [Browserify](http://browserify.org/) with [factor-bundle](https://github.com/substack/factor-bundle)
* [Bliss](http://blissfuljs.com/)
* [Material Components for the web](https://github.com/material-components/material-components-web)
* [ESLint](http://eslint.org/)
* [SASS](http://sass-lang.com/) with [Node-sass](https://github.com/sass/node-sass)
* [stylelint](https://stylelint.io/) with [stylelint-config-standard](https://github.com/stylelint/stylelint-config-standard), [stylelint-order](https://github.com/hudochenkov/stylelint-order), [stylelint-scss](https://github.com/kristerkari/stylelint-scss) and [stylelint-config-sass-guidelines](https://github.com/bjankord/stylelint-config-sass-guidelines)
* [purifycss](https://github.com/purifycss/purifycss)
* [gulp](http://gulpjs.com/) with [gulp-svgmin](https://github.com/ben-eb/gulp-svgmin) and [gulp-svgstore](https://github.com/w0rm/gulp-svgstore)
* [concurrently](https://github.com/kimmobrunfeldt/concurrently)
* [watch](https://github.com/mikeal/watch)
* [svg2png](https://github.com/domenic/svg2png)
* [npm-check-updates](https://github.com/tjunnone/npm-check-updates)
* [SVG-edit](https://github.com/SVG-Edit/svgedit)
