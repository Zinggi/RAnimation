"use strict";

var React = require('react/addons'),
    {animationMixin, Easing, EasingHelpers} = require('../src/index.jsx');

var Demo = React.createClass({
    mixins: [animationMixin],
    getInitialState() {
        return {
            duration: 1000,
            easing: Easing.linear,
            forwards: true
        };
    },
    getInitialAnimationState() {
        return {
            x: 0
        };
    },
    changeDuration(e) {
        this.setState({
            duration: e.target.value
        });
    },
    render() {
        var options = Object.keys(Easing).filter(key => !/make/.test(key)).map(key => <option key={key}>{key}</option>);
        return <div style={{height:"100%"}}>
            <select onChange={this.changeEasing}>
                {options}
            </select>
            duration: <input type="number" step="200" value={this.state.duration} onChange={this.changeDuration} />
            <button onClick={this.startAnimation}>Animate!</button>
            <div ref="ball" style={{backgroundColor:"red", width: "20px", height: "20px", borderRadius: "10px", position: "absolute"}}></div>
        </div>;
    },
    changeEasing(e) {
        this.setState({easing: Easing[e.target.value]});
    },
    startAnimation() {
        this.animateToState({
            x: {
                endValue: (this.state.forwards) ? 1 : 0,
                duration: this.state.duration,
                easing: this.state.easing,
                stackingBehaviour: "replace"
            }
        });
        this.setState({
            forwards: !this.state.forwards
        });
    },
    performAnimation() {
        var node = this.refs.ball.getDOMNode();
        node.style.left = (this.animationState.x*70 + 15)+"%";
    }
});

React.render(<Demo />, document.querySelector('body'));