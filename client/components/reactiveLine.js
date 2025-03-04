import './reactiveLine.html'

Template.reactiveLine.helpers({
  getValue() {
    return instance[this.name].get() || 0
  },
})
