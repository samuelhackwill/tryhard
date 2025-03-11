import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './pages/show.js'
import './pages/pupitre.js'
import './pages/planDeSalle.js'

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
