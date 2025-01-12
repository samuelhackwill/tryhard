import { cleanData } from 'jquery'
import { streamer } from '../both/streamer.js'

// Import the WebSocket library
const WebSocket = require('ws')

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 })
const PING_INTERVAL = 5000

queue = []

console.log(
  'Hi! this is Samuel from Tryhard. Just so that you know, the WebSocket server for the raspberrys is running on ws://localhost:8080. Please tell the mouse-grabr.py to talk to that adress. see ya',
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
      merged[client] = { client: client, x: 0, y: 0 }
    }
    merged[client].x += obj.x || 0
    merged[client].y += obj.y || 0
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
