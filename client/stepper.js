import { lerp, peakAtHalf, clampPointToArea } from "../both/math-helpers.js"
import { ValueNoise } from 'value-noise-js';
import { getRandomIdleRoutine } from './bots.js'
const noise = new ValueNoise();

export const stepper = function(pointerCallbacks = []) {
  for(let id of Object.keys(this.pointers.keys)) {
    let pointer = this.pointers.get(id)
    stepEventQueue(pointer);
    applyGravity(pointer)
    pointer.coords = clampPointToArea(pointer.coords, this.windowBoundaries);
    this.pointers.set(id, pointer);
    pointerCallbacks.forEach(c => c(pointer));
  }
}

function applyGravity(p) {
  //Assume p.gravity is in pixels per seconds; compensate for framerate
  p.coords.y += (p.gravity / 60)
}

function stepEventQueue(pointer) {
  //Whent the event queue is empty,
  if(pointer.events.length == 0){
    if(pointer.bot && !pointer.locked) {
      //Bots get random commands
      getRandomIdleRoutine(pointer);
      return
    } else {
      //Non-bots do nothing
      return
    }
  }

  //Get the first event in the queue
  let event = pointer.events.shift();

  //Keep track of the elapsed time during this event (set it to 0 to start)
  if(!event.elapsed) event.elapsed = 0;
  //Step it by a frame each frame (assuming constant 60fps)
  event.elapsed += 1000/60.0;

  //Use t as a shorthand for the relative time elapsed in this event
  //t=0 at the start of the animation,
  //t=1 at the end of the animation
  let t
  if(event.duration) {
    t = event.elapsed/event.duration
  } else if(event.type == "wait") {
    //Special case: wait events without a duration are infinite
    event.elapsed = -1
    event.duration = 0
  } else
  {
    //Special case: events without a duration are instantaneous
    //Consider the animation over
    t = 1
  }

  //Process the event, based on its type.
  //We probably want to do something based on event.elapsezd
  switch(event.type) {
    case "wait":
    //console.log("waiting " + ((event.elapsed/event.duration) * 100) + "%")
    break;
    case "lock":
      pointer.locked = event.state
    break;
    case "accessory":
      pointer.accessory = event.accessory;
    break;
    case "tree":
      pointer.tree = event.tree;
    break;
    case "bufferClick":
      pointer.bufferedClick = true
    break
    case "fade":
      if(event.from == null) event.from = pointer.opacity
      if(event.to == null) event.to = pointer.opacity
      pointer.opacity = lerp(event.from, event.to, t)
    break;
    case "move":
    //Use the current coordinates for `from` and `to` if they have not been specified 
    if(event.from == null) event.from = event.from = {...pointer.coords}
    if(event.to == null) event.to = event.to = {...pointer.coords}
    //The position of the cursor at `t` is a linear interpolation between `from` and `to`
    pointer.coords.x = lerp(event.from.x, event.to.x, t)
    pointer.coords.y = lerp(event.from.y, event.to.y, t)
    break;
    case "humanizedMove":
    //Use the current coordinates for `from` and `to` if they have not been specified 
    if(event.from == null) event.from = {...pointer.coords}
    if(event.to == null) event.to = {...pointer.coords}
    //Positional offset: move the pointer around the desired position
    let offset = {x:0, y:0}
    let offsetAmp = event.offsetAmp ?? 20.0 //Amplitude of the offset, how far it's allowed to deviate from its normal position, in pixels
    let offsetRate = event.offsetRate ?? 3 //Variation rate: how quickly the values can change
    //Sample a noise function to get an amount between 0 and 1,
    // and scale that to [-offsetAmp/2, offsetAmp/2]
    offset.x = noise.evalXY(t * offsetRate, pointer.seed??0) * offsetAmp - offsetAmp/2.0
    offset.y = noise.evalXY(t * offsetRate, pointer.seed??0 + 10) * offsetAmp - offsetAmp/2.0

    //Temporal offset: randomize the current time in the animation (creating a sort of wonky easing function)
    let delay = {x:0, y:0}
    let delayAmp = event.delayAmp ?? 0.2; //How much to deviate from normal time (on the relative time scale, where 0 is start and 1 is end)
    let delayRate = event.delayRate ?? 5; //Variation rate: how quickly the values can change
    delay.x = noise.evalXY(t * delayRate, pointer.seed??0) * delayAmp - delayAmp/2.0
    delay.y = noise.evalXY(t * delayRate, pointer.seed??0 + 10) * delayAmp - delayAmp/2.0

    //Tone down the randomization near the start and end positions
    let attenuation = peakAtHalf(t);
    offset.y *= attenuation
    offset.x *= attenuation
    delay.x *= attenuation
    delay.y *= attenuation

    //The position of the cursor at `t` is a linear interpolation between `from` and `to`,
    //- except `t` is randomly delayed forward or backward a bit,
    //- and the position is offset by a small amount,
    //both of which vary along the path.
    //Not so linear after all.
    pointer.coords.x = lerp(event.from.x, event.to.x, t + delay.x) + offset.x
    pointer.coords.y = lerp(event.from.y, event.to.y, t + delay.y) + offset.y
    break;
    default:
    break;
  }

  //If the event isn't finished, replace in the queue, to be further consumed next frame
  if(event.elapsed < event.duration??0) {
    pointer.events.unshift(event)
  }
}