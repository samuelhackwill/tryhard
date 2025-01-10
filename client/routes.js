import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './pages/logger.js'
import './pages/show.js'
import './pages/pupitre.js'

FlowRouter.route('/', {
  name: 'logger',
  action() {
    //Read a logger id from the url, with the format: localhost:3000?id=id_goes_here
    let loggerId = FlowRouter.getQueryParam('id')
    this.render('logger', { loggerId: loggerId })
  },
})

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
