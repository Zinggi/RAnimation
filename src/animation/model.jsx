"use strict";

var Model = {};

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
    	if (obj.endCondition(obj)) {
    		obj.finished = true;
    	}
    	return obj;
    },
    // TODO!!!
    constrain(simulation, constraints) {
    	return (obj, dt, t) => {
    		// TODO: Integrate first, then check if the constraint is
    		// fulfilled, if not, solve the problem with the solver.
    		// So a constraint could be: (x) => x>ground
    		// A solver could be: (x1, v1) => (x2=ground+c*(ground-x1), v2=-c*v1)
    		var o = simulation(obj, dt, t);
    		for (var i = 0, l = constraints.length; i < l; i++) {
    			var cont = constraints[i];
    			if (cont.restrict(o)) {
    				cont.resolve(o);
    			}
    		}
    	};
    },
    stopControlled(o) {
    	var cond = Math.abs(o.endValue-o.value) < 0.0001 && Math.abs(o.velocity) < 0.0001;
    	if (cond) {
    		// Make sure the end value is exactly endValue
    		o.value = o.endValue;
    	}
    	return cond;
    },
    stopUncontrolled(o) {
    	return Math.abs(o.velocity) < 0.0001 && Math.abs(o.acceleration) < 0.0001;
    }
};

Model.forces = {
	/* a simple friction force */
	friction(frictionCoefficient) {
		return (v) => {
			if (v > 0) {
				return -frictionCoefficient;
			} else if (v < 0) {
				return frictionCoefficient;
			} return 0;
		};
	},
	gravity(g) {
		return -g;
	},
	/* Drag equation with a high Reynolds number */
	fluidDrag(dragConstant) {
		return (v) => -dragConstant*v*v;
	},
	/* Drag equation with a low Reynolds number */
	airDrag(dragConstant) {
		return (v) => -dragConstant*v;
	},
	spring(springConstant) {
		return (xEnd, x) => {
			return (xEnd - x) * springConstant;
		};
	},
	damper(damperConstant) {
		return (v) => -damperConstant*v;
	}
};

// ### Controlled ###
Model.controlled = {};
Model.controlled.make = {
	massSpringDamper(mass, springConstant, damperConstant) {
		var fd = Model.forces.damper(damperConstant);
		var fs = Model.forces.spring(springConstant);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, (fs(obj.endValue, obj.value)+fd(obj.velocity))/mass, dt);
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
Model.controlled.underDamped = Model.controlled.make.dampedHarmonicOscillator(20, 0.7);
Model.controlled.overDamped = Model.controlled.make.dampedHarmonicOscillator(20, 1.3);
Model.controlled.criticallyDamped = Model.controlled.make.criticallyDamped(20);


// ### Uncontrolled ###
Model.uncontrolled = {};
Model.uncontrolled.make = {
	gravity(g) {
		var g_ = Model.forces.gravity(g);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, g_, dt);
		};
	},
	slide(friction) {
		var f = Model.forces.friction(friction);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, f, dt);
		};
	},
	slidePhysical(mass, g, friction) {
		var f = Model.forces.friction(g*mass*friction);
		return (obj, dt, t) => {
			return Model.helpers.verletIntegration(obj, f, dt);
		};
	}
};
// Model.gravity = 
Model.uncontrolled.slide = Model.uncontrolled.make.slide(10);

module.exports = Model;