// TODO.
// Decide what to do with these.
// 
// Maybe profile to see if the analytical solutions are faster,
//  if they are, keep them as a backup for when performance if absolutely needed,
//  if not delete.

"use strict";


/*
 * This is a collection of nice simulation functions
 *
 * Inside the 'make' object you can find functions that
 * take configuration parameters and return a new simulation function.
 */
var Simulation = {
    helpers: {
        /*
         * Used internally for animating
         */
        advanceAnimation(startTime, endValue, fn) {
            return (oldAnim, dt, now) => {
                var timePassed = now - startTime;
                var newValue = fn(timePassed);
                oldAnim.velocity = (newValue - oldAnim.value) / dt;
                oldAnim.value = newValue;
                if (Math.abs(oldAnim.velocity) <= 0.0001 && Math.abs(oldAnim.value - endValue) <= 0.0001) {
                    oldAnim.value = endValue;
                    oldAnim.finished = true;
                }
                return oldAnim;
            };
        }
    },
    make: {
        /* damping = 1 */
        criticallyDamped(frequency) {
            return (startValue, endValue, startVelocity) => {
                var a = startValue - endValue,
                    b = a * frequency + startVelocity;
                    return (t) => (a + b*t)*Math.exp(-frequency*t) + endValue;
            };
        },
        /* 1 < damping */
        overDamped(frequency, damping) {
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
        underDamped(frequency, damping) {
            return (startValue, endValue, startVelocity) => {
                var w_d = frequency * Math.sqrt(1 - damping * damping),
                    a = startValue - endValue,
                    b = 1/w_d*(damping * frequency * a + startVelocity);
                return (t) => Math.exp(-damping * frequency * t)*(a*Math.cos(w_d * t) + b*Math.sin(w_d * t)) + endValue;
            };
        }
    },
    /*
     * This is a an exponential decay animation.
     * ATTENTION:
     * This animation makes only sense if
     *     startVelocity/(endValue-startValue) > 0
     * In simpler words, your velocity has to go towards your end value.
     */
    decay(startValue, endValue, startVelocity) {
        var lambda = startVelocity/(endValue-startValue);
        var n0 = startValue-endValue;
        var b = endValue;
        if (lambda > 0) {
            return (t) => n0 * Math.exp(-lambda*t)+b;
        } else {
            // TODO: throw error, use critically damped or use this ugly default?
            return (t) => endValue;
        }
    }
};

/* 0 < damping */
Simulation.make.dampedHarmonicOscillator = (frequency, damping) => {
    if (damping < 1) {
        return Simulation.make.underDamped(frequency, damping);
    } else if (damping === 1) {
        return Simulation.make.criticallyDamped(frequency);
    } else {
        return Simulation.make.overDamped(frequency, damping);
    }
};
Simulation.make.massSpringDamper = (mass, springConstant, damperConstant) => {
    return Simulation.make.dampedHarmonicOscillator(
        Math.sqrt(springConstant/mass),
        damperConstant/(2*Math.sqrt(mass*springConstant))
    );
};

Simulation.underDamped = Simulation.make.dampedHarmonicOscillator(10, 0.3);
Simulation.criticalDamped = Simulation.make.dampedHarmonicOscillator(10, 1);
Simulation.overDamped = Simulation.make.dampedHarmonicOscillator(10, 1.5);

module.exports = Simulation;