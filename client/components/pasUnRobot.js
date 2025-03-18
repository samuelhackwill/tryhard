import './pasUnRobot.html'
import { moveOffOfCaptcha } from '../bots.js'
import { streamer } from '../../both/streamer.js'

streamer.on('pupitreAction', function () {
  streamer.on('pupitreAction', handlePupitreAction)
})
pasUnRobotTimeouts = []

export let catpchaTemplateContainer = []

newX = 1
newY = 1

Template.pasUnRobot.onCreated(function () {
  // refactor : this.state would be better, to avoid multi-state-bordels
  this.waiting = new ReactiveVar(false)
  // this.fleeing = new ReactiveVar(false)
  this.timestamp = new Date()

  // this.autorun(() => {
  //   // Get the chosen item reactively
  //   const chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)

  //   if (chosenItem && this.fleeing.get()) {
  //     updateCaptchaPosition(this)
  //   }
  // })

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

  const t = this
  const v = this.view
  pasUnRobotTimeouts.push(
    setTimeout(() => {
      console.log('player failed to complete captcha')
      checkAndDie(t, v, false)
    }, timeToComplete),
    setTimeout(() => {
      console.log('warn player that time almost over')
      showWarning()
    }, timeToComplete * 0.5),
  )
})

Template.pasUnRobot.helpers({
  // isFleeing() {
  //   console.log('fleeing changed!', Template.instance().fleeing.get())
  //   return Template.instance().fleeing.get()
  // },
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

checkAndDie = function (t, handle, passed) {
  removeTimeouts()
  if (passed) {
    t.waiting.set(false)
    setTimeout(() => {
      document.getElementById('checkbox-pasUnRobot').checked = true
    }, 50)
  } else {
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

function handlePupitreAction(message) {
  switch (message.content) {
    case 'captcha-spin':
      if (message.args) {
        document.getElementById('pasUnRobot').classList.add('rotate-loop-fast')
      } else {
        document.getElementById('pasUnRobot').classList.add('rotate-loop')
      }
      break
    case 'cancelCaptchaTimeouts':
      removeTimeouts()
      break
    case 'killCaptchas':
      // hum that's an edge case, but if we launch a captcha by mistake, kill it immediately, and then launch another one, then that captcha will be eliminated by the old one's settimeout. So yeah we need to clear these timeouts. nice!
      let chosenItem = Object.values(instance.pointers.all()).find((obj) => obj.chosen)
      if (!chosenItem) {
        return
      }
      chosenItem.chosen = false
      chosenItem.captchaPlayCount++
      moveOffOfCaptcha(chosenItem)
      instance.pointers.set(chosenItem.id, chosenItem)

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

function setCheckboxToFailed(checkbox) {
  document.getElementById('warning').innerHTML = 'hannn la souris n°2 est un robot han'

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
  // checkbox.style.pointerEvents = 'none'
  // checkbox.disabled = true // Prevent interaction programmatically

  // // Append the ❌ inside the checkbox's container
  // parentDiv.appendChild(cross)
}

function showWarning() {
  document.getElementById('warning').classList.remove('opacity-0')
  document.getElementById('warningBorder').classList.remove('opacity-0')
}
