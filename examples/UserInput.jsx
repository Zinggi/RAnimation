"use strict";

var React = require('react/addons'),
    {animationMixin, Easing, EasingHelpers, Physical} = require('../src/index.jsx');

var Demo = React.createClass({
    mixins: [animationMixin],
    getInitialState() {
        return {
            mousedown: false
        };
    },
    componentDidMount() {
        this.setState({
            sizeX: this.getDOMNode().clientWidth,
            sizeY: this.getDOMNode().clientHeight,
        })
    },
    getInitialAnimationState() {
        return {
            x: 0.5,
            y: 0.5
        };
    },
    render() {
        return <div style={{height:"100%"}} onMouseMove={this.animateBall}
                    onMouseDown={(e) => {
                        this.setState({mousedown: true});
                        this.startDirectUserInput({x: e.clientX/this.state.sizeX, y: e.clientY/this.state.sizeY});
                    }}
                    onMouseUp={() => {
                        this.setState({mousedown: false});
                        this.simulateBall(0.5, 0.5);
                    }}>
            <div ref="ball"
                 style={{backgroundColor:"red", width: "50px", height: "50px", borderRadius: "10px",
                         position: "absolute", marginLeft: "-25px", marginTop: "-25px"}} />
        </div>;
    },
    animateBall(e) {
        if (!this.state.mousedown) {
            return;
        }
        // console.log("x: " + e.clientX/e.target.clientWidth + "  y: " + e.clientY/e.target.clientHeight);
        this.directUserInput({
            x: e.clientX/this.state.sizeX,
            y: e.clientY/this.state.sizeY
        });
    },
    simulateBall(x, y) {
        this.simulateTo({
            x: {
                endValue: x,
                simulationFn: Physical.underDamped
            },
            y: {
                endValue: y,
                simulationFn: Physical.underDamped
            }
        });
    },
    performAnimation() {
        var node = this.refs.ball.getDOMNode();
        node.style.left = (this.animationState.x*100)+"%";
        node.style.top = (this.animationState.y*100)+"%";
    }
});

React.render(<Demo />, document.querySelector('body'));