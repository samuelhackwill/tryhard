import { streamer } from '../both/streamer.js'
import { disabledMice, mouseOrder, SalleLayout } from '../both/api.js'

// Import the WebSocket library
const WebSocket = require('ws')

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 })
const PING_INTERVAL = 5000

let connectedRasps = []
queue = []
disabledMice.remove({})

Meteor.publish('disabledMice', function () {
  return disabledMice.find({})
})

Meteor.publish('salleLayout', function () {
  return SalleLayout.find({})
})

Meteor.publish('mouseOrder', function () {
  return mouseOrder.find({})
})

Meteor.startup(() => {
  // fixtures
  if (SalleLayout.find().count() === 0) {
    SalleLayout.insert({
      rows: 6,
      columns: 4,
      cells: [], // Will hold {row, col, deviceId}
    })
  }
})

console.log(
  'Hi! this is Samuel from Tryhard. Just so that you know, the WebSocket server for the raspberrys is running on ws://<this machine>:8080. Please tell the mouse-grabr.py to talk to that adress. see ya',
)

addToQueue = function (data) {
  queue.push(data)
}

mergeQueue = function (objectsArray) {
  // if (objectsArray.length > 0) {
  //   console.log(objectsArray)
  // }
  const merged = {}

  objectsArray.forEach((obj, i) => {
    const client = obj.client
    if (!merged[client]) {
      // first look if that client is already known ie has sent more than one event during this 16ms loop
      merged[client] = { client: client, x: 0, y: 0, buttonEvents: [] }
    }
    // ok so if this guy has already told us to move, just make a sum of all past movement instructions
    merged[client].x += obj.x || 0
    merged[client].y += obj.y || 0

    // also check if he's doing anything with the mouse buttons
    // on utilise un array parce que contrairement aux mouvements qui peuvent être additionnés et écrasés,
    // on veut jouer tous les mouse events les uns après les autres ; c'est à dire si un mousepressed et un mouserelease
    // ont été effectués à l'intérieur de 16.6ms, on veut pas que l'un soit ignoré, on veut que le client les joue tous deux.
    // bon c'est sans doute un gros edge case des familles, mais en même temps on sait qu'un clic peut être pressé et released à l'intérieur de 16ms, easily.
    if (obj.code?.length > 0) {
      // console.log(obj.code)
      let _code
      if (obj.code?.length > 2) {
        // console.log('not left button')
        // alors ça c'est parce que pour une raison ou une autre, quand on fait un clic gauche obj.code contient deux strings ["BUTTON_LEFT", "BUTTON"], alors que sur les autres types de clics (middle, right), il contient juste un string et pas un array. OK
        _code = obj.code
      }
      merged[client].buttonEvents.push({ code: _code || obj.code[0], value: obj.value })
    }
  })

  // console.log(merged)
  queue = []

  return Object.values(merged)
}

// Event: Connection established
wss.on('connection', (ws, req) => {
  // Track if the client is alive
  ws.isAlive = true

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      // console.log(data)
      if (data.rasp) {
        ws.raspName = data.rasp
      }
      if (data.event_type == 'device_update') {
        console.log(`${ws.raspName} just told the server how many mice it has.`)
        updateDevices(data)
        return
      }
      // if (data.event_type == 'disconnect') {
      //   console.log(`rasp ${data.rasp} just disconnected. Removing connectedRasps array.`)
      //   const index = connectedRasps.findIndex((obj) => obj.name === data.rasp)
      //   if (index !== -1) {
      //     connectedRasps.splice(index, 1)
      //   }
      //   return
      // }
      addToQueue(data)
    } catch (error) {
      console.error('Error processing Raspberry Pi data:', error)
    }
  })

  // Handle disconnection from the Raspberry Pi (if it closes)
  ws.on('close', () => {
    console.log(`${ws.raspName} disconnected`)
    const index = connectedRasps.findIndex((obj) => obj.name === ws.raspName)
    if (index !== -1) {
      connectedRasps.splice(index, 1)
    }
  })

  // Respond to pong messages from the client
  ws.on('pong', () => {
    console.log(`Received pong from ${ws.raspName}`)
    ws.isAlive = true
  })
})

// Periodically send pings and check for unresponsive clients
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    // console.log(ws.isAlive)
    if (!ws.isAlive) {
      console.log(`${ws.raspName} is unresponsive. Terminating connection.`)
      const index = connectedRasps.findIndex((obj) => obj.name === ws.raspName)
      if (index !== -1) {
        connectedRasps.splice(index, 1)
      }
      return ws.terminate()
    }

    ws.isAlive = false // Mark the client as unresponsive
    ws.ping() // Send a ping
    console.log(`Ping sent to ${ws.raspName}`)
  })
}, PING_INTERVAL)

// Cleanup on server shutdown
wss.on('close', () => {
  clearInterval(interval)
})

setInterval(() => {
  const cleanData = mergeQueue(queue)

  if (cleanData.length > 0) {
    JSON.stringify(cleanData)
    // console.log('got data ', cleanData)
    streamer.emit('tickUpdate', cleanData)
  }
}, 1000 / 64)

function updateDevices(data) {
  // check if we're already tracking that rasp
  // console.log(data)
  tracked_rasp = connectedRasps.find(({ name }) => name === data.rasp)
  if (tracked_rasp) {
    if (tracked_rasp.mice.length == data.connected_mice.length) {
      return
    } else {
      tracked_rasp.mice = data.connected_mice
    }
  } else {
    connectedRasps.push({ name: data.rasp, mice: data.connected_mice })
  }
}

Meteor.methods({
  updateMouseOrder({ device, order }) {
    mouseOrder.upsert({ device }, { $set: { order } })
  },
  eraseEveryDb() {
    console.log('flashing mouseOrder and disabledMice')
    mouseOrder.remove({})
    disabledMice.remove({})
  },
  async returnText() {
    text = parseMarkdown(Assets.absoluteFilePath('text.md'))
    return text
  },
  async getConnectedDevices() {
    return connectedRasps
  },
  resetConnectedDevices() {
    connectedRasps = []
  },
  toggleMouse(data) {
    console.log(data)
    if (data.on == false) {
      mouseOrder.remove({ device: data.rasp + '_' + data.dirtybrand })

      disabledMice.insert({
        rasp: data.rasp,
        brand: data.brand,
      })
    } else {
      disabledMice.remove({
        rasp: data.rasp,
        brand: data.brand,
      })
    }
    console.log(disabledMice.find({}).fetch())
  },

  enableAllMice() {
    console.log('remove everything in this filthy db')
    disabledMice.remove({})
  },
})
