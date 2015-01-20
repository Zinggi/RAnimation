"use strict";

var helpers = {
    /*
     * Use this to create a new easing function from 'start' to 'end'
     * based on an existing one
     * 
     * @f: the easing function to use
     * @start: the start value
     * @end: the end value
     */
    ease(f, start, end) {
        return t => start + f(t) * (end - start);   
    },
    /* Takes an easing function and reverses it, effectively creating an ease-out animation */
    toEaseOut(f) {
      return t => 1 - f(1 - t);
    },
    /* Takes an easing function and transforms it, creating an ease-in-out animation */
    toEaseInOut(f) {
      return t => 0.5 * (t < 0.5 ? f(2 * t) : (2 - f(2 - 2 * t)));
    },
    /*
     * Squeezes a function f to a new function f' that satisfies the easing function properties.
     *
     * @f: a function from Num -> Num
     * @x1: the left x coordinate that should become the new (0, 0), e.g. (x1, f(x1)) -> (0, 0)
     * @x2: the right x coordinate that should become the new (1, 1), e.g. (x2, f(x2)) -> (1, 1)
     * @return: a function f' that satisfies f'(0) = 0 and f'(1) = 1
     */
    squeeze(f, x1, x2) {
        var y1 = f(x1);
        return t => (f(x1 + t*(x2-x1)) - y1) / (f(x2) - y1);
    },
    /*
     * Used for implementing easing animations
     */
    advance(startTime, animDuration, easing) {
        return (oldAnim, dt, now) => {
            var percentage = (now - startTime) / animDuration;
            if (percentage >= 1) {
                percentage = 1;
            }
            var newValue = easing(percentage);
            oldAnim.velocity = (newValue - oldAnim.value) / dt;
            oldAnim.value = newValue;
            if (percentage === 1) {
                oldAnim.finished = true;
            }
            return oldAnim;
        };
    }
};


/*
 * This is a collection of nice easing functions
 *
 * The functions inside the 'make' object are functions that
 * take configuration parameters and return a new easing function.
 */
var Easing = {
    /* Linear interpolation. Mostly ugly. */
    linear(t) {
        return t;
    },
    /* t^2 */
    quadIn(t) {
        return t * t;
    },
    quadOut(t) { return helpers.toEaseOut(Easing.quadIn)(t); },
    quadInOut(t) { return helpers.toEaseInOut(Easing.quadIn)(t); },

    /* t^3 */
    cubicIn(t) {
        return Math.pow(t, 3);
    },
    cubicOut(t) { return helpers.toEaseOut(Easing.cubicIn)(t); },
    cubicInOut(t) { return helpers.toEaseInOut(Easing.cubicIn)(t); },

    /* 1 - cos(t * Pi/2) */
    sinIn(t) {
        return 1 - Math.cos(t * Math.PI/2);
    },
    sinOut(t) { return helpers.toEaseOut(Easing.sinIn)(t); },
    sinInOut(t) { return helpers.toEaseInOut(Easing.sinIn)(t); },

    /* 2^(10(t-1)). Note that expIn(0)!=0, but it's close enough */
    expIn(t) {
        return Math.pow(2, 10 * (t - 1));
    },
    expOut(t) { return helpers.toEaseOut(Easing.expIn)(t); },
    expInOut(t) { return helpers.toEaseInOut(Easing.expIn)(t); },

    /* 1 - sqrt(1-t^2) */
    circleIn(t) {
        return 1 - Math.sqrt(1 - t * t);
    },
    circleOut(t) { return helpers.toEaseOut(Easing.circleIn)(t); },
    circleInOut(t) { return helpers.toEaseInOut(Easing.circleIn)(t); },

    /* A comic style function, going back first */
    backIn(t) {
        return Easing.makeBackIn(1.70158)(t);
    },
    backOut(t) { return helpers.toEaseOut(Easing.backIn)(t); },
    backInOut(t) { return helpers.toEaseInOut(Easing.backIn)(t); },


    /* A spring like function */
    elasticIn(t) {
        // return Easing.makeElasticIn(7, 3)(t);
        return Math.sin(13.0 * t * Math.PI/2) * Math.pow(2.0, 10.0 * (t - 1.0));
    },
    elasticOut(t) { return helpers.toEaseOut(Easing.elasticIn)(t); },
    elasticInOut(t) { return helpers.toEaseInOut(Easing.elasticIn)(t); },


    /* a bouncy function */
    bounceIn(t) {
        // return Easing.makeBounceIn(2, 3)(t);
        return helpers.toEaseOut(Easing.bounceOut)(t);
    },
    bounceOut(t) { 
        return t < 1 / 2.75 ? 7.5625 * t * t
            : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
            : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
            : 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    bounceInOut(t) { return helpers.toEaseInOut(Easing.bounceIn)(t); },
};

var make = {
    /* returns f(t) = t^e */
    polyIn(exponent) {
        return t => Math.pow(t, exponent);
    },
    /* a comic style function, going backwards first */
    backIn(amplitude) {
        return x => x*x*((1+amplitude)*x-amplitude);
    },
    /* 
     * returns a spring like function
     * 
     * @springiness: how much it swings, 7 seems to be a nice value.
     * @numberOfSwings: how many swings, Integer.
     */
    elasticIn(springiness, numberOfSwings) {
        var s = springiness;
        var n = Math.round(numberOfSwings);
        return x => (Math.exp(s*x)-1.0)/(Math.exp(s)-1.0)*(Math.sin((Math.PI * 2.0 * n + Math.PI * 0.5) * x));
    }
};

Easing.make = make;
Easing.helpers = helpers;

module.exports = Easing;