import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import { streamer } from '../../both/streamer.js'
import { stepper } from '../stepper.js'
import { playAudio } from '../audioAssets/audio.js'
// import { getRandomBossAccessory, getRandomAccessory } from '../dressup.js'
// import { getRandomTree } from '../trees.js'
import {
  sendToSides,
  circleRoutine,
  dressupAnimation,
  killAnimation,
  treePickUpAnimation,
} from '../bots.js'
import {
  resetRoutine,
  welcomeRoutine,
  regroupRoutine,
  squareRoutine,
  playgroundRoutine,
  axisRoutine,
  graphRoutine,
} from '../bots.js'
import { randomBetween } from '../../both/math-helpers.js'

import { handlePupitreMessage } from '../components/feed.js'

import '../components/main.js'
import './show.html'
import { animateMiniClocks } from '../components/clock.js'

let eventQueue = []
let pointers = []
let bots = []
let players = []

// THIS IS FOR THE DVD animation stuff
// Initialize position, velocity, and screen bounds
let x = Math.random() * window.innerWidth
let y = Math.random() * window.innerHeight
let vx = 2 + Math.random() * 3 // Velocity in x direction
let vy = 2 + Math.random() * 3 // Velocity in y direction
let dvdPhase2 = false

// Available colors for collision
const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c']

Template.show.onCreated(function () {
  this.feedToggle = new ReactiveVar(true)
  this.bgColor = new ReactiveVar('#1C1917')

  this.scoreSprintEntreePublic = new ReactiveDict()
  this.scoreSprint1p = new ReactiveDict()
  this.scoreSprint2p = new ReactiveDict()
  this.areNamesHidden = new ReactiveVar(true)
  this.areClocksHidden = new ReactiveVar(true)
  this.arePointersHidden = new ReactiveVar(false)
  this.plantedTrees = new ReactiveDict()
  this.pointers = new ReactiveDict()

  this.windowBoundaries = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight - 60 }

  // fuuuuu
  // ux state for windows
  this.isAdminOpen = new ReactiveVar(false)
  this.adminPosition = new ReactiveVar([0, 0])
  this.whichBackground = new ReactiveVar('slate.png')

  // make instance callable from everywhere
  instance = this

  //Start the stepper at a fixed framerate (60fps)
  this.stepInterval = Meteor.setInterval(
    stepper.bind(this, [checkHover, checkBufferedClick]), //Call stepper, passing `this` as the context, and an array of callbacks to call on each pointer every frame
    (1 / 60.0) * 1000, //60 frames per second <=> (1000/60)ms per frame
  )

  //Listen to logger events (one message whenever a pointer moves or clicks)
  streamer.on('pointerMessage', handlePointerMessage)

  //Listen to admin calls to action (like displaying score ou quoi)
  streamer.on('pupitreAction', handlePupitreAction)

  // //Create 96 bots
  // this.bots = [] //Keep the array of bots on hand, it's easier than filtering this.pointers every time
  // for (let i = 0; i < 96; i++) {
  //   let bot = createBot('bot' + i)
  //   //QUICKFIX: set a default state (hidden, not dead, etc). Probably should be done elsewhere
  //   resetRoutine(bot)
  //   this.pointers.set(bot.id, bot)
  //   bots.push(bot)
  // }
  // //Keep this around: it gives bots a home position
  // sendToSides(bots, this.windowBoundaries)

  // bots.forEach((b) => this.pointers.set(b.id, b))
})
Template.show.onDestroyed(function () {
  //Stop the stepper
  clearInterval(this.stepInterval)
  //Stop listening to logger events
  streamer.removeAllListeners('pointerMessage')
  pointers = []
})
Template.show.onRendered(function () {
  streamer.emit('showInit', { width: window.innerWidth, height: window.innerHeight })
})

function handlePupitreAction(message) {
  switch (message.content) {
    case 'showNicks':
      instance.areNamesHidden.set(false)
      break
    case 'togglePointers':
      _trueOrFalse = instance.arePointersHidden.get()
      _hidden = !_trueOrFalse

      const button = document.getElementById('bonjourSamuel') || false

      if (_hidden) {
        if (button) button.classList.add('pointer-events-none')
      } else {
        if (button) button.classList.remove('pointer-events-none')
      }
      instance.arePointersHidden.set(_hidden)

      break

    case 'initPointers':
      console.log('init pointers')
      let index = 1

      const len = Object.keys(instance.pointers.all()).length

      Object.entries(instance.pointers.all()).forEach(([key, value]) => {
        circleRoutine(value, len, index)
        instance.pointers.set(key, value)
        index++
      })
      break

    case 'startCountingPlayers':
      instance.scoreSprintEntreePublic.set('startTime', new Date())
      break
    case 'stopCountingPlayers':
      instance.scoreSprintEntreePublic.set('endTime', new Date())
      break
    case 'displayPlayerCount':
      // we need to substract 2 because 2 of the objects of scroSprintEntreePublic are startTime and endTime
      let plural = { s: '', ont: 'a' }
      let text = ''
      let count = Object.keys(instance.scoreSprintEntreePublic.all()).length - 2

      if (count > 1 || count == 0) {
        plural.s = 's'
        plural.ont = 'ont'
      }

      text = `${count} personne${plural.s} ${plural.ont} déjà commencé à jouer.`
      console.log(text)

      if (count < 0)
        text =
          "oups Samuel a oublié de lancer le programme pour regarder qui était en train de faire des trucs avec sa souris! _again!_ Ou alors il y a un bug peut-être, auquel cas pardon Samuel d'avoir été passif-agressif. Enfin ceci dit si y'a un bug c'est aussi de ma faute donc bon"

      handlePupitreMessage({ type: 'newLine', content: text })

      break

    // case 'startRace':
    //   instance.scoreSprint1p.set('startTime', new Date())
    //   break

    // case 'showNick':
    //   // get ID of that pointer, associate it with a new nick and show the nick div.
    //   data = instance.scoreSprint1p.all()
    //   // get everything and then get the smallest score
    //   const smallestTime = Object.entries(data).reduce(
    //     (min, [key, value]) => {
    //       return value.time < min.value.time ? { key, value } : min
    //     },
    //     { key: null, value: { time: Infinity } },
    //   )

    //   _pointer = instance.pointers.get(smallestTime.key)
    //   console.log(_pointer)
    //   _pointer.nick = 'Atalante-du-7e-Arrdt'
    //   instance.pointers.set(smallestTime.key, _pointer)

    //   instance.areNamesHidden.set(false)
    //   break

    case 'savemeDvd':
      dvdMove('saveme')
      break

    case 'dvdPhase2':
      dvdPhase2 = true
      break

    case 'showClocks':
      instance.areClocksHidden.set(false)
      break

    case 'startTimers':
      requestAnimationFrame(animateMiniClocks)

      break

    default:
      break
  }
}

function handlePointerMessage(message) {
  console.log('debug ', message)
  let pointer = instance.pointers.get(message.loggerId)

  //We don't know this pointer yet.
  //Welcome!
  if (pointer == undefined) {
    pointer = createPointer(message.loggerId)
    //QUICKFIX: set a default state for all the cursors (hidden, not dead, no accessory, etc)
    if (pointer.id != 'samuel') {
      // resetRoutine(pointer)
    }
    players.push(pointer)
  }

  if (message.type == 'move' && !pointer.locked) {
    //Move messages are relative (e.g. 1px right, 2px down)
    //Apply that change to the coords
    pointer.coords.x += message.coords.x
    pointer.coords.y += message.coords.y
    //Save the pointer
    instance.pointers.set(pointer.id, pointer)
  } else if (message.type == 'mousedown') {
    simulateMouseDown(pointer)
  } else if (message.type == 'mouseup') {
    simulateMouseUp(pointer)
  }
}

Template.show.helpers({
  hasNick() {
    if (this.nick) {
      return true
    } else {
      return false
    }
  },
  arePointersHidden() {
    if (Template.instance().arePointersHidden.get() === true) {
      return 'opacity-0'
    } else {
      return 'opacity-1'
    }
  },
  areClocksHidden() {
    if (Template.instance().areClocksHidden.get() === true) {
      return 'opacity-0'
    } else {
      return 'opacity-1'
    }
  },
  areNamesHidden() {
    if (Template.instance().areNamesHidden.get() === true) {
      return 'opacity-0'
    } else {
      return 'opacity-1'
    }
  },
  // Get all client pointers for iteration if you want to display all.
  allPointers(arg) {
    if (arg.hash.getAdmin === true) {
      // the pointer with ?id=samuel is the boss!
      pointer = instance.pointers.get('samuel')
      if (pointer == undefined) {
        return
      } else {
        return [pointer]
      }
    } else {
      allPointers = instance.pointers.all()
      const { samuel, ...userData } = allPointers
      pointers = Object.values(userData)
      return pointers
    }
  },
  allPlantedTrees() {
    return Object.values(instance.plantedTrees.all())
  },
  isAdmin() {
    return true
  },
})

Template.show.events({
  'mouseup #saveme'(e, t, p) {
    clock = document.getElementById('pointer' + p.pointer.id).querySelector('.miniclock')

    if (clock) {
      clock.classList.add('opacity-0')

      Meteor.setTimeout(function () {
        clock.remove()
      }, 250)
    }
  },
  'mouseup #bonjourSamuel'(e, template, p) {
    if (instance.arePointersHidden.get()) return

    // ok so here we're using JSON parsing & stringifying because we can't store js objects directly in the html-data attributes.

    playAudio('bonjour')

    visitedBefore = JSON.parse(e.target.getAttribute('visitedBy')) || {}

    _id = p.pointer.id

    let pointer = instance.pointers.get(p.pointer.id)

    if (pointer.bgColor == '#60A5FA') {
      // if pointer is red, then this peep has already clicked twice, we don't want to modify its pointer any more so yeah just return.
      return
    }

    // if (visitedBefore.hasOwnProperty(_id)) {
    //   pointer.bgColor = 'red'
    //   pointer.outlineColor = '#000000'
    // } else {
    pointer.bgColor = '#60A5FA'
    // }

    visitedBefore[_id] = true

    e.target.setAttribute('visitedBy', JSON.stringify(visitedBefore))

    // if iclick une fois, vert
    // if iclick plus que une fois, autre couleur
    template.pointers.set(p.pointer.id, pointer)
    // Meteor.setTimeout(function () {
    // }, 50)
  },

  'mouseup .backgroundContainer'(event, tpl, extra) {
    if (instance.arePointersHidden.get()) return
    if (!extra) return

    let pointer = instance.pointers.get(extra.pointer.id)

    if (extra.pointer.id == 'samuel') {
      tpl.isAdminOpen.set(false)
    }
  },

  'mouseup #background'(event, tpl, extra) {
    // console.log('click background')
    if (instance.arePointersHidden.get()) return
    if (!extra) return

    let pointer = instance.pointers.get(extra.pointer.id)
    if (!pointer) {
      return
    }

    //Is it currently the 2p sprint race? (this is to get the second player)
    if (instance.scoreSprint2p.get('startTime') && !instance.scoreSprint2p.get('endTime')) {
      const _id = extra.pointer.id

      // we need to check if it's not p1 clicking!!! we'll clean that stuff later
      p1data = instance.scoreSprint1p.all()

      const smallestTimep1 = Object.entries(p1data).reduce(
        (min, [key, value]) => {
          return value.time < min.value.time ? { key, value } : min
        },
        { key: null, value: { time: Infinity } },
      )

      p1id = instance.pointers.get(smallestTimep1.key).id
      console.log(p1id, extra.pointer.id)
      if (p1id == extra.pointer.id) return

      //////// if it's not p1, go along

      const finishTime = new Date()
      const score = finishTime - instance.scoreSprint2p.get('startTime')
      instance.scoreSprint2p.set(_id, { time: score })
      instance.scoreSprint2p.set('endTime', finishTime)

      data = instance.scoreSprint2p.all()
      // get everything and then get the smallest score
      const smallestTime = Object.entries(data).reduce(
        (min, [key, value]) => {
          return value.time < min.value.time ? { key, value } : min
        },
        { key: null, value: { time: Infinity } },
      )

      Meteor.setTimeout(() => {
        document.getElementById('pointer' + _id).style.transform = 'scale(1000)'

        document.getElementById('pointer' + _id).classList.remove('opacity-0')
      }, 20)

      Meteor.setTimeout(() => {
        document
          .getElementById('pointer' + _id)
          .classList.add('transition-transform', 'duration-[1s]')
      }, 50)

      Meteor.setTimeout(() => {
        document.getElementById('pointer' + _id).style.transform = ''
      }, 100)

      Meteor.setTimeout(() => {
        console.log(instance.pointers.all(), smallestTime)

        _pointer = instance.pointers.get(smallestTime.key)
        _pointer.nick = 'Méléagre-de-la-guille'
        instance.pointers.set(smallestTime.key, _pointer)
      }, 1000)
    }

    //Is it currently the 1p sprint race? (this is to get the first player)
    if (instance.scoreSprint1p.get('startTime') && !instance.scoreSprint1p.get('endTime')) {
      console.log('PROUUUT')
      const _id = extra.pointer.id

      const finishTime = new Date()
      const score = finishTime - instance.scoreSprint1p.get('startTime')
      instance.scoreSprint1p.set(_id, { time: score })
      instance.scoreSprint1p.set('endTime', finishTime)

      document.getElementById('pointer' + _id).style.transform = 'scale(1000)'

      document.getElementById('pointer' + _id).classList.remove('opacity-0')

      Meteor.setTimeout(() => {
        document
          .getElementById('pointer' + _id)
          .classList.add('transition-transform', 'duration-[1s]')
      }, 50)

      Meteor.setTimeout(() => {
        document.getElementById('pointer' + _id).style.transform = ''
      }, 100)
    }

    //Is it currently the entree public sprint race?
    // sprint-entree-public?
    if (
      instance.scoreSprintEntreePublic.get('startTime') &&
      !instance.scoreSprintEntreePublic.get('endTime') &&
      !instance.scoreSprintEntreePublic.get(extra.pointer.id)
    ) {
      // the race has started but isn't finished and the reactiveDict doesn't already contain a log for that pointer's id.
      const finishTime = new Date()
      const score = finishTime - instance.scoreSprintEntreePublic.get('startTime')

      // score is in milisecs
      instance.scoreSprintEntreePublic.set(extra.pointer.id, { time: score })
    }

    //Does the pointer currently hold a tree?
    if (pointer.tree) {
      //Make up a new tree identifier (they're sequential)
      let newTreeId = 'tree-' + Object.keys(instance.plantedTrees.all()).length
      //Add that tree to the reactive plantedTrees dictionary, so it can appear on the page
      instance.plantedTrees.set(newTreeId, { coords: pointer.coords, tree: pointer.tree })
      //The pointer no longer holds a tree
      pointer.tree = null
      instance.pointers.set(pointer.id, pointer)
    }
  },
  'mouseup .pointer'(event, tpl, extra) {
    if (instance.arePointersHidden.get()) return

    //Boss "kill on click" behaviour
    if (extra.pointer.id == 'samuel') {
      //We're a pointer clicking on another pointer (the _pointee_)
      let pointeeId = event.target.getAttribute('pointer-id')
      let pointee = instance.pointers.get(pointeeId)
      if (pointee.killable) {
        killAnimation(pointee)
        instance.pointers.set(pointee.id, pointee)
      }
    }
  },
  // 'click #folderVestiaire'(event, tpl, extra) {
  //   if (!extra) return //No extra data was provided: we don't know which pointer clicked?
  //   let pointer = instance.pointers.get(extra.pointer.id)
  //   //Don't let locked pointers change their accessories
  //   if (pointer.locked) return

  //   //Clear the event queue (this helps bot dress up immediately, humans probably don't have events)
  //   pointer.events = []

  //   if (pointer.id == 'samuel') {
  //     dressupAnimation(pointer, getRandomBossAccessory())
  //   } else {
  //     dressupAnimation(pointer, getRandomAccessory())
  //   }

  //   instance.pointers.set(pointer.id, pointer)
  // },
  // 'click #folderTrees'(event, tpl, extra) {
  //   if (!extra) return //No extra data was provided: we don't know which pointer clicked?
  //   let pointer = instance.pointers.get(extra.pointer.id)

  //   //Don't let locked pointers change their accessories
  //   if (pointer.locked) return

  //   treePickUpAnimation(pointer, getRandomTree())

  //   instance.pointers.set(pointer.id, pointer)
  // },
  // 'click #folderAdmin'(event, tpl, extra) {
  //   if (extra) {
  //     instance.adminPosition.set([extra.pointer.coords.x, extra.pointer.coords.y])
  //   } else {
  //     instance.adminPosition.set([event.pageX, event.pageY])
  //   }
  //   GlobalEvent.set(GlobalEvents.OUVRIR_LA_FNET)
  // },
})

simulateMouseUp = function (pointer) {
  const elements = getElementsUnder(pointer)
  if (elements.length == 0) return
  $(element).trigger('mouseup', { pointer: pointer })

  elements.forEach((e) => e.classList.remove('clicked'))
}

simulateMouseDown = function (pointer) {
  const elements = getElementsUnder(pointer)
  if (elements.length == 0) return
  for (element of elements) {
    // we need to restrict clicks on privileged buttons, like the admin buttons
    // so that only samuel can click on them.
    if (element.classList.contains('privileged') && pointer.id != 'samuel') {
      return
    }

    //Trigger a jQuery click event with extra data (the pointer)
    $(element).trigger('mousedown', { pointer: pointer })
    element.classList.add('clicked')

    //TODO: figure out a better event propagation mechanism
    // Here's part of the issue: https://stackoverflow.com/questions/3277369/how-to-simulate-a-click-by-using-x-y-coordinates-in-javascript/78993824#78993824
    //QUICKFIX: privileged elements stop propagating a click event.
    if (element.classList.contains('stops-events')) break
  }
}

function getElementsUnder(pointer) {
  let elements = document.elementsFromPoint(pointer.coords.x, pointer.coords.y)

  //Ignore elements without an id
  elements = elements.filter((e) => e.id != '')
  //Ignore the pointer itself
  elements = elements.filter((e) => e.id != 'pointer' + pointer.id)
  elements = elements.filter((e) => e.id != 'pointerSvg')

  return elements
}

function checkHover(pointer) {
  let prevHoveredElement = document.getElementById(pointer.hoveredElement)
  let currentHoveredElements = getElementsUnder(pointer)

  if (currentHoveredElements.length == 0) return
  let currentHoveredElement = currentHoveredElements[0]

  // console.log(" debug", prevHoveredElement, currentHoveredElement)

  //"We were hovering something, now we're hovering something else"
  if (prevHoveredElement != currentHoveredElement) {
    //Update the hover counter of the previous element (if there's one)
    if (prevHoveredElement) {
      prevHoveredElement.classList.remove('clicked')
      addToDataAttribute(prevHoveredElement, 'hovered', -1)
      $(prevHoveredElement).trigger('mouseleave', { pointer: pointer })
    }
    //Update the pointer state
    pointer.hoveredElement = currentHoveredElement ? currentHoveredElement.id : null
    instance.pointers.set(pointer.id, pointer)
    //Update the hover counter of the new element (if there's one)
    if (currentHoveredElement) {
      addToDataAttribute(currentHoveredElement, 'hovered', 1)
      $(currentHoveredElement).trigger('mouseenter', { pointer: pointer })
    }
  }
}

//A buffered click is a click that was added as part of an animation (usually for bots), waiting for the end of the frame to be applied
function checkBufferedClick(pointer) {
  //If there's a buffered click: do it now
  if (pointer.bufferedClick) {
    simulateMouseDown(pointer)
    simulateMouseUp(pointer)
  }
  //Reset the flag
  pointer = instance.pointers.get(pointer.id, pointer)
  pointer.bufferedClick = false
  instance.pointers.set(pointer.id, pointer)
}

//Shorthand for "getting a data attribute in `element` as an integer to add `amount` to it before re-saving the new value as a data attribute"
export const addToDataAttribute = function (element, attr, amount) {
  let value = parseInt(element.getAttribute(attr) ?? 0)
  value += amount
  if (value == 0) {
    element.removeAttribute(attr)
  } else {
    element.setAttribute(attr, value)
  }
}

export const createPointer = function (id, bot = false) {
  return {
    id: id,
    bgColor: '#000000',
    outlineColor: '#FFFFFF',
    coords: { x: 0, y: 0 },
    events: [],
    bot: bot,
    seed: Math.random() * 1000000,
    gravity: 0, //in pixels per second
    locked: false,
    opacity: 1,
    tree: null,
    killable: false,
  }
}
function createBot(id) {
  return createPointer(id, true)
}

export const die = function (element) {
  element.classList.remove('transition-transform')
  element.classList.add('transition-opacity', 'duration-250')
  playAudio('oof')

  element.addEventListener('transitionend', (event) => {
    element.classList.add('hidden')
  })

  Meteor.setTimeout(function () {
    element.style.opacity = '0'
  }, 50)
}

//Receives the text that finished displaying in the lettreur.
//We can check what's displayed and react accordingly (eg launch a bot routine)
// TellShowWeFinishedDisplayingParagraph = function (text) {
//   switch (text) {
//     // ACTE II
//     case 'Bonjour!':
//       // les joueureuses/bots apparaissent (fade in)
//       ;[...bots, ...players].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         welcomeRoutine(pointer)
//         instance.pointers.set(p.id, pointer)
//       })
//       break
//     case 'Est-ce que vous pourriez vous rassembler devant moi?':
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         regroupRoutine(pointer)
//         instance.pointers.set(p.id, pointer)
//       })
//       break
//     case 'est-ce que vous pourriez essayer de faire un cercle autour de moi?':
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         circleRoutine(pointer)
//         instance.pointers.set(p.id, pointer)
//       })
//       break
//     case 'peut-être que ce serait mieux? merci vous êtes sympas.':
//       // les joueureuses doivent faire un carré autour de samuel
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         squareRoutine(pointer)
//         instance.pointers.set(p.id, pointer)
//       })
//       break
//     case "au milieu j'ai mis le salaire net médian en 2022 à titre de comparaison.":
//       // les joueureuses doivent se mettre sur un axe en fonction de leurs revenus
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         axisRoutine(pointer, {
//           xMin: 200,
//           xMax: instance.windowBoundaries.width - 200,
//           y: instance.windowBoundaries.height * 0.46,
//         })
//         instance.pointers.set(p.id, pointer)
//       })
//       break
//     case 'du genre':
//       // les joueureuses doivent se mettre sur un axe en fonction de la dernière fois qu'iels ont mangé
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         axisRoutine(pointer, {
//           xMin: 200,
//           xMax: instance.windowBoundaries.width - 200,
//           y: instance.windowBoundaries.height * 0.73,
//         })
//         instance.pointers.set(p.id, pointer)
//       })
//       break
//     case 'ou alors je sais pas, pourquoi pas ça sinon':
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         graphRoutine(pointer, {
//           xMin: instance.windowBoundaries.width * 0.25,
//           xMax: instance.windowBoundaries.width * 0.75,
//           yMin: instance.windowBoundaries.height * 0.12,
//           yMax: instance.windowBoundaries.height * 0.77,
//         })
//         instance.pointers.set(p.id, pointer)
//       })
//       break

//     case 'hmmm':
//       //Fin du minijeu de positionnement: les bots retournent à leur "maison"
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         pointer.events.push({
//           type: 'humanizedMove',
//           from: null,
//           to: pointer.homeCoords ?? { x: 0, y: 0 },
//           duration: randomBetween(2000, 3000),
//         })
//         instance.pointers.set(p.id, pointer)
//       })
//       break

//     case 'pour en revenir au pointeur de souris':
//       ;[...bots].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         playgroundRoutine(pointer)
//         instance.pointers.set(p.id, pointer)
//       })
//       break

//       break
//     case "cachez-vous parce que si j'arrive à vous toucher,":
//       ;[...bots, ...players].forEach((p) => {
//         pointer = instance.pointers.get(p.id)
//         pointer.killable = true
//         instance.pointers.set(p.id, pointer)
//       })
//       break
//   }
// }
function dvdMove(targetId) {
  const button = document.getElementById(targetId)

  // Calculate the initial position before switching to absolute
  const rect = button.getBoundingClientRect()
  const initialX = rect.left
  const initialY = rect.top

  // Switch to absolute positioning and set the initial position
  button.style.position = 'absolute'
  button.style.left = `${initialX}px`
  button.style.top = `${initialY}px`
  button.style.margin = 0 // Remove any margin to avoid positioning issues

  // Start the animation
  requestAnimationFrame(() => moveButton(targetId))
}

function changeColor(targetId) {
  const button = document.getElementById(targetId)
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  button.style.backgroundColor = randomColor
}

function moveButton(targetId) {
  const button = document.getElementById(targetId)

  // Parse the current position of the button
  let x = parseFloat(button.style.left) || 0
  let y = parseFloat(button.style.top) || 0

  // Update position
  x += vx
  y += vy

  // Check for collisions with screen edges and add randomness
  if (x < 0 || x + button.offsetWidth > window.innerWidth) {
    // Reverse X velocity and add randomness to the angle
    vx *= -1
    vx += (Math.random() - 0.5) * 100 // Random adjustment between -1 and 1
    vy += (Math.random() - 0.5) * 10 // Random Y adjustment for variability

    // Clamp position to avoid overflow
    if (x < 0) x = 0
    if (x + button.offsetWidth > window.innerWidth) x = window.innerWidth - button.offsetWidth

    if (dvdPhase2) changeColor(targetId) // Change color
  }

  if (y < 0 || y + button.offsetHeight > window.innerHeight) {
    // Reverse Y velocity and add randomness to the angle
    vy *= -1
    vx += (Math.random() - 0.5) * 100 // Random X adjustment for variability
    vy += (Math.random() - 0.5) * 10 // Random adjustment between -1 and 1

    // Clamp position to avoid overflow
    if (y < 0) y = 0
    if (y + button.offsetHeight > window.innerHeight) y = window.innerHeight - button.offsetHeight

    if (dvdPhase2) changeColor(targetId) // Change color
  }

  // Normalize speed to prevent it from becoming too fast
  const speedLimit = 5
  const speed = Math.sqrt(vx * vx + vy * vy)
  if (speed > speedLimit) {
    vx = (vx / speed) * speedLimit
    vy = (vy / speed) * speedLimit
  }

  // Apply new position
  button.style.left = `${x}px`
  button.style.top = `${y}px`

  // Schedule the next frame
  requestAnimationFrame(() => moveButton(targetId))
}
