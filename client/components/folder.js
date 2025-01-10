import './folder.html'

Template.folderAdmin.onCreated(function () {
  this.pos = new ReactiveVar([500, 400])
})

Template.folderAdmin.helpers({
  position() {
    return `left:${Template.instance().pos.get()[0]}px; top:${Template.instance().pos.get()[1]}px;`
  },
})

Template.folderAdmin.events({})

Template.folderVestiaire.onCreated(function () {
  this.pos = new ReactiveVar([800, 100])
})

Template.folderVestiaire.helpers({
  position() {
    return `left:${Template.instance().pos.get()[0]}px; top:${Template.instance().pos.get()[1]}px;`
  },
})
