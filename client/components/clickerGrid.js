import './clickerGrid.html'

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
})

Template.clicker.onRendered(function () {
  setTimeout(() => {
    this.isRendered.set(true)
  }, 50)
})

Template.clicker.helpers({
  isRendered() {
    return Template.instance().isRendered.get()
  },
})
