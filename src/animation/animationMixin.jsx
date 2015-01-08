"use strict";


require('./polyfills');
var {Easing, EasingHelpers} = require("./easing");
// var Physical = require("./physical");


// Here we store all animationIds to keep a references to objects containing animations.
var animationIds = {};

var animationMixin = {
    componentDidMount() {
        // TODO: configure the state model
        // 
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
     * TODO: 
     *     Replace with directUserInput
     * 
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
        var anim = this.__ongoingAnimations && this.__ongoingAnimations[id];
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
     *          // The end value of the property. REQUIRED
     *          endValue: 42,
     *          // the duration of the animation in milliseconds.
     *          // DEFAULT: 1000
     *          duration: 1500,
     *          // An easing function f with type: f(t: Num [0-1]) -> Num
     *          //      where f(0) = 0 and f(1) = 1. f(0 < t < 1) is allowed to be out of the [0-1] range!
     *          // There are many useful functions available in Easing.* to pick from.
     *          //
     *          // -OR-
     *          //
     *          // A physical based function f of type: f(startPosition: Num, startVelocity: Num) -> (t: Num -> Num)
     *          //      where f(x0, v0)(0) = startPosition, f(x0, v0)(infinity) = 0, df(x0, v0)/dt(0) = startVelocity
     *          // If you choose a physical based function, the duration property will be ignored.
     *          // The animation stops when t: |f(x0, v0)(t)| < epsilon and |df(x0, v0)/dt(t)| < epsilon,
     *          //      for a very small epsilon.
     *          // Useful functions can be found in Physical.*
     *          //
     *          // -OR-
     *          //
     *          // A custom function f of type: f(startValue: a, endValue: a, t: Num [0-1]) -> a
     *          //      where f(x0, x1, 0) = x0, f(x0, x1, 1) = x1
     *          // This allows you to interpolate whatever property you want,
     *          // as long as you can provide an appropriate function.
     *          // Colors, strings, potatoes, you name it!
     *          //
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
            var endValue = newS.endValue;
            var newAnimDuration = newS.duration || 1000;

            var canceledAnim = target.cancelAnimation(p);

            var fade = newS.fade;
            var velocity = fade && fade.startingVelocity;
            velocity = velocity || (canceledAnim && canceledAnim.velocity) || 0;

            var easingInput = newS.easing || Easing.cubicInOut;
            var tempEasing;
            if (easingInput.length === 1) { // Meaning we've got a function of type Num [0-1] -> Num
                tempEasing = EasingHelpers.ease(easingInput, startValue, endValue);
            } else if (easingInput.length === 2) { // Meaning we've got a physical function.
                var physicalFn = easingInput(startValue - endValue, velocity * 1000);
                tempEasing = (t) => physicalFn(t) + endValue;
            } else { // Meaning we've got a function of type (a, a, Number [0-1]) -> a
                tempEasing = easingInput;
            }

            var newEasingFn = tempEasing;
            if (easingInput.length === 1 && fade) {
                var duration = fade.duration || 0.5;
                var easing = fade.easing || Easing.quadOut;
                newEasingFn = (t) => {
                    if (t < duration) {
                        var eased = easing(t/duration);
                        return (1 - eased) * (velocity * t * newAnimDuration + startValue) + eased * tempEasing(t);
                    } else {
                        return tempEasing(t);
                    }
                };
            }

            var startTime = window.performance.now();

            var anim = {
                value: startValue,
                finished: false,
                onEnded: newS.onEnded
            };
            if (easingInput.length !== 2) {
                anim.velocity = velocity;
                anim.lastTime = startTime;
                anim.advance = (oldAnim, now) => {
                    var percentage = (now - startTime) / newAnimDuration;
                    if (percentage >= 1) {
                        percentage = 1;
                    }
                    var newValue = newEasingFn(percentage);
                    oldAnim.velocity = (newValue - oldAnim.value) / (now - oldAnim.lastTime);
                    oldAnim.lastTime = now;
                    oldAnim.value = newValue;
                    if (percentage === 1) {
                        oldAnim.finished = true;
                    }
                    return oldAnim;
                };
            } else {
                anim.velocity = velocity;
                anim.lastTime = startTime;
                anim.advance = (oldAnim, now) => {
                    var dt = now - startTime;
                    var newValue = newEasingFn(dt/1000);
                    oldAnim.velocity = (newValue - oldAnim.value) / (now - oldAnim.lastTime);
                    oldAnim.lastTime = now;
                    oldAnim.value = newValue;
                    if (Math.abs(oldAnim.velocity) <= 0.0001 && Math.abs(oldAnim.value - endValue) <= 0.0001) {
                        oldAnim.value = endValue;
                        oldAnim.finished = true;
                    }
                    return oldAnim;
                };
            }
            target.__ongoingAnimations[p] = anim;
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
            var newAnim = anim.advance(anim, now);
            this.__ongoingAnimations[p] = newAnim;
            this.animationState[p] = newAnim.value;
            if (newAnim.finished) {
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