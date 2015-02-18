"use strict";

var isVisible = require('./polyfills');

var Easing = require("./easing");
var EasingHelpers = Easing.helpers;
var Model = require("./model");
var ModelHelpers = Model.helpers;

// A little helper function, as we do all calculations in seconds
var nowInSeconds = () => window.performance.now() / 1000;

// Here we keep track of all ongoing animations
var ongoingAnimations = {};
// This is the current id returned by requestAnimationFrame
var animationFrame;
// For performance reasons, we keep track of the # of animations here.
var numAnimations = 0;
// The last time we rendered a frame
var lastFrame = nowInSeconds();

isVisible(() => {
    if (isVisible()) {
        // we reset this, as a lot of time passed since being hidden,
        // so dt would be ridiculously high!
        lastFrame = nowInSeconds();
    }
});

var uniqueIDCounter = 0;

// the animation loop
var doAnimations = () => {
    var now = nowInSeconds();
    var dt = now - lastFrame;
    for (var p in ongoingAnimations) {
        var animContainer = ongoingAnimations[p];
        var ref = animContainer.ref;
        var anims = animContainer.anims;
        for (var prop in anims) {
            var anim = anims[prop];
            var newAnim = anim.advance(anim, dt, now);
            anims[prop] = newAnim;
            ref.animationState[prop] = newAnim.value;
            if (newAnim.finished) {
                ref.cancelAnimation(prop, true);
            }
        }
        ref.performAnimation();
    }
    if (numAnimations !== 0) {
        animationFrame = window.requestAnimationFrame(doAnimations);
    } else {
        animationFrame = undefined;
    }
    lastFrame = now;
};

var startAnimation = (anim, prop, ref) => {
    numAnimations++;
    var UID = ref._UID_animation;
    var animCont = ongoingAnimations[UID] = ongoingAnimations[UID] || {
        ref: ref,
        anims: {},
    };
    animCont.anims[prop] = anim;

    if (!animationFrame) {
        lastFrame = nowInSeconds();
        animationFrame = window.requestAnimationFrame(doAnimations);
    }
};

var getAnimation = (ref, prop) => {
    var UID = ref._UID_animation;
    var animCont = ongoingAnimations[UID];
    if (animCont) {
        return animCont.anims[prop];
    }
    return undefined;
};

// This is used for direct user input.
// A dummy animation makes sure to track the current velocity
var startDirectInputAnimation = (ref, prop, startValue) => {
    startAnimation({
        advance(oldAnim, dt, now) {
            var v = (oldAnim.endValue - oldAnim.value) / dt;
            // Smooth the velocity, to get rid of too crazy movements...
            oldAnim.velocity = 0.8 * v + 0.2 * oldAnim.velocity;
            oldAnim.value = oldAnim.endValue;
            return oldAnim;
        },
        endValue: startValue,
        value: startValue,
        velocity: 0,
        finished: false
    }, prop, ref);
};

// This is used to start a simulation based on a model.
var startModelSimulation = (ref, prop, startValue, endValue, velocity, acceleration, modelFn, endCondition, onEnd) => {
    startAnimation({
        advance: modelFn,
        endValue: endValue,
        value: startValue,
        velocity: velocity,
        acceleration: acceleration,
        finished: false,
        endCondition: endCondition,
        onEnd: onEnd
    }, prop, ref);
};

// For user input, we need to be able to modify an ongoing animations endValue.
var modifyAnimationEndValue = (ref, prop, newValue) => {
    var anim = getAnimation(ref, prop);
    if (anim) {
        anim.endValue = newValue;
    }
};

// Cancels an animation, calls onEnd and returns the canceled animation.
var cancelAnimation = (prop, UID, couldFinish, dontFireOnEnd) => {
    var animCont = ongoingAnimations[UID];
    if (animCont) {
        var anim = animCont.anims[prop];
        if (anim) {
            if (!dontFireOnEnd && anim.onEnd) {
                anim.onEnd(couldFinish);
            }
            numAnimations--;
            delete animCont.anims[prop];
            if (Object.keys(animCont.anims).length === 0) {
                delete ongoingAnimations[UID];
            }
            return anim;
        }
    }
    return undefined;
};

// Cancel all animations for the given ref.
var cancelAnimations = (ref, dontFireOnEnd) => {
    var UID = ref._UID_animation;
    var animCont = ongoingAnimations[UID];
    if (animCont) {
        for (var prop in animCont.anims) {
            cancelAnimation(prop, UID, false, dontFireOnEnd);
        }
    }
};


var animationMixin = {
    componentWillMount() {
        // Make sure to give each component a unique ID
        this._UID_animation = uniqueIDCounter;
        uniqueIDCounter++;

        // set the initial state
        this.animationState = this.getInitialAnimationState();
    },
    componentDidMount() {
        // perform first animation
        this.performAnimation();
    },

    /*
     * A low level API if, for any reason, you need full control over the animation.
     * 
     * You could also modify an ongoing animation by
     * calling getAnimation and then modifying the returned animation.
     *
     * @anim: an object with at least the fallowing properties:
     * {
     *     // -- Required --
     *     value: startValue,
     *         // The current value of your animation
     *     advance(oldAnim, dt, now) { ... }
     *         // A function that should return a new animation object,
     *         // containing your new value among other things
     *         // you want to keep track of. It's OK (and better for performance)
     *         // to directly modify oldAnim, as its not used after this call.
     *         // dt is the time that passed since the last frame. (in s)
     *         // now is the current time the frame was rendered. (in s)
     *     // -- Optional, but highly recommended --
     *     finished: false,
     *         // finished is used to indicate if the animation is over.
     *         // If advance(...) sets this to true, cancelAnimation will
     *         // be called.
     *     onEnd: newS.onEnd,
     *         // When cancelAnimation is called, it will call onEnd if its given
     *     velocity: velocity,
     *         // It's a good idea to keep track of the velocity, as this is valuable
     *         // information for a new animation, interrupting the current one. (in value/s)
     *     // -- You can have as many more properties you like --
     *     acceleration: acceleration,
     *         // For some integration techniques,
     *         // it might be needed to keep track of the acceleration.
     *     ...
     * }
     */
    startAnimation(anim, p) {
        startAnimation(anim, p, this);
    },

    /*
     * Cancels an ongoing animation for the animationState property p.
     * Returns the canceled animation object.
     * 
     * This contains a velocity property, among some other implementation details
     */
    cancelAnimation(p, couldFinish) {
        couldFinish = !!couldFinish;
        return cancelAnimation(p, this._UID_animation, couldFinish);
    },

    /*
     * Returns the current animation for prop or
     * undefined if there is no animation for this property.
     *
     * The returned object contains the velocity
     * plus some implementation details.
     *
     * Note that you could modify the ongoing animation here,
     * but that should never be necessary.
     */
    getAnimation(prop) {
        return getAnimation(this, prop);
    },

    /*
     * Use to simulate a value to a halt. This can be used for example after some userInput,
     * for instance in a scrolling list.
     * 
     * There are controlled and uncontrolled model functions.
     *     Controlled: You will know where it will end.
     *         examples: spring-damper model.
     *     Uncontrolled: It will just follow the modeled behavior until it comes to a halt.
     *                   Note that you might still know where it ends,
     *                   e.g. with gravity it will eventually stop at the ground.
     *         examples: damper, gravity
     * 
     *  + Physically accurate, natural movement
     *  - You don't know when it stops exactly, less control.
     *  - If you choose an uncontrolled model, you might not even know where it stops.
     *
     * @newState: an object like:
     * {
     *     x: {
     *         modelFn: Model.controlled.underDamped,
     *             // A function that models the desired behavior.
     *             // You can find useful functions inside
     *             // Model.controlled.* -OR- Model.uncontrolled.*
     *             // the function f should be of type: f(obj : o, dt: Num, t: Num) -> o,
     *             //   where o : { value: Num, velocity: Num, acceleration: Num, (Optional)endValue: Num }
     *             //     NOTE: f can modify obj in place and then return the modified version!
     *             // DEFAULT: Model.controlled.criticallyDamped, if endValue specified
     *             //          Model.uncontrolled.damper, else
     *         endValue: 42,
     *             // If you use a function from Model.controlled.* specify the end value here,
     *             // else omit the property. Its either a number
     *             // -OR-
     *             // a function of type: (velocity: Num) -> Num
     *             //     This is useful if your end value depends on the previous velocity.
     *             // REQUIRED, if using controlled. OMIT, if using uncontrolled.
     *         endCondition(o) { return Math.abs(o.velocity) < 0.5; },
     *             // A function to indicate when to end the simulation.
     *             // This can for instance be useful if you want to go from an uncontrolled to a
     *             // controlled model when a certain condition is reached, for instance
     *             // for a scrolling list that snaps to a grid when below a certain velocity.
     *             // DEFAULT: |o.endValue-o.value| < 0.0001 && |o.velocity| < 0.0001
     *             //               for controlled,
     *             //          |o.velocity| < 0.0001 && |o.acceleration| < 0.0001
     *             //               for uncontrolled.
     *         onEnd(couldFinish) { console.log(couldFinish);},
     *             // A callback that gets called with true, when the simulation finished
     *             // or with false, when interrupted.
     *             // OPTIONAL
     *     }
     * }
     */
    simulateToHalt(newState, dontStop) {
        for (var p in newState) {
            var config = newState[p];
            var anim = this.cancelAnimation(p);
            var velocity = (anim && anim.velocity) || 0;
            var acceleration = (anim && anim.acceleration) || 0;
            var endValue = config.endValue;
            var isControlled = typeof endValue !== 'undefined';

            if (typeof config.endValue === "function") {
                endValue = config.endValue(velocity);
            } else {
                endValue = config.endValue || 0;
            }

            var modelFn = config.modelFn;
            if (isControlled) {
                modelFn = modelFn || Model.controlled.criticalDamped;
            } else {
                modelFn = modelFn || Model.uncontrolled.damper;
            }
            var endCondition = config.endCondition;
            if (isControlled) {
                if (dontStop) {
                    endCondition = endCondition || Model.helpers.dontStop;    
                } else {
                    endCondition = endCondition || Model.helpers.stopControlled;
                }
            } else {
                endCondition = endCondition || Model.helpers.stopUncontrolled;
            }
            var onEnd = config.onEnd;
            startModelSimulation(this, p, this.animationState[p], endValue, velocity, acceleration, modelFn, endCondition, onEnd);
        }
    },

    /*
     * Use to set the desired animation state directly (or indirectly).
     * 
     * Best used with user input to give them maximum control over an animation.
     * Good candidates for using this are onMouseMove, onTouchMove, onScroll, etc...
     *
     * MAKE SURE YOU'VE USED startDirectUserInput or startIndirectUserInput BEFORE!
     * or
     * you're IN THE MIDDLE of a CONTROLLED simulateToHalt animation!
     *
     * A userInput animation can be stopped by
     * either starting another animation for the same prop or by using cancelAnimation
     *
     * @newState: an object like:
     * {
     *     x: e.clientX // The new value.
     * }
     * 
     */
    userInput(newState) {
        for (var p in newState) {
            modifyAnimationEndValue(this, p, newState[p]);
        }
    },

    /*
     * Call this just before starting a series of userInput(..)s.
     * It prepares everything necessary to offload all fallowing userInput(..)s
     * into the animation frame and to keep track of the velocity.
     *
     * Good candidates for using this are onMouseDown, onTouchDown, onScrollStart, etc...
     *
     *  + Maximum control to the user
     *  - Unphysical movements
     * 
     * @startState: an object containing the starting state., e.g.
     * {
     *     x: 42
     * }
     */
    startDirectUserInput(startState) {
        for (var p in startState) {
            this.cancelAnimation(p);
            startDirectInputAnimation(this, p, startState[p]); 
        }
    },

    /*
     * Call this just before starting a series of userInput(..)s.
     *
     * Good candidates for using this are onMouseDown, onTouchDown, onScrollStart, etc...
     *
     * This is equivalent to starting a controlled simulateToHalt animation,
     * so if there is already one going on, you don't need to call this.
     *
     *  + Control to the user...
     *  - ... but not very accurate
     *  + physical movement
     * 
     * @newState: refer to a controlled simulateToHalt(...) animation.
     */
    startIndirectUserInput(newState) {
        this.simulateToHalt(newState, true);
    },

    /*
     * Automatically animate from the current animationState to the new state,
     * Using an easing function.
     *
     * You can also fade from one animation to an easing function using the fade property.
     * This will respect the previous velocity.
     *
     *  + Complete control
     *  - Tends to unphysical movements (even when using fade)
     * 
     * @newState: an Object with the fallowing properties:
     *  {
     *      x: {
     *          endValue: 42,
     *              // The end value of the property.
     *              // a number
     *              // -OR-
     *              // a function of type: (velocity: Num) -> Num
     *              //     This is useful if your end value depends on the previous velocity.
     *              // REQUIRED
     *          duration: 1.5,
     *              // The duration of the animation in seconds.
     *              // DEFAULT: 1
     *          easingFn(t) { return Math.pow(t, 3); },
     *              // An easing function f with type: f(t: Num [0-1]) -> Num
     *              //      where f(0) = 0 and f(1) = 1. f(0 < t < 1) is allowed to be out of the [0-1] range!
     *              // There are many useful functions available in Easing.* to pick from.
     *              // DEFAULT: Easing.cubicInOut
     *          fade: {
     *              // Fade from the previous motion to this new animation.
     *              // Use when interrupting another animation or when transitioning
     *              // from a user controlled motion to a new animation.
     *              // OMIT to immediately start the new animation.
     *              // use 'fade: {}' to use the default configuration.
     *              interpolationFn: Easing.expOut,
     *                  // How to fade from the previous animation to the new one.
     *                  // For best results, use an easeOut animation.
     *                  // DEFAULT: Easing.quadOut
     *              duration: 0.3,
     *                  // How long to fade from the old animation the the new one,
     *                  // as a percentage of the new animations duration.
     *                  // DEFAULT: 0.5
     *          },
     *          onEnd: callback
     *              // A callback that gets called with true, when the animation finished
     *              // or with false, when interrupted.
     *      }, ...
     *  }
     */
    easeTo(newState) {
        var startTime = nowInSeconds();

        for (var p in newState) {
            var newS = newState[p];
            var startValue = this.animationState[p];

            var canceledAnim = this.cancelAnimation(p);
            var velocity = (canceledAnim && canceledAnim.velocity) || 0;

            var endValue;
            if (typeof newS.endValue === "function") {
                endValue = newS.endValue(velocity);
            } else {
                endValue = newS.endValue;
            }

            var newAnimDuration = newS.duration || 1;


            var easingInput = newS.easingFn || Easing.cubicInOut;
            var tempEasing = EasingHelpers.ease(easingInput, startValue, endValue);

            var fade = newS.fade;
            var newEasingFn = tempEasing;
            if (fade) {
                var fadeDuration = fade.duration || 0.5;
                var easing = fade.interpolationFn || Easing.quadOut;
                newEasingFn = (t) => {
                    if (t < fadeDuration) {
                        var eased = easing(t/fadeDuration);
                        return (1 - eased) * (velocity * t * newAnimDuration + startValue) + eased * tempEasing(t);
                    } else {
                        return tempEasing(t);
                    }
                };
            }

            var anim = {
                value: startValue,
                finished: false,
                onEnd: newS.onEnd,
                velocity: velocity,
                advance: EasingHelpers.advance(startTime, newAnimDuration, newEasingFn)
            };
            startAnimation(anim, p, this);
        }
    },
    componentWillUnmount() {
        cancelAnimations(this, true);
    }
};

module.exports = animationMixin;