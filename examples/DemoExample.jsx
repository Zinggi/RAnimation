"use strict";

var React = require('react/addons'),
    {animationMixin, Easing, EasingHelpers} = require('../src/index.jsx');

var Demo = React.createClass({
    mixins: [animationMixin],
    getInitialState() {
        return {
            duration: 1000,
            easing: Easing.linear
        };
    },
    getInitialAnimationState() {
        return {
            x: 0
        };
    },
    render() {
        var options = Object.keys(Easing).filter(key => !/make/.test(key)).map(key => <option>{key}</option>);
        return <div style={{height:"100%"}}>
            <select onChange={this.changeEasing}>
                {options}
            </select>
            <button onClick={this.startAnimation}>Animate!</button>
            <div ref="square" style={{backgroundColor:"red", width: "0px", height: "20px", marginLeft: "10%", border: "1px solid black"}}></div>
        </div>;
    },
    changeEasing(e) {
        this.setState({easing: Easing[e.target.value]});
    },
    startAnimation() {
        this.setAnimationState({
            x: 0
        });
        this.animateToState({
            x: {
                endValue: 1,
                duration: this.state.duration,
                easing: this.state.easing
            }
        });
    },
    performAnimation() {
        var node = this.refs.square.getDOMNode();
        node.style.width = (this.animationState.x*80)+"%";
    }
});

React.render(<Demo />, document.querySelector('body'));