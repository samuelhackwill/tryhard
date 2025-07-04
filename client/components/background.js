import './background.html'
import { streamer } from '../../both/streamer.js'

flamesBgView = null

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})

Template.flamesBg.onRendered(function () {
  flamesBgView = Template.instance().view
  setTimeout(() => {
    document.getElementById('flamesContainer').style.opacity = '1'
    // fadeAudio(document.getElementById('bg-audio'), 'in', 5000)
  }, 100)
})

Template.background.helpers({
  getBg() {
    return 'background-color :' + instance.bgColor.get() + ';'
  },
})

const handlePupitreAction = function (message) {
  const bg = document.getElementById('background')

  switch (message.content) {
    case 'killUnseated':
      killUnseated()
      break
    case 'bgToblue':
      instance.bgColor.set('blue')
      break
    case 'bgToblack':
      instance.bgColor.set('#1C1917')
      break
    case 'bgToNoir':
      instance.bgColor.set('black')
      break
    case 'bgTogrey':
      instance.bgColor.set('oklch(0.869 0.022 252.894)')
      break
    case 'bgToMaroon':
      instance.bgColor.set('#8d4343')
      break
    case 'flash-hapy':
      flash('/samcontan/1.png')
      break
    case 'flash-angry':
      flash('/samcontan/2.png')
      break
    case 'flash-parodelia':
      const randomNum = Math.floor(Math.random() * 6) + 1
      flash(`/thingswithfaces/${randomNum}.png`)
      break
    case 'burnPointers':
      addFlames()
      break
    case 'bgToFlames':
      Blaze.render(Template.flamesBg, bg)
      break
    case 'removeFlames':
      document.getElementById('flamesContainer').style.opacity = '0'
      // fadeAudio(document.getElementById('bg-audio'), 'out', 5000)

      setTimeout(() => {
        Blaze.remove(flamesBgView)
      }, 20000)
      break
    case 'addPodium':
      createPodium()
      break
    case 'removePodium':
      const podium = document.getElementById('podium')
      podium.style.opacity = '0'
      setTimeout(() => {
        podium.remove()
      }, 1000)

      break
    case 'samuelSpawn':
      Blaze.render(Template.samuel, bg)
      break
  }
}

// const addFlames = function () {
//   const autoclickers = document.querySelectorAll('.autoclicker')
//   const pointers = document.querySelectorAll('.pointer')

//   const allElements = [...autoclickers, ...pointers]

//   // Settings
//   const maxDelay = 1000
//   const minDelay = 50
//   const spriteSheetURL = 'fire1_64.png'
//   const frameWidth = 64
//   const frameHeight = 64
//   const columns = 10
//   const rows = 6
//   const animationDuration = 250

//   function addFlameAtElement(element, delay) {
//     const flame = document.createElement('div')
//     flame.classList.add('flame')

//     const rect = element.getBoundingClientRect()
//     const offsetX = rect.width / 2 - frameWidth / 2
//     const offsetY = rect.height / 2 - frameHeight / 2

//     Object.assign(flame.style, {
//       width: `${frameWidth}px`,
//       height: `${frameHeight}px`,
//       position: 'absolute',
//       top: `${rect.top + window.scrollY + offsetY}px`,
//       left: `${rect.left + window.scrollX + offsetX}px`,
//       backgroundImage: `url(${spriteSheetURL})`,
//       backgroundSize: `${columns * frameWidth}px ${rows * frameHeight}px`,
//       backgroundRepeat: 'no-repeat',
//       zIndex: 9999,
//       pointerEvents: 'none',
//       transition: 'opacity .6s',
//     })

//     document.body.appendChild(flame)

//     // lol the linter likes this line
//     flame.style.animation = `playv ${animationDuration / 1000}s steps(${rows}) infinite, playh ${
//       animationDuration / (columns * 10)
//     }s steps(${columns}) infinite`
//   }

//   function startFlamingSequence() {
//     const firstBatchCount = 5
//     const pauseDuration = 2000 // Pause for 2 seconds
//     let currentDelay = 0

//     const lighterPath = './spaceJoe_lighter/'
//     const soundEffects = [
//       '0.wav',
//       '1.wav',
//       '2.wav',
//       '3.wav',
//       '4.wav',
//       '5.wav',
//       '6.wav',
//       '7.wav',
//       '8.wav',
//       '9.wav',
//     ]

//     // Extract and sort money values to find the top 3
//     const moneyValues = [...pointers]
//       .map((element) => {
//         const moneySpan = element.querySelector('#money')
//         if (!moneySpan) return null
//         return Number(moneySpan.innerHTML.replace(/\s/g, ''))
//       })
//       .filter((value) => value !== null)
//       .sort((a, b) => b - a)

//     const topMoneyValues = moneyValues.slice(0, 3) // Top 3 values
//     // console.log('Top 3 Money Values:', topMoneyValues)

//     allElements.forEach((element, index) => {
//       // Get money value
//       const moneySpan = element.querySelector('#money')
//       const moneyValue = moneySpan ? Number(moneySpan.innerHTML.replace(/\s/g, '')) : null

//       // console.log(`Checking pointer ID: ${element.id}, Money: ${moneyValue}`)

//       // Skip inflaming if the money value is in the top 3
//       if (moneyValue !== null && topMoneyValues.includes(moneyValue)) {
//         // console.log(`Skipping inflaming for ${element.id} (Top 3 Pointer)`)
//         return
//       }

//       if (index < firstBatchCount) {
//         currentDelay += maxDelay
//       } else if (index === firstBatchCount) {
//         currentDelay += pauseDuration
//       } else {
//         currentDelay += minDelay
//       }

//       setTimeout(() => {
//         // console.log(`Inflaming pointer: ${element.id}`)
//         const randomSound =
//           lighterPath + soundEffects[Math.floor(Math.random() * soundEffects.length)]
//         const audio = new Audio(randomSound)
//         audio.play()

//         addFlameAtElement(element, currentDelay)
//       }, currentDelay)
//     })

//     // Once all flames are added, trigger explosions after 5 seconds
//     setTimeout(() => {
//       triggerExplosions()
//     }, currentDelay + 3000)
//   }

//   function triggerExplosions() {
//     autoclickerIntervals.forEach((interval) => {
//       clearInterval(interval)
//     })
//     autoclickerIntervals.length = 0

//     // Extract and sort money values to find the top 3
//     const moneyValues = [...pointers]
//       .map((element) => {
//         const moneySpan = element.querySelector('#money')
//         if (!moneySpan) return null
//         return Number(moneySpan.innerHTML.replace(/\s/g, ''))
//       })
//       .filter((value) => value !== null)
//       .sort((a, b) => b - a)

//     const topMoneyValues = moneyValues.slice(0, 3) // Top 3 values
//     // console.log('Top 3 Money Values:', topMoneyValues)

//     const explosionPath = './explosions/'
//     const explosionSounds = ['0.mp3', '1.mp3', '2.mp3', '3.mp3', '4.mp3', '5.mp3', '6.mp3']
//     const explosionDelay = 50 // 50ms between each explosion

//     // Capture flames as a fixed array before modifying them
//     const flamesQueue = Array.from(document.getElementsByClassName('flame'))

//     allElements.forEach((pointer, index) => {
//       // Get money value
//       const moneySpan = pointer.querySelector('#money')
//       const moneyValue = moneySpan ? Number(moneySpan.innerHTML.replace(/\s/g, '')) : null

//       // console.log(`Checking explosion for pointer ${pointer.id}, Money: ${moneyValue}`)

//       // Skip explosion if the money value is in the top 3
//       if (moneyValue !== null && topMoneyValues.includes(moneyValue)) {
//         // console.log(`Skipping explosion for ${pointer.id} (Top 3 Pointer)`)
//         return
//       }

//       setTimeout(() => {
//         // console.log(`Exploding pointer: ${pointer.id}`)
//         const rect = pointer.getBoundingClientRect()
//         const explosion = document.createElement('img')
//         explosion.src = `boom.gif?t=${new Date().getTime()}`
//         explosion.classList.add('explosion')

//         Object.assign(explosion.style, {
//           width: '128px',
//           height: '128px',
//           position: 'absolute',
//           top: `${rect.top + window.scrollY - 20}px`,
//           left: `${rect.left + window.scrollX - 40}px`,
//           zIndex: 10000,
//           pointerEvents: 'none',
//         })

//         document.body.appendChild(explosion)

//         // Play a random explosion sound
//         const randomExplosionSound =
//           explosionPath + explosionSounds[Math.floor(Math.random() * explosionSounds.length)]
//         const explosionAudio = new Audio(randomExplosionSound)
//         explosionAudio.play()

//         // **Remove one flame per explosion**
//         const flame = flamesQueue.shift() // Get the first available flame
//         if (flame) {
//           // console.log(`Fading out flame for pointer: ${pointer.id}`)
//           flame.style.opacity = '0'

//           setTimeout(() => {
//             flame.remove()
//           }, 600)
//         }

//         setTimeout(() => {
//           // Create the falling skull
//           const skull = document.createElement('span')
//           skull.textContent = '💀'
//           skull.classList.add('falling-skull') // Add animation class

//           const randomOffset = (Math.random() - 0.5) * 40 // Random X offset to avoid perfect stacking

//           Object.assign(skull.style, {
//             position: 'absolute',
//             top: `${rect.top + window.scrollY}px`,
//             left: `${rect.left + window.scrollX + randomOffset}px`,
//             fontSize: '24px', // Adjust size
//             zIndex: 9999,
//             pointerEvents: 'none',
//             animationDuration: `${Math.random() * 3 + 3}s`,
//           })

//           document.body.appendChild(skull)
//         }, 150)

//         pointer.remove()

//         // Remove explosion gif after animation ends
//         explosion.addEventListener('animationend', () => {
//           explosion.remove()
//         })

//         // Fallback: Remove after a few seconds (if no animation event)
//         setTimeout(() => {
//           explosion.remove()
//         }, 1000)
//       }, index * explosionDelay) // Delay each explosion by index * 50ms
//     })
//   }

//   startFlamingSequence()
// }
function createPodium() {
  // Create the podium container
  const podium = document.createElement('div')
  podium.classList.add('podium')
  podium.id = 'podium'

  // Create a helper to make each box
  function createBox(place, height, medal) {
    const box = document.createElement('div')
    box.classList.add('box', place)

    // Create the number element
    const number = document.createElement('div')
    number.textContent = place === 'first' ? '1' : place === 'second' ? '2' : '3'

    // Create the medal element
    const emoji = document.createElement('div')
    emoji.textContent = medal
    emoji.style.marginTop = '-8px'

    // Style container as column
    box.style.display = 'flex'
    box.style.flexDirection = 'column'
    box.style.alignItems = 'center'

    // Apply styles
    Object.assign(box.style, {
      width: '160px',
      height: height,
      backgroundColor: 'white',
      border: '3px solid black',
      justifyContent: 'center',
      fontSize: '36px',
      fontWeight: 'bold',
      textAlign: 'center',
    })

    box.appendChild(number)
    box.appendChild(emoji)
    return box
  }

  // Create the boxes
  const second = createBox('second', '120px', '🥈')
  const first = createBox('first', '150px', '🥇')
  const third = createBox('third', '100px', '🥉')

  // Append boxes to podium
  podium.appendChild(second)
  podium.appendChild(first)
  podium.appendChild(third)

  // Apply initial styles to podium
  Object.assign(podium.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'flex-end',
    opacity: '0', // Start hidden
    transition: 'opacity 1s ease-in-out', // Fade-in animation
  })

  // Append to the body
  document.body.appendChild(podium)

  // Trigger fade-in after a short delay
  setTimeout(() => {
    podium.style.opacity = '1'
  }, 100)
}

const killUnseated = function () {
  const pointers = document.querySelectorAll('.pointer')

  const explosionDelay = 1 // 50ms between each explosion

  pointers.forEach((pointer, index) => {
    const pointerData = instance.pointers.get(pointer.id)

    if (pointerData.order === -1) {
      return
    }

    const isSeated = pointerData.seated
    const isDead = pointerData.bot

    _coords = document.getElementById(pointerData.id).dataset
    pointerData.initializationCoords = { x: _coords.x, y: _coords.y }
    instance.pointers.set(pointerData.id, pointerData)

    setTimeout(() => {
      unseatEveryone()
    }, 3000)

    if (isSeated || isDead) {
      return
    }

    setTimeout(() => {
      // console.log(`Exploding pointer: ${pointer.id}`)
      const rect = pointer.getBoundingClientRect()
      const explosion = document.createElement('img')
      explosion.src = `boom.gif?t=${new Date().getTime()}`
      explosion.classList.add('explosion')

      Object.assign(explosion.style, {
        width: '128px',
        height: '128px',
        position: 'absolute',
        top: `${rect.top + window.scrollY - 20}px`,
        left: `${rect.left + window.scrollX - 40}px`,
        zIndex: 10000,
        pointerEvents: 'none',
      })

      document.body.appendChild(explosion)

      // tell pupitre to play a random explosion sound
      streamer.emit('explosion')

      setTimeout(() => {
        // Create the falling skull
        const skull = document.createElement('span')
        skull.textContent = '💀'
        skull.classList.add('falling-skull') // Add animation class

        const randomOffset = (Math.random() - 0.5) * 40 // Random X offset to avoid perfect stacking

        Object.assign(skull.style, {
          fontSize: '33px',
          position: 'absolute',
          top: `${rect.top + window.scrollY}px`,
          left: `${rect.left + window.scrollX + randomOffset}px`,
          zIndex: 9999,
          pointerEvents: 'none',
          animationDuration: `2s`,
        })

        document.body.appendChild(skull)
      }, 150)

      pointerData.chosen = false
      pointerData.bot = true // bots don't get a nick

      instance.pointers.set(pointerData.id, pointerData)
      // pointer.remove()

      // Remove explosion gif after animation ends
      explosion.addEventListener('animationend', () => {
        explosion.remove()
      })

      // Fallback: Remove after a few seconds (if no animation event)
      setTimeout(() => {
        explosion.remove()
      }, 1000)
    }, index * explosionDelay) // Delay each explosion by index * 50ms
  })
}

const unseatEveryone = function () {
  Object.entries(instance.pointers.all()).forEach(([key, pointer]) => {
    _coords = document.getElementById(pointer.id).dataset
    pointer.initializationCoords = { x: _coords.x, y: _coords.y }
    instance.pointers.set(pointer.id, pointer)

    const _pointer = pointer
    _pointer.seated = false
    _pointer.crouching = false
    _pointer.bgColor = _pointer.formerColor
    _pointer.hoveredElementId = 'feed'
    instance.pointers.set(key, _pointer)
  })
}

flash = function (path) {
  const overlay = document.createElement('div')
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundImage: 'url(images/captchas/' + path + ')',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 99999,
    opacity: 0.8,
  })

  overlay.addEventListener('animationend', () => {
    overlay.remove()
  })

  overlay.classList.add('flash1')

  document.body.appendChild(overlay)
}
