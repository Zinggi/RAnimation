"use strict";

require('./polyfills');
var {Easing, EasingHelpers} = require("./easing");
var Physical = require("./physical");


var ongoingAnimations = {};
var animationFrame;
var numAnimations = 0;

var doAnimations = () => {
    var now = window.performance.now();
    for (var p in ongoingAnimations) {
        var animCont = ongoingAnimations[p];
        var ref = animCont.ref;
        var anims = animCont.anims;
        for (var prop in anims) {
            var anim = anims[prop];
            var newAnim = anim.advance(anim, now);
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
};

var startAnimation = (anim, prop, ref) => {
    numAnimations++;
    var rootID = ref._rootNodeID;
    var animCont = ongoingAnimations[rootID] = ongoingAnimations[rootID] || {
        ref: ref,
        anims: {},
    };
    animCont.anims[prop] = anim;

    if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(doAnimations);
    }
};

var startDummyAnimation = (ref, prop, startValue, startTime) => {
    startAnimation({
        advance(oldAnim, now) {
            var dt = now - startTime;
            // We scale by 1000 here because our function takes s and not ms.
            oldAnim.velocity = (oldAnim.newValue - oldAnim.value) / (now - oldAnim.lastTime) * 1000;
            oldAnim.lastTime = now;
            oldAnim.value = oldAnim.newValue;
            return oldAnim;
        },
        newValue: startValue,
        value: startValue,
        velocity: 0,
        finished: false,
        lastTime: startTime
    }, prop, ref);
};

var modifyDummyAnimation = (ref, prop, newValue) => {
    var rootID = ref._rootNodeID;
    var animCont = ongoingAnimations[rootID];
    if (animCont) {
        var anim = animCont.anims[prop];
        if (anim) {
            anim.newValue = newValue;
        }
    }
};


var cancelAnimation = (prop, rootID, couldFinish, dontFireOnEnd) => {
    var animCont = ongoingAnimations[rootID];
    if (animCont) {
        var anim = animCont.anims[prop];
        if (anim) {
            if (!dontFireOnEnd && anim.onEnd) {
                anim.onEnd(couldFinish);
            }
            numAnimations--;
            delete animCont.anims[prop];
            if (Object.keys(animCont.anims).length === 0) {
                delete ongoingAnimations[rootID];
            }
            return anim;
        }
    }
    return undefined;
};

var cancelAnimations = (ref, dontFireOnEnd) => {
    var rootNode = ref._rootNodeID;
    var animCont = ongoingAnimations[rootNode];
    if (animCont) {
        for (var prop in animCont.anims) {
            cancelAnimation(prop, rootNode, false, dontFireOnEnd);
        }
    }
};


var animationMixin = {
    componentDidMount() {
        // set the initial state
        this.animationState = this.getInitialAnimationState();
        // perform first animation
        // (TODO): maybe pass the previous values and/or the delta time?
        this.performAnimation();
    },

    /*
     * Cancels an ongoing animation for the animationState property p.
     * Returns the canceled animation object.
     * This contains a velocity property, among some other implementation details:
     */
    cancelAnimation(p, couldFinish) {
        couldFinish = !!couldFinish;
        return cancelAnimation(p, this._rootNodeID, couldFinish);
    },

    /*
     * Simulates the transition from the current state to the given newState,
     * respecting the inertia.
     * 
     *  + Physically accurate, natural movement
     *  - You don't know when it stops exactly, less control.
     *
     * @newState: an object like this:
     *     {
     *         x: {
     *             endValue: 42, // Where to simulate to.
     *                           // Either a value
     *                           // -OR- a function of type: (velocity: Num) -> Num
     *                           //     This is useful if your end value depends on the previous velocity.
     *                           // REQUIRED
     *             simulationFn: Physical.underDamped, // A function f of type:
     *                 // f(startValue: Num, endValue: Num, startVelocity: Num) -> (t: Num n -> Num)
     *                 //   where n > 0, f(x0, x1, v0)(0) = x0, f(x0, x1, v0)(infinity) = x1, df(x0, x1, v0)/dt(0) = v0
     *                 // The simulation ends at t:
     *                 //   |f(x0, x1, v0)(t)| < eps and |df(x0, x1, v0)/dt(t)| < eps, for a very small eps.
     *                 // Useful functions can be found in Physical.*
     *                 // DEFAULT: Physical.criticalDamped
     *             onEnd: callback // A callback that gets called with true, when the simulation finished
     *                             // or with false, when interrupted.
     *         }, ...
     *     }
     */
    simulateTo(newState) {
        var target = this;
        var startTime = window.performance.now();

        for (var p in newState) {
            var config = newState[p];

            var startValue = target.animationState[p];
            
            var canceledAnim = target.cancelAnimation(p);
            var velocity = canceledAnim && canceledAnim.velocity || 0;
            var simulationFn = config.simulationFn || Physical.criticalDamped;

            var endValue;
            if (typeof config.endValue === "function") {
                endValue = config.endValue(velocity);
            } else {
                endValue = config.endValue;
            }

            // TODO: make sure all implementations expect velocity to be value/s
            var finalSimFn = simulationFn(startValue, endValue, velocity);

            var anim = {
                value: startValue,
                lastTime: startTime,
                velocity: velocity,
                finished: false,
                onEnd: config.onEnd,
                advance: Physical.advanceAnimation(startTime, endValue, finalSimFn)
            };
            startAnimation(anim, p, target);
        }
    },

    /*
     * Use to set the animation state directly,
     * while giving you the benefit of offloading the rendering to the animation frame
     * and keeping track of the velocity for smooth transitions to a controlled animation.
     * 
     * Best used with user input to give them maximum control over an animation.
     * Good candidates for using this are onMouseMove, onTouchMove, onScroll, etc...
     *
     * MAKE SURE YOU'VE USED startDirectUserInteraction BEFORE!
     *
     *  + Direct control to the user
     *  - Unphysical movement
     *
     * @newState: an object like:
     * {
     *     x: e.clientX // The new value.
     * }
     * 
     */
    directUserInput(newState) {
        var target = this;
        for (var p in newState) {
            modifyDummyAnimation(target, p, newState[p]);
        }
    },
    /*
     * Call this just before starting a series of directUserInput(..)s.
     * It prepares everything necessary to offload all fallowing directUserInput(..)s
     * into the animation frame and to keep track of the velocity.
     *
     * Good candidates for using this are onMouseDown, onTouchDown, onScrollStart, etc...
     *
     * @newState: an object containing the starting state
     */
    startDirectUserInput(newState) {
        var target = this;
        var startTime = window.performance.now();

        for (var p in newState) {
            target.cancelAnimation(p);
            startDummyAnimation(target, p, newState[p], startTime); 
        }
    },

    /*
     * Automatically animate from the current animationState to the new state,
     * Using an easing function.
     *
     *  + Complete control
     *  - Tends to unphysical movements
     * 
     * @newState: an Object with fallowing properties:
     *  {
     *      x: {
     *          // The end value of the property. REQUIRED
     *          endValue: 42,
     *          // the duration of the animation in milliseconds.
     *          // DEFAULT: 1000
     *          duration: 1500,
     *          // An easing function f with type: f(t: Num [0-1]) -> Num
     *          //      where f(0) = 0 and f(1) = 1. f(0 < t < 1) is allowed to be out of the [0-1] range!
     *          // There are many useful functions available in Easing.* to pick from.
     *          // DEFAULT: Easing.cubicInOut
     *          easingFn(t) {
     *              return Math.pow(t, 3);
     *          },
     *          // Fade from the previous motion to this new animation.
     *          // Use when interrupting another animation or when transitioning
     *          // from a user controlled motion to a new animation.
     *          // OMIT to immediately start the new animation.
     *          // use 'fade: {}' to use the default configuration.
     *          fade: {
     *              interpolationFn: Easing.quadOut, // How to fade from the previous animation to the new one.
     *                                      // For best results, use an easeOut animation.
     *                                      // DEFAULT: Easing.quadOut
     *              duration: 0.3,          // How long to fade from the old animation the the new one,
     *                                      // as a percentage of the new animations duration.
     *                                      // DEFAULT: 0.5
     *          
     *          },
     *          onEnd: callback     // a callback that gets called when the animation finished or when interrupted.
     *      },
     */
    easeTo(newState) {
        var target = this;
        var startTime = window.performance.now();

        for (var p in newState) {
            var newS = newState[p];
            var startValue = target.animationState[p];
            var endValue = newS.endValue;
            var newAnimDuration = newS.duration || 1000;

            var canceledAnim = target.cancelAnimation(p);

            var fade = newS.fade;
            var velocity = (canceledAnim && canceledAnim.velocity) || 0;

            var easingInput = newS.easingFn || Easing.cubicInOut;
            var tempEasing = EasingHelpers.ease(easingInput, startValue, endValue);

            var newEasingFn = tempEasing;
            if (fade) {
                var fadeDuration = fade.duration || 0.5;
                var easing = fade.interpolationFn || Easing.quadOut;
                newEasingFn = (t) => {
                    if (t < fadeDuration) {
                        var eased = easing(t/fadeDuration);
                        return (1 - eased) * (velocity/1000 * t * newAnimDuration + startValue) + eased * tempEasing(t);
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
                lastTime: startTime,
                advance(oldAnim, now) {
                    var percentage = (now - startTime) / newAnimDuration;
                    if (percentage >= 1) {
                        percentage = 1;
                    }
                    var newValue = newEasingFn(percentage);
                    oldAnim.velocity = (newValue - oldAnim.value) / (now - oldAnim.lastTime) * 1000;
                    oldAnim.lastTime = now;
                    oldAnim.value = newValue;
                    if (percentage === 1) {
                        oldAnim.finished = true;
                    }
                    return oldAnim;
                }
            };
            startAnimation(anim, p, target);
        }
    },
    componentWillUnmount() {
        cancelAnimations(this, true);
    }
};

module.exports = animationMixin;