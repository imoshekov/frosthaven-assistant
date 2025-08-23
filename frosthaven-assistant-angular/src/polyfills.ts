import 'core-js/es/object';
import 'core-js/es/array';
import 'core-js/es/promise';
import 'core-js/es/string';
import 'zone.js'; // Required by Angular

// Add missing flatMap for environments like Chromium 68
if (!Array.prototype.flatMap) {
  (Array.prototype as any).flatMap = function(callback: any, thisArg?: any) {
    return this.map(callback, thisArg).reduce((a: any[], b: any) => a.concat(b), []);
  };
}

