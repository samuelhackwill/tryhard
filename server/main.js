import { Meteor } from 'meteor/meteor'
import { streamer } from '../both/streamer.js'
import './parser.js'
import './server.js'

import { connectedRasps } from './server.js'

streamer.allowRead('all')
streamer.allowWrite('all')

streamer.on('pointerMessage', function (message) {
  //eventQueue.push(message);
})

Meteor.startup(async () => {})

Meteor.methods({
  async returnText() {
    text = parseMarkdown(Assets.absoluteFilePath('text.md'))
    return text
  },
  async getConnectedDevices() {
    return connectedRasps
  },
})
