"use strict";


/*
 * This is a collection of nice easing functions
 *
 * The functions that start with 'make' are functions that
 * take a configuration parameters and return a new easing function.
 */
var Physical = {
    makeCriticallyDamped(frequency) {
        return (startValue, startVelocity) => {
            var a = startValue,
                b = startValue * frequency + startVelocity;
                return (t) => (a + b*t)*Math.exp(-frequency*t);
        };
    },
    /* 1 < damping */
    makeOverDamped(frequency, damping) {
        return (startValue, startVelocity) => {
            var temp = Math.sqrt(damping * damping - 1),
                y_1 = frequency * (temp - damping),
                y_2 = frequency * (-temp - damping),
                a = startValue + (y_1 * startValue - startVelocity)/(y_2 - y_1),
                b = -(y_1 * startValue - startVelocity)/(y_2 - y_1);
            return (t) => a * Math.exp(y_1 * t) + b*Math.exp(y_2 * t);
        };
    },
    /* 0 < damping < 1 */
    makeUnderDamped(frequency, damping) {
        return (startValue, startVelocity) => {
            var w_d = frequency * Math.sqrt(1 - damping * damping),
                a = startValue,
                b = 1/w_d*(damping * frequency * startValue + startVelocity);
            return (t) => Math.exp(-damping * frequency * t)*(a*Math.cos(w_d * t) + b*Math.sin(w_d * t));
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

module.exports = Physical;