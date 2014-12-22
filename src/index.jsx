'use strict';

var {Easing, EasingHelpers} = require("./animation/easing");

module.exports = {
    Easing: Easing,
    EasingHelpers: EasingHelpers,
    animationMixin: require("./animation/animationMixin")
};