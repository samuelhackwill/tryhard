import './pasUnRobot.html'
import { moveOffOfCaptcha } from '../bots.js'
import { streamer } from '../../both/streamer.js'

pasUnRobotTimeouts = []

export let catpchaTemplateContainer = []

const interestingSpeeds = [
  235, 33, 40, 49, 42, 50, 52, 56, 131, 129, 61, 67, 94, 87, 109, 186, 217, 243, 275, 282, 284, 291,
  297, 304, 311, 407, 317, 358, 393, 423,
]

newX = 1
newY = 1

Template.pasUnRobot.onCreated(function () {
  const self = this
  streamer.on('pupitreAction', function (message) {
    _message = message
    message.context = self
    handlePupitreAction(_message)
  })
  // refactor : this.state would be better, to avoid multi-state-bordels
  this.waiting = new ReactiveVar(false)
  // this.fleeing = new ReactiveVar(false)
  this.timestamp = new Date()
  this.warning = new ReactiveVar(false)
  this.failed = new ReactiveVar(false)

  // this.autorun(() => {
  //   // Get the chosen item reactively
  //   const chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)

  //   if (chosenItem && this.fleeing.get()) {
  //     updateCaptchaPosition(this)
  //   }
  // })

  const speedRatio = 0.9 - -this.data.readingSpeed * 0.05
  this.minReadingTime = estimateReadingTime(this.data.text.value) * speedRatio
})

Template.pasUnRobot.onRendered(function () {
  const timeToComplete = this.data.surpriseAmount + this.minReadingTime + this.data.hesitationAmount

  console.log(
    'debug : TIME TO COMPLETE CAPTCHA =',
    'surprise time :',
    this.data.surpriseAmount,
    '+ reading time :',
    this.minReadingTime,
    ' + hesitation time : ',
    this.data.hesitationAmount,
  )

  const handle = Template.instance().view
  setTimeout(() => {
    document.getElementById('pasUnRobot').classList.remove('opacity-0')
  }, 50)

  const t = this
  const v = this.view
  pasUnRobotTimeouts.push(
    setTimeout(() => {
      console.log('player failed to complete captcha')
      checkAndDie(t, v, false)
    }, timeToComplete),
    setTimeout(() => {
      console.log('warn player that time almost over')
      showWarning(t)
    }, timeToComplete * 0.5),
  )
})

Template.pasUnRobot.helpers({
  // isFleeing() {
  //   console.log('fleeing changed!', Template.instance().fleeing.get())
  //   return Template.instance().fleeing.get()
  // },
  isFailed() {
    return Template.instance().failed.get()
  },
  isWarning() {
    if (Template.instance().warning.get() == true) {
      return 'opacity-1'
    } else {
      return 'opacity-0'
    }
  },
  hasInteracted() {
    return Template.instance().waiting.get()
  },
  jeNeSuisPas() {
    return this.text.value
  },
})

Template.pasUnRobot.events({
  'mousedown #checkbox-pasUnRobot'(event, t, obj) {
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
      setTimeout(() => {
        checkAndDie(t, t.view, true)
      }, wait)
      Template.instance().waiting.set(true)
    }
  },
})

const checkAndDie = function (t, handle, passed) {
  removeTimeouts()
  if (passed) {
    t.waiting.set(false)
    setTimeout(() => {
      document.getElementById('checkbox-pasUnRobot').checked = true
    }, 50)
  } else {
    t.failed.set(true)
    setCheckboxToFailed(document.getElementById('checkbox-pasUnRobot'))
  }

  setTimeout(() => {
    // console.log('captcha completed!!')
    const element = document.getElementById('pasUnRobot')
    element.style.opacity = 0

    setTimeout(() => {
      unchoosePlayer()
      Blaze.remove(handle)
    }, 300)
  }, 1000)
}

export const removeTimeouts = function () {
  pasUnRobotTimeouts.forEach(clearTimeout)
  pasUnRobotTimeouts = []
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

const unchoosePlayer = function (player) {
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

// makeCaptchaFlee = function () {
//   Blaze.getView(document.getElementById('pasUnRobot')).templateInstance().fleeing.set(true)
// }

const handlePupitreAction = function (message) {
  // message.context contains the original template which was bound to the streamer. Hm i wonder what will happen when we have several templates of captcha in the same page.
  const captcha = document.getElementById('pasUnRobot')
  switch (message.content) {
    case 'changeOpacity':
      document.getElementById('pasUnRobotWhiteBox').style.opacity = message.args / 10
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
        realId: 'pasUnRobot',
        duration: 30000,
        resolution: 50,
      })

      break
    case 'captcha-spin':
      captcha.classList.add('rotate-loop')

      switch (message.args) {
        case 'fast':
          captcha.style.animationDuration = '1.2s'
          break
        case 'superFast':
          captcha.style.animationDuration = '.2s'
          break
        case 'ultraFast':
          captcha.style.animationDuration = '.05s'
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
          break
      }
      break
    case 'cancelCaptchaTimeouts':
      removeTimeouts()
      break
    case 'hurry':
      showWarning(message.context)
      break
    case 'fail':
      showWarning(message.context)
      checkAndDie(message.context, message.context.view, false)
      break
    case 'killCaptchas':
      console.log('kill catpcahs')
      // hum that's an edge case, but if we launch a captcha by mistake, kill it immediately, and then launch another one, then that captcha will be eliminated by the old one's settimeout. So yeah we need to clear these timeouts. nice!
      let chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)
      if (chosenItem) {
        chosenItem.chosen = false
        chosenItem.captchaPlayCount++
        moveOffOfCaptcha(chosenItem)
        instance.pointers.set(chosenItem.id, chosenItem)
      }

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
  }
}

const setCheckboxToFailed = function (checkbox) {
  // if (!checkbox) {
  //   console.error('Checkbox element not found!')
  //   return
  // }

  // // Ensure the checkbox has a wrapper
  // const parentDiv = checkbox.closest('.flex-none') // Find the correct container
  // if (!parentDiv) {
  //   console.error('Parent container not found!')
  //   return
  // }

  // // Create the ❌ element
  // const cross = document.createElement('span')
  // cross.textContent = '❓'
  // cross.classList.add('checkbox-cross')
  // cross.style.position = 'absolute'
  // cross.style.fontSize = '24px'
  // cross.style.fontWeight = 'bold'
  // cross.style.color = 'red'
  // cross.style.pointerEvents = 'none' // Allows checkbox clicks
  // cross.style.top = '50%'
  // cross.style.left = '50%'
  // cross.style.transform = 'translate(-50%, -50%)'

  // // Ensure the checkbox container is relatively positioned
  // parentDiv.style.position = 'relative'

  // // **Disable all mouse events on the checkbox**
  checkbox.style.pointerEvents = 'none'
  checkbox.disabled = true // Prevent interaction programmatically

  // // Append the ❌ inside the checkbox's container
  // parentDiv.appendChild(cross)
}

const showWarning = function (t) {
  t.warning.set(true)
}

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
      console.log(`>> Closest center time ≈ ${closestTime}ms`)
      console.log(`>> Applied animation-delay: ${negativeDelay} to #${realId}`)
    }, 500)
  }, 50) // slight delay ensures layout is measurable
}
