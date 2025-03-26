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
  this.type = this.data
})

Template.clicker.onRendered(function () {
  console.log(this)
})

Template.clicker.helpers({
  is(typeName) {
    return Template.instance().type === typeName
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
        Blaze.renderWithData(Template.clicker, message.args[0], targetContainer)
      }
      break
    case 'showClicker':
      console.log('prout ', message.args, 'prout 2', message.args[0])
      document.querySelector(`#clicker-${message.args[0]}`).classList.remove('opacity-0')
      break
  }
}
