"use strict";

var {Easing, EasingHelpers} = require("./easing");

// for compatibility
window.requestAnimationFrame = (function(){
  return  window.requestAnimationFrame       ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function( callback ){
        window.setTimeout(callback, 1000 / 60);
      };
})();


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
     */
    setAnimationState(newState, id) {
        var target = animationIds[id + this._rootNodeID] || this;
        for (var p in newState) {
            target.cancelAnimation(p);
            target.animationState[p] = newState[p];
        }
        target.performAnimation();
    },
    cancelAnimation(id) {
        var anim = this.__ongoingAnimations[id];
        if (anim) {
            if (anim.onEnded) {
                anim.onEnded();
            }
            delete this.__ongoingAnimations[id];
            return anim;
        }
        return undefined;
    },
    /*
     * Automatically animate from the current animationState to the new state
     * 
     * @newState: an Object with fallowing properties:
     *  {
     *      prop1: {
     *          endValue: 42, // The end value of the property. REQUIRED
     *          duration: 1500, // the duration of the animation in milliseconds.
     *                          // DEFAULT: 1000
     *          // An easing function f with type: Num [0-1] -> Num
     *          //      where f(0) = 0 and f(1) = 1. f(0 < t < 1) is allowed to be out of the [0-1] range!
     *          // There are many useful functions available in Easing.* to pick from.
     *          // DEFAULT: Easing.cubicInOut
     *          easing(t) {
     *              return Math.pow(t, 3);
     *          },
     *          onEnded: callback, // a callback that gets called when the animation finished or when interrupted.
     *          // Fade to this new animation. Use when interrupting another animation or
     *          // when transitioning from a user controlled motion to a new animation.
     *          // OMIT to immediately start the new animation.
     *          // use fade: {} to use the default configuration.
     *          fade: {
     *              easing: Easing.quadOut, // How to fade from the previous animation to the new one.
     *                                      // For best results, use an easeOut animation.
     *                                      // default: Easing.quadOut
     *              duration: 0.3,          // How long to fade from the old animation the the new one,
     *                                      // as a percentage of the new animations duration.
     *                                      // default: 0.5
     *              startingVelocity: 42    // You ONLY need to provide this if you're transitioning
     *                                      // from a user controlled motion to an animation.
     *                                      // Calculate with: (previousValue - currentValue)/deltaTimeInMS
     *                                      // OMIT when transitioning from an animation to an animation,
     *                                      // as this will be calculated automatically
     *          
     *          },
     *          startValue: 3 // Optionally overwrite the start value. OMIT to use the current animationState value.
     *                        // If you provide this value, it will jump to this value,
     *                        // so only provide it if this jump wouldn't be visible.
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
     */
    animateToState(newState, id) {
        var target = animationIds[id + this._rootNodeID] || this;
        target.__ongoingAnimations = target.__ongoingAnimations || {};
        for (var p in newState) {
            var newS = newState[p];
            var startValue = newS.startValue || target.animationState[p];
            var newAnimDuration = newS.duration || 1000;

            var canceledAnim = target.cancelAnimation(p);

            var tempEasing = newS.easing || Easing.cubicInOut;
            if (tempEasing.length === 1) { // Meaning we've got a function of type Number [0-1] -> Number
                tempEasing = EasingHelpers.ease(tempEasing, startValue, newS.endValue);
            } else { // Meaning we've got a function of type (a, a, Number [0-1]) -> a
                tempEasing = (t) => tempEasing(startValue, newS.endValue, t);
            }

            var fade = newS.fade;
            var velocity = fade && fade.startingVelocity;
            velocity = velocity || (canceledAnim && canceledAnim.velocity) || 0;

            var newEasingFn = tempEasing;
            if (fade) {
                var duration = fade.duration || 0.5;
                var easing = fade.easing || Easing.quadOut;
                newEasingFn = (t) => {
                    if (t < duration) {
                        var eased = easing(t/duration);
                        return (1-eased) * (velocity * t * newAnimDuration + startValue) + eased * tempEasing(t);
                    } else {
                        return tempEasing(t);
                    }
                };
            }

            var now = window.performance.now();
            target.__ongoingAnimations[p] = {
                duration: newAnimDuration,
                easing: newEasingFn,
                startTime: now,
                onEnded: newS.onEnded,
                velocity: velocity,
                lastTime: now
            };
        }
        if (!target.__animation) {
            target.__animation = window.requestAnimationFrame(target.doAnimations);
        }
    },
    doAnimations() {
        var finished = false;
        var now = window.performance.now();
        for (var p in this.__ongoingAnimations) {
            var anim = this.__ongoingAnimations[p];
            var percentage = (now - anim.startTime) / anim.duration;
            if (percentage >= 1) {
                percentage = 1;
            }
            var newValue = anim.easing(percentage);

            anim.velocity = (newValue - this.animationState[p]) / (now - anim.lastTime);
            anim.lastTime = now;
            this.animationState[p] = newValue;
            if (percentage === 1) {
                this.cancelAnimation(p);
                if (Object.keys(this.__ongoingAnimations).length === 0) {
                    finished = true;
                }
            }
        }
        this.performAnimation();
        if (!finished) {
            this.__animation = window.requestAnimationFrame(this.doAnimations);
        } else {
            this.__animation = undefined;
        }
    }
};

module.exports = animationMixin;