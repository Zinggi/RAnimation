"use strict";


/*
 * This is a collection of nice easing functions
 *
 * The functions that start with 'make' are functions that
 * take a configuration parameters and return a new easing function.
 */
var Physical = {
    makeCriticallyDamped(frequency) {
        return (startValue, endValue, startVelocity) => {
            var a = startValue - endValue,
                b = a * frequency + startVelocity;
                return (t) => (a + b*t)*Math.exp(-frequency*t) + endValue;
        };
    },
    /* 1 < damping */
    makeOverDamped(frequency, damping) {
        return (startValue, endValue, startVelocity) => {
            var temp = Math.sqrt(damping * damping - 1),
                y_1 = frequency * (temp - damping),
                y_2 = frequency * (-temp - damping),
                x0 = startValue - endValue,
                a = x0 + (y_1 * x0 - startVelocity)/(y_2 - y_1),
                b = -(y_1 * x0 - startVelocity)/(y_2 - y_1);
            return (t) => a * Math.exp(y_1 * t) + b*Math.exp(y_2 * t) + endValue;
        };
    },
    /* 0 < damping < 1 */
    makeUnderDamped(frequency, damping) {
        return (startValue, endValue, startVelocity) => {
            var w_d = frequency * Math.sqrt(1 - damping * damping),
                a = startValue - endValue,
                b = 1/w_d*(damping * frequency * a + startVelocity);
            return (t) => Math.exp(-damping * frequency * t)*(a*Math.cos(w_d * t) + b*Math.sin(w_d * t)) + endValue;
        };
    }
};

/* 0 < damping */
Physical.makeDampedHarmonicOscillator = (frequency, damping) => {
    if (damping < 1) {
        return Physical.makeUnderDamped(frequency, damping);
    } else if (damping === 1) {
        return Physical.makeCriticallyDamped(frequency);
    } else {
        return Physical.makeOverDamped(frequency, damping);
    }
};
Physical.makeMassSpringDamper = (mass, springConstant, damperConstant) => {
    return Physical.makeDampedHarmonicOscillator(Math.sqrt(springConstant/mass), damperConstant/(2*Math.sqrt(mass*springConstant)));
};

Physical.underDamped = Physical.makeDampedHarmonicOscillator(10, 0.3);
Physical.criticalDamped = Physical.makeDampedHarmonicOscillator(10, 1);
Physical.overDamped = Physical.makeDampedHarmonicOscillator(10, 1.5);

/*
 * This is a an exponential decay animation.
 * This animation makes only sense if
 *     startVelocity/(endValue-startValue) is POSITIVE.
 * In simpler words, your velocity goes towards your end value.
 */
Physical.decay = (startValue, endValue, startVelocity) => {
    var lambda = startVelocity/(endValue-startValue);
    var n0 = startValue-endValue;
    var b = endValue;
    if (lambda > 0) {
        return (t) => n0 * Math.exp(-lambda*t)+b;
    } else {
        return (t) => endValue;
    }
};

Physical.advanceAnimation = (startTime, endValue, fn) => {
    return (oldAnim, now) => {
        var dt = now - startTime;
        // We scale by 1000 here because our function takes s and not ms.
        var newValue = fn(dt/1000);
        oldAnim.velocity = (newValue - oldAnim.value) / (now - oldAnim.lastTime) * 1000;
        oldAnim.lastTime = now;
        oldAnim.value = newValue;
        if (Math.abs(oldAnim.velocity) <= 0.0001 && Math.abs(oldAnim.value - endValue) <= 0.0001) {
            oldAnim.value = endValue;
            oldAnim.finished = true;
        }
        return oldAnim;
    };
};

module.exports = Physical;