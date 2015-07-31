"use strict";

var React = require('react/addons'),
    {animationMixin, Model} = require('../src/index.js');

var Demo = React.createClass({
    // Make sure the motor is running...
    mixins: [animationMixin],
    // The initial state
    getInitialAnimationState() {
        return {
            x: 0,
            // This information could also be stored in your state,
            // depending on your taste. But since our render method doesn't depend on this information,
            // it seems appropriate (and slightly better for performance(!)) to store it here.
            forwards: true
        };
    },
    // Your render method should NOT depend on animationState!
    render() {
        return <div style={{height:"100%"}}>
            <button onClick={this.animateBall}>
                Animate!
            </button>
            {/* We give the ball a ref, so that we can later easily modify it's DOM node */}
            <div ref="ball"
                 style={{backgroundColor:"red", width: "50px", height: "50px", borderRadius: "10px", position: "absolute"}} />
        </div>;
    },
    // Your performAnimation however, definitely should
    performAnimation() {
        // get a reference to the DOM
        var node = this.refs.ball.getDOMNode();
        // and modify it accordingly
        node.style.left = (this.animationState.x*70 + 15)+"%";
    },
    // Start the animation
    animateBall() {
        var end = this.animationState.forwards ? 1 : 0;
        this.simulateToHalt({
            x: {
                endValue: end,
                modelFn: Model.controlled.underDamped,
            }
        });
        this.animationState.forwards = !this.animationState.forwards;
    }
});

React.render(<Demo />, document.querySelector('body'));