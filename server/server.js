import { streamer } from '../both/streamer.js'

// Import the WebSocket library
const WebSocket = require('ws')

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 })
const PING_INTERVAL = 5000

queue = []

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
      merged[client].buttonEvents.push({ code: obj.code[0], value: obj.value })
    }
  })

  // console.log(merged)
  queue = []

  return Object.values(merged)
}

// Event: Connection established
wss.on('connection', (ws, req) => {
  console.log('New client connected')

  // Track if the client is alive
  ws.isAlive = true

  // If it's a Raspberry Pi or another sending device, listen for data but do not add to htmlClients
  console.log('Raspberry Pi connected. Waiting for mouse event data...')

  ws.on('message', (message) => {
    // console.log(message)
    try {
      const data = JSON.parse(message)
      addToQueue(data)
    } catch (error) {
      console.error('Error processing Raspberry Pi data:', error)
    }
  })

  // Handle disconnection from the Raspberry Pi (if it closes)
  ws.on('close', () => {
    console.log('Raspberry Pi disconnected')
  })

  // Respond to pong messages from the client
  ws.on('pong', () => {
    console.log('Received pong from client')
    ws.isAlive = true
  })
})

// Periodically send pings and check for unresponsive clients
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    console.log(ws.isAlive)
    if (!ws.isAlive) {
      console.log('Client is unresponsive. Terminating connection.')
      return ws.terminate()
    }

    ws.isAlive = false // Mark the client as unresponsive
    ws.ping() // Send a ping
    console.log('Ping sent to client')
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
