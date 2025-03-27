import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './pages/show.js'
import './pages/pupitre.js'
import './pages/planDeSalle.js'
import './pages/highScore.js'

FlowRouter.route('/show', {
  name: 'show',
  action() {
    this.render('show')
  },
})

FlowRouter.route('/pupitre', {
  name: 'pupitre',
  action() {
    this.render('pupitre')
  },
})

FlowRouter.route('/plan', {
  name: 'plan',
  action() {
    this.render('planDeSalle')
  },
})

FlowRouter.route('/score', {
  name: 'score',
  action() {
    this.render('highScore')
  },
})
