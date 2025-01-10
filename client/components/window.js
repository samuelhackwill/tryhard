import './window.html'

import { checkboxCaptchas } from './../textAssets/captchas.js'

const feed = new ReactiveVar([{ value: 'Je ne suis pas un robot', hasInteracted: false }])
const captchaSolved = new ReactiveVar(false)
const captchaIndex = new ReactiveVar(0)

let fader = null

Template.windowAdmin.helpers({
  isAdminOpen() {
    let currentView = Template.instance().view

    while (currentView != null) {
      if (currentView.name == 'Template.show') {
        break
      }
      currentView = currentView.parentView
    }

    // console.log("is admin open? ", currentView.templateInstance().isAdminOpen.get())
    if (currentView.templateInstance().isAdminOpen.get() === true) {
      return 'transform: translate(-50%,-50%) scale3d(1, 1, 1);'
    } else {
      return 'transform: translate(-50%,-50%) scale3d(0, 0, 0);'
    }
  },

  getPos() {
    // cherche parmi tes parents qui est le template que tu désire
    // on s'en sert pour réutiliser le data contexte des parents, typiquement show
    // qui est la personne que tout le composants ont en commun et a la responsabilité
    // de gérer most of the state.
    let currentView = Template.instance().view

    while (currentView != null) {
      if (currentView.name == 'Template.show') {
        break
      }
      currentView = currentView.parentView
    }
    coords = currentView.templateInstance().adminPosition.get()
    return 'left : ' + coords[0] + 'px; top:' + coords[1] + 'px;'
  },

  isSpecialButton() {
    if (this == 'LANCER_LE_PLAYTEST') {
      return true
    } else {
      return false
    }
  },

  isCaptchaSolved() {
    return captchaSolved.get()
  },

  FSMEvents() {
    // show.html is passing a currentState=<state> arg
    // so we have acess to the FSM state that way
    // because we need to have the context of the parent component quoi.
    return Object.values(events)
  },

  isItCaptchaTime() {
    // "this" is actually the state of SHOW which was passed to its children.
    if (Template.instance().data.currentState == 'ACTE1s2') {
      return 'display : block;'
    } else {
      return 'display : none;'
    }
  },
  feed() {
    return feed.get()
  },
  getGlobalEvent() {
    return GlobalEvent.get()
  },
})

Template.windowAdmin.events({
  'click button'() {
    buttonId = String(this)
    GlobalEvent.set(buttonId)

    if (captchaSolved.get() == true && buttonId == 'LANCER_LE_PLAYTEST') {
      GlobalEvent.set(GlobalEvents.VRAIMENT_LANCER_LE_PLAYTEST)
    }
  },
})

Template.captcha.helpers({
  hasInteracted() {
    return this.hasInteracted
  },
})

Template.captcha.events({
  'click input'() {
    index = captchaIndex.get()

    if (index < checkboxCaptchas.length) {
      _feed = feed.get()
      _feed[_feed.length - 1].hasInteracted = true
      _feed.push({ value: checkboxCaptchas[index], hasInteracted: false })
      feed.set(_feed)
    } else {
      // trigger event! it's finished!
      fadeEveryCaptcha()
      return
    }

    _index = index + 1
    captchaIndex.set(_index)

    // scroll to bottom
    Meteor.setTimeout(() => {
      var objDiv = document.getElementById('captchaContainer')
      objDiv.scrollTop = objDiv.scrollHeight
    }, 0)
  },
})

fadeEveryCaptcha = function () {
  fader = Meteor.setInterval(() => {
    _feed = feed.get()
    _feed.pop()
    feed.set(_feed)

    if (_feed.length < 1) {
      Meteor.clearInterval(fader)
      captchaSolved.set(true)
    }
  }, 200)
}
