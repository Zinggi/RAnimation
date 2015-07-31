"use strict";

var Model = {};

var eps = 0.0001;

Model.helpers = {
    /*
     * Used internally for animating
     */
    verletIntegration: function(obj, newA, dt) {
    	var x = obj.value;
    	var v = obj.velocity;
    	var a = obj.acceleration;
    	var halfV = v + 0.5*a*dt;
    	obj.value = x + halfV*dt;
    	obj.velocity = halfV + 0.5*newA*dt;
    	obj.acceleration = newA;
    	if (obj.endCondition(obj)) {
    		obj.finished = true;
    	}
    	return obj;
    },
    constrain: function(simulation, constraints) {
    	return function(obj, dt, t) {
    		// Integrate first, then check if the constraint is
    		// fulfilled, if not, run the constraint to fix the problem
    		var o = simulation(obj, dt, t);
    		for (var i = 0, l = constraints.length; i < l; i++) {
    			constraints[i](o, dt);
    		}
    		return o;
    	};
    },
    stopControlled: function(o) {
    	var cond = Math.abs(o.endValue-o.value) < eps && Math.abs(o.velocity) < eps;
    	if (cond) {
    		// Make sure the end value is exactly endValue
    		o.value = o.endValue;
    	}
    	return cond;
    },
    stopUncontrolled: function(o) {
    	return Math.abs(o.velocity) < eps && Math.abs(o.acceleration) < eps;
    },
    dontStop: function(_) {
    	return false;
    }
};
Model.constraints = {
	// TODO: still buggy!
	// I think I'm doing this wrong, especially the check to see if velocity is big enough
	// seems wrong. However, it seems to work ok...
	elasticBoundaries: function(lower, upper, bounceConstant) {
		var l = typeof lower !== 'undefined' ? lower : -Infinity;
		var u = typeof upper !== 'undefined' ? upper : Infinity;
		var e = typeof bounceConstant !== 'undefined' ? bounceConstant : 0.8;
		return function(o, dt) {
			var b = (o.value < l) ? l : ((o.value > u) ? u : undefined);
			if (typeof b !== "undefined") {
				o.value = b;
				// I have no idea why, but this seems to be helping to stop the jittering
				if (Math.abs(o.velocity) < 1) {
					o.acceleration = o.acceleration*o.acceleration * o.velocity;
					if (Math.abs(o.velocity) < 0.05) {
						o.acceleration = 0;
						o.velocity = 0;
					}
				}
				o.velocity = -e*o.velocity;
			}
		};
	}
};

Model.forces = {
	gravity: function(g) {
		return function(o) {
			return -g;
		};
	},
	/* Drag equation with a high Reynolds number */
	fluidDrag: function(dragConstant) {
		return function(o) {
			var v = o.velocity;
			if (v > 0) {
				return -dragConstant*v*v;
			} else {
				return dragConstant*v*v;
			}
		};
	},
	/* Drag equation with a low Reynolds number */
	airDrag: function(dragConstant) {
		return function(o) { return -dragConstant*o.velocity; };
	},
	spring: function(springConstant) {
		return function(o) {
			return (o.endValue - o.value) * springConstant;
		};
	},
	damper: function(damperConstant) {
		return function(o) { return -damperConstant*o.velocity; };
	}
};

// ### Controlled ###
Model.controlled = {};
Model.controlled.make = {
	massSpringDamper: function(mass, springConstant, damperConstant) {
		var fd = Model.forces.damper(damperConstant);
		var fs = Model.forces.spring(springConstant);
		return function(obj, dt, t) {
			return Model.helpers.verletIntegration(obj, (fs(obj)+fd(obj))/mass, dt);
		};
    }
};
Model.controlled.make.dampedHarmonicOscillator = function(frequency, damping) {
	return Model.controlled.make.massSpringDamper(1, frequency*frequency, 2*frequency*damping);
};
Model.controlled.make.criticallyDamped = function(frequency) {
	return Model.controlled.make.dampedHarmonicOscillator(1, frequency);
};
Model.controlled.make.damper = function(mass, damping) {
	return Model.controlled.make.massSpringDamper(mass, 0, damping);
};
Model.controlled.underDamped = Model.controlled.make.dampedHarmonicOscillator(10, 0.5);
Model.controlled.overDamped = Model.controlled.make.dampedHarmonicOscillator(10, 1.3);
Model.controlled.criticallyDamped = Model.controlled.make.criticallyDamped(10);


// ### Uncontrolled ###
Model.uncontrolled = {};
Model.uncontrolled.make = {
	gravity: function(g) {
		var fg = Model.forces.gravity(g);
		return function(obj, dt, t) {
			return Model.helpers.verletIntegration(obj, fg(obj), dt);
		};
	},
	airDrag: function(constant) {
		var f = Model.forces.airDrag(constant);
		return function(obj, dt, t) {
			return Model.helpers.verletIntegration(obj, f(obj), dt);
		};
	},
	fluidDrag: function(constant) {
		var f = Model.forces.fluidDrag(constant);
		return function(obj, dt, t) {
			return Model.helpers.verletIntegration(obj, f(obj), dt);
		};
	}
};
Model.uncontrolled.gravity = Model.uncontrolled.make.gravity(10);
Model.uncontrolled.gravityUpsideDown = Model.uncontrolled.make.gravity(-10);
Model.uncontrolled.airDrag = Model.uncontrolled.make.airDrag(0.5);
Model.uncontrolled.damper = Model.uncontrolled.make.airDrag(5);
Model.uncontrolled.fluidDrag = Model.uncontrolled.make.fluidDrag(5);
Model.uncontrolled.nothing = function(obj, dt, t) {
    Model.helpers.verletIntegration(obj, 0, dt);
};

module.exports = Model;