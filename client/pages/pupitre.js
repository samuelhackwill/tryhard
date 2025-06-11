import './pupitre.html'

import { streamer } from '../../both/streamer.js'

import { getRasp, getMouseBrand } from './show.js'

const musick = new Audio('/music/stronger_monsters_toby_fox.mp3')

const explosionPath = './explosions/'
const explosionSounds = [
  '1.mp3',
  '1.mp3',
  '1.mp3',
  '1.mp3',
  '1.mp3',
  '1.mp3',
  '1.mp3',
  '1.mp3',
  '1.mp3',
  '2.mp3',
  '3.mp3',
]

Template.pupitre.onCreated(function () {
  this._handlePlanDeSalleMessage = (message) => {
    message.template = this
    handlePlanDeSalleMessage(message)
  }

  streamer.on('planDeSalleMessage', this._handlePlanDeSalleMessage)
  streamer.on('explosion', playExplosion)

  Meteor.call('resetConnectedDevices')
  this.text = new ReactiveVar('')
  this.headers = new ReactiveVar([])
  this.selectedHeader = new ReactiveVar('mise')
  this.connectedDevices = new ReactiveVar('')
  this.selectedPlayer = new ReactiveVar('ffa')
  this.chairsNumber = new ReactiveVar(35)
  this.cochesNumber = new ReactiveVar(1)
  this.playersNumber = new ReactiveVar(1)
  this.danceSpeed = new ReactiveVar(100)
  Meteor.call('returnText', (err, res) => {
    if (err) {
      alert(err)
    } else {
      this.text.set(res)
      this.headers.set(res.map((item) => item.header))
    }
  })
})

Template.pupitre.onRendered(function () {
  addShortcutListeners()
  sendAction('toggleAutoTimeout', false)
})

Template.pupitre.helpers({
  isItMultiplayerCaptchaTime() {
    return Template.instance().selectedHeader.get().startsWith('captchas-coche-multi')
  },
  isItChairTime() {
    return Template.instance().selectedHeader.get().startsWith('chaises')
  },
  getCochesNumber() {
    return Template.instance().cochesNumber.get()
  },
  getPlayersNumber() {
    return Template.instance().playersNumber.get()
  },
  getChairsNumber() {
    return Template.instance().chairsNumber.get()
  },
  getDanceSpeed() {
    return Template.instance().danceSpeed.get()
  },
  getSomeIndex() {
    // switch (Template.instance().selectedHeader.get()) {
    //   case 'iii-captchas-1j-s2':
    //     const index = Template.instance().Captcha1jIndex?.get()
    //     const maxIndex = Template.instance().Captcha1jPlayersCount?.get()
    //     return index + '/' + maxIndex
    //     break
    //   default:
    //     return ''
    //     break
    // }
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
  getConnectedDevices() {
    if (Template.instance().connectedDevices.get().length > 0)
      return Template.instance().connectedDevices.get()?.sort()
  },
  getMice() {
    // le serveur nous envoie des noms de souris longs comme le bras parce qu'ils incluent le chemin input/dev etc etc donc on cleane en claquant une grosse regex, et si on a pas de match on garde tout le nom quand même histoire de pas oublier des souris parce qu'on les connaissait pas.
    const cleanMice = []

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

  selectedHeader() {
    if (Template.instance().selectedHeader.get()) {
      return '§ ' + Template.instance().selectedHeader.get()
    } else {
      return 'no state found'
    }
  },

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
  'click #fox'() {
    musick.src = '/music/stronger_monsters_toby_fox.mp3'
  },
  'click #praetorius'() {
    musick.src = '/music/spagnoleta_m_praetorius_maurizio_machella.mp3'
  },
  'click #override-timeout'(event) {
    const button = event.currentTarget
    const currentState = button.getAttribute('aria-pressed') === 'true'

    const newState = !currentState

    sendAction('toggleAutoTimeout', newState)

    button.setAttribute('aria-pressed', newState)
    console.log('Override timeout toggled:', newState)
  },
  'click #chairs-start-music'() {
    musick.play()
  },
  'click #chairs-start-carousel'() {
    sendAction('startCarousel')
  },

  'click #chairs-stop-everythingCarousel'() {
    sendAction('stopEverythingCarousel')
  },
  'click #chairs-stop-music'() {
    fadeAudio(musick, 'out', 300)
  },
  'click #forceRefresh'() {
    sendAction('forceRefresh')
  },
  'click #chairs-squidGame'() {
    Template.instance().selectedHeader.set('chaises-squidGame')
    broadcastState('chaises-squidGame')
    sendAction('squidGame')
  },
  'click #chairs-initRonde'() {
    sendAction('initRonde')
  },
  'click #chairs-stop-ronde'() {
    sendAction('nukeEventQueue')
  },
  'click #chairs-killUnseated'() {
    fadeAudio(musick, 'out', 300)
    Template.instance().selectedHeader.set('chaises')
    broadcastState('chaises')
    sendAction('killCaptchas')
    sendAction('killUnseated')
  },
  'click #chairs-send-jesuis'(e) {
    sendAction('createChairs', {
      type: 'chair',
      hesitationAmount: 1000000,
      readingSpeed: 1,
      surpriseAmount: 1,
      howMany: Number(Template.instance().chairsNumber.get()),
      text: { value: 'je ne suis pas un robot', emphasis: 'robot' },
      animationSpeed: Template.instance().danceSpeed.get() / 10,
    })
  },
  'click #chairs-send-lastChair'(e) {
    sendAction('createChairs', {
      type: 'chair',
      hesitationAmount: 1000000,
      readingSpeed: 1,
      surpriseAmount: 1,
      howMany: Number(Template.instance().chairsNumber.get()),
      text: { value: 'mettre fin à la performance', emphasis: 'performance' },
      animationSpeed: Template.instance().danceSpeed.get() / 10,
    })
  },
  'input #chairs-slider'(e) {
    Template.instance().chairsNumber.set(e.target.value)
  },
  'input #coches-slider'(e) {
    Template.instance().cochesNumber.set(e.target.value)
  },
  'input #players-slider'(e) {
    Template.instance().playersNumber.set(e.target.value)
  },
  'input #danceSpeed-slider'(e) {
    Template.instance().danceSpeed.set(e.target.value)
  },
  'input #opacity-slider'(e) {
    // console.log('sliderChange', { id: sliderId, value: sliderValue })
    sendAction('changeOpacity', e.target.value)
  },
  'click #hurry'() {
    sendAction('cancelCaptchaTimeouts')
    sendAction('hurry')
  },
  'click #fail'() {
    sendAction('cancelCaptchaTimeouts')
    sendAction('fail')
  },
  'click #pass'() {
    sendAction('cancelCaptchaTimeouts')
    sendAction('pass')
  },
  'click #kill'() {
    sendAction('killCaptchas')
  },
  'click .playerToggle'(e) {
    if (e.target.id == 'radio-ffa') {
      Template.instance().selectedPlayer.set('ffa')
      sendAction('unchoosePlayers')
    } else {
      // const who = getRasp(e.target.id) + '_' + getMouseBrand(e.target.id, 0)
      // Template.instance().selectedPlayer.set(who)
      // sendAction('choosePlayer', who)
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
    broadcastState(String(this))
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
      // case 'iii-captchas-1j-s2':
      //   numberOfPlayers = Array.from(document.querySelectorAll('.mouseToggle:checked')).length
      //   Template.instance().Captcha1jPlayersCount.set(numberOfPlayers)
      //   break

      default:
        break
    }
  },

  'click #captcha-spin'() {
    sendAction('captcha-spin')
  },

  'click #captcha-spin-reverse'() {
    sendAction('captcha-spin', 'reverse')
  },

  'click #captcha-fast'() {
    sendAction('captcha-spin', 'fast')
  },

  'click #captcha-whirl'() {
    sendAction('captcha-spin', 'superFast')
  },

  'click #captcha-ultraFast'() {
    sendAction('captcha-spin', 'ultraFast')
  },

  'click #captcha-randomFast'() {
    sendAction('captcha-spin', 'randomFast')
  },

  'click #captcha-pause'() {
    sendAction('captcha-spin', 'pause')
  },

  'click #captcha-dvd'() {
    sendAction('dvd')
  },

  'click .line'(e) {
    e.target.classList.add('line-through')
    console.log('click ', this)
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

const broadcastState = function (string) {
  streamer.emit('pupitreStateChange', { type: 'stateChange', content: string })
}

const checkBeforeEmit = function (context) {
  if (String(context.type) == 'text') {
    switch (Template.instance().selectedHeader.get()) {
      // here goes all non-standard behaviour. we don't need
      // to name every action keyword because they are being
      // pris en charge by the default block down down
      case 'captchas-coche-1j':
        console.log('check before emit ', context)
        sendAction('reqNextPlayer', context)
        break
      case 'captchas-kinetic-1j':
        sendAction('reqNextPlayer', context)
        break
      case 'captchas-coche-conclusion':
        sendAction('reqNextPlayer', context)
        break
      case 'captchas-coche-multiplayer':
        // Add extra info to context for multiplayer
        const multiplayerContext = {
          ...context,
          players: Number(Template.instance().playersNumber.get()),
          coches: Number(Template.instance().cochesNumber.get()),
        }
        sendAction('reqNextMultiplePlayers', multiplayerContext)
        break

      default:
        sendLine(String(context.value))
        break
    }
  } else {
    // here we're parsing action lines in case they contain arguments
    // IF THEY DO, then also check if it's a special captcha
    const value = String(context.value)
    const match = value.match(/^(\w+)\s*\[(.*)\]$/)
    if (match) {
      const action = match[1]
      const args = match[2].split(',').map((arg) => arg.trim())
      console.log(action, args)
      switch (action) {
        case 'ImgCapGridSubmit':
        case 'ImgCapOnlyOneSubmit':
        case 'ImgCapNoSelect':
          sendAction('reqNextPlayer', { type: action, args: args })
          break
        // case 'chaises':
        //   sendAction('chaises', {
        //     type: 'chair',
        //     text: getCaptchaTextAndFailstate(args[0]),
        //     hesitationAmount: 1000000,
        //     readingSpeed: 1,
        //     surpriseAmount: 1,
        //   })
        //   break
        // case 'clicker':
        //   sendAction('reqNextPlayer', { type: action, args: args })
        //   break
        case 'tetris':
          sendAction('newTetris', {
            type: 'tetris',
            // we're not getting text from the same place, look at how checkBeforeEmit
            // is parsing the args from action lines. We need to do this because we're
            // going to pack a hell of a lot more pseudo code in the captchas of acte II
            text: getCaptchaTextAndFailstate(args[0]),
            hesitationAmount: 1000,
            readingSpeed: 0,
            surpriseAmount: -1000,
          })
          break
        default:
          sendAction(action, args)
          break
      }
    } else {
      // console.log('proutos', value)
      sendAction(value)
    }
  }
}

const handlePlanDeSalleMessage = function (message) {
  const state = message.template.selectedHeader.get()
  // console.log(state)
  switch (message.type) {
    case 'nextPlayerIs':
      console.log(message.context)
      switch (message.context.type) {
        case 'ImgCapGridSubmit':
        case 'ImgCapOnlyOneSubmit':
        case 'ImgCapNoSelect':
          sendAction('choosePlayer', { chosenOne: message.content.device })
          sendAction(message.context.type, message.context.args)
          break
        case 'text':
          _hesitationAmount = Number(document.getElementById('hesitation-slider').value) * 1000
          _readingSpeed = Number(document.getElementById('reading-speed-slider').value)
          _surpriseAmount = document.getElementById('surprise-slider').value
          console.log(message)
          sendAction('choosePlayer', {
            chosenOne: message.content.device,
            customMoveTo: message.moveTo,
          })

          sendAction('newCaptcha-1j', {
            text: getCaptchaTextAndFailstate(String(message.context.value)),
            hesitationAmount: _hesitationAmount,
            readingSpeed: _readingSpeed,
            surpriseAmount: Number(_surpriseAmount) * 1000,
            chosenOne: message.content.order,
          })
          document.getElementById('surprise-slider').value = _surpriseAmount - 1
          break
        default:
          break
      }
  }
}

const getCaptchaTextAndFailstate = function (string) {
  // so this function is used to incruste de la data dans le captcha
  // so that if the player fails the captcha,
  // the checkAndDie function knows what the player IS
  // ie what challenge he failed.
  // "je ne suis pas un robot" > "j1 est un robot".
  const emphasisRegex = /_(.*?)_/
  const metadataRegex = /\s*\[(-?\d+)\](?:\[\s*(-?\d+)\])?\s*$/

  const emphasisMatch = string.match(emphasisRegex)
  const metadataMatch = string.match(metadataRegex)

  const emphasis = emphasisMatch ? emphasisMatch[1] : 'un robot'
  const cleanedValue = string.replace(emphasisRegex, '').replace(metadataRegex, '').trim()

  const loot = metadataMatch ? parseInt(metadataMatch[1], 10) : null
  const notClicked = metadataMatch && metadataMatch[2] ? parseInt(metadataMatch[2], 10) : null

  return {
    value: cleanedValue,
    emphasis: emphasis,
    loot: loot,
    notClicked: notClicked,
  }
}

const playExplosion = function () {
  const randomExplosionSound =
    explosionPath + explosionSounds[Math.floor(Math.random() * explosionSounds.length)]
  const explosionAudio = new Audio(randomExplosionSound)
  explosionAudio.play()
}

const addShortcutListeners = function () {
  document.addEventListener('keydown', function (event) {
    if (event.key === '&') {
      const button = document.getElementById('hurry')
      if (button && button.getAttribute('aria-pressed') !== 'true') {
        button.setAttribute('aria-pressed', 'true')
        button.dispatchEvent(new Event('mousedown'))
      }
    }
  })

  document.addEventListener('keyup', function (event) {
    if (event.key === '&') {
      const button = document.getElementById('hurry')
      if (button && button.getAttribute('aria-pressed') === 'true') {
        button.setAttribute('aria-pressed', 'false')
        button.dispatchEvent(new Event('mouseup'))
        button.click()
      }
    }
  })
  document.addEventListener('keydown', function (event) {
    if (event.key === 'é') {
      const button = document.getElementById('fail')
      if (button && button.getAttribute('aria-pressed') !== 'true') {
        button.setAttribute('aria-pressed', 'true')
        button.dispatchEvent(new Event('mousedown'))
      }
    }
  })

  document.addEventListener('keyup', function (event) {
    if (event.key === 'é') {
      const button = document.getElementById('fail')
      if (button && button.getAttribute('aria-pressed') === 'true') {
        button.setAttribute('aria-pressed', 'false')
        button.dispatchEvent(new Event('mouseup'))
        button.click()
      }
    }
  })
  document.addEventListener('keydown', function (event) {
    if (event.key === '"') {
      const button = document.getElementById('pass')
      if (button && button.getAttribute('aria-pressed') !== 'true') {
        button.setAttribute('aria-pressed', 'true')
        button.dispatchEvent(new Event('mousedown'))
      }
    }
  })

  document.addEventListener('keyup', function (event) {
    if (event.key === '"') {
      const button = document.getElementById('pass')
      if (button && button.getAttribute('aria-pressed') === 'true') {
        button.setAttribute('aria-pressed', 'false')
        button.dispatchEvent(new Event('mouseup'))
        button.click()
      }
    }
  })
  document.addEventListener('keydown', function (event) {
    if (event.key === 'à') {
      const button = document.getElementById('kill')
      if (button && button.getAttribute('aria-pressed') !== 'true') {
        button.setAttribute('aria-pressed', 'true')
        button.dispatchEvent(new Event('mousedown'))
      }
    }
  })

  document.addEventListener('keyup', function (event) {
    if (event.key === 'à') {
      const button = document.getElementById('kill')
      if (button && button.getAttribute('aria-pressed') === 'true') {
        button.setAttribute('aria-pressed', 'false')
        button.dispatchEvent(new Event('mouseup'))
        button.click()
      }
    }
  })
}

const fadeAudio = function (audioElement, fadeType = 'in', duration = 10000) {
  let stepTime = 10 // Adjust volume every 100ms
  let volumeStep = 1 / (duration / stepTime) // Volume step per interval

  if (fadeType === 'in') {
    audioElement.volume = 0 // Start silent
    let currentVolume = 0
    const fadeInterval = setInterval(() => {
      currentVolume += volumeStep
      if (currentVolume >= 1) {
        currentVolume = 1
        clearInterval(fadeInterval)
      }
      audioElement.volume = currentVolume
    }, stepTime)
  } else if (fadeType === 'out') {
    let currentVolume = audioElement.volume // Start at current volume
    const fadeInterval = setInterval(() => {
      currentVolume -= volumeStep
      if (currentVolume <= 0) {
        currentVolume = 0
        clearInterval(fadeInterval)
        audioElement.pause() // Optional: stop playback when faded out
        audioElement.currentTime = 0
        audioElement.volume = 1
      } else {
        audioElement.volume = currentVolume
      }
    }, stepTime)
  }
}
