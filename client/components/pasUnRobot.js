import './pasUnRobot.html'

Template.pasUnRobot.onCreated(function () {
  this.hasInteracted = new ReactiveVar(false)
})

Template.pasUnRobot.onRendered(function () {
  setTimeout(() => {
    document.getElementById('pasUnRobot').classList.remove('opacity-0')
  }, 50)
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
  'click input#pasUnRobot'() {
    addToFeed()
    Template.instance().hasInteracted.set(true)
  },
})
