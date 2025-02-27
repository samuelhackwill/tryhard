import { lerp, peakAtHalf, clampPointToArea, convertRemToPixels } from '../both/math-helpers.js'
import { ValueNoise } from 'value-noise-js'
import { autoClickerMine, moveInFrontOfCaptcha, moveOffOfCaptcha } from './bots.js'
import { streamer } from '../both/streamer.js'
import { removeTimeouts } from './components/pasUnRobot.js'

import {
  createPointer,
  checkHover,
  simulateMouseDown,
  simulateMouseUp,
  getRasp,
  getMouseBrand,
} from '../client/pages/show.js'

let clientEventQueue = []
let catpchaTemplateContainer = []

const noise = new ValueNoise()

streamer.on('tickUpdate', function (message) {
  clientEventQueue.push({ origin: 'serverTick', payload: message })
})
streamer.on('pupitreAction', function (message) {
  clientEventQueue.push({ origin: 'pupitre', payload: message })
})

export const stepper = function (pointerCallbacks = []) {
  stepEventQueue(clientEventQueue)
  // clientEventQueue = [] // Clear queue after processing

  // for (let id of Object.keys(this.pointers.keys)) {
  //   let pointer = this.pointers.get(id)
  //   stepEventQueue(pointer)
  //   applyGravity(pointer)
  //   pointer.coords = clampPointToArea(pointer.coords, this.windowBoundaries)
  //   this.pointers.set(id, pointer)
  //   pointerCallbacks.forEach((c) => c(pointer))
  // }
}

// function applyGravity(p) {
//   //Assume p.gravity is in pixels per seconds; compensate for framerate
//   p.coords.y += p.gravity / 60
// }

function stepEventQueue(queue) {
  //Whent the event queue is empty,
  if (queue.length == 0) {
    return
  }
  timestampStart = Date.now()
  autoPlayCollector = []
  for (let i = queue.length - 1; i >= 0; i--) {
    // ok so maybe here we first get all clicker click farm events and merge them, or add them to a different queue, which is then iterated through to update all the pointers in batch
    if (queue[i].origin == 'autoplay') {
      handleAutoPlay(queue[i].payload)
    }
    if (queue[i].origin == 'pupitre') {
      handlePupitreAction(queue[i].payload)
    }
    if (queue[i].origin == 'serverTick') {
      handleTickUpdate(queue[i].payload)
    }

    // remove event from queue
    queue.splice(i, 1)

    if (i == 0) {
      let timestampEnd = Date.now()
      if (timestampEnd - timestampStart > 16) {
        console.log('event queue read in ', timestampEnd - timestampStart, 'ms.')
      }
    }
  }
  return

  if (pointer.events.length == 0) {
    if (pointer.bot && !pointer.locked) {
      //Bots NEED TO MINE!
      autoClickerMine(pointer)
      // getRandomIdleRoutine(pointer)
      // console.log('empty queue')
      return
    } else {
      //Non-bots do nothing
      return
    }
  }

  //Get the first event in the queue
  let event = pointer.events.shift()

  //Keep track of the elapsed time during this event (set it to 0 to start)
  if (!event.elapsed) event.elapsed = 0
  //Step it by a frame each frame (assuming constant 60fps)
  event.elapsed += 1000 / 60.0

  //Use t as a shorthand for the relative time elapsed in this event
  //t=0 at the start of the animation,
  //t=1 at the end of the animation
  let t
  if (event.duration) {
    t = event.elapsed / event.duration
  } else if (event.type == 'wait') {
    //Special case: wait events without a duration are infinite
    event.elapsed = -1
    event.duration = 0
  } else {
    //Special case: events without a duration are instantaneous
    //Consider the animation over
    t = 1
  }

  //Process the event, based on its type.
  //We probably want to do something based on event.elapsezd
  switch (event.type) {
    case 'wait':
      //console.log("waiting " + ((event.elapsed/event.duration) * 100) + "%")
      break
    case 'lock':
      pointer.locked = event.state
      break
    case 'accessory':
      pointer.accessory = event.accessory
      break
    case 'tree':
      pointer.tree = event.tree
      break
    case 'bufferClick':
      pointer.bufferedClick = true
      break
    case 'fade':
      if (event.from == null) event.from = pointer.opacity
      if (event.to == null) event.to = pointer.opacity
      pointer.opacity = lerp(event.from, event.to, t)
      break
    case 'move':
      //Use the current coordinates for `from` and `to` if they have not been specified
      if (event.from == null) event.from = event.from = { ...pointer.coords }
      if (event.to == null) event.to = event.to = { ...pointer.coords }
      //The position of the cursor at `t` is a linear interpolation between `from` and `to`
      pointer.coords.x = lerp(event.from.x, event.to.x, t)
      pointer.coords.y = lerp(event.from.y, event.to.y, t)
      break
    case 'humanizedMove':
      //Use the current coordinates for `from` and `to` if they have not been specified
      if (event.from == null) event.from = { ...pointer.coords }
      if (event.to == null) event.to = { ...pointer.coords }
      //Positional offset: move the pointer around the desired position
      let offset = { x: 0, y: 0 }
      let offsetAmp = event.offsetAmp ?? 20.0 //Amplitude of the offset, how far it's allowed to deviate from its normal position, in pixels
      let offsetRate = event.offsetRate ?? 3 //Variation rate: how quickly the values can change
      //Sample a noise function to get an amount between 0 and 1,
      // and scale that to [-offsetAmp/2, offsetAmp/2]
      offset.x = noise.evalXY(t * offsetRate, pointer.seed ?? 0) * offsetAmp - offsetAmp / 2.0
      offset.y = noise.evalXY(t * offsetRate, pointer.seed ?? 0 + 10) * offsetAmp - offsetAmp / 2.0

      //Temporal offset: randomize the current time in the animation (creating a sort of wonky easing function)
      let delay = { x: 0, y: 0 }
      let delayAmp = event.delayAmp ?? 0.2 //How much to deviate from normal time (on the relative time scale, where 0 is start and 1 is end)
      let delayRate = event.delayRate ?? 5 //Variation rate: how quickly the values can change
      delay.x = noise.evalXY(t * delayRate, pointer.seed ?? 0) * delayAmp - delayAmp / 2.0
      delay.y = noise.evalXY(t * delayRate, pointer.seed ?? 0 + 10) * delayAmp - delayAmp / 2.0

      //Tone down the randomization near the start and end positions
      let attenuation = peakAtHalf(t)
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
      break
    default:
      break
  }

  //If the event isn't finished, replace in the queue, to be further consumed next frame
  if (event.elapsed < event.duration ?? 0) {
    pointer.events.unshift(event)
  }
}

function handlePupitreAction(message) {
  switch (message.content) {
    case 'bgToblue':
      instance.bgColor.set('blue')
      break
    case 'bgToblack':
      instance.bgColor.set('#1C1917')
      break
    case 'bgTogrey':
      instance.bgColor.set('oklch(0.869 0.022 252.894)')
      break
    case 'showNicks':
      instance.areNamesHidden.set(false)
      break
    case 'captcha-spin':
      if (message.args) {
        document.getElementById('pasUnRobot').classList.add('rotate-loop-fast')
      } else {
        document.getElementById('pasUnRobot').classList.add('rotate-loop')
      }
      break
    case 'cancelCaptchaTimeouts':
      removeTimeouts()
      break
    case 'killCaptchas':
      // hum that's an edge case, but if we launch a captcha by mistake, kill it immediately, and then launch another one, then that captcha will be eliminated by the old one's settimeout. So yeah we need to clear these timeouts. nice!
      removeTimeouts()
      const element = document.getElementById('pasUnRobot')
      element.style.opacity = 0

      Meteor.setTimeout(function () {
        catpchaTemplateContainer.forEach((captcha) => {
          Blaze.remove(captcha)
        })
      }, parseFloat(getComputedStyle(element).transitionDuration) * 1000)
      break
    case 'unchoosePlayers':
      Object.values(instance.pointers.all()).forEach((obj) => {
        _pointer = instance.pointers.get(obj.id)
        _pointer.chosen = undefined
        instance.pointers.set(obj.id, _pointer)
      })
      break
    case 'choosePlayer':
      Object.values(instance.pointers.all()).forEach((obj) => {
        let transformedId = getRasp(obj.id) + '_' + getMouseBrand(obj.id)
        _pointer = instance.pointers.get(obj.id)
        _pointer.chosen = transformedId === message.args

        if (transformedId === message.args) {
          moveInFrontOfCaptcha(_pointer)
        }

        instance.pointers.set(obj.id, _pointer)
      })
      break
    case 'newCaptcha-1j':
      catpchaTemplateContainer.push(
        Blaze.renderWithData(
          Template.pasUnRobot,
          message.args,
          document.getElementsByClassName('milieuContainer')[0],
        ),
      )
      break
  }
  return
}

function handleTickUpdate(message) {
  message.forEach((element, i) => {
    let pointer = instance.pointers.get(element.client)
    if (pointer == undefined) {
      // OK donc là il faut aussi vérifier si cette souris n'a pas été désactivée (c'est à dire que le siège devant la souris est innocupé)
      // lol d'ailleurs ça va être un délire pendant l'entrée public de regarder qui prend quelle souris. y'a des cowboys qui vont sans doute prendre la souris que j'ai pas prévu pour leur siège.

      // donc on appelle le serveur pour savoir si la souris est cancel et pi cé tou
      const canceled = isMouseDisabled(element)
      if (canceled) {
        return
      }

      pointer = createPointer(element.client)

      // pointer.initialisationCoords = { y: i * 15, x: i * 2 }

      //QUICKFIX: set a default state for all the cursors (hidden, not dead, no accessory, etc)
      if (pointer.id != 'samuel') {
        // resetRoutine(pointer)
      }
      // players.push(pointer)

      //we're only using meteor reactivity to CREATE the pointers in the DOM. that's it
      instance.pointers.set(pointer.id, pointer)
    }

    let DOMpointer = document.getElementById(pointer.id)

    const coords = {
      x: Number(DOMpointer.getAttribute('data-x')),
      y: Number(DOMpointer.getAttribute('data-y')),
    }

    if (!pointer.locked) {
      //Move messages are relative (e.g. 1px right, 2px down)
      //Apply that change to the coords
      switch (
        isInWindowBoundaries(
          'x',
          coords.x,
          element.x,
          convertRemToPixels(instance.pointerWidth.get()),
        )
      ) {
        case 'x-in-bounds':
          coords.x += element.x
          break
        case 'overflow-right':
          console.log('overflow right')
          coords.x =
            instance.windowBoundaries.width - convertRemToPixels(instance.pointerWidth.get())
          break
        case 'overflow-left':
          console.log('overflow left')
          coords.x = 0
          break

        default:
          break
      }

      switch (
        isInWindowBoundaries(
          'y',
          coords.y,
          element.y,
          convertRemToPixels(instance.pointerHeight.get()),
        )
      ) {
        case 'y-in-bounds':
          coords.y += element.y
          break
        case 'overflow-bottom':
          console.log('overflow bottom')
          coords.y =
            instance.windowBoundaries.height - convertRemToPixels(instance.pointerHeight.get())
          break
        case 'overflow-top':
          console.log('overflow top')
          coords.y = 0
          break

        default:
          break
      }

      // here we need to update the DOM en fonction du dataset

      let transform = DOMpointer.style.transform || ''

      // Remove any existing translate (optional if you want to overwrite it every time)
      transform = transform.replace(/translate\([^)]+\)/, '')

      // Add the new translate
      transform = `${transform} translate(${coords.x}px, ${coords.y}px)`.trim()

      // Apply the updated transform
      DOMpointer.style.transform = transform

      // Also apply the updated data
      DOMpointer.setAttribute('data-x', coords.x)
      DOMpointer.setAttribute('data-y', coords.y)

      // check clicks
      if (element.buttonEvents.length > 0) {
        for (let x = 0; x < element.buttonEvents.length; x++) {
          simulateMouseEvent(element.buttonEvents[x].code, element.buttonEvents[x].value, pointer)
        }
      }

      //quand on bouge un pointeur, ça en fait automatiquement le pointeur le plus élevé et le plus au-dessus.
      // global_z_index = global_z_index + 1
      // if (document.getElementById(pointer.id)) {
      //   document.getElementById(pointer.id).style.zIndex = global_z_index
      // }

      // check hover
      checkHover(pointer)
    }
  })
}

function handleAutoPlay(message) {
  _message = message
  const pointer = _message.pointer
  //Keep track of the elapsed time during this event (set it to 0 to start)
  if (!_message.elapsed) _message.elapsed = 0
  //Step it by a frame each frame (assuming constant 60fps)
  _message.elapsed += 1000 / 60.0

  //Use t as a shorthand for the relative time elapsed in this event
  //t=0 at the start of the animation,
  //t=1 at the end of the animation
  let t
  if (_message.duration) {
    t = _message.elapsed / _message.duration
  } else if (_message.type == 'wait') {
    //Special case: wait events without a duration are infinite
    _message.elapsed = -1
    _message.duration = 0
  } else {
    //Special case: events without a duration are instantaneous
    //Consider the animation over
    t = 1
  }

  switch (_message.type) {
    case 'wait':
      //console.log("waiting " + ((event.elapsed/event.duration) * 100) + "%")
      break

    // case 'bufferClick':
    //   simulateMouseDown(pointer)
    //   setTimeout(() => {
    //     simulateMouseUp(pointer)
    //   }, 150)
    //   break

    case 'move':
      //Use the current coordinates for `from` and `to` if they have not been specified
      if (_message.from == null) _message.from = _message.from = { ...pointer.coords }
      if (_message.to == null) _message.to = _message.to = { ...pointer.coords }
      //The position of the cursor at `t` is a linear interpolation between `from` and `to`
      pointer.coords.x = lerp(_message.from.x, _message.to.x, t)
      pointer.coords.y = lerp(_message.from.y, _message.to.y, t)

      instance.pointers.set(pointer.id, pointer)
      break

    default:
      break
  }

  if (_message.elapsed < _message.duration ?? 0) {
    clientEventQueue.unshift(_message)
  } else {
    return
  }
}

export const pushToClientEventQueue = function (message) {
  clientEventQueue.push(message)
}
