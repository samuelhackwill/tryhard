import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import { stepper } from '../stepper.js'
import { playAudio } from '../audioAssets/audio.js'
import { streamer } from '../../both/streamer.js'
import { killAnimation, autoclickerSpawn, autoClickerMine } from '../bots.js'

import { handleButtonClick } from '../components/btnDashboard.js'

import '../components/main.js'
import './show.html'

import { disabledMice } from '../../both/disabledMice.js'

import { observe } from '../observe.js'

Template.show.onCreated(function () {
  this.autorun(() => {
    this.subscribe('disabledMice')
  })
  this.GoldMouseScore = new ReactiveVar(0)
  this.SilverMouseScore = new ReactiveVar(0)
  this.CopperMouseScore = new ReactiveVar(0)

  this.bgColor = new ReactiveVar('#1C1917')
  this.feedToggle = new ReactiveVar(true)
  this.textColor = new ReactiveVar('white')

  this.pointerWidth = new ReactiveVar(1.5)
  this.pointerHeight = new ReactiveVar(2.3)

  this.areNamesHidden = new ReactiveVar(true)
  this.areClocksHidden = new ReactiveVar(true)
  this.arePointersHidden = new ReactiveVar(false)
  this.pointers = new ReactiveDict()

  this.windowBoundaries = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }

  this.whichBackground = new ReactiveVar('slate.png')

  // make instance callable from everywhere
  instance = this

  setInterval(() => {
    stepper()
  }, (1 / 64.0) * 1000)
})

Template.show.onRendered(function () {
  streamer.emit('showInit', { width: window.innerWidth, height: window.innerHeight })
})

// switch (message.content) {
//   case 'debug-bot-pointers':
//     ;[...bots].forEach((p) => {
//       pointer = instance.pointers.get(p.id)
//       graphRoutine(pointer, {
//         xMin: instance.windowBoundaries.width * 0.25,
//         xMax: instance.windowBoundaries.width * 0.75,
//         yMin: instance.windowBoundaries.height * 0.12,
//         yMax: instance.windowBoundaries.height * 0.77,
//       })
//       instance.pointers.set(p.id, pointer)
//     })

//   break

// case 'togglePointers':
//   _trueOrFalse = instance.arePointersHidden.get()
//   _hidden = !_trueOrFalse

//   const button = document.getElementById('bonjourSamuel') || false

//   if (_hidden) {
//     if (button) button.classList.add('pointer-events-none')
//   } else {
//     if (button) button.classList.remove('pointer-events-none')
//   }
//   instance.arePointersHidden.set(_hidden)

//   break

// case 'initPointers':
//   console.log('init pointers')
//   let index = 1

//   const len = Object.keys(instance.pointers.all()).length

//   Object.entries(instance.pointers.all()).forEach(([key, value]) => {
//     circleRoutine(value, len, index)
//     instance.pointers.set(key, value)
//     index++
//   })
//   break

// case 'startCountingPlayers':
//   instance.scoreSprintEntreePublic.set('startTime', new Date())
//   break
// case 'stopCountingPlayers':
//   instance.scoreSprintEntreePublic.set('endTime', new Date())
//   break
// case 'displayPlayerCount':
//   // we need to substract 2 because 2 of the objects of scroSprintEntreePublic are startTime and endTime
//   let plural = { s: '', ont: 'a' }
//   let text = ''
//   let count = Object.keys(instance.scoreSprintEntreePublic.all()).length - 2

//   if (count > 1 || count == 0) {
//     plural.s = 's'
//     plural.ont = 'ont'
//   }

//   text = `${count} personne${plural.s} ${plural.ont} déjà commencé à jouer.`
//   console.log(text)

//   if (count < 0)
//     text =
//       "oups Samuel a oublié de lancer le programme pour regarder qui était en train de faire des trucs avec sa souris! _again!_ Ou alors il y a un bug peut-être, auquel cas pardon Samuel d'avoir été passif-agressif. Enfin ceci dit si y'a un bug c'est aussi de ma faute donc bon"

//   handlePupitreMessage({ type: 'newLine', content: text })

//   break

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

//     case 'savemeDvd':
//       document.getElementById('saveme').classList.add('saveme-animated')
//       break

//     case 'showClocks':
//       instance.areClocksHidden.set(false)
//       break

//     case 'startTimers':
//       requestAnimationFrame(animateMiniClocks)

//       break

//     default:
//       break
//   }
// }

Template.show.helpers({
  isChosen() {
    if (this.chosen == undefined) {
      return true
    } else {
      return this.chosen
    }
  },
  pointerType(value) {
    // console.log(this)
    if (this.hoveredElementId == undefined) {
      console.log('there might be a problem with the pointerType helper mate!')
      return
    }

    switch (value) {
      case 'isPointingHand':
        if (
          this.hoveredElementId.startsWith('checkbox') == true ||
          this.hoveredElementId.startsWith('button') == true
        ) {
          return true
        }
        break
      case 'isOpenHand':
        return this.hoveredElementId.startsWith('th') == true
        break
      case 'isCursor':
        if (
          this.hoveredElementId.startsWith('th') != true &&
          this.hoveredElementId.startsWith('button') != true &&
          this.hoveredElementId.startsWith('checkbox') != true
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
    if (this.bot == false) {
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
      const pointer = instance.pointers.get('samuel')
      if (pointer == undefined) {
        return
      } else {
        return [pointer]
      }
    } else {
      const allPointers = instance.pointers.all()
      const { samuel, ...userData } = allPointers
      const pointers = Object.values(userData)
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
  'mouseup .trade'(e) {
    handleButtonClick(e)
  },
  'mouseup #saveme'(e, t, p) {
    clock = document.getElementById('pointer' + p.pointer.id).querySelector('.miniclock')

    if (clock) {
      clock.classList.add('opacity-0')

      Meteor.setTimeout(function () {
        clock.remove()
      }, 250)
    }
  },
  'mouseup .bonjourSamuel'(e, template, p) {
    console.log('BNOJOUR!')
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
})

simulateMouseEvent = function (button, status, pointer) {
  if (button == 'BTN_LEFT' && status == 'pressed') {
    simulateMouseDown(pointer)
  }
  if (button == 'BTN_LEFT' && status == 'released') {
    simulateMouseUp(pointer)
  }
  if (button == 'BTN_RIGHT' && status == 'released') {
    simulateRightMouseUp(pointer)
  }
}

simulateRightMouseUp = function (pointer) {
  const hasPaymentSucceeded = pay(pointer, 1)
  if (hasPaymentSucceeded) {
    let bot = createBot(pointer.id + '_autoclicker_' + Date.now(), true, pointer.id)
    bot.hoveredElementId = 'feed'
    const _pointer = pointer
    const _bot = bot

    const DOMPointer = document.getElementById(pointer.id)
    const coords = readDomCoords(pointer.id)

    // this is to create the pointer
    instance.pointers.set(bot.id, bot)
    // this is to animate the pointer
    autoclickerSpawn(pointer, bot)

    setTimeout(() => {
      autoClickerMine(_pointer, _bot, coords)
    }, 99)
  }
}

export const simulateMouseUp = function (pointer) {
  observe('newClick', pointer.id)

  const domPointer = document.getElementById(pointer.id)

  const transform = window.getComputedStyle(domPointer).transform

  let translateX = 0,
    translateY = 0

  if (transform && transform !== 'none') {
    const matrixValues = transform.match(/matrix\(([^)]+)\)/)

    if (matrixValues) {
      const values = matrixValues[1].split(',').map(parseFloat)

      if (values.length === 6) {
        // 2D matrix case: matrix(a, b, c, d, tx, ty)
        translateX = values[4]
        translateY = values[5]
      }
    }
  }

  // Add 4 pixels to the Y translation
  translateY -= 2

  // Apply the new transform
  domPointer.style.transform = `translate(${translateX}px, ${translateY}px)`

  const elements = getElementsUnder(pointer)
  if (elements.length == 0) return

  for (element of elements) {
    // console.log(element)
    $(element).trigger('mouseup', { pointer: pointer })
  }
  elements.forEach((e) => e.classList.remove('clicked'))

  // bonjour il faudrait un switch qui vérifie dans quel moment du spectacle on est, sinon on va faire gagner de l'argent aux gens quand ils cliquent sur les captchaaaasss on verra plus tard fuck go fuck
  const DOMcounter = domPointer.querySelector('#money')
  const cleanValue = DOMcounter.innerHTML.replace(/\s/g, '')
  const DOMcounterValue = Number(cleanValue) + 1
  DOMcounter.innerHTML = DOMcounterValue
}

export const simulateMouseDown = function (pointer) {
  const elements = getElementsUnder(pointer)
  const domPointer = document.getElementById(pointer.id)

  const transform = window.getComputedStyle(domPointer).transform

  let translateX = 0,
    translateY = 0

  if (transform && transform !== 'none') {
    const matrixValues = transform.match(/matrix\(([^)]+)\)/)

    if (matrixValues) {
      const values = matrixValues[1].split(',').map(parseFloat)

      if (values.length === 6) {
        // 2D matrix case: matrix(a, b, c, d, tx, ty)
        translateX = values[4]
        translateY = values[5]
      }
    }
  }

  // Add 4 pixels to the Y translation
  translateY += 2

  // Apply the new transform
  domPointer.style.transform = `translate(${translateX}px, ${translateY}px)`

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
  const DOMpointer = document.getElementById(pointer.id)
  if (DOMpointer != null) {
    const coords = readDomCoords(pointer.id)

    let elements = document.elementsFromPoint(coords.x, coords.y)

    //Ignore elements without an id
    elements = elements.filter((e) => e.id != '')
    //Ignore the pointer itself
    elements = elements.filter((e) => e.id != 'pointer' + pointer.id)
    elements = elements.filter((e) => e.id != 'pointerSvg')
    return elements
  } else {
    // ok so this is hacky. when we're initializing the pointer,
    // it's probably not possible to access the DOM. so we're just
    // telling checkHover that the pointer is hovering the feed.
    // see you later unintended consequences
    return [document.getElementById('feed')]
  }
}

export const checkHover = function (pointer) {
  if (pointer.chosen == false) {
    // if pointer is deactivated, we don't want to trigger hover events when it's under a clickable element
    return
  }

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

export const createPointer = function (id, bot = false, _owner) {
  return {
    id: id,
    rasp: getRasp(id),
    mouseBrand: getMouseBrand(id),
    bgColor: '#000000',
    outlineColor: '#FFFFFF',
    initializationCoords: { x: -50, y: -50 },
    events: [],
    bot: bot,
    owner: _owner || null,
    seed: Math.random() * 1000000,
    gravity: 0, //in pixels per second
    locked: false,
    opacity: 1,
    tree: null,
    killable: false,
    money: 0,
    stock: { nwtec: 0, oilgs: 0, svdbt: 0, rlest: 0 },
    hoveredElementId: 'feed',
  }
}
function createBot(id, isBot, owner) {
  return createPointer(id, isBot, owner)
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

export const getMouseBrand = function (id, regexGroupOveride) {
  regexGroup = regexGroupOveride || 2
  const regex = /(.+)(hp|lenovo|dell|logitech|cherry|pixart|bot-\d*)(.+)/i
  // "pixart" are KENSINGTON mice. It's the name of the taiwanese company making the mouse's chip, it's all over! But only KENSINGTON are unnamed so yeah. Simulated mouse are called "bot".
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

pay = function (author, amount) {
  cleanValue = document
    .getElementById(author.id)
    .querySelector('#money')
    .innerHTML.replace(/\s/g, '')
  money = Number(cleanValue)

  if (money < amount) {
    console.log('insufficient funds mate')
    return false
  } else {
    money = money - amount
    document.getElementById(author.id).querySelector('#money').innerHTML =
      money.toLocaleString('fr-FR')
    return true
  }
}

readDomCoords = function (id) {
  const DOMpointer = document.getElementById(id)
  if (DOMpointer) {
    return {
      x: Number(DOMpointer.getAttribute('data-x')),
      y: Number(DOMpointer.getAttribute('data-y')),
    }
  } else {
    return { x: 0, y: 0 }
  }
}

writeDomCoords = function (id, coords) {
  const DOMpointer = document.getElementById(id)

  DOMpointer.setAttribute('data-x', coords.x)
  DOMpointer.setAttribute('data-y', coords.y)
}
