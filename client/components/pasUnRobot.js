import './pasUnRobot.html'

pasUnRobotTimeouts = []

Template.pasUnRobot.onCreated(function () {
  this.waiting = new ReactiveVar(false)
  this.timestamp = new Date()

  // lecture lente : 10 caractères par seconde.
  // donc 0.01 caractère/miliseconde

  // n(position du slider)	Valeur calculée
  // 1	                     3
  // 2	                     4
  // 3	                     7
  // 4	                     10
  // 5	                     15
  // 6	                     22
  // 7	                     30
  charsReadPerSecond = Math.round(3 * Math.pow(1.4678, this.data.readingSpeed - 1))

  this.minReadingTime = (this.data.text.length / charsReadPerSecond) * 1000
  // this reading time est en millisecondes.
})

Template.pasUnRobot.onRendered(function () {
  console.log(
    'debug : TIME TO COMPLETE CAPTCHA = reading time ',
    this.minReadingTime + ' + hesitation time ',
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
    }, this.minReadingTime + this.data.hesitationAmount),
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
    const handle = Template.instance().view
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

    if (
      clickTimestamp.getTime() - Template.instance().timestamp.getTime() >
      Template.instance().minReadingTime
    ) {
      checkAndDie(t, handle)
    } else {
      // console.log(
      //   'attend encore ',
      //   Template.instance().minReadingTime -
      //     (clickTimestamp.getTime() - Template.instance().timestamp.getTime()),
      //   'ms.',
      // )
      const wait =
        Template.instance().minReadingTime -
        (clickTimestamp.getTime() - Template.instance().timestamp.getTime())
      setTimeout(() => {
        checkAndDie(t, handle)
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
  }, 1500)
}

export const removeTimeouts = function () {
  pasUnRobotTimeouts.forEach(clearTimeout)
  pasUnRobotTimeouts = []
}
