"use strict";

// http://stackoverflow.com/questions/19519535/detect-if-browser-tab-is-active-or-user-has-switched-away/19519701#19519701
var isVisible = (function(){
    var stateKey, eventKey, keys = {
        hidden: "visibilitychange",
        webkitHidden: "webkitvisibilitychange",
        mozHidden: "mozvisibilitychange",
        msHidden: "msvisibilitychange"
    };
    for (stateKey in keys) {
        if (stateKey in document) {
            eventKey = keys[stateKey];
            break;
        }
    }
    return function(c) {
        if (c) { document.addEventListener(eventKey, c); }
        return !document[stateKey];
    };
})();

// http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimationFrame = (function(){
  return  window.requestAnimationFrame       ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function( callback ){
        window.setTimeout(callback, 1000 / 60);
      };
})();

// https://gist.github.com/paulirish/5438650
(function(){
	// prepare base perf object
	if (typeof window.performance === 'undefined') {
		window.performance = {};
	}
	if (!window.performance.now){
		var nowOffset = Date.now();
		if (performance.timing && performance.timing.navigationStart){
			nowOffset = performance.timing.navigationStart;
		}
		window.performance.now = function now(){
			return Date.now() - nowOffset;
		};
	}
})();

module.exports = isVisible;