import './pasUnRobot.html'

import { moveOffOfCaptcha } from '../bots.js'

pasUnRobotTimeouts = []
newX = 1
newY = 1

Template.pasUnRobot.onCreated(function () {
  // refactor : this.state would be better, to avoid multi-state-bordels
  this.waiting = new ReactiveVar(false)
  this.fleeing = new ReactiveVar(false)
  this.timestamp = new Date()

  this.autorun(() => {
    // Get the chosen item reactively
    const chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)

    if (chosenItem && this.fleeing.get()) {
      updateCaptchaPosition(this)
    }
  })

  const speedRatio = 0.9 - -this.data.readingSpeed * 0.05
  this.minReadingTime = estimateReadingTime(this.data.text) * speedRatio
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

  pasUnRobotTimeouts.push(
    setTimeout(() => {
      console.log('timeout!!')
      const element = document.getElementById('pasUnRobot')
      element.style.opacity = 0

      pasUnRobotTimeouts.push(
        setTimeout(() => {
          Blaze.remove(handle)

          unchoosePlayer()
        }, 300),
      )
    }, timeToComplete),
  )
})

Template.pasUnRobot.helpers({
  isFleeing() {
    console.log('fleeing changed!', Template.instance().fleeing.get())
    return Template.instance().fleeing.get()
  },
  hasInteracted() {
    return Template.instance().waiting.get()
  },
  jeNeSuisPas() {
    return this.text
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
      checkAndDie(t, t.view, obj.pointer)
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
        checkAndDie(t, t.view, obj.pointer)
      }, wait)
      Template.instance().waiting.set(true)
    }
  },
})

checkAndDie = function (t, handle, pointer) {
  removeTimeouts()

  t.waiting.set(false)
  setTimeout(() => {
    document.getElementById('checkbox-pasUnRobot').checked = true
  }, 50)

  setTimeout(() => {
    console.log('captcha completed!!')
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

estimateReadingTime = function (text) {
  const L = text.length
  // alors ce que j'ai fait c'est que j'ai fourni des data points à notre ami (je me suis enregistré en train de faire défiler les captchas à un rythme qui me semblait acceptable) et il a écrit les maths pour fit the curve. C'est fou. C'est toujours beaucoup trop lent avec les gros textes though.

  // Updated quadratic model parameters (fitted to extended data)
  const a = 2381
  const b = 33.42
  const c = 0.0405

  // Compute estimated time in milliseconds
  return a + b * L + c * L ** 2
}

unchoosePlayer = function (player) {
  let _player = player || null

  if (_player == null) {
    let chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)
    chosenItem.chosen = false
    moveOffOfCaptcha(chosenItem)
    instance.pointers.set(chosenItem.id, chosenItem)
  } else {
    _player.chosen = false
    moveOffOfCaptcha(chosenItem)
    instance.pointers.set(chosenItem.id, chosenItem)
  }
}

makeCaptchaFlee = function () {
  Blaze.getView(document.getElementById('pasUnRobot')).templateInstance().fleeing.set(true)
}

updateCaptchaPosition = function (t) {
  const chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)
  const mouseCoords = chosenItem.coords
  const captcha = document.getElementById('pasUnRobot')

  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const threshold = 50 // Distance at which the captcha starts moving away
  const step = 5 // Pixels the captcha moves per frame

  const rect = captcha.getBoundingClientRect()
  const captchaX = rect.left + rect.width / 2
  const captchaY = rect.top + rect.height / 2

  const deltaX = captchaX - mouseCoords.x
  const deltaY = captchaY - mouseCoords.y

  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)
  // console.log('delta', deltaX, deltaY)
  // console.log('distance', distance)

  if (distance < threshold) {
    // Normalize movement direction
    const moveX = (deltaX / distance) * step
    const moveY = (deltaY / distance) * step

    let newX = rect.left + moveX
    let newY = rect.top + moveY

    // Keep inside screen bounds
    newX = Math.max(0, Math.min(screenWidth - rect.width, newX))
    newY = Math.max(0, Math.min(screenHeight - rect.height, newY))

    console.log(newX, newY)

    document.getElementById('pasUnRobot').style.left = newX + 'px'
    document.getElementById('pasUnRobot').style.top = newY + 'px'
  }
}
