"use strict";

var {Easing, EasingHelpers} = require("./easing");

// here we store all references to objects containing animations
var animationIds = {};

var animationMixin = {
    componentDidMount() {
        // set the initial state
        this.animationState = this.getInitialAnimationState();
        // If this component has an ID, store a reference to it
        if (this.props.animationId) {
            animationIds[this.props.animationId + this._owner._rootNodeID] = this;
        }
        // perform first animation
        this.performAnimation();
    },

    /*
     * Set the state of the animation directly.
     * Calling this will call performAnimation()
     * Useful when doing animations based on mouseMove or similar.
     * 
     * This will cancel all ongoing animations. (set trough animateToState(..))
     * 
     * @id: the animationId to animate. Omit to animate itself (e.g. this)
     */
    setAnimationState(newState, id) {
        var target = animationIds[id + this._rootNodeID] || this;
        this.stopAnimation();
        for (var p in newState) {
            target.animationState[p] = newState[p];
        }
        target.performAnimation();
    },

    /*
     * Automatically animate from the current animationState to the new state
     *
     * Calls onAnimationEnded when finished or interrupted by setAnimationState.
     * 
     * @newState: an Object with fallowing properties:
     *  {
     *      prop1: {
     *          endValue: 42, // The end value of the property. Required
     *          duration: 1500, // the duration of the animation in milliseconds. Defaults to 1000
     *          // An easing function f with type: Num [0-1] -> Num
     *          //      where f(0) = 0 and f(1) = 1. f(0 < t < 1) is allowed to be out of the [0-1] range!
     *          // There are many useful functions available in Easing.* to pick from.
     *          // Defaults to: Easing.cubicInOut
     *          easing(t) {
     *              return Math.pow(t,3);
     *          }
     *      },
     *      prop2: {
     *          // You can also use a complex object,
     *          // but then you have to specify a custom easing function.
     *          // This means you could even animate a string or whatever else you desire!
     *          endValue: { x: 2, y: 5},
     *          easing(start, end, t) {
     *              return {
     *                  x: EasingHelpers.ease(Easing.easeInCubic, start.x, end.x)(t),
     *                  y: start.y * (1-t) + end.y * t
     *              };
     *          }
     *      }
     *  }
     *  
     * @id: the animationId to animate. Omit to animate itself (e.g. this)
     */
    animateToState(newState, id) {
        var target = animationIds[id + this._rootNodeID] || this;
        target.__ongoingAnimations = target.__ongoingAnimations || {};
        target.stopAnimation();

        for (var p in newState) {
            target.__ongoingAnimations[p] = {
                startValue: target.animationState[p],
                duration: newState[p].duration || 1000,
                easing: newState[p].easing || Easing.cubicInOut,
                endValue: newState[p].endValue,
                startTime: window.performance.now(),
            };
        }
        if (!target.__animation) {
            target.__animation = window.requestAnimationFrame(target.doAnimations);
        }
    },
    doAnimations() {
        for (var p in this.__ongoingAnimations) {
            var anim = this.__ongoingAnimations[p];
            var percentage = (window.performance.now() - anim.startTime) / anim.duration;
            if (percentage >= 1) {
                percentage = 1;
            }
            var newValue;
            if (anim.easing.length === 1) {
                newValue = EasingHelpers.ease(anim.easing, anim.startValue, anim.endValue)(percentage);
            } else {
                newValue = anim.easing(anim.startValue, anim.endValue, percentage);
            }

            this.animationState[p] = newValue;
            this.performAnimation();
            if (percentage === 1) {
                this.stopAnimation();
            } else {
                this.__animation = window.requestAnimationFrame(this.doAnimations);
            }
        }
    },
    stopAnimation() {
        if (this.__animation) {
            window.cancelAnimationFrame(this.__animation);
            this.__animation = undefined;
            if (this.onAnimationEnded) {
                this.onAnimationEnded();
            }
        }
    }
};

module.exports = animationMixin;