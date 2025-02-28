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
      if (element) {
        element.style.opacity = 0

        Meteor.setTimeout(function () {
          catpchaTemplateContainer.forEach((captcha) => {
            Blaze.remove(captcha)
          })
        }, parseFloat(getComputedStyle(element).transitionDuration) * 1000)
      }

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

    const DOMpointer = document.getElementById(pointer.id) || null

    const coords = {
      x: Number(DOMpointer?.getAttribute('data-x')),
      y: Number(DOMpointer?.getAttribute('data-y')),
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
          coords.x =
            instance.windowBoundaries.width - convertRemToPixels(instance.pointerWidth.get())
          break
        case 'overflow-left':
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
          coords.y =
            instance.windowBoundaries.height - convertRemToPixels(instance.pointerHeight.get())
          break
        case 'overflow-top':
          coords.y = 0
          break

        default:
          break
      }

      // here we need to update the DOM en fonction du dataset

      let transform = DOMpointer?.style.transform || ''

      // Remove any existing translate (optional if you want to overwrite it every time)
      transform = transform.replace(/translate\([^)]+\)/, '')

      // Add the new translate
      transform = `${transform} translate(${coords.x}px, ${coords.y}px)`.trim()

      // Apply the updated transform
      if (DOMpointer) {
        DOMpointer.style.transform = transform

        // Also apply the updated data
        DOMpointer.setAttribute('data-x', coords.x)
        DOMpointer.setAttribute('data-y', coords.y)
      }

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
  _message.elapsed += 1000 / 64.0

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
      const DOMpointer = document.getElementById(pointer.id)
      const coords = {
        x: Number(DOMpointer?.getAttribute('data-x')),
        y: Number(DOMpointer?.getAttribute('data-y')),
      }
      // console.log("message from ", _message.from, "message to ",  _message.to)
      //Use the current coordinates for `from` and `to` if they have not been specified
      if (_message.from == null) _message.from = { ...coords }
      if (_message.to == null) _message.to = { ...coords }
      //The position of the cursor at `t` is a linear interpolation between `from` and `to`
      coords.x = lerp(_message.from.x, _message.to.x, t)
      coords.y = lerp(_message.from.y, _message.to.y, t)

      // update data and transform

      // here we need to update the DOM en fonction du dataset

      let transform = DOMpointer?.style.transform || ''

      // Remove any existing translate (optional if you want to overwrite it every time)
      transform = transform.replace(/translate\([^)]+\)/, '')

      // Add the new translate
      transform = `${transform} translate(${coords.x}px, ${coords.y}px)`.trim()

      // Apply the updated transform
      if (DOMpointer) {
        DOMpointer.style.transform = transform

        // Also apply the updated data
        DOMpointer.setAttribute('data-x', coords.x)
        DOMpointer.setAttribute('data-y', coords.y)
      }

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
