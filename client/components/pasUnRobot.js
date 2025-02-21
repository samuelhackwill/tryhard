import './pasUnRobot.html'

pasUnRobotTimeouts = []

Template.pasUnRobot.onCreated(function () {
  this.hasInteracted = new ReactiveVar(false)
})

Template.pasUnRobot.onRendered(function () {
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
    }, 4000),
  )
})

Template.pasUnRobot.helpers({
  hasInteracted() {
    return Template.instance().hasInteracted.get()
  },
  jeNeSuisPas() {
    return this
  },
})

Template.pasUnRobot.events({
  'mouseup #checkbox-pasUnRobot'() {
    Template.instance().hasInteracted.set(true)
  },
})
