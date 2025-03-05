import './pupitre.html'

import { streamer } from '../../both/streamer.js'

import { disabledMice } from '../../both/disabledMice.js'

import { getRasp, getMouseBrand } from './show.js'

Template.pupitre.onCreated(function () {
  Session.set('state', 'mise')

  Meteor.call('resetConnectedDevices')

  this.autorun(() => {
    this.subscribe('disabledMice')
  })

  this.text = new ReactiveVar('')
  this.headers = new ReactiveVar([])
  this.selectedHeader = new ReactiveVar('mise')
  this.connectedDevices = new ReactiveVar('')
  this.selectedPlayer = new ReactiveVar('ffa')
  this.Captcha1jIndex = new ReactiveVar(0)
  this.Captcha1jPlayersCount = new ReactiveVar(0)

  Meteor.call('returnText', (err, res) => {
    if (err) {
      alert(err)
    } else {
      this.text.set(res)
      this.headers.set(res.map((item) => item.header))
    }
  })

  Meteor.setInterval(() => {
    // currently this is not reliable to detect disonnections!!! if a device OR a mouse is removed during the show i won't know about it. It should be pretty simple to implement though, all we need is to tell mouse_grabr to send a signal to the server. The current polling is only to get NEW devices.
    document.getElementById('rasp_update_status').innerText = 'listening for rasps...'
    this.connectedDevices.set('')
    // console.log(this.connectedDevices.get())
    Meteor.call('getConnectedDevices', (err, res) => {
      if (err) {
        alert(err)
        document.getElementById('rasp_update_status').innerText =
          'there was an error during the mouse count :x'
      } else {
        this.connectedDevices.set(res)
        if (res.length < 1) {
          document.getElementById('rasp_update_status').innerText = 'no mice found!'
        } else {
          document.getElementById('rasp_update_status').innerText = 'update complete!'
        }
      }
    })
  }, 1000)
})

Template.pupitre.helpers({
  getSomeIndex() {
    switch (Template.instance().selectedHeader.get()) {
      case 'captchas-single-player':
        const index = Template.instance().Captcha1jIndex?.get()
        const maxIndex = Template.instance().Captcha1jPlayersCount?.get()
        return index + '/' + maxIndex
        break

      default:
        return ''
        break
    }
  },
  isSelectedPlayer(e) {
    // console.log(e + '_' + String(this), Template.instance().selectedPlayer.get())

    // ok, so i'm ashamed, ok? due to a very inconsistent naming between pupitre, show, mouse-grabr, etc, we have cases where the proper id of the mouse is the group 1 of the regex, sometimes the group 2 etc. And the problem here is that bots were named like this :
    // th6_bot-1_
    // with the stupid trailing underscore just to make the regex work with them (yey)
    // but the problem is that it doesn't play nice with getBrand(). anyway. Maybe one day solve this technical debt thanks guess i'll never go to the recurse center bisous

    if (e == undefined && Template.instance().selectedPlayer.get() == 'ffa') {
      return 'checked'
    } else {
      const client = e + '_' + String(this)
      if (
        client == Template.instance().selectedPlayer.get() ||
        client == Template.instance().selectedPlayer.get() + '_'
      ) {
        return 'checked'
      } else {
        return 'unchecked'
      }
    }
  },
  isChecked(_rasp) {
    // console.log(disabledMice.find({ rasp: _rasp, brand: String(this) }).fetch().length == 0)
    if (disabledMice.find({ rasp: _rasp, brand: String(this) }).fetch().length == 0) {
      return 'checked'
    }
    return 'unchecked'
  },
  getConnectedDevices() {
    if (Template.instance().connectedDevices.get().length > 0)
      return Template.instance().connectedDevices.get()?.sort()
  },
  getMice() {
    // le serveur nous envoie des noms de souris longs comme le bras parce qu'ils incluent le chemin input/dev etc etc donc on cleane en claquant une grosse regex, et si on a pas de match on garde tout le nom quand même histoire de pas oublier des souris parce qu'on les connaissait pas.
    cleanMice = []

    for (x = 0; x < this.mice.length; x++) {
      cleanMice.push(getMouseBrand(this.mice[x]))
    }
    return cleanMice
  },
  styleActions() {
    if (this.type != 'text') {
      return 'text-red-500 focus:bg-red-500 focus:text-black'
    } else {
      return
    }
  },

  state() {
    if (Session.get('state')) {
      return Session.get('state')
    } else {
      return 'no state found'
    }
  },

  // selectedHeader() {
  //   if (Template.instance().selectedHeader.get()) {
  //     return '§ ' + Template.instance().selectedHeader.get()
  //   } else {
  //     return
  //   }
  // },

  getHeaders() {
    return Template.instance().headers.get()
  },

  getContent() {
    select = Template.instance().selectedHeader.get()
    data = Template.instance().text.get()

    if (select && data) {
      const values = data.find((item) => item.header === select)?.content || []

      return values
    } else {
      return ''
    }
  },
})

Template.pupitre.events({
  'click #override-timeout'() {
    sendAction('cancelCaptchaTimeouts')
  },
  'click .playerToggle'(e) {
    if (e.target.id == 'radio-ffa') {
      Template.instance().selectedPlayer.set('ffa')
      sendAction('unchoosePlayers')
    } else {
      const who = getRasp(e.target.id) + '_' + getMouseBrand(e.target.id, 0)
      Template.instance().selectedPlayer.set(who)
      sendAction('choosePlayer', who)
    }
    // console.log(Template.instance().selectedPlayer.get())
  },
  'click .mouseToggle'(e, t) {
    // quand un siege reste vide, on veut pouvoir désactiver la souris pour qu'elle ne soit jamais prise en compte pendant le spectacle.
    let _on = false

    if (e.target.checked) {
      console.log('activate mouse :', e.target.dataset.rasp + '_' + e.target.dataset.brand)
      // ça, ça veut dire qu'il faut lever l'interdiction de créer un pointeur en cas de mouvement de souris.
      _on = true
    } else {
      console.log('deactivate mouse :', e.target.dataset.rasp + '_' + e.target.dataset.brand)
      // HUM! ça, ça veut dire deux choses:
      // si il y a des mouvements parasite (dossier qui bouge ou quoi), ça ne doit pas faire apparaître de souris désactivée.
      // si il y a déjà un pointeur parce que y'a eu des mouvements parasites pendant l'entrée public, il faut le détruire.
    }
    Meteor.call('toggleMouse', {
      on: _on,
      rasp: e.target.dataset.rasp,
      brand: e.target.dataset.brand,
    })
  },
  'click .header'() {
    Session.set('state', String(this))
    Template.instance().selectedHeader.set(String(this))
    // the timeout is to make sure blaze has rendered, lulz.
    Meteor.setTimeout(() => {
      document.getElementById('textLinesColumn').children[0].children[0].focus()
    }, 0)

    const div = document.getElementById('textLinesColumn') // Replace with your div's ID
    const children = div.children

    // ok alors comme on a une tite fonction sympa qui raye les lignes
    // au fur et à mesure qu'on les envoie
    // et qu'apparemment meteor s'en fout de la réactivité pour une fois
    // ben faut enlever ces barrures quand on navige dans le texte
    // (sinon on voit les nouvelles lignes barrées )
    for (let child of children) {
      for (let chil of child.children) {
        chil.classList.remove('line-through')
      }
    }

    switch (String(this)) {
      case 'captchas-single-player':
        numberOfPlayers = Array.from(document.querySelectorAll('.mouseToggle:checked')).length
        Template.instance().Captcha1jPlayersCount.set(numberOfPlayers)
        break

      default:
        break
    }
  },

  'click #captcha-spin'() {
    sendAction('captcha-spin')
  },

  'click #captcha-whirl'() {
    sendAction('captcha-spin', 'fast')
  },

  'click #captcha-flee'() {
    sendAction('captcha-flee')
  },

  'click .line'(e) {
    e.target.classList.add('line-through')
    checkBeforeEmit(this)
  },

  'keyup .line'(e) {
    if (e.key == 'Enter') {
      e.target.classList.add('line-through')
      checkBeforeEmit(this)
    } else {
      return
    }
  },
})

const sendLine = function (string) {
  streamer.emit('pupitreMessage', { type: 'newLine', content: string })
}

const sendAction = function (string, instructions) {
  _args = instructions || 0
  // console.log('pupitreAction', { type: 'action', content: string, args: _args })
  streamer.emit('pupitreAction', { type: 'action', content: string, args: _args })
}

const checkBeforeEmit = function (context) {
  if (String(context.type) == 'text') {
    switch (Template.instance().selectedHeader.get()) {
      case 'startObserving':
        sendAction('startObserving')
        break
      case 'captchas-single-player':
        _hesitationAmount = Number(document.getElementById('hesitation-slider').value) * 1000
        _readingSpeed = Number(document.getElementById('reading-speed-slider').value)
        _surpriseAmount = document.getElementById('surprise-slider').value
        sendAction('newCaptcha-1j', {
          text: String(context.value),
          coords: { x: 0, y: 0 },
          hesitationAmount: _hesitationAmount,
          readingSpeed: _readingSpeed,
          surpriseAmount: Number(_surpriseAmount) * 1000,
        })
        document.getElementById('surprise-slider').value = _surpriseAmount - 1

        _index = Template.instance().Captcha1jIndex.get()

        activePlayer = Array.from(document.querySelectorAll('.mouseToggle:checked'))[_index]
        brand = activePlayer.getAttribute('data-brand')
        rasp = activePlayer.getAttribute('data-rasp')

        document.getElementById(rasp + '_' + brand + '-chosen').click()

        if (_index == Template.instance().Captcha1jPlayersCount.get() - 1) {
          alert('cool, everybody has completed a captcha! nice!')
          _index = -1
        }
        _index++
        Template.instance().Captcha1jIndex.set(_index)

        break

      default:
        sendLine(String(context.value))
        break
    }
  } else {
    action = String(context.value)
    sendAction(action)
  }
}
