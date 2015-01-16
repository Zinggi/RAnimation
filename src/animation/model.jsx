"use strict";

var Model = {};

var eps = 0.01;

Model.helpers = {
    /*
     * Used internally for animating
     */
    verletIntegration(obj, newA, dt) {
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
    constrain(simulation, constraints) {
    	return (obj, dt, t) => {
    		// Integrate first, then check if the constraint is
    		// fulfilled, if not, run the constraint to fix the problem
    		var o = simulation(obj, dt, t);
    		for (var i = 0, l = constraints.length; i < l; i++) {
    			constraints[i](o, dt);
    		}
    		return o;
    	};
    },
    stopControlled(o) {
    	var cond = Math.abs(o.endValue-o.value) < eps && Math.abs(o.velocity) < eps;
    	if (cond) {
    		// Make sure the end value is exactly endValue
    		o.value = o.endValue;
    		console.log("stop controlled");
    	}
    	return cond;
    },
    stopUncontrolled(o) {
    	var cond = Math.abs(o.velocity) < eps && Math.abs(o.acceleration) < eps;
    	if(cond) {
    		console.log("stop uncontrolled");
    	}
    	return cond;
    },
    dontStop(o) {
    	return false;
    }
};
Model.constraints = {
	// TODO: still buggy!
	// I think I'm doing this wrong, especially the check to see if velocity is big enough
	// seems wrong. However, it seems to work ok...
	elasticBoundaries(lower, upper, bounceConstant) {
		var l = typeof lower !== 'undefined' ? lower : -Infinity;
		var u = typeof upper !== 'undefined' ? upper : Infinity;
		var e = typeof bounceConstant !== 'undefined' ? bounceConstant : 0.8;
		return (o, dt) => {
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
				console.log(o);
				o.velocity = -e*o.velocity;
				// if (Math.abs(o.velocity) < 0.5) {
				// 	o.velocity = 0;	
				// } else {
				// 	o.velocity = -e*o.velocity;
				// }
			}
		};
	}
};

Model.forces = {
	/* a simple friction force */
	friction(frictionCoefficient) {
		return (o) => {
			if (o.velocity > eps) {
				return -frictionCoefficient;
			} else if (o.velocity < -eps) {
				return frictionCoefficient;
			} return 0;
		};
	},
	gravity(g, floor) {
		return (o) => {
			if (g > 0 && o.value > floor) {
				return -g;
			} else if (g < 0 && o.value < floor) {
				return -g;
			} else {
				return 0;
			}
		};
	},
	/* Drag equation with a high Reynolds number */
	fluidDrag(dragConstant) {
		return (o) => {
			var v = o.velocity;
			if (v > 0) {
				return -dragConstant*v*v;
			} else {
				return dragConstant*v*v;
			}
		};
	},
	/* Drag equation with a low Reynolds number */
	airDrag(dragConstant) {
		return (o) => -dragConstant*o.velocity;
	},
	spring(springConstant) {
		return (o) => {
			return (o.endValue - o.value) * springConstant;
		};
	},
	damper(damperConstant) {
		return (o) => -damperConstant*o.velocity;
	}
};

// ### Controlled ###
Model.controlled = {};
Model.controlled.make = {
	massSpringDamper(mass, springConstant, damperConstant) {
		var fd = Model.forces.damper(damperConstant);
		var fs = Model.forces.spring(springConstant);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, (fs(obj)+fd(obj))/mass, dt);
		};
    }
};
Model.controlled.make.dampedHarmonicOscillator = (frequency, damping) => {
	return Model.controlled.make.massSpringDamper(1, frequency*frequency, 2*frequency*damping);
};
Model.controlled.make.criticallyDamped = (frequency) => {
	return Model.controlled.make.dampedHarmonicOscillator(1, frequency);
};
Model.controlled.make.damper = (mass, damping) => {
	return Model.controlled.make.massSpringDamper(mass, 0, damping);
};
Model.controlled.underDamped = Model.controlled.make.dampedHarmonicOscillator(10, 0.5);
Model.controlled.overDamped = Model.controlled.make.dampedHarmonicOscillator(10, 1.3);
Model.controlled.criticallyDamped = Model.controlled.make.criticallyDamped(10);


// ### Uncontrolled ###
Model.uncontrolled = {};
Model.uncontrolled.make = {
	gravity(g, floor) {
		var fg = Model.forces.gravity(g, floor);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, fg(obj), dt);
		};
	},
	slide(friction) {
		var f = Model.forces.friction(friction);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, f(obj), dt);
		};
	},
	slidePhysical(mass, g, friction) {
		var f = Model.forces.friction(g*mass*friction);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, f(obj), dt);
		};
	},
	airDrag(constant) {
		var f = Model.forces.airDrag(constant);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, f(obj), dt);
		};
	},
	fluidDrag(constant) {
		var f = Model.forces.fluidDrag(constant);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, f(obj), dt);
		};
	}
};
Model.uncontrolled.gravity = Model.uncontrolled.make.gravity(10, 0);
Model.uncontrolled.gravityUpsideDown = Model.uncontrolled.make.gravity(-10, 1);
Model.uncontrolled.slide = Model.uncontrolled.make.slide(1);
Model.uncontrolled.airDrag = Model.uncontrolled.make.airDrag(0.5);
Model.uncontrolled.damper = Model.uncontrolled.make.airDrag(5);
Model.uncontrolled.fluidDrag = Model.uncontrolled.make.fluidDrag(5);
Model.uncontrolled.nothing = (obj, dt, t) => Model.helpers.verletIntegration(obj, 0, dt);

module.exports = Model;