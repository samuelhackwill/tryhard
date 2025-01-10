import './pupitre.html'

import { streamer } from '../../both/streamer.js'

Template.pupitre.onCreated(function () {
  this.text = new ReactiveVar('')
  this.headers = new ReactiveVar([])
  this.selectedHeader = new ReactiveVar('')

  Meteor.call('returnText', (err, res) => {
    if (err) {
      alert(err)
    } else {
      this.text.set(res)
      this.headers.set(res.map((item) => item.header))
    }
  })
})

Template.pupitre.events({
  'click .header'() {
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
  },

  'click .line'(e) {
    // we need to send the text when it's text, but when it's an action then it'll be something else RIGHT
    e.target.classList.add('line-through')

    if (String(this.type) == 'text') {
      sendLine(String(this.value))
    } else {
      action = String(this.value)
      sendAction(action)
    }
  },

  'keyup .line'(e) {
    if (e.key == 'Enter') {
      e.target.classList.add('line-through')

      if (String(this.type) == 'text') {
        sendLine(String(this.value))
      } else {
        action = String(this.value)
        sendAction(action)
      }
    } else {
      return
    }
  },
})

Template.pupitre.helpers({
  // getPointer() {
  //   console.log(this)
  // },
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
      return
    }
  },

  getHeaders() {
    return Template.instance().headers.get()
  },

  getContent() {
    select = Template.instance().selectedHeader.get()
    data = Template.instance().text.get()

    if (select) {
      const values = data.find((item) => item.header === select)?.content || []

      return values
    } else {
      return ''
    }
  },
})

const sendLine = function (string) {
  streamer.emit('pupitreMessage', { type: 'newLine', content: string })
}

const sendAction = function (string) {
  streamer.emit('pupitreAction', { type: 'action', content: string })
}
