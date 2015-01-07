"use strict";

var React = require('react/addons'),
    {animationMixin, Easing, EasingHelpers, Physical} = require('../src/index.jsx');

var Demo = React.createClass({
    mixins: [animationMixin],
    getInitialState() {
        return {
            animationType: "physical",
            duration: 2000,
            easing: "quadInOut",
            forwards: true,
            fadeDuration: 0.5,
            fadeEasing: "quadOut",
            useFade: true,
            frequency: 10,
            damping: 0.3
        };
    },
    getInitialAnimationState() {
        return {
            x: 0
        };
    },
    render() {
        var options = Object.keys(Easing).filter(key => !/make/.test(key)).map(key => <option key={key}>{key}</option>);

        var config = (this.state.animationType === "static") ? <div>
                <select value={this.state.easing}
                        onChange={(e) => {this.setState({easing: e.target.value});}}>
                    {options}
                </select>
                duration: <input type="number" step="200" value={this.state.duration}
                                 onChange={(e) => {this.setState({duration: parseFloat(e.target.value)});}} />
                <br />
                fade? <input type="checkbox" checked={this.state.useFade}
                             onChange={(e) => {this.setState({useFade: e.target.checked});}} />
                <select value={this.state.fadeEasing}
                        onChange={(e) => {this.setState({fadeEasing: e.target.value});}}>
                    {options}
                </select>
                duration: <input type="number" step="0.02" value={this.state.fadeDuration}
                                 onChange={(e) => {this.setState({fadeDuration: parseFloat(e.target.value)});}} />
            </div> :
            <div>
                frequency: <input type="number" step="0.5" value={this.state.frequency}
                                 onChange={(e) => {this.setState({frequency: parseFloat(e.target.value)});}} />
                damping: <input type="number" step="0.1" value={this.state.damping}
                                 onChange={(e) => {this.setState({damping: parseFloat(e.target.value)});}} />
                {this.state.damping < 1 ? "under damped" : this.state.damping === 1 ? "critical damped" : "over damped"}
            </div>;

        return <div style={{height:"100%"}}>
            <select value={this.state.animationType}
                    onChange={(e) => {this.setState({animationType: e.target.value});}}>
                <option>static</option>
                <option>physical</option>
            </select>
            <br />
            {config}
            <br />
            <button onClick={this.startAnimation}>
                Animate!
            </button>

            <div ref="ball"
                 style={{backgroundColor:"red", width: "50px", height: "50px", borderRadius: "10px", position: "absolute"}} />
        </div>;
    },
    startAnimation() {
        var end = (this.state.forwards) ? 1 : 0;
        var isAtEnd = Math.abs(this.animationState.x - end) === 1;
        var isStatic = this.state.animationType === "static";
        this.animateToState({
            x: {
                endValue: end,
                duration: this.state.duration * Math.abs(this.animationState.x - end),
                easing: isStatic ? Easing[this.state.easing] : Physical.makeDampedHarmonicOscillator(this.state.frequency, this.state.damping),
                fade: (this.state.useFade && !isAtEnd) ? {
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