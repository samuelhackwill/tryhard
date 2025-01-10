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

// Array to hold HTML client(s)
let htmlClients = []

addToQueue = function (data) {
  queue.push(data)
}

mergeQueue = function (objectsArray) {
  const merged = {}

  objectsArray.forEach((obj) => {
    const client = obj.client
    const timestamp = obj.timestamp_rasp
    if (!merged[client]) {
      merged[client] = { client: client, x: 0, y: 0, timestamp_rasp: timestamp }
    }
    merged[client].x += obj.x || 0
    merged[client].y += obj.y || 0
    merged[client].timestamp_rasp = timestamp
  })
  queue = []

  return Object.values(merged)
}

// Event: Connection established
wss.on('connection', (ws, req) => {
  console.log('New client connected')

  // Track if the client is alive
  ws.isAlive = true

  // Determine if the client is an HTML client or Raspberry Pi (based on User-Agent)
  const isHTMLClient = req.headers['user-agent']?.includes('Chrome') // Basic check for HTML client

  if (isHTMLClient) {
    // If it's an HTML client, add it to the list of clients
    htmlClients.push(ws)
    console.log('HTML client connected')

    // Send a welcome message to the HTML client
    ws.send('{"welcome":"true"}')

    // Event: Message received from the HTML client (optional)
    ws.on('message', (message) => {
      console.log(`Received from HTML client: ${message}`)
    })

    // Event: Client disconnected
    ws.on('close', () => {
      console.log('HTML client disconnected')
      htmlClients = htmlClients.filter((client) => client !== ws) // Remove from list
    })

    // Event: Error
    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    // Respond to pong messages from the client
    ws.on('pong', () => {
      console.log('Received pong from client')
      ws.isAlive = true
    })
  } else {
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
      // try {
      //   const data = JSON.parse(message)
      //   // console.log(data)
      //   data.timestamp_SERVER = Date.now()
      //   // Forward the received data only to HTML clients
      //   htmlClients.forEach((client) => {
      //     if (client.readyState === WebSocket.OPEN) {
      //       client.send(JSON.stringify(data)) // Send mouse event data to HTML clients
      //     }
      //   })
      // } catch (error) {
      //   console.error("Error processing Raspberry Pi data:", error)
      // }
    })

    // Handle disconnection from the Raspberry Pi (if it closes)
    ws.on('close', () => {
      console.log('Raspberry Pi disconnected')
    })
  }

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
  // meteor code here.
  // we're not going to send data to html clients, rather, we're going to emit DDP events ou quelque chose comme ça
  streamer.emit('pointerMessage', { message: 'prout' })

  htmlClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      cleanData = mergeQueue(queue)
      // console.log(cleanData)
      client.send(JSON.stringify(cleanData)) // Send mouse event data to HTML clients
    }
  })
}, 1000 / 60)
