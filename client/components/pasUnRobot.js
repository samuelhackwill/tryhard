import './pasUnRobot.html'
import { moveOffOfCaptcha } from '../bots.js'
import { streamer } from '../../both/streamer.js'
import { unchoosePlayer, unchoosePlayers, registerCircleElement } from '../pages/show.js'

const interestingSpeeds = [
  235, 33, 40, 49, 42, 50, 52, 56, 131, 129, 61, 67, 94, 87, 109, 186, 217, 243, 275, 282, 284, 291,
  297, 304, 311, 407, 317, 358, 393, 423,
]

const startHiddenList = ['je ne suis pas un robot (impossible)']

newX = 1
newY = 1

Template.pasUnRobot.onCreated(function () {
  console.log('new pasUnRobot ', this)
  this._pupitreHandler = (message) => {
    message.context = this
    handlePupitreAction(message)
  }

  // console.log(this.data)

  streamer.on('pupitreAction', this._pupitreHandler)
  // this is only for les chaises musik
  this.circleX = new ReactiveVar(0)
  this.circleY = new ReactiveVar(0)

  // refactor : this.state would be better, to avoid multi-state-bordels
  this.waiting = new ReactiveVar(false)
  this.timestamp = new Date()
  this.warning = new ReactiveVar(false)
  this.failed = new ReactiveVar(false)
  this.passed = new ReactiveVar(false)
  this.rendered = new ReactiveVar(false)
  this.timeouts = new ReactiveVar([])
  this.uuid = crypto.randomUUID()

  this.top = '-45%'

  console.log(this.data.xfraction != undefined)
  if (this.data.xfraction) {
    this.left = `${window.innerWidth * this.data.xfraction - 300}px`
    // this.rotation = 30
  } else {
    this.left = `${Math.floor(Math.random() * 81)}%`
  }
  this.rotation = Math.floor(Math.random() * 360)

  const speedRatio = 0.9 - -this.data.readingSpeed * 0.05
  this.minReadingTime = estimateReadingTime(this.data.text.value) * speedRatio
})

Template.pasUnRobot.onDestroyed(function () {
  streamer.removeListener('pupitreAction', this._pupitreHandler)
  removeTimeouts(this)
})

Template.pasUnRobot.onRendered(function () {
  const el = this.firstNode
  const rect = el.getBoundingClientRect()

  // Now call a global "recalculateCirclePositions()" that uses ALL sizes
  registerCircleElement(this, rect.width, rect.height, this.data.howMany)
  // console.log(el, rect.width)

  const timeToComplete = this.data.surpriseAmount + this.minReadingTime + this.data.hesitationAmount

  // console.log(
  //   'debug : TIME TO COMPLETE CAPTCHA =',
  //   'surprise time :',
  //   this.data.surpriseAmount,
  //   '+ reading time :',
  //   this.minReadingTime,
  //   ' + hesitation time : ',
  //   this.data.hesitationAmount,
  //   ' = total ',
  //   timeToComplete,
  // )

  setTimeout(() => {
    this.rendered.set(true)
  }, 50)

  const timeouts = []
  if (instance.autoTimeout === true) {
    timeouts.push(
      setTimeout(() => {
        // console.log('warn player that time almost over')
        showWarning(this)
      }, timeToComplete * 0.5),
      setTimeout(() => {
        // console.log('player failed to complete captcha')
        checkAndDie(this, this.view, false)
      }, timeToComplete),
    )
  }

  this.timeouts.set(timeouts)
})

Template.pasUnRobot.helpers({
  uuid() {
    return Template.instance().uuid
  },
  // isFleeing() {
  //   console.log('fleeing changed!', Template.instance().fleeing.get())
  //   return Template.instance().fleeing.get()
  // },
  isClicker() {
    // console.log(!Template.instance().data || !Template.instance().data.hasOwnProperty('type'))
    return Template.instance().data.type === 'clicker'
  },
  isTetris() {
    return Template.instance().data.type === 'tetris'
  },
  isChaisesMusicales() {
    return Template.instance().data.type === 'chair'
  },
  tetrisStyle() {
    const self = Template.instance()
    return `top: ${self.top}; left: ${self.left};`
  },
  cmStyle() {
    const self = Template.instance()
    return `left: ${self.circleX.get()}px; top: ${self.circleY.get()}px;`
  },
  tetrisRot() {
    const self = Template.instance()
    return `transform: rotate(${self.rotation}deg);`
  },
  isFailed() {
    return Template.instance().failed.get()
  },
  isSinglePlayer() {
    return instance.state.get().endsWith('1j')
  },
  isPassed() {
    return Template.instance().passed.get()
  },
  isDisabled() {
    if (Template.instance().failed.get() || instance.state.get() == 'chaises') {
      return 'disabled'
    } else {
      return
    }
  },
  isWarning() {
    if (Template.instance().warning.get() == true) {
      return 'opacity-1'
    } else {
      return 'opacity-0'
    }
  },
  isRendered() {
    return Template.instance().rendered.get()
  },
  hasInteracted() {
    return Template.instance().waiting.get()
  },
  jeNeSuisPas() {
    return this.text.value
  },
  startsHidden() {
    return startHiddenList.includes(this.text.value)
  },
})

Template.pasUnRobot.events({
  // 'mousedown .pasUnRobot'(e, t, p) {
  //   const pointer = instance.pointers.get(p.pointer.id)
  //   if (
  //     t.data.type == 'chair' &&
  //     pointer.seated == false &&
  //     !e.target.classList.contains('clicked') &&
  //     instance.state.get() == 'chaises-squidGame'
  //   ) {
  //     console.log('someone just clicked on a chair')
  //     checkAndDie(t, t.view, true)
  //     pointer.seated = true
  //     pointer.hoveredElementId = 'feed'
  //     setTimeout(() => {
  //       pointer.bgColor = 'oklch(0.488 0.243 264.376)'
  //       instance.pointers.set(pointer.id, pointer)
  //     }, 0)
  //   }
  // },
  'mousedown .checkbox-pasUnRobot'(event, t, obj) {
    // this down here is to guarantee that during the sequences when we're playing with opacity,
    // that the captcha is REVEALED when clicked and invisible. (to avoid that it just gets completed silently)
    if (this.text.value == 'mettre fin à la performance') {
      console.log('the show is over! good night folks!')
      streamer.emit('noir')
    }

    if (
      instance.state.get().startsWith('chaises') ||
      instance.state.get().startsWith('die-and-retry') ||
      instance.state.get() == 'captchas-kinetic-1j'
    ) {
      const regex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
      const uuid = event.currentTarget.id.match(regex)
      document.getElementById(`pasUnRobotWhiteBox-${uuid}`).style.opacity = 1
    }
    if (
      (t.data.type == 'chair' || t.data.type == 'tetris') &&
      obj.pointer.seated == false &&
      !event.target.classList.contains('clicked') &&
      instance.state.get().endsWith('squidGame')
    ) {
      // console.log('someone just clicked on a chair')
      checkAndDie(t, t.view, true)
      obj.pointer.seated = true
      obj.pointer.hoveredElementId = 'feed'
      setTimeout(() => {
        obj.pointer.formerColor = obj.pointer.bgColor
        obj.pointer.bgColor = 'oklch(0.488 0.243 264.376)'
        instance.pointers.set(obj.pointer.id, obj.pointer)
        setTimeout(() => {
          obj.pointer.crouching = true
          _coords = document.getElementById(obj.pointer.id).dataset
          console.log('reseting initialisation coords ', _coords)
          obj.pointer.initializationCoords = { x: _coords.x, y: _coords.y }
          instance.pointers.set(obj.pointer.id, obj.pointer)
        }, 1000)
      }, 0)
    }

    if (instance.state.get() == 'captchas-coche-1j') {
      const score = Number(obj.pointer.humanScore) + 1
    }

    if (instance.state.get() == 'chaises' || obj.pointer.seated == true) {
      return
    }

    t.warning.set(false)
    removeTimeouts(t)
    // console.log(t)
    clickTimestamp = new Date()
    // console.log(
    //   'user completed captcha in :',
    //   clickTimestamp.getTime() - Template.instance().timestamp.getTime(),
    //   'ms! minimum reading time is :',
    //   Template.instance().minReadingTime,
    //   'ms. maximum timeout is :',
    //   Template.instance().minReadingTime + this.hesitationAmount,
    // )

    // console.log(
    //   clickTimestamp.getTime() - t.timestamp.getTime(),
    //   t.minReadingTime + t.data.surpriseAmount,
    // )

    if (
      clickTimestamp.getTime() - t.timestamp.getTime() >
      t.minReadingTime + t.data.surpriseAmount
    ) {
      checkAndDie(t, t.view, true)
    } else {
      // console.log(
      //   'attend encore ',
      //   Template.instance().minReadingTime -
      //     (clickTimestamp.getTime() - Template.instance().timestamp.getTime()),
      //   'ms.',
      // )
      const wait =
        Template.instance().minReadingTime +
        t.data.surpriseAmount -
        (clickTimestamp.getTime() - Template.instance().timestamp.getTime())

      const _timeouts = t.timeouts.get()
      _timeouts.push(
        setTimeout(() => {
          checkAndDie(t, t.view, true)
        }, wait),
      )
      Template.instance().waiting.set(true)
    }
  },
})

const checkAndDie = function (t, handle, passed) {
  let wait = 1000
  if (passed) {
    t.waiting.set(false)
    setTimeout(() => {
      document.getElementById(`checkbox-pasUnRobot-${t.uuid}`).checked = true
    }, 50)
  } else {
    wait = wait + 4000
    t.failed.set(true)
  }

  updateScore(t, passed)

  const _timeouts = t.timeouts.get()
  _timeouts.push(
    setTimeout(() => {
      // console.log('captcha completed!!')
      // const element = document.getElementById('pasUnRobot')
      // element.style.opacity = 0
      t.rendered.set(false)

      setTimeout(() => {
        checkAndDieOutro(t)
        Blaze.remove(handle)
      }, 1000)
    }, wait),
  )
  t.timeouts.set(_timeouts)
}

// const clickerDie = function (t, handle, passed) {
//   const _timeouts = t.timeouts.get()
//   _timeouts.push(
//     setTimeout(() => {
//       console.log('captcha completed!!')
//       // const element = document.getElementById('pasUnRobot')
//       // element.style.opacity = 0
//       t.rendered.set(false)

//       setTimeout(() => {
//         checkAndDieOutro(t)
//         Blaze.remove(handle)
//       }, 300)
//     }, 1000),
//   )
//   t.timeouts.set(_timeouts)
// }

const checkAndDieOutro = function (t) {
  if (instance.state.get() == 'captchas-coche-multiplayer') {
    unchoosePlayers()
  }

  if (t.data && t.data.type) {
    // console.log(`Type exists: ${t.data.type}`);
    if (t.data.type === 'tetris' || t.data.type === 'clicker') {
      return
    } else {
      unchoosePlayer()
    }
  } else {
    unchoosePlayer()
  }
}

export const removeTimeouts = function (t) {
  t.timeouts.get().forEach(clearTimeout)
  t.timeouts.set([])
}

const estimateReadingTime = function (text) {
  const L = text.length
  // alors ce que j'ai fait c'est que j'ai fourni des data points à notre ami (je me suis enregistré en train de faire défiler les captchas à un rythme qui me semblait acceptable) et il a écrit les maths pour fit the curve. C'est fou. C'est toujours beaucoup trop lent avec les gros textes though.

  // Updated quadratic model parameters (fitted to extended data)
  const a = 2381
  const b = 33.42
  const c = 0.0405

  // Compute estimated time in milliseconds
  return a + b * L + c * L ** 2
}

// makeCaptchaFlee = function () {
//   Blaze.getView(document.getElementById('pasUnRobot')).templateInstance().fleeing.set(true)
// }

const handlePupitreAction = function (message) {
  // message.context contains the original template which was bound to the streamer. Hm i wonder what will happen when we have several templates of captcha in the same page.
  const captcha = document.getElementById(`pasUnRobot-${message.context.uuid}`)
  switch (message.content) {
    case 'changeOpacity':
      // hev, first check that this guy is still clickable; if he's not we want him with full opacity
      if (document.getElementById(`checkbox-pasUnRobot-${message.context.uuid}`).checked) {
        document.getElementById(`pasUnRobotWhiteBox-${message.context.uuid}`).style.opacity = 1
      } else {
        document.getElementById(`pasUnRobotWhiteBox-${message.context.uuid}`).style.opacity =
          message.args / 10
      }
      break
    case 'dvd':
      document.documentElement.style.setProperty('--logo-w', captcha.offsetWidth)
      document.documentElement.style.setProperty('--logo-h', captcha.offsetHeight)
      // captcha.classList.remove('-translate-x-1/2', '-translate-y-1/2', 'left-1/2', 'top-1/2')
      // captcha.classList.add('saveme-animated')

      // uncomment this is you want to find when the animation is going to pass through the center of
      // screen. It's pretty nice. comment the animation-delay property in animations.css first though,
      // or else it won't work! bisous la tournée! lol
      // chaotic evil
      // findApproximateCenterTime(captcha, 'both', 30000, 10)
      prepareAnimationWithCenteredStart({
        realId: `pasUnRobot-${message.context.uuid}`,
        duration: 30000,
        resolution: 50,
      })

      break
    case 'captcha-spin-slow':
      captcha.style.animationDuration = '3.5s'
      captcha.classList.add('rotate-loop')
      break
    case 'captcha-spin-reverse':
      captcha.style.animationDuration = '3.5s'
      captcha.style.animationDirection = 'reverse'
      captcha.classList.add('rotate-loop')

      break

    case 'captcha-spin-fast':
      captcha.style.animationDuration = '1.1s'
      captcha.classList.add('rotate-loop')

      break
    case 'captcha-spin-vFast':
      captcha.style.animationDuration = '.4s'
      captcha.classList.add('rotate-loop')

      break
    case 'captcha-spin-fast-a-r':
      captcha.style.animationDuration = '.9s'
      captcha.style.animationDirection = 'alternate'
      captcha.classList.add('rotate-loop')
      break
    case 'captcha-spin-joli-1':
      captcha.style.animationDuration = '.109s'
      captcha.classList.add('rotate-loop')
      break
    case 'captcha-spin-joli-2':
      captcha.style.animationDuration = '.049s'
      captcha.classList.add('rotate-loop')
      break
    case 'captcha-spin-joli-3':
      captcha.style.animationDirection = 'reverse'
      captcha.style.animationDuration = '.033s'
      captcha.classList.add('rotate-loop')
      break
    case 'captcha-spin-joli-4':
      captcha.style.animationDuration = '1800s'
      captcha.classList.add('rotate-loop')
      break
    case 'captcha-spin-joli-5':
      captcha.style.animationDuration = '86400s'
      captcha.classList.add('rotate-loop')
      break

    // this down here is for the pupitre BUTTONS
    // cause they are so smart they pass arguments to the same function. which is not
    // the case for the text-based-action-calls.
    // DRY i am not youhouhouuuu
    case 'captcha-spin':
      captcha.classList.add('rotate-loop')

      switch (message.args) {
        case 'fast':
          captcha.style.animationDuration = '.9s'
          break
        case 'superFast':
          captcha.style.animationDuration = '.4s'
          break
        case 'ultraFast':
          captcha.style.animationDuration = '.2s'
          break
        case 'fast-a-r':
          captcha.style.animationDuration = '.2s'
          captcha.style.animationDirection = 'alternate'
          break
        case 'randomFast':
          captcha.style.animationDuration = `${
            interestingSpeeds[Math.floor(Math.random() * interestingSpeeds.length)]
          }ms`
          captcha.style.animationDirection = Math.random() < 0.5 ? 'reverse' : 'normal'

          break
        case 'reverse':
          captcha.style.animationDirection = 'reverse'
          break
        case 'pause':
          if (captcha.style.animationPlayState === 'paused') {
            captcha.style.animationPlayState = 'running'
          } else {
            captcha.style.animationPlayState = 'paused'
          }
          break
        default:
          captcha.style.animationDuration = '3.5s'

          break
      }
      break
    case 'cancelCaptchaTimeouts':
      removeTimeouts(message.context)
      break
    case 'hurry':
      showWarning(message.context)
      break
    case 'fail':
      // check if bob hasn't clicked
      // THIS WONT WORK IF MULTIPLE CAPTCHAS!!!
      // the clicks in show don't know about uuid of this template so it's tricky.

      // ok this is ONLY FOR THE CLICKER lulz
      showWarning(message.context)
      checkAndDie(message.context, message.context.view, false)
      // const hasntClicked = Number(document.getElementById('clickCounter').innerHTML) === 0
      // if (hasntClicked) {
      //   document.getElementById(
      //     'warning',
      //   ).innerHTML = `la personne ${message.context.data.chosenOne} a résisté à l'impératif productiviste.`
      // } else {
      //   document.getElementById(
      //     'warning',
      //   ).innerHTML = `la personne ${message.context.data.chosenOne} a cliqué à son rythme.`
      // }
      break
    case 'pass':
      message.context.passed.set(true)
      message.context.warning.set(false)
      removeTimeouts(message.context)

      checkAndDie(message.context, message.context.view, true)
      break
    case 'killCaptchas':
      // console.log('kill catpcahs', message.context.uuid)
      // hum that's an edge case, but if we launch a captcha by mistake, kill it immediately, and then launch another one, then that captcha will be eliminated by the old one's settimeout. So yeah we need to clear these timeouts. nice!
      if (instance.state.get() == 'captchas-coche-multiplayer') {
        unchoosePlayers()
      } else {
        unchoosePlayer()
      }

      removeTimeouts(message.context)
      // well, now that we have a scenario where several captchas exist in the same
      // screen, maybe we need a more graceful way of hiding
      // everyone. We would need to access to each template's reactive data context
      // and switch this.rendered.set(false).
      const element = document.getElementById(`pasUnRobot-${message.context.uuid}`)
      if (element) {
        element.style.opacity = 0
      }

      const uuidAtCall = message.context.uuid
      const viewAtCall = message.context.view

      Meteor.setTimeout(function () {
        // console.log('removing captcha', uuidAtCall)
        Blaze.remove(viewAtCall)
      }, 1000)

      break
  }
}

// const setCheckboxToFailed = function (checkbox) {
//   // if (!checkbox) {
//   //   console.error('Checkbox element not found!')
//   //   return
//   // }

//   // // Ensure the checkbox has a wrapper
//   // const parentDiv = checkbox.closest('.flex-none') // Find the correct container
//   // if (!parentDiv) {
//   //   console.error('Parent container not found!')
//   //   return
//   // }

//   // // Create the ❌ element
//   // const cross = document.createElement('span')
//   // cross.textContent = '❓'
//   // cross.classList.add('checkbox-cross')
//   // cross.style.position = 'absolute'
//   // cross.style.fontSize = '24px'
//   // cross.style.fontWeight = 'bold'
//   // cross.style.color = 'red'
//   // cross.style.pointerEvents = 'none' // Allows checkbox clicks
//   // cross.style.top = '50%'
//   // cross.style.left = '50%'
//   // cross.style.transform = 'translate(-50%, -50%)'

//   // // Ensure the checkbox container is relatively positioned
//   // parentDiv.style.position = 'relative'

//   // // **Disable all mouse events on the checkbox**
//   checkbox.style.pointerEvents = 'none'
//   checkbox.disabled = true // Prevent interaction programmatically

//   // // Append the ❌ inside the checkbox's container
//   // parentDiv.appendChild(cross)
// }

const showWarning = function (t) {
  t.warning.set(true)
}

// bloatware here, this is ONLY to make the dvd animation work.
function prepareAnimationWithCenteredStart({
  realId,
  axis = 'both',
  duration = 10000,
  resolution = 50,
  animationClass = 'saveme-animated',
}) {
  const realEl = document.getElementById(realId)
  if (!realEl) {
    console.warn(`Element #${realId} not found`)
    return
  }

  // Clone the real element
  const shadowEl = realEl.cloneNode(true)
  shadowEl.id = `${realId}-shadow`

  // Apply styles to make it hidden but measurable
  shadowEl.style.visibility = 'hidden'
  shadowEl.style.pointerEvents = 'none'
  shadowEl.style.position = 'absolute'
  shadowEl.style.top = '0'
  shadowEl.style.left = '0'
  shadowEl.style.zIndex = '-9999'
  shadowEl.style.animationPlayState = 'paused'
  shadowEl.classList.remove('-translate-x-1/2', '-translate-y-1/2', 'left-1/2', 'top-1/2')
  shadowEl.classList.add(animationClass)

  // Insert it into DOM
  document.body.appendChild(shadowEl)

  // Wait for a brief moment to ensure layout is computed
  setTimeout(() => {
    const animations = shadowEl.getAnimations()
    if (!animations.length) {
      console.warn('No animations found on cloned element.')
      shadowEl.remove()
      return
    }

    const screenCenterX = window.innerWidth / 2
    const screenCenterY = window.innerHeight / 2
    let closestTime = 0
    let smallestDistance = Infinity

    for (let t = 0; t <= duration; t += resolution) {
      animations.forEach((anim) => (anim.currentTime = t))

      const rect = shadowEl.getBoundingClientRect()
      const elementCenterX = rect.left + rect.width / 2
      const elementCenterY = rect.top + rect.height / 2

      let dx = 0,
        dy = 0
      if (axis === 'x' || axis === 'both') {
        dx = Math.abs(elementCenterX - screenCenterX)
      }
      if (axis === 'y' || axis === 'both') {
        dy = Math.abs(elementCenterY - screenCenterY)
      }

      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < smallestDistance) {
        smallestDistance = distance
        closestTime = t
      }
    }

    setTimeout(() => {
      // Apply computed negative delay to real element
      const negativeDelay = `-${closestTime}ms`
      realEl.style.animationDelay = negativeDelay
      realEl.classList.add(animationClass)

      // Clean up shadow
      shadowEl.remove()
      realEl.classList.remove('-translate-x-1/2', '-translate-y-1/2', 'left-1/2', 'top-1/2')
      // console.log(`>> Closest center time ≈ ${closestTime}ms`)
      // console.log(`>> Applied animation-delay: ${negativeDelay} to #${realId}`)
    }, 500)
  }, 50) // slight delay ensures layout is measurable
}

const updateScore = function (t, passed) {
  if (instance.state.get() != 'captchas-coche-1j') {
    return
  }

  const pointer = Object.values(instance.pointers.all()).find((p) => p.order === t.data.chosenOne)

  if (!pointer) {
    return
  }

  if (passed) {
    // console.log('update score! captcha succeeded', t.data.text.loot)
    pointer.score.human += t.data.text.loot
  } else {
    // console.log('update score! captcha failed', t.data.text.notClicked)
    pointer.score.human += t.data.text.notClicked
  }

  instance.pointers.set(pointer.id, pointer)
}
