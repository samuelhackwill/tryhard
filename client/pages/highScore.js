import './highScore.html'

import { HighScore } from '../../both/api.js'

Template.highScore.onCreated(function () {
  this.autorun(() => {
    this.subscribe('highScore')
  })
})

Template.highScore.helpers({
  highScores() {
    return HighScore.find({}, { sort: { date: -1 } })
  },
  eachField() {
    const doc = this
    if (!doc || typeof doc !== 'object') return []
    const keys = [
      'gentillé',
      'date',
      'heure',
      'totalClics',
      'topSpeed',
      'topPlayer',
      'topGradin',
      'topChomeurs',
      'gini',
    ]
    console.log(
      keys.map((field) => ({
        field,
        value: doc[field] ?? '',
        _id: doc._id,
      })),
    )
    return keys.map((field) => ({
      field,
      value: doc[field] ?? '',
      _id: doc._id,
    }))
  },
})

Template.highScore.events({
  'click .editable'(event) {
    const el = event.currentTarget
    el.contentEditable = true
    el.focus()
  },

  'blur .editable'(event) {
    const el = event.currentTarget
    el.contentEditable = false

    const field = el.dataset.field
    const _id = el.dataset.id
    const value = el.innerText.trim()

    if (_id && field) {
      HighScore.update({ _id }, { $set: { [field]: value } })
    }
  },

  'click [data-action="delete"]'(event) {
    const _id = event.currentTarget.dataset.id
    if (confirm('Supprimer cette entrée ?')) {
      HighScore.remove({ _id })
    }
  },

  'click #flush-db'() {
    if (confirm('Effacer TOUTES les entrées ?')) {
      Meteor.call('highScore.flushAll')
    }
  },

  'click #add-highscore'() {
    HighScore.insert({
      ville: 'Nouvelle ville',
      date: new Date().toISOString().slice(0, 10),
      topSpeed: '',
      topPlayer: '',
      topGradin: '',
      topChomeurs: '',
      gini: '',
    })
  },
})
