import { Meteor } from 'meteor/meteor'
import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import { streamer } from '../../both/streamer.js' // Import the streamer to send data
import './logger.html'

Template.logger.onCreated(function () {
  this.pointer = new ReactiveDict()
  this.pointer.set('X', 1)
  this.pointer.set('Y', 1)
  if (this.data.loggerId) {
    this.loggerId = this.data.loggerId
  } else {
    //TODO: replace this (bad, random) uuid by a repeatable name:
    //mouse evdev + raspberry pi hostname
    this.loggerId = Date.now().toString() + Math.floor(Math.random() * 1000)
  }

  instance = this

  document.addEventListener('mousemove', function (event) {
    let coords = {
      x: event.movementX,
      y: event.movementY,
    }

    let newPointerPosition = {
      x: instance.pointer.get('X') + coords.x,
      y: instance.pointer.get('Y') + coords.y,
    }

    //Clamp newPointerPosition between 0,0 and containerDimensions
    let containerDimensions = {
      x: document.querySelector('.container').clientWidth,
      y: document.querySelector('.container').clientHeight,
    }
    if (newPointerPosition.x < 0) newPointerPosition.x = 0
    if (newPointerPosition.y < 0) newPointerPosition.y = 0
    if (newPointerPosition.x > containerDimensions.x) newPointerPosition.x = containerDimensions.x
    if (newPointerPosition.y > containerDimensions.y) newPointerPosition.y = containerDimensions.y

    instance.pointer.set('X', newPointerPosition.x)
    instance.pointer.set('Y', newPointerPosition.y)

    sendMessage({ type: 'move', loggerId: instance.loggerId, coords: coords })
  })
  document.addEventListener('mousedown', function (event) {
    sendMessage({ type: 'mousedown', loggerId: instance.loggerId })
  })
  document.addEventListener('mouseup', function (event) {
    sendMessage({ type: 'mouseup', loggerId: instance.loggerId })
  })
})

Template.logger.onRendered(function () {
  console.log('logger rendered')
  let coords = {
    x: 1,
    y: 1,
  }
  sendMessage({ type: 'move', loggerId: instance.loggerId, coords: coords })

  document.querySelector('body').addEventListener(
    'click',
    function () {
      document.querySelector('body').requestPointerLock()
    },
    { once: true },
  )
})

Template.logger.helpers({
  loggerId() {
    return Template.instance().loggerId
  },
  posX() {
    return Template.instance().pointer.get('X')
  },
  posY() {
    return Template.instance().pointer.get('Y')
  },
})

function sendMessage(message) {
  streamer.emit('pointerMessage', message)
}
