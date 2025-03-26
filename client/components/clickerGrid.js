import './clickerGrid.html'
import { streamer } from '../../both/streamer.js'

Template.clickerGrid.onCreated(function () {
  streamer.on('pupitreAction', handlePupitreAction)
})

Template.clickerGrid.helpers({
  columns() {
    return [0, 1, 2].map((val, i) => ({ index: i, value: val }))
  },
  rows() {
    return [0, 1, 2, 3]
  },
})

Template.clicker.onCreated(function () {
  this.isRendered = new ReactiveVar(false)
  this.type = this.data[0]
})

Template.clicker.onRendered(function () {
  console.log(this)
  setTimeout(() => {
    this.isRendered.set(true)
  }, 50)
})

Template.clicker.helpers({
  is(typeName) {
    return Template.instance().type === typeName
  },
  isRendered() {
    return Template.instance().isRendered.get()
  },
})

const handlePupitreAction = function (message) {
  // find the first empty clicker container and fill it
  const containers = document.getElementsByClassName('clickerContainer')
  let targetContainer = null

  for (let i = 0; i < containers.length; i++) {
    if (containers[i].children.length === 0) {
      targetContainer = containers[i]
      break
    }
  }

  switch (message.content) {
    case 'clicker':
      if (targetContainer) {
        Blaze.renderWithData(Template.clicker, message.args, targetContainer)
      }
      break
  }
}
