import 'core-js/es/object';
import 'core-js/es/array';
import 'core-js/es/promise';
import 'core-js/es/string';
import 'zone.js'; // Required by Angular

import 'core-js/actual/promise';
import 'core-js/actual/array/from';
import 'core-js/actual/array/includes';
import 'core-js/actual/object/assign';
import 'core-js/actual/object/entries';
import 'core-js/actual/object/values';
import 'core-js/actual/url-search-params';
import 'core-js/actual/string/starts-with';
import 'core-js/actual/string/ends-with';
// If you use animations:
import 'web-animations-js';


// Add missing flatMap for environments like Chromium 68
if (!Array.prototype.flatMap) {
  (Array.prototype as any).flatMap = function(callback: any, thisArg?: any) {
    return this.map(callback, thisArg).reduce((a: any[], b: any) => a.concat(b), []);
  };
}

