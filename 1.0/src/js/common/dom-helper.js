'use strict';

// TODO: DEPRECATED

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const ICON_SIZE_CLASS_MAP = {
  1: 'icon-size-18',
  2: 'icon-size-24',
  3: 'icon-size-36',
  4: 'icon-size-48'
};

let create = {
  /**
   * @param {Object|string} params - icon parameters. If string specified - Icon ID
   * @param {string} params.id - Icon ID
   * @param {string} [params.className='']
   * @param {number} [params.size=2] - Icon size 1-4
   */
  icon(params) {
    const iconId = typeof params === 'string' ? params : params.id;
    const iconSize = params.size !== 2 && params.size;
    const iconSizeClass = iconSize && ICON_SIZE_CLASS_MAP[iconSize];

    let svgElem = document.createElementNS(SVG_NS, 'svg');
    svgElem.classList.add('icon');

    if (params.className) {
      params.className.split(' ')
        .forEach(className => svgElem.classList.add(className));
    }

    if (iconSizeClass) {
      svgElem.classList.add(iconSizeClass);
    }

    let useElem = document.createElementNS(svgElem.namespaceURI, 'use');
    useElem.setAttributeNS(XLINK_NS, 'href', `icons.svg#${iconId}`);

    svgElem.appendChild(useElem);

    return svgElem;
  }
};


module.exports = {
  create
};
