"use strict";

var React = require('react/addons'),
    {animationMixin, Model} = require('../src/index.jsx');

var getTouchPos = (e) => {
    var touch = (e.touches && e.touches[0]) || e;
    return {x: touch.clientX, y: touch.clientY};
};

var Demo = React.createClass({
    // Make sure the motor is running...
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
    // The initial state
    getInitialAnimationState() {
        return {
            x: 0.5,
            y: 0.5,
            mousedown: false,
            sizeX: 1280,
            sizeY: 720
        };
    },
    down(e) {
        this.animationState.mousedown = true;
        var pos = getTouchPos(e);
        this.startIndirectUserInput({
            x: {
                endValue: pos.x/this.animationState.sizeX,
                modelFn: Model.controlled.underDamped
            },
            y: {
                endValue: pos.y/this.animationState.sizeY,
                modelFn: Model.controlled.underDamped
            }
        });
    },
    up(e) {
        this.animationState.mousedown = false;
        this.simulateBall(0.5, 0.5);
    },
    // Your render method should NOT depend on animationState!
    render() {
        return <div onMouseMove={this.animateBall} onTouchMove={this.animateBall}
                    onMouseDown={this.down} onTouchStart={this.down}
                    onMouseUp={this.up} onTouchEnd={this.up} onTouchCancel={this.up}
                    style={{height:"100%"}}>
            <div ref="ball"
                 style={{backgroundColor:"red", width: "50px", height: "50px", borderRadius: "10px",
                         position: "absolute", marginLeft: "-25px", marginTop: "-25px"}} />
        </div>;
    },
    // Your performAnimation however, definitely should
    performAnimation() {
        var node = this.refs.ball.getDOMNode();
        node.style.left = (this.animationState.x*100)+"%";
        node.style.top = (this.animationState.y*100)+"%";
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
    // Start the animation
    simulateBall(x, y) {
        this.simulateToHalt({
            x: {
                endValue: x,
                modelFn: Model.controlled.underDamped
            },
            y: {
                endValue: y,
                modelFn: Model.controlled.underDamped
            }
        });
    }
});

React.initializeTouchEvents(true);
React.render(<Demo />, document.querySelector('body'));