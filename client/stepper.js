import { lerp, convertRemToPixels } from '../both/math-helpers.js'
import { ValueNoise } from 'value-noise-js'
import { streamer } from '../both/streamer.js'
// import { observe } from './observe.js'
import { createPointer, checkHover } from '../client/pages/show.js'

let clientEventQueue = []

// we need to know when it's authorized to MOVE, so it's hard-coded here. yep
const moveAuthorized = [
  'repetition',
  'captchas-ffa',
  'captchas-tetris-ffa',
  'recre-ffa',
  'chaises',
  'chaises-squidGame',
  'clicker-ffa',
  'die-and-retry',
  'die-and-retry-squidGame',
]

const noise = new ValueNoise()

streamer.on('tickUpdate', function (message) {
  clientEventQueue.push({ origin: 'serverTick', payload: message })
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

  // console.log([...queue])

  timestampStart = Date.now()
  for (let i = queue.length - 1; i >= 0; i--) {
    // ok so maybe here we first get all clicker click farm events and merge them, or add them to a different queue, which is then iterated through to update all the pointers in batch
    if (queue[i].origin == 'autoplay') {
      // console.log(queue[i])
      handleAutoPlay(queue[i].payload)
    }
    if (queue[i].origin == 'serverTick') {
      handleTickUpdate(queue[i].payload)
    }

    queue.splice(i, 1)
    // remove event from queue

    if (i == 0) {
      let timestampEnd = Date.now()
      if (timestampEnd - timestampStart > 16) {
        console.log('event queue read in ', timestampEnd - timestampStart, 'ms.')
      }
    }
  }
}

function handleTickUpdate(message) {
  message.forEach((element, i) => {
    let pointer = instance.pointers.get(element.client)

    if (pointer == undefined) {
      // OK donc là il faut aussi vérifier si cette souris n'a pas été désactivée (c'est à dire que le siège devant la souris est innocupé)
      // lol d'ailleurs ça va être un délire pendant l'entrée public de regarder qui prend quelle souris. y'a des cowboys qui vont sans doute prendre la souris que j'ai pas prévu pour leur siège.

      // donc on appelle le serveur pour savoir si la souris est cancel et pi cé tou
      const unoccupiedSeat = isMouseDisabled(element)

      if (unoccupiedSeat) return

      if (instance.state.get() != 'repetition' && instance.state.get() != 'les-philosophes') return

      pointer = createPointer(element.client)

      // pointer.initialisationCoords = { y: i * 15, x: i * 2 }

      //QUICKFIX: set a default state for all the cursors (hidden, not dead, no accessory, etc)
      if (pointer.id != 'samuel') {
        // resetRoutine(pointer)
      }
      // players.push(pointer)

      //we're only writing into meteor reactivity to CREATE the pointers in the DOM. that's it
      instance.pointers.set(pointer.id, pointer)
    }

    // let's check if we can move
    const moveForbiden = !moveAuthorized.includes(instance.state.get())

    if (moveForbiden && (pointer.chosen == undefined || pointer.chosen == false)) {
      // console.log(
      //   'move forbidden during sequence ',
      //   instance.state.get(),
      //   '. Move is only possible during sequences : ',
      //   moveAuthorized.join(', '),
      // )
      return
    }

    const DOMpointer = document.getElementById(pointer.id) || null

    coords = readDomCoords(DOMpointer)

    if (!pointer.locked) {
      //Move messages are relative (e.g. 1px right, 2px down)
      //Apply that change to the coords
      switch (isInWindowBoundaries('x', coords.x, element.x, GlobalPointerWidth)) {
        case 'x-in-bounds':
          coords.x += element.x
          break
        case 'overflow-right':
          // samuel peut quitter l'écran s'il le veult
          if (pointer.order == -1) {
            coords.x += element.x
          } else {
            coords.x = instance.windowBoundaries.width - GlobalPointerWidth
            // observe('magellan', { p: pointer, corner: 'right' })
          }
          break
        case 'overflow-left':
          // samuel peut quitter l'écran s'il le veult
          if (pointer.order == -1) {
            coords.x += element.x
          } else {
            coords.x = 0
            // observe('magellan', { p: pointer, corner: 'left' })
          }
          break

        default:
          break
      }

      switch (isInWindowBoundaries('y', coords.y, element.y, GlobalPointerHeight)) {
        case 'y-in-bounds':
          coords.y += element.y
          break
        case 'overflow-bottom':
          if (pointer.order == -1) {
            coords.y += element.y
          } else {
            coords.y = instance.windowBoundaries.height - GlobalPointerHeight
            // observe('magellan', { p: pointer, corner: 'bottom' })
          }
          break
        case 'overflow-top':
          if (pointer.order == -1) {
            coords.y += element.y
          } else {
            coords.y = 0
            // observe('magellan', { p: pointer, corner: 'top' })
          }
          break

        default:
          break
      }

      // observe('newMove', pointer.id)

      // Apply the updated transform
      if (DOMpointer) {
        DOMpointer.dataset.x = coords.x
        DOMpointer.dataset.y = coords.y

        DOMpointer.style.transform = `translate(${coords.x}px, ${coords.y}px)`
        writeDomCoords(DOMpointer, coords)
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
      if (instance.state.get() == 'clicker-ffa') {
        // let's skip this guy, we're not checking hover during clicker sequence
      } else {
        checkHover(pointer)
      }
    }
  })
}

function handleAutoPlay(message) {
  const _message = message
  const pointer = _message.pointer

  //Keep track of the elapsed time during this event (set it to 0 to start)
  if (!_message.elapsed) _message.elapsed = 0
  //Step it by a frame each frame (assuming constant 60fps)
  _message.elapsed += 1000 / 64

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
    case 'moveLoop':
      const DOMpointer = document.getElementById(pointer.id)
      const coords = readDomCoords(DOMpointer)
      // console.log("message from ", _message.from, "message to ",  _message.to)
      //Use the current coordinates for `from` and `to` if they have not been specified
      if (_message.from == null) _message.from = { ...coords }
      if (_message.to == null) _message.to = { ...coords }
      //The position of the cursor at `t` is a linear interpolation between `from` and `to`
      coords.x = lerp(_message.from.x, _message.to.x, t)
      coords.y = lerp(_message.from.y, _message.to.y, t)

      let transform = DOMpointer?.style.transform || ''
      transform = transform.replace(/translate\([^)]+\)/, '')
      transform = `${transform} translate(${coords.x}px, ${coords.y}px)`.trim()

      if (DOMpointer) {
        DOMpointer.style.transform = transform

        writeDomCoords(DOMpointer, coords)
      }

      break

    default:
      break
  }

  if (_message.elapsed < _message.duration ?? 0) {
    const restructuredMessage = { origin: 'autoplay', payload: _message }
    clientEventQueue.push(restructuredMessage)
  } else {
    if (_message.type == 'moveLoop') {
      loopPointerAroundCorners(_message.pointer, _message.cornerIndex)
    }
    // console.log('dropping pointer ', message.pointer.id, message.elapsed)
    return
  }
}

export const pushToClientEventQueue = function (message) {
  clientEventQueue.push(message)
}

isInWindowBoundaries = function (axis, coords, acceleration, elemSize) {
  // can return : x-in-bounds / overflow-left / overflow-right / y-in-bounds / overflow-bottom / overflow-top
  // console.log(axis, coords, acceleration, elemSize)
  if (axis == 'x') {
    if (coords + acceleration + elemSize > instance.windowBoundaries.width) {
      return 'overflow-right'
    }
    if (coords + acceleration < 0) {
      return 'overflow-left'
    }
    if (
      coords + acceleration + elemSize < instance.windowBoundaries.width &&
      coords + acceleration > 0
    ) {
      return 'x-in-bounds'
    }
  } else {
    if (coords + acceleration + elemSize > instance.windowBoundaries.height) {
      return 'overflow-bottom'
    }
    if (coords + acceleration < 0) {
      return 'overflow-top'
    }
    if (
      coords + acceleration + elemSize < instance.windowBoundaries.height &&
      coords + acceleration > 0
    ) {
      return 'y-in-bounds'
    }
  }
}

nukeEventQueue = function () {
  clientEventQueue.length = 0
}
