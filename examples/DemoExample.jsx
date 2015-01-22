"use strict";

var React = require('react/addons'),
    {animationMixin, Easing, Model} = require('../src/index.jsx');

var parseFloatDefault = (string, def) => {
    var x = parseFloat(string);
    if (isNaN(x)) {
        return def;
    }
    return x;
};

var Demo = React.createClass({
    mixins: [animationMixin],
    getInitialState() {
        return {
            animationType: "physical",
            duration: 1.5,
            easing: "quadInOut",
            fadeDuration: 0.5,
            fadeEasing: "quadOut",
            useFade: true,
            frequency: 10,
            damping: 0.6
        };
    },
    getInitialAnimationState() {
        return {
            x: 0,
            forwards: true
        };
    },
    render() {
        var options = Object.keys(Easing).filter(key => !/(make)|(helpers)/.test(key)).map(key => <option key={key}>{key}</option>);

        var config = (this.state.animationType === "static") ?
            <div>
                <select value={this.state.easing}
                        onChange={(e) => {this.setState({easing: e.target.value});}}>
                    {options}
                </select>
                {/* I woulds have loved to use type="number", but some android browsers then fail to input decimal numbers. */}
                duration: <input type="text" defaultValue={this.state.duration}
                                 onChange={(e) => {this.setState({duration: parseFloatDefault(e.target.value, 1)});}} />
                <br />
                fade? <input type="checkbox" checked={this.state.useFade}
                             onChange={(e) => {this.setState({useFade: e.target.checked});}} />
                <select value={this.state.fadeEasing}
                        onChange={(e) => {this.setState({fadeEasing: e.target.value});}}>
                    {options}
                </select>
                duration: <input type="text" defaultValue={this.state.fadeDuration}
                                 onChange={(e) => {this.setState({fadeDuration: parseFloatDefault(e.target.value, 0.5)});}} />
            </div> :
            <div>
                frequency: <input type="text" defaultValue={this.state.frequency}
                                 onChange={(e) => {this.setState({frequency: parseFloatDefault(e.target.value, 10)});}} />
                damping: <input type="text" defaultValue={this.state.damping}
                                 onChange={(e) => {this.setState({damping: parseFloatDefault(e.target.value, 0.7)});}} />
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
            <button onClick={this.animateBall}>
                Animate!
            </button>

            <div ref="ball"
                 style={{backgroundColor:"red", width: "50px", height: "50px", borderRadius: "10px", position: "absolute"}} />
        </div>;
    },
    animateBall() {
        var end = (this.animationState.forwards) ? 1 : 0;
        var isAtEnd = Math.abs(this.animationState.x - end) === 1;
        var isStatic = this.state.animationType === "static";
        if (!isStatic) {
            this.simulateToHalt({
                x: {
                    endValue: end,
                    modelFn: Model.controlled.make.dampedHarmonicOscillator(this.state.frequency, this.state.damping)
                }
            });
        } else {
            this.easeTo({
                x: {
                    endValue: end,
                    duration: this.state.duration * Math.abs(this.animationState.x - end),
                    easingFn: Easing[this.state.easing],
                    fade: (this.state.useFade && !isAtEnd) ? {
                        duration: this.state.fadeDuration,
                        interpolationFn: Easing[this.state.fadeEasing]
                    } : undefined
                }
            });
        }
        this.animationState.forwards = !this.animationState.forwards;
    },
    performAnimation() {
        var node = this.refs.ball.getDOMNode();
        node.style.left = (this.animationState.x*70 + 15)+"%";
    }
});

React.render(<Demo />, document.querySelector('body'));