import './pasUnRobot.html'

pasUnRobotTimeouts = []

Template.pasUnRobot.onCreated(function () {
  this.waiting = new ReactiveVar(false)
  this.timestamp = new Date()

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
        }, 300),
      )
    }, timeToComplete),
  )
})

Template.pasUnRobot.helpers({
  hasInteracted() {
    return Template.instance().waiting.get()
  },
  jeNeSuisPas() {
    return this.text
  },
})

Template.pasUnRobot.events({
  'mousedown #checkbox-pasUnRobot'() {
    const t = Template.instance()

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
      checkAndDie(t, t.view)
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
        checkAndDie(t, t.view)
      }, wait)
      Template.instance().waiting.set(true)
    }
  },
})

checkAndDie = function (t, handle) {
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
  // alors ce que j'ai fait c'est que j'ai fourni des data points à notre ami (je me suis enregistré en train de faire défiler les captchas à un rythme qui me semblait acceptable) et il a écrit les maths pour fit the curve. C'est fou.

  // Updated quadratic model parameters (fitted to extended data)
  const a = 2381
  const b = 33.42
  const c = 0.0405

  // Compute estimated time in milliseconds
  return a + b * L + c * L ** 2
}
