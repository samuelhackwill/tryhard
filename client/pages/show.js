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

import { disabledMice } from '../../both/disabledMice.js'

let eventQueue = []
let pointers = []
let bots = []
let players = []

let global_z_index = 1

Template.show.onCreated(function () {
  this.autorun(() => {
    this.subscribe('disabledMice')
  })

  this.feedToggle = new ReactiveVar(true)
  this.bgColor = new ReactiveVar('grey')
  this.pointerWidth = new ReactiveVar(1.5)
  this.pointerHeight = new ReactiveVar(2.3)
  this.scoreSprintEntreePublic = new ReactiveDict()
  this.scoreSprint1p = new ReactiveDict()
  this.scoreSprint2p = new ReactiveDict()
  this.areNamesHidden = new ReactiveVar(true)
  this.areClocksHidden = new ReactiveVar(true)
  this.arePointersHidden = new ReactiveVar(false)
  this.plantedTrees = new ReactiveDict()
  this.pointers = new ReactiveDict()

  this.windowBoundaries = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }

  // fuuuuu
  // ux state for windows
  this.isAdminOpen = new ReactiveVar(false)
  this.adminPosition = new ReactiveVar([0, 0])
  this.whichBackground = new ReactiveVar('slate.png')

  // make instance callable from everywhere
  instance = this

  //Start the stepper at a fixed framerate (60fps)
  this.stepInterval = Meteor.setInterval(
    stepper.bind(this), //Call stepper, passing `this` as the context, and an array of callbacks to call on each pointer every frame
    (1 / 60.0) * 1000, //60 frames per second <=> (1000/60)ms per frame
  )

  streamer.on('tickUpdate', handleTickUpdate)

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
  // clearInterval(this.stepInterval)
  //Stop listening to logger events
  streamer.removeAllListeners('pointerMessage')
  pointers = []
})
Template.show.onRendered(function () {
  streamer.emit('showInit', { width: window.innerWidth, height: window.innerHeight })
})

function handlePupitreAction(message, args) {
  switch (message.content) {
    case 'unchoosePlayer':
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
        instance.pointers.set(obj.id, _pointer)
      })
      break
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
      document.getElementById('saveme').classList.add('saveme-animated')
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

function handleTickUpdate(message) {
  // console.log('debug ', message)
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
      pointer.coords.y = i * 15
      pointer.coords.x = i * 2
      //QUICKFIX: set a default state for all the cursors (hidden, not dead, no accessory, etc)
      if (pointer.id != 'samuel') {
        // resetRoutine(pointer)
      }
      players.push(pointer)
    }
    if (!pointer.locked) {
      //Move messages are relative (e.g. 1px right, 2px down)
      //Apply that change to the coords
      switch (
        isInWindowBoundaries(
          'x',
          pointer.coords.x,
          element.x,
          convertRemToPixels(instance.pointerWidth.get()),
        )
      ) {
        case 'x-in-bounds':
          pointer.coords.x += element.x
          break
        case 'overflow-right':
          pointer.coords.x =
            instance.windowBoundaries.width - convertRemToPixels(instance.pointerWidth.get())
          break
        case 'overflow-left':
          pointer.coords.x = 0
          break

        default:
          break
      }

      switch (
        isInWindowBoundaries(
          'y',
          pointer.coords.y,
          element.y,
          convertRemToPixels(instance.pointerHeight.get()),
        )
      ) {
        case 'y-in-bounds':
          pointer.coords.y += element.y
          break
        case 'overflow-bottom':
          pointer.coords.y =
            instance.windowBoundaries.height - convertRemToPixels(instance.pointerHeight.get())
          break
        case 'overflow-top':
          pointer.coords.y = 0
          break

        default:
          break
      }

      // check clicks
      if (element.buttonEvents.length > 0) {
        for (let x = 0; x < element.buttonEvents.length; x++) {
          simulateMouseEvent(element.buttonEvents[x].code, element.buttonEvents[x].value, pointer)
        }
      }

      //Save the pointer
      instance.pointers.set(pointer.id, pointer)

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

Template.show.helpers({
  isChosen() {
    if (this.chosen == undefined) {
      return true
    } else {
      return this.chosen
    }
  },
  pointerType(value) {
    switch (value) {
      case 'isPointingHand':
        return this.hoveredElementId.startsWith('button') == true
        break
      case 'isOpenHand':
        return this.hoveredElementId.startsWith('th') == true
        break
      case 'isCursor':
        if (
          this.hoveredElementId.startsWith('th') != true &&
          this.hoveredElementId.startsWith('button') != true
        ) {
          return true
        }
        break
      default:
        return false
        break
    }
  },
  pointerWidth() {
    return instance.pointerWidth.get()
  },
  pointerHeight() {
    return instance.pointerHeight.get()
  },
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

simulateMouseEvent = function (button, status, pointer) {
  if (button == 'BTN_LEFT' && status == 'pressed') {
    simulateMouseDown(pointer)
  }
  if (button == 'BTN_LEFT' && status == 'released') {
    simulateMouseUp(pointer)
  }
}

simulateMouseUp = function (pointer) {
  const elements = getElementsUnder(pointer)
  const domPointer = document.getElementById(pointer.id)
  domPointer.classList.remove('translate-y-[4%]')

  if (elements.length == 0) return

  for (element of elements) {
    $(element).trigger('mouseup', { pointer: pointer })
  }
  elements.forEach((e) => e.classList.remove('clicked'))
}

simulateMouseDown = function (pointer) {
  const elements = getElementsUnder(pointer)
  const domPointer = document.getElementById(pointer.id)
  domPointer.classList.add('translate-y-[4%]')

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
  let prevHoveredElement = document.getElementById(pointer.hoveredElementId)
  let currentHoveredElements = getElementsUnder(pointer)

  if (currentHoveredElements.length == 0) return

  let currentHoveredElement = currentHoveredElements[0]

  // alors les amis ce qui est marrant avec le checkHover, c'est que *parfois* les coordonnées sont SUR le pointeur simulé (et parfois non), ce qui fait que checkHover pense qu'on est en train de se hover soi-même, et donc c'est ça qui fait glitcher le fait que parfois on était sur un bouton et le bouton s'en foutait. Parce qu'en fait on hover toujours plein d'éléments en même temps.
  while (currentHoveredElement.id.startsWith('th') == true) {
    // donc en gros tant que c'est un pointeur, y compris le tien, qu'il y a dessous de tes coordonées, vire le pointeur et va voir ce qu'il y a dessous.
    ignoredElem = currentHoveredElements.shift()
    if (ignoredElem.id != pointer.id) {
      // ok et en fait si c'est pas ton propre pointeur que tu survolais, hé bé c'est que c'est une autre personne (cqfd) et donc ben c'est que tu peux *cliquer sur cette personne*
      // console.log('hovered this guy :', ignoredElem, ' and ignored him.')
    }
    currentHoveredElement = currentHoveredElements[0]
    // console.log(currentHoveredElements[0])
  }

  //"We were hovering something, now we're hovering something else"
  if (prevHoveredElement != currentHoveredElement) {
    //Update the hover counter of the previous element (if there's one)
    if (prevHoveredElement) {
      prevHoveredElement.classList.remove('clicked')
      addToDataAttribute(prevHoveredElement, 'hovered', -1)
      $(prevHoveredElement).trigger('mouseleave', { pointer: pointer })
    }
    //Update the pointer state
    pointer.hoveredElementId = currentHoveredElement ? currentHoveredElement.id : null
    // pointer.hoveredElementClassList = currentHoveredElement.classList
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
    rasp: getRasp(id),
    mouseBrand: getMouseBrand(id),
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

function convertRemToPixels(rem) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export const getMouseBrand = function (id, regexGroupOveride) {
  regexGroup = regexGroupOveride || 2
  const regex = /(.+)(hp|lenovo|dell|logitech)(.+)/i
  return id.replace(regex, `$${regexGroup}`)
}

export const getRasp = function (id, regexGroupOveride) {
  regexGroup = regexGroupOveride || 1
  const regex = /(th\d{0,})(.+)/i
  return id.replace(regex, `$${regexGroup}`)
}

disableMouse = function (mouse) {
  instance.disabledMice.get().push(mouse.rasp + '_' + mouse.brand)
  console.log(disabledMice.get())
}

enableMouse = function (mouse) {
  disabledMice = instance.disabledMice
    .get()
    .filter((item) => item !== mouse.rasp + '_' + mouse.brand)
  console.log('disables mice :', disabledMice.get())
}

isMouseDisabled = function (mouse) {
  // ok so we're using a DIFFERENT NAMING CONVENTION on pupitre and on show. unfortunately. which comes down to how mouse_grab identifies the mice, sometimes using the device.name, sometimes using the device.path. guess i'll have to learn python some day
  // in show, the naming convention looks like this : th6_pixart_dell_etc ...
  // in pupitre, the naming convention looks like this : th6_Dell
  // this should be adressed but it's a lot of work unfortunately
  const _brand = getMouseBrand(mouse.client)
  const _rasp = getRasp(mouse.client)

  if (disabledMice.find({ rasp: _rasp, brand: _brand }).fetch().length > 0) {
    console.log(
      `une souris de marque ${_brand} vient de bouger à ${_rasp}. Cette place a été définie comme vide, la souris sera donc ignorée.`,
    )
    return true
  } else {
    return false
  }
}
