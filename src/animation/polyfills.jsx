"use strict";


window.requestAnimationFrame = (function(){
  return  window.requestAnimationFrame       ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function( callback ){
        window.setTimeout(callback, 1000 / 60);
      };
})();


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