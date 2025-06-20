import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import { stepper } from '../stepper.js'
import { playAudio } from '../audioAssets/audio.js'
import { streamer } from '../../both/streamer.js'
import {
  killAnimation,
  autoclickerSpawn,
  move,
  moveInFrontOfCaptcha,
  moveOffOfCaptcha,
  moveInFrontOfCaptchaImg,
  moveAllPointersOffScreen,
  moveSamuelInScreen,
  autoClickerMine,
  alignPointersInTheBottom,
  alignPointersOnTheLeft,
  initRonde,
  positionPointersOnCircle,
  positionPointersOutsideCircle,
} from '../bots.js'
import { handleButtonClick } from '../components/btnDashboard.js'
import { disabledMice, mouseOrder } from '../../both/api.js'
// import { observe, observing } from '../observe.js'
import {
  ImgCapGridSubmit,
  ImgCapOnlyOneSubmit,
  ImgCapNoSelect,
} from '../components/pasUnRobotImage.js'
import { ImgCapInfinite } from '../components/pasUnRobotImageInfinite.js'
import { lerp, convertRemToPixels } from '../../both/math-helpers.js'

import '../components/main.js'
import './show.html'

const circleElements = []
let stop = null
let pointersBucket = []

Template.show.onCreated(function () {
  streamer.on('pupitreStateChange', function (message) {
    instance.state.set(message.content)
    console.log(instance.state.get())
  })
  streamer.on('pupitreAction', handlePupitreAction)

  this.autorun(() => {
    this.subscribe('disabledMice')
    this.subscribe('mouseOrder')
  })

  this.GoldMouseScore = new ReactiveVar(0)
  this.SilverMouseScore = new ReactiveVar(0)
  this.CopperMouseScore = new ReactiveVar(0)
  this.FourthMouseScore = new ReactiveVar(0)

  this.bgColor = new ReactiveVar('#1C1917')
  this.feedToggle = new ReactiveVar(true)
  this.textColor = new ReactiveVar('white')

  this.pointerWidth = new ReactiveVar(2)
  this.pointerHeight = new ReactiveVar(3)

  this.areNamesHidden = new ReactiveVar(false)
  this.areClocksHidden = new ReactiveVar(true)
  this.arePointersHidden = new ReactiveVar(false)
  this.pointers = new ReactiveDict()

  this.windowBoundaries = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }

  this.whichBackground = new ReactiveVar('slate.png')

  this.state = new ReactiveVar('init')

  this.score = { gradins: {} }

  this.autoTimeout = false

  // make instance callable from everywhere
  instance = this

  setInterval(() => {
    stepper()
  }, (1 / 64.0) * 1000)
})

Template.show.onRendered(function () {
  GlobalPointerWidth = convertRemToPixels(this.pointerWidth.get())
  GlobalPointerHeight = convertRemToPixels(this.pointerHeight.get())

  streamer.emit('showInit', { width: window.innerWidth, height: window.innerHeight })
})

function handlePupitreAction(message) {
  switch (message.content) {
    case 'moveSamuelInScreen':
      moveSamuelInScreen()
      break
    case 'toggleFFA':
      toggleFFA(true)
      break
    case 'mutePointers':
      toggleFFA(false)
      break
    case 'toggleAutoTimeout':
      // console.log(message.args)
      instance.autoTimeout = message.args
      break
    case 'revealMoney':
      document.querySelectorAll('.pointer').forEach((pointer) => {
        const money = pointer.querySelector('#money')
        money.classList.remove('hidden', 'opacity-0')
      })
      break

    case 'hideMoney':
      document.querySelectorAll('.pointer').forEach((pointer) => {
        const money = pointer.querySelector('#money')
        money.classList.add('opacity-0')
        setTimeout(() => {
          money.classList.add('hidden')
        }, 300)
      })
      break
    case 'forceRefresh':
      location.reload()
      break
    case 'initRonde':
      const allPointers = Object.values(instance.pointers.all())
        .filter((p) => typeof p.order === 'number' && !p.bot)
        .sort((a, b) => a.order - b.order)

      initRonde(allPointers, instance)
      break
    case 'nukeEventQueue':
      nukeEventQueue()
      break
    case 'alignPointersBot':
      alignPointersInTheBottom(instance.pointers.all())
      break
    case 'moveAllPointersOffScreen':
      moveAllPointersOffScreen(instance.pointers.all())
      break
    case 'alignPointersLeft':
      alignPointersOnTheLeft(instance.pointers.all())
      break
    case 'alignHumansInCircle':
      {
        // const allPointers = Object.values(instance.pointers.all()).filter((p) => p.score?.human > 0)
        const allPointers = Object.values(instance.pointers.all())
        positionPointersOnCircle(allPointers)
      }
      break
    // case 'alignNonHumansInRandom':
    //   {
    //     const allPointers = Object.values(instance.pointers.all()).filter((p) => p.score?.human < 1)
    //     positionPointersOutsideCircle(allPointers)
    //   }
    //   break
    case 'squidGame':
      {
        nukeEventQueue()
        const elements = document.querySelectorAll('.pasUnRobotWhiteBox.skipHighlight')
        elements.forEach((element) => {
          element.classList.remove('skipHighlight')
        })
      }
      break
    case 'startColor':
      const boxes = document.querySelectorAll('.pasUnRobotWhiteBox')
      if (stop !== null) stop()

      stop = animatePasUnRobotWhiteBox(boxes, 'single')

      break
    case 'stopColor':
    case 'killUnseated':
      if (stop != null) stop()
      // console.log('stopping', stop != undefined)
      break
    case 'startCarousel':
      {
        const carousel = document.getElementById('carousel')
        carousel.classList.add('carousel')
        carousel.style.animationPlayState = 'running'

        const chairElements = document.querySelectorAll('.chair')
        chairElements.forEach((chair) => {
          chair.classList.add('rotatingCaptcha')
        })
      }
      break
    case 'stopEverythingCarousel':
      {
        const carousel = document.getElementById('carousel')
        carousel.style.animationPlayState = 'paused'

        const chairElements = document.querySelectorAll('.chair')
        chairElements.forEach((chair) => {
          chair.style.animationPlayState = 'paused'
        })
      }
      break
    case 'createChairs':
      {
        circleElements.length = 0
        for (let index = 0; index < message.args.howMany; index++) {
          Blaze.renderWithData(
            Template.pasUnRobot,
            message.args,
            document.getElementById('carousel'),
          )
        }
        const carousel = document.getElementById('carousel')

        carousel.classList.remove('carousel')
        void carousel.offsetWidth
        carousel.style.animationDuration = message.args.animationSpeed + 's'

        setTimeout(() => {
          const chairElements = document.querySelectorAll('.chair')
          chairElements.forEach((chair) => {
            chair.style.animationDuration = message.args.animationSpeed + 's'
          })
        }, 50)
      }
      break
    case 'clearPointers':
      pointersBucket = []

      // First: collect all candidates
      let temp = []

      for (const [key, pointer] of Object.entries(instance.pointers.all())) {
        if (pointer.order !== -1) {
          temp.push({ id: pointer.id, order: pointer.order })
          instance.pointers.delete(key)
        }
      }

      // Then: sort descending by order
      temp.sort((a, b) => b.order - a.order)

      // Finally: extract only the ids
      pointersBucket = temp.map((item) => item.id)
      break
    case 'togglePointers':
      const _trueOrFalse = instance.arePointersHidden.get()
      const _hidden = !_trueOrFalse

      instance.arePointersHidden.set(_hidden)
      break
    // case 'startObserving':
    //   observing.push('newClick', 'newMove', 'magellan')
    //   break
    case 'showNicks':
      instance.areNamesHidden.set(false)
      break
    case 'unchoosePlayer':
      unchoosePlayer()
      // Object.values(instance.pointers.all()).forEach((obj) => {
      // _pointer = instance.pointers.get(obj.id)
      // _pointer.chosen = undefined
      // instance.pointers.set(obj.id, _pointer)
      // })
      break
    case 'unchoosePlayers':
      unchoosePlayers()
      break
    case 'choosePlayer':
      console.log('choose player ', message)
      // Extract rasp and brand from pointer ID
      const pointer = findPointerByBrandAndRasp(
        getRasp(message.args.chosenOne),
        getMouseBrand(message.args.chosenOne),
        'instance',
      )

      if (!pointer) {
        console.log(
          'while looking for pointer ',
          getRasp(message.args.chosenOne),
          getMouseBrand(message.args.chosenOne),
          " could not find that guy. He's probably toggled in /plan but didn't trigger a createPointer yet on /show",
        )
      } else {
        pointer.chosen = true
        instance.pointers.set(pointer.id, pointer)

        switch (instance.state.get()) {
          case 'captchas-img-1j':
            moveInFrontOfCaptchaImg(pointer)

            break
          case 'captchas-coche-multiplayer':
            console.log(message)
            move(pointer, message.args.customMoveTo)
            break
          case 'captchas-kinetic-1j':
            setTimeout(() => {
              moveInFrontOfCaptcha(pointer)
            }, 1000)
            break
          default:
            moveInFrontOfCaptcha(pointer)
            break
        }
      }
      break
    case 'ImgCapGridSubmit':
      // type : grid submit
      ImgCapGridSubmit(message)
      break

    case 'ImgCapOnlyOneSubmit':
      // type : only one submit
      ImgCapOnlyOneSubmit(message)
      break

    case 'ImgCapNoSelect':
      // type : only one submit
      ImgCapNoSelect(message)
      break

    case 'ImgCapInfinite':
      // type : only one submit
      ImgCapInfinite(message)
      break

    case 'newCaptcha-1j':
      // console.log(message.args)
      // grrmbllll if there's already a captcha don't render any additonnal captcha ok?
      // this is because we're calling newcaptcha multiple times when we're getting several
      // players in the multiplayer section. This is hacky as hell but i can't be arsed
      if (
        document.querySelector('.pasUnRobot') &&
        instance.state.get() == 'captchas-coche-multiplayer'
      ) {
        return
      } else {
        Blaze.renderWithData(
          Template.pasUnRobot,
          message.args,
          document.getElementsByClassName('milieuContainer')[0],
        )
      }
      break
    case 'newTetris':
      // console.log(message.args)

      Blaze.renderWithData(
        Template.pasUnRobot,
        message.args,
        document.getElementsByClassName('milieuContainer')[0],
      )
      break

    case 'newClicker':
      Blaze.renderWithData(
        Template.pasUnRobot,
        message.args,
        document.getElementsByClassName('milieuContainer')[0],
      )
      break

    case 'newClickerGrid':
      Blaze.renderWithData(
        Template.clickerGrid,
        message.args,
        document.getElementsByClassName('foregroundContainer')[0],
      )
      break
  }
  return
}

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
  // isItCaptchaTime() {
  //   if (instance.state.get() == startsWith('captchas-1j')) {
  //     return true
  //   } else {
  //     return false
  //   }
  // },
  isMinusOne() {
    return this.order == -1
  },
  isChosen() {
    if (this.crouching) {
      return false
    }
    if (this.chosen == undefined) {
      return true
    } else {
      return this.chosen
    }
  },
  pointerType(value) {
    // console.log(this)
    if (this.hoveredElementId == undefined) {
      // console.log('there might be a problem with the pointerType helper mate!')
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
          (this.hoveredElementId.startsWith('th') != true &&
            this.hoveredElementId.startsWith('button') != true &&
            this.hoveredElementId.startsWith('checkbox') != true) ||
          (this.hoveredElementId.startsWith('checkbox') && this.seated == true)
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
    // console.log('BNOJOUR!')
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
  const isclickerTime = instance.state.get() == 'clicker-ffa'

  if ((button == 'BTN_LEFT' || isclickerTime) && status == 'pressed') {
    simulateMouseDown(pointer)
  }
  if ((button == 'BTN_LEFT' || isclickerTime) && status == 'released') {
    simulateMouseUp(pointer)
  }
  if (button == 'BTN_RIGHT' && status == 'pressed') {
    simulateRightMouseDown(pointer)
  }
  if (button == 'BTN_RIGHT' && status == 'released') {
    simulateRightMouseUp(pointer)
  }
}

simulateRightMouseDown = function (creatorPointer) {
  const domPointer = document.getElementById(creatorPointer.id)
  const svg = domPointer.querySelector('#pointerSvg')
  svg.style.transform = 'translateY(4px)'
}

simulateRightMouseUp = function (creatorPointer) {
  const domPointer = document.getElementById(creatorPointer.id)
  const svg = domPointer.querySelector('#pointerSvg')
  svg.style.transform = 'translateY(0px)'

  if (pointersBucket.length === 0 || instance.pointers.get(creatorPointer.id).order != -1) {
    return
  }
  // get the next saved id
  const savedId = pointersBucket.shift() // this removes and returns the first element

  // fallback if array is empty
  // const baseId = savedId || pointer.id + '_autoclicker_' + Date.now()

  // create the bot using the saved id if available
  let newPlayer = createPointer(savedId)
  newPlayer.hoveredElementId = 'feed'

  // register and animate
  instance.pointers.set(newPlayer.id, newPlayer)
  autoclickerSpawn(creatorPointer, newPlayer)
  // setTimeout(() => {
  //   autoClickerMine(_pointer, _bot, coords);
  // }, 99);
}

export const simulateMouseUp = function (pointer) {
  // observe('newClick', pointer.id)
  // console.log(pointer)
  const domPointer = document.getElementById(pointer.id)
  const svg = domPointer.querySelector('#pointerSvg')
  svg.style.transform = 'translateY(0px)'

  // const audio = new Audio('mouseUp.mp3')
  // audio.play()

  if (instance.state.get() != 'clicker-ffa') {
    const elements = getElementsUnder(pointer)
    if (elements.length == 0) return

    for (element of elements) {
      $(element).trigger('mouseup', { pointer: pointer })
    }
    elements.forEach((e) => e.classList.remove('clicked'))
  } else {
    const gradin = pointer.gradin
    const dernierGradin = pointer.dernierGradin

    const moneyEl = domPointer.querySelector('#money')
    const currentValue = Number(moneyEl.firstChild.nodeValue)
    const previousValue = Number(moneyEl.dataset.lastvalue || 0)

    if (currentValue !== previousValue) {
      // Update the timestamp and value
      moneyEl.dataset.lastupdate = Date.now()
      moneyEl.dataset.lastvalue = currentValue
    }

    const newVal = currentValue + 1

    if (
      newVal == 50 ||
      newVal == 100 ||
      newVal == 250 ||
      newVal == 500 ||
      newVal == 800 ||
      newVal == 1250 ||
      newVal == 1800 ||
      newVal == 2500 ||
      newVal == 3500
    ) {
      moneyEl.classList.add('scale-[2]')
      setTimeout(() => {
        moneyEl.classList.remove('scale-[2]')
      }, 200)
    }

    moneyEl.firstChild.nodeValue = newVal

    instance.score.gradins[gradin] = (instance.score.gradins[gradin] || 0) + 1

    if (gradin == dernierGradin) {
      const gradinEl = document.querySelector('#clickCounter-gradinDuFond')
      if (gradinEl) {
        const current = Number(gradinEl.firstChild.nodeValue)
        gradinEl.firstChild.nodeValue = current + 1
      }
    }

    if (gradin == 1) {
      const gradinEl = document.querySelector('#clickCounter-gradinDuDevant')
      if (gradinEl) {
        const current = Number(gradinEl.firstChild.nodeValue)
        gradinEl.firstChild.nodeValue = current + 1
      }
    }

    const collectiveMoneyEl = document.querySelector('#clickCounter-total')
    if (collectiveMoneyEl) {
      const currentTot = Number(collectiveMoneyEl.firstChild.nodeValue)
      collectiveMoneyEl.firstChild.nodeValue = currentTot + 1
    }
  }

  // only add to money if we're in the appropriate moment of the show.
  // if (instance.state.get('state').startsWith('ii-le-succes')) {
  //   const DOMcounter = domPointer.querySelector('#money')
  //   const cleanValue = DOMcounter.innerHTML.replace(/\s/g, '')
  //   const DOMcounterValue = Number(cleanValue) + 1
  //   DOMcounter.innerHTML = DOMcounterValue
  // }

  // only enable autolicker production if we're at ii le succes s3.
  // if (instance.state.get() != 'ii-le-succes-s3') return

  // const hasPaymentSucceeded = pay(pointer, 1)
  // if (hasPaymentSucceeded) {
  //   let bot = createBot(pointer.id + '_autoclicker_' + Date.now(), true, pointer.id)
  //   bot.hoveredElementId = 'feed'
  //   const _pointer = pointer
  //   const _bot = bot

  //   const coords = readDomCoords(pointer.id)

  //   // this is to create the pointer
  //   instance.pointers.set(bot.id, bot)
  //   // this is to animate the pointer
  //   autoclickerSpawn(pointer, bot)

  //   setTimeout(() => {
  //     autoClickerMine(_pointer, _bot, coords)
  //   }, 99)
  // }
}

export const simulateMouseDown = function (pointer) {
  // const audio = new Audio('mouseDown.mp3')
  // audio.play()

  const domPointer = document.getElementById(pointer.id)

  const svg = domPointer.querySelector('#pointerSvg')
  svg.style.transform = 'translateY(4px)'

  const elements = getElementsUnder(pointer)

  if (elements.length == 0) return
  for (element of elements) {
    if (element.classList.contains('privileged') && pointer.id != 'samuel') {
      return
    }

    const elementZindex = parseInt(getComputedStyle(element).zIndex, 10) || 0
    const pointerZindex = parseInt(getComputedStyle(domPointer).zIndex, 10) || 0

    if (elementZindex > pointerZindex) {
      // console.log(
      //   'click not registered because element has a highter zindex than pointie',
      //   element.id,
      //   'with zindex :',
      //   elementZindex,
      //   '. pointer zindex :',
      //   pointerZindex,
      // )
      return
    } else {
      // console.log('CLICK', element)
      $(element).trigger('mouseup', { pointer: pointer })
      $(element).trigger('mousedown', { pointer: pointer })
      element.classList.add('clicked')

      // we need to restrict clicks on
      //  privileged buttons, like the admin buttons
      // so that only samuel can click on them.

      //Trigger a jQuery click event with extra data (the pointer)

      //TODO: figure out a better event propagation mechanism
      // Here's part of the issue: https://stackoverflow.com/questions/3277369/how-to-simulate-a-click-by-using-x-y-coordinates-in-javascript/78993824#78993824
      //QUICKFIX: privileged elements stop propagating a click event.

      if (element.classList.contains('stops-events')) break
    }
  }
}

function getElementsUnder(pointer) {
  const DOMpointer = document.getElementById(pointer.id)
  if (DOMpointer != null) {
    const coords = readDomCoords(DOMpointer)

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
  if (pointer.chosen == false || pointer.seated) {
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
  // console.log(currentHoveredElement)

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
  const _dbPointer = findPointerByBrandAndRasp(getRasp(id, 1), getMouseBrand(id), 'mouseOrder')
  const _order = _dbPointer?.order
  const _gradin = _dbPointer?.gradin

  // this should obviously not be scoped to every mice but wtvr
  const _dernierGradin = _dbPointer?.dernierGradin

  return {
    id: id,
    rasp: getRasp(id),
    mouseBrand: getMouseBrand(id),
    bgColor: '#000000',
    outlineColor: '#FFFFFF',
    initializationCoords: { x: -100, y: -50 },
    order: _order,
    gradin: _gradin,
    dernierGradin: _dernierGradin,
    opacity: 1,
    hoveredElementId: 'feed',
    cornersTouched: {},
    captchaPlayCount: 0,
    seated: false,
    crouching: false,
    score: { human: 0 },
    // deprecated
    bot: bot,
    killable: false,
    owner: _owner || null,
    seed: Math.random() * 1000000,
    gravity: 0, //in pixels per second
    locked: false,
    money: 0,
    events: [],
    tree: null,
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

// export const findMouseByRaspAndBrand = function (raspName, brand) {
//   if (!raspName || !brand) return null
//   const regex = new RegExp(`${raspName}.*${brand}`, 'i')
//   instance.pointers.get()

//   return mouseOrder.findOne({ device: { $regex: regex } })
// }

export const getMouseBrand = function (id, regexGroupOveride) {
  regexGroup = regexGroupOveride || 2
  const regex = /(.+)(logitech|hp|lenovo|dell|cherry|pixart|bot-\d*)(.+)/i
  // "pixart" are KENSINGTON mice. It's the name of the taiwanese company making the mouse's chip, it's all over the place! But only KENSINGTON are unnamed so yeah. Simulated mouse are called "bot".
  // also, gasp, some lenovo mouses are named logitech_lenovo lol.
  // also there's some mice named "kye" something something.
  return id.replace(regex, `$${regexGroup}`)
}

export const getRasp = function (id, regexGroupOveride) {
  regexGroup = regexGroupOveride || 1
  const regex = /\b(th\d+)_([^-]+(?:-[^']+)?)/i
  // console.log(
  //   'getting rasp of id :',
  //   id,
  //   '. Group 0 :',
  //   id.replace(regex, `$0`),
  //   '. Group 1 :',
  //   id.replace(regex, `$1`),
  //   '. Group 2 :',
  //   id.replace(regex, `$2`),
  // )
  return id.replace(regex, `$${regexGroup}`)
}

disableMouse = function (mouse) {
  instance.disabledMice.get().push(mouse.rasp + '_' + mouse.brand)
  // console.log(disabledMice.get())
}

enableMouse = function (mouse) {
  disabledMice = instance.disabledMice
    .get()
    .filter((item) => item !== mouse.rasp + '_' + mouse.brand)
  // console.log('disables mice :', disabledMice.get())
}

isMouseDisabled = function (mouse) {
  // ok so we're using a DIFFERENT NAMING CONVENTION on pupitre and on show. unfortunately. which comes down to how mouse_grab identifies the mice, sometimes using the device.name, sometimes using the device.path. guess i'll have to learn python some day
  // in show, the naming convention looks like this : th6_pixart_dell_etc ...
  // in pupitre, the naming convention looks like this : th6_Dell
  // this should be adressed but it's a lot of work unfortunately
  const _brand = getMouseBrand(mouse.client)
  const _rasp = getRasp(mouse.client)

  if (disabledMice.find({ rasp: _rasp, brand: _brand }).fetch().length > 0) {
    // console.log(
    //   `une souris de marque ${_brand} vient de bouger à ${_rasp}. Cette place a été définie comme vide, la souris sera donc ignorée.`,
    // )
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
    // console.log('insufficient funds mate')
    return false
  } else {
    money = money - amount
    document.getElementById(author.id).querySelector('#money').innerHTML =
      money.toLocaleString('fr-FR')
    return true
  }
}

readDomCoords = function (DOMpointer) {
  if (DOMpointer) {
    return {
      x: Number(DOMpointer.getAttribute('data-x')),
      y: Number(DOMpointer.getAttribute('data-y')),
    }
  } else {
    return { x: 0, y: 0 }
  }
}

writeDomCoords = function (DOMpointer, coords) {
  DOMpointer.setAttribute('data-x', coords.x)
  DOMpointer.setAttribute('data-y', coords.y)
}

const findPointerByBrandAndRasp = function (targetRasp, targetBrand, target) {
  if (target == 'instance') {
    pointers = instance.pointers.all()
    for (const key in pointers) {
      if (pointers.hasOwnProperty(key)) {
        const pointer = pointers[key]
        // console.log(`[DEBUG] Checking pointer:`, pointer)

        // console.log(`[DEBUG] pointer.rasp: "${pointer.rasp}" vs targetRasp: "${targetRasp}"`)
        // console.log(
        //   `[DEBUG] pointer.mouseBrand: "${pointer.mouseBrand}" vs targetBrand: "${targetBrand}"`,
        // )

        if (pointer.rasp === targetRasp && pointer.mouseBrand === targetBrand) {
          // console.log('[DEBUG] ✅ Match found:', pointer)
          return pointer
        }
      }
    }
  } else {
    // if we're not looking in the instance.pointers() this means we're looking in the DB. fuuu
    const allEntries = mouseOrder.find().fetch()

    for (const entry of allEntries) {
      // console.log('[DEBUG] Checking entry:', entry)
      // console.log(`[DEBUG] entry.device: "${entry.device}"`)
      // console.log(`[DEBUG] targetRasp: "${targetRasp}" / targetBrand: "${targetBrand}"`)

      if (
        entry.device &&
        getRasp(entry.device) == targetRasp &&
        getMouseBrand(entry.device) == targetBrand
      ) {
        // console.log('[DEBUG] ✅ Match found:', entry)
        return entry
      }
    }

    // console.log('[DEBUG] ❌ No match found in mouseOrder')
    return null
  }
}

export const unchoosePlayers = function () {
  const allPointers = Object.values(instance.pointers.all())

  allPointers.forEach((pointer) => {
    if (pointer.chosen) {
      pointer.chosen = false
      pointer.captchaPlayCount++
      moveOffOfCaptcha(pointer)
      instance.pointers.set(pointer.id, pointer)
    }
  })
}

export const unchoosePlayer = function (player) {
  let _player = player || null

  if (_player == null) {
    let chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)
    if (!chosenItem) {
      return
    }
    chosenItem.chosen = false
    chosenItem.captchaPlayCount++
    moveOffOfCaptcha(chosenItem)
    instance.pointers.set(chosenItem.id, chosenItem)
  } else {
    _player.chosen = false
    chosenItem.captchaPlayCount++
    moveOffOfCaptcha(chosenItem)
    instance.pointers.set(chosenItem.id, chosenItem)
  }
}

function recalculateCirclePositions() {
  const carousel = document.getElementById('carousel')

  // STEP 1 — Calculate carousel size BEFORE anything else
  const maxElementRadius = Math.max(...circleElements.map((e) => Math.max(e.width, e.height))) / 2
  const diameter = Math.min(window.innerWidth, window.innerHeight) - 2 * maxElementRadius
  const radius = diameter / 2

  // STEP 2 — Set carousel size
  carousel.style.width = diameter + 'px'
  carousel.style.height = diameter + 'px'

  // STEP 3 — Now that size is correct, position elements *relative to the carousel center*
  const centerX = diameter / 2
  const centerY = diameter / 2
  const n = circleElements.length

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n
    const el = circleElements[i]
    const x = centerX + radius * Math.cos(angle) - el.width / 2
    const y = centerY + radius * Math.sin(angle) - el.height / 2

    el.instance.circleX.set(x)
    el.instance.circleY.set(y)
  }
}

export const registerCircleElement = function (instance, width, height, howMany) {
  circleElements.push({ instance, width, height })
  // console.log('[circleElements] Length is', circleElements.length)
  // console.log('howMany is', howMany)
  // console.log('check is', circleElements.length === howMany)

  // console.log('width:', width, 'height:', height)

  if (circleElements.length === howMany) {
    recalculateCirclePositions()
  }
}
function animatePasUnRobotWhiteBox(divs, mode = 'single') {
  let index = 0
  const total = divs.length
  let interval

  const updateColors = () => {
    divs.forEach((div, i) => {
      if (mode === 'single') {
        div.style.opacity = i === index ? '1' : '0'
      } else if (mode === 'odd') {
        const isOdd = i % 2 === 1
        const active = index % 2 === 0 ? isOdd : !isOdd
        div.style.opacity = active ? '1' : '0'
      }
    })

    if (mode === 'single') {
      index = (index + 1) % total
    } else if (mode === 'odd') {
      index = (index + 1) % 2 // toggle between odd/even mode
    }
  }

  // Start the loop
  updateColors()
  interval = setInterval(updateColors, 300)

  // Return handle to stop it later if needed
  return () => clearInterval(interval)
}

const toggleFFA = function (toggle) {
  Object.values(instance.pointers.all()).forEach((obj) => {
    _coords = document.getElementById(obj.id).dataset
    console.log('reseting initialisation coords ', _coords)
    obj.initializationCoords = { x: _coords.x, y: _coords.y }

    if (toggle) {
      obj.chosen = undefined
      obj.bot = false
    } else {
      obj.chosen = false
      obj.bot = true
    }
    instance.pointers.set(obj.id, obj)
  })
}
