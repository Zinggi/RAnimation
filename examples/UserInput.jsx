"use strict";

var React = require('react/addons'),
    {animationMixin, Easing, Model} = require('../src/index.js');

var getTouchPos = (e) => {
    var touch = (e.touches && e.touches[0]) || e;
    return {x: touch.clientX, y: touch.clientY};
};

var Demo = React.createClass({
    mixins: [animationMixin],
    componentDidMount() {
        window.addEventListener('resize', this.getFrameSize);
        this.getFrameSize();
    },
    componentWillUnmount() {
        window.removeEventListener('resize', this.getFrameSize);
    },
    getFrameSize() {
        this.animationState.sizeX = this.getDOMNode().clientWidth;
        this.animationState.sizeY = this.getDOMNode().clientHeight;
    },
    getInitialAnimationState() {
        return {
            x: 0.5,
            y: 0.5,
            mousedown: false,
            sizeX: 1280,
            sizeY: 720
        };
    },
    getInitialState() {
        return {
            useDirect: false,
            model: "damper"
        };
    },
    down(e) {
        this.animationState.mousedown = true;
        var pos = getTouchPos(e);
        if (this.state.useDirect) {
            this.startDirectUserInput({
                x: pos.x/this.animationState.sizeX,
                y: pos.y/this.animationState.sizeY
            });
        } else {
            this.startIndirectUserInput({
                x: {
                    endValue: pos.x/this.animationState.sizeX,
                    modelFn: Model.controlled.make.dampedHarmonicOscillator(10, 0.7)
                },
                y: {
                    endValue: pos.y/this.animationState.sizeY,
                    modelFn: Model.controlled.make.dampedHarmonicOscillator(10, 0.7)
                }
            });
        }
    },
    up(e) {
        this.animationState.mousedown = false;
        this.simulateBall(0.5, 0.5);
    },
    render() {
        return <div onMouseMove={this.animateBall} onTouchMove={this.animateBall}
                    onMouseDown={this.down} onTouchStart={this.down}
                    onMouseUp={this.up} onTouchEnd={this.up} onTouchCancel={this.up}
                    style={{height:"100%", userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "-moz-none"}}>
            <select value={this.state.model}
                    onChange={(e) => {this.setState({model: e.target.value});}}>
                <option>damper</option>
                <option>fluidDrag</option>
                <option>gravity</option>
                <option>airDrag</option>
            </select>
            direct? <input type="checkbox" checked={this.state.useDirect}
                         onChange={(e) => {this.setState({useDirect: e.target.checked});}} />
            <div ref="ball"
                 style={{backgroundColor:"red", width: "50px", height: "50px", borderRadius: "10px",
                         position: "absolute", marginLeft: "-25px", marginTop: "-25px", pointerEvents: "none", zIndex: -1}} />
        </div>;
    },
    animateBall(e) {
        if (!this.animationState.mousedown) {
            return;
        }
        var pos = getTouchPos(e);
        this.userInput({
            x: pos.x/this.animationState.sizeX,
            y: pos.y/this.animationState.sizeY
        });
    },
    simulateBall(x, y) {
        var fn = this.fns[this.state.model];
        this.simulateToHalt({
            x: {
                modelFn: this.state.model === "gravity" ? this.fns.airDrag : fn
            },
            y: {
                modelFn: fn
            }
        });
    },
    performAnimation() {
        var node = this.refs.ball.getDOMNode();
        node.style.left = (this.animationState.x*100)+"%";
        node.style.top = (this.animationState.y*100)+"%";
    },
    fns: {
        damper: Model.helpers.constrain(Model.uncontrolled.damper, [Model.constraints.elasticBoundaries(0, 1)]),
        fluidDrag: Model.helpers.constrain(Model.uncontrolled.fluidDrag, [Model.constraints.elasticBoundaries(0, 1)]),
        gravity: Model.helpers.constrain(Model.uncontrolled.gravityUpsideDown, [Model.constraints.elasticBoundaries(0, 1, 0.7)]),
        airDrag: Model.helpers.constrain(Model.uncontrolled.airDrag, [Model.constraints.elasticBoundaries(0, 1, 0.7)]),
    }
});

React.initializeTouchEvents(true);
React.render(<Demo />, document.querySelector('body'));