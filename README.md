# RAnimation

An animation library for React.

## Demo

[Demo Animations](http://zinggi.github.io/RAnimation/DemoExample.html) / [Src](examples/DemoExample.jsx)  
[Demo UserInput](http://zinggi.github.io/RAnimation/UserInput.html) / [Src](examples/UserInput.jsx)  

Check out all the [examples](examples)!

## Install

```sh
npm install r-animation --save
```

## Motivation

While trying to recreate a currently native Android and IPhone app as a hybrid app (using React),
I came to the point where everything was unacceptably slow.
React's diffing algorithm might be fast enough for many "normal" things, but it's definitely too slow for doing animations (especially on mobile).

Another thing that bothered me, was that suddenly I had to put things in my state that didn't really belong there, as they were not truly describing the application's state, but solely some intermediate state, only needed for animation. This would mean that I could no longer easily serialize the applications state as it was cluttered with unnecessary state descriptions

## Features

**Performance**: Animations need to look smooth which is especially hard to achieve on mobile devices.  
To make animations as smooth as possible, all animations are offloaded into a single requestAnimationFrame.  
Even when doing animations based on user input, say in onTouchMove, the updates will not happen immediately, but only every time a frame gets rendered!

**Interruptible animations**: Animations should be interruptible, to stay fully interactive.  
When an animation is interrupted we have to be careful to keep the current velocity to get a smooth transition between two animations.  
This library always keeps track of the velocity for you and automatically passes this information on to the next animation.

**Physically based animations**: Physics gives us all we need for naturally looking movements, a mass–spring–damper system is a pure goldmine!


****

## Concepts

### Static animations

These can be useful when you need exact control over an animation, e.g. you want to know from where to where, how long and exactly how it will move.  
[Robert Penner's Easing Functions](http://www.robertpenner.com/easing/) have almost become standard for these kind of animations, so a slightly modified version of them is included in this library.  

For maximum control, but achieved by ignoring the previous velocity,  
 * Use [easeTo](http://github.com/Zinggi/RAnimation/search?q=easeTo(newState)&type=Code),  
	* Configure with [Easing.*](#Easing).

When you want to keep as much control as possible, while maintaining the previous velocity, you need to fade one animation into the other.  
 * Use [easeTo](http://github.com/Zinggi/RAnimation/search?q=easeTo(newState)&type=Code) with a fade object.  
	* Configure with [Easing.*](#Easing).

### Physical animations

If you want physically accurate animations, you will have to give up a little bit of control over the animation.  
This means you don't know anymore how long an animation will take, but as a plus, the animation will be way more realistic.  

If you want an animation from point a to b, given some physical model describing the motion,  
 * Use [simulateToHalt](http://github.com/Zinggi/RAnimation/search?q=simulateToHalt(newState, dontStop)&type=Code),  
    * Configure with [Model.controlled.*](#Model).

If you don't need to know where the animation ends, e.g. for a scrolling list,  
 * Use [simulateToHalt](http://github.com/Zinggi/RAnimation/search?q=simulateToHalt(newState, dontStop)&type=Code),  
	* Configure with [Model.uncontrolled.*](#Model).

### User input

Use [userInput](http://github.com/Zinggi/RAnimation/search?q=userInput(newState)&type=Code) to give the user control over an animation.
Before you call that, you need to configure how the animation should react on this input with the fallowing functions:  

If you want to give a user direct control over the motion of an object,
 * Use [startDirectUserInput](http://github.com/Zinggi/RAnimation/search?q=startDirectUserInput(startState)&type=Code)

If you want to respect physical properties of an object the user is controlling, e.g. something that should feel heavy,  
 * Use [startIndirectUserInput](http://github.com/Zinggi/RAnimation/search?q=startIndirectUserInput(newState)&type=Code)
 	* Configure with [Model.controlled.*](#Model).

### Decoration / Additive animation
**This is currently in progress and not implemented yet!**  
Adding an animation on top of another could be useful, as described [here](http://ronnqvi.st/multiple-animations/).
Given that this library already does smooth interruptions of ongoing animation, the only use of this would be to add some complexity to animations, as in the heart example of the linked article.

### Animation state
The state of your animation doesn't describe you application state, therefore it will not be stored inside your state object.
Instead you can access it anytime with `this.animationState`.  
You can manipulate it with the above functions.
The initial animation state needs to be specified inside you `getInitialAnimationState` function!

### Perform animation
Since we are avoiding Reacts diffing algorithm for performance reasons, we sadly can't completely describe our UI in our render method.  
Instead, `performAnimation` will be called anytime a new frame is rendered, so that you can then imperatively modify the DOM to display your current `animationState`. This is not ideal, I would prefer a declarative way like the render method, but it seems to be necessary for good performance.


## API

Require the needed modules (only pick the ones you need):
```JS
var {animationMixin, Easing, Model} = require('r-animation');
```

### Simple examples
Check out:  
[simple animation](http://zinggi.github.io/RAnimation/SimpleDemo.html) / [src](examples/SimpleDemo.jsx)  
[simple user input](http://zinggi.github.io/RAnimation/SimpleUserInput.html) / [src](examples/SimpleUserInput.jsx)

#### animationMixin
This mixin powers the whole animation system.  
You need to implement:
 * getInitialAnimationState
 * performAnimation

It provides:  
 * easeTo
 * simulateToHalt
 * startDirectUserInput
 * startIndirectUserInput
 * userInput
 * cancelAnimation
 * getAnimation
 * startAnimation

[doc](src/animation/animationMixin.jsx)

#### Easing
A collection of easing functions.

[doc](src/animation/easing.jsx)

#### Model
A collection of physical models.

[doc](src/animation/model.jsx)

---
## Develop

First time, run:  
`npm install`  
After that, Just run:  
`grunt dev`

---
## License

[MIT](LICENSE)
