"use strict";

var React = require('react/addons'),
    {animationMixin, Easing, EasingHelpers} = require('../src/index.jsx');

var Demo = React.createClass({
    mixins: [animationMixin],
    getInitialState() {
        return {
            duration: 1000,
            easing: "linear",
            forwards: true,
            fadeDuration: 1,
            fadeEasing: "cubicOut",
            useFade: true
        };
    },
    getInitialAnimationState() {
        return {
            x: 0
        };
    },
    render() {
        var options = Object.keys(Easing).filter(key => !/make/.test(key)).map(key => <option key={key}>{key}</option>);
        return <div style={{height:"100%"}}>
            <select onChange={(e) => {this.setState({easing: e.target.value});}}>
                {options}
            </select>
            duration: <input type="number" step="200" value={this.state.duration}
                             onChange={(e) => {this.setState({duration: e.target.value});}} />
            <br />
            fade? <input type="checkbox" checked={this.state.useFade}
                         onChange={(e) => {this.setState({useFade: e.target.checked});}} />
            <select selected={this.state.fadeEasing}
                    onChange={(e) => {this.setState({fadeEasing: e.target.value});}}>
                {options}
            </select>
            duration: <input type="number" step="0.02" value={this.state.fadeDuration}
                             onChange={(e) => {this.setState({fadeDuration: e.target.value});}} />
            <br />
            <button onClick={this.startAnimation}>
                Animate!
            </button>

            <div ref="ball"
                 style={{backgroundColor:"red", width: "20px", height: "20px", borderRadius: "10px", position: "absolute"}} />
        </div>;
    },
    startAnimation() {
        var end = (this.state.forwards) ? 1 : 0;
        this.animateToState({
            x: {
                endValue: end,
                duration: this.state.duration * Math.abs(this.animationState.x - end),
                easing: Easing[this.state.easing],
                fade: this.state.useFade ? {
                    duration: this.state.fadeDuration,
                    easing: Easing[this.state.fadeEasing]
                } : undefined
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