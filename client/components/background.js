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
    fadeAudio(document.getElementById('bg-audio'), 'in', 5000)
  }, 100)
})

Template.background.helpers({
  getBg() {
    return 'background-color :' + instance.bgColor.get() + ';'
  },
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'bgToblue':
      instance.bgColor.set('blue')
      break
    case 'bgToblack':
      instance.bgColor.set('#1C1917')
      break
    case 'bgTogrey':
      instance.bgColor.set('oklch(0.869 0.022 252.894)')
      break
    case 'burnPointers':
      addFlames()
      break
    case 'bgToFlames':
      const bg = document.getElementById('background')
      Blaze.render(Template.flamesBg, bg)
      break
    case 'removeFlames':
      document.getElementById('flamesContainer').style.opacity = '0'
      fadeAudio(document.getElementById('bg-audio'), 'out', 5000)

      setTimeout(() => {
        Blaze.remove(flamesBgView)
      }, 20000)
      break
  }
}

function fadeAudio(audioElement, fadeType = 'in', duration = 10000) {
  let stepTime = 100 // Adjust volume every 100ms
  let volumeStep = 1 / (duration / stepTime) // Volume step per interval

  if (fadeType === 'in') {
    audioElement.volume = 0 // Start silent
    let currentVolume = 0
    const fadeInterval = setInterval(() => {
      currentVolume += volumeStep
      if (currentVolume >= 1) {
        currentVolume = 1
        clearInterval(fadeInterval)
      }
      audioElement.volume = currentVolume
    }, stepTime)
  } else if (fadeType === 'out') {
    let currentVolume = audioElement.volume // Start at current volume
    const fadeInterval = setInterval(() => {
      currentVolume -= volumeStep
      if (currentVolume <= 0) {
        currentVolume = 0
        audioElement.volume = 0
        clearInterval(fadeInterval)
        audioElement.pause() // Optional: stop playback when faded out
      } else {
        audioElement.volume = currentVolume
      }
    }, stepTime)
  }
}
const addFlames = function () {
  const autoclickers = document.querySelectorAll('.autoclicker')
  const pointers = document.querySelectorAll('.pointer')

  const allElements = [...autoclickers, ...pointers]

  // Settings
  const maxDelay = 1000
  const minDelay = 50
  const spriteSheetURL = 'fire1_64.png'
  const frameWidth = 64
  const frameHeight = 64
  const columns = 10
  const rows = 6
  const animationDuration = 250

  function addFlameAtElement(element, delay) {
    const flame = document.createElement('div')
    flame.classList.add('flame')

    const rect = element.getBoundingClientRect()
    const offsetX = rect.width / 2 - frameWidth / 2
    const offsetY = rect.height / 2 - frameHeight / 2

    Object.assign(flame.style, {
      width: `${frameWidth}px`,
      height: `${frameHeight}px`,
      position: 'absolute',
      top: `${rect.top + window.scrollY + offsetY}px`,
      left: `${rect.left + window.scrollX + offsetX}px`,
      backgroundImage: `url(${spriteSheetURL})`,
      backgroundSize: `${columns * frameWidth}px ${rows * frameHeight}px`,
      backgroundRepeat: 'no-repeat',
      zIndex: 9999,
      pointerEvents: 'none',
      transition: 'opacity .6s',
    })

    document.body.appendChild(flame)

    // lol what's going on here
    flame.style.animation = `playv ${animationDuration / 1000}s steps(${rows}) infinite, 
                             playh ${
                               animationDuration / (columns * 10)
                             }s steps(${columns}) infinite`
  }

  function startFlamingSequence() {
    const totalElements = allElements.length
    const firstBatchCount = 5
    const pauseDuration = 2000 // Pause for 2 seconds
    let currentDelay = 0

    const lighterPath = './spaceJoe_lighter/'
    const soundEffects = [
      '0.wav',
      '1.wav',
      '2.wav',
      '3.wav',
      '4.wav',
      '5.wav',
      '6.wav',
      '7.wav',
      '8.wav',
      '9.wav',
    ]

    allElements.forEach((element, index) => {
      if (index < firstBatchCount) {
        currentDelay += maxDelay
      } else if (index === firstBatchCount) {
        currentDelay += pauseDuration
      } else {
        currentDelay += minDelay
      }

      setTimeout(() => {
        const randomSound =
          lighterPath + soundEffects[Math.floor(Math.random() * soundEffects.length)]
        const audio = new Audio(randomSound)
        audio.play()

        addFlameAtElement(element, currentDelay)
      }, currentDelay)
    })

    // Once all flames are added, trigger explosions after 5 seconds
    setTimeout(() => {
      triggerExplosions()
    }, currentDelay + 3000)
  }

  function triggerExplosions() {
    autoclickerIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    autoclickerIntervals.length = 0

    const explosionPath = './explosions/'
    const explosionSounds = ['0.mp3', '1.mp3', '2.mp3', '3.mp3', '4.mp3', '5.mp3', '6.mp3']
    const explosionDelay = 50 // 50ms between each explosion
    // Capture flames as a fixed array before modifying them
    // Convert flames collection into an array (fixed snapshot)
    const flamesQueue = Array.from(document.getElementsByClassName('flame'))

    allElements.forEach((pointer, index) => {
      setTimeout(() => {
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

        // Play a random explosion sound
        const randomExplosionSound =
          explosionPath + explosionSounds[Math.floor(Math.random() * explosionSounds.length)]
        const explosionAudio = new Audio(randomExplosionSound)
        explosionAudio.play()

        // **Remove one flame per explosion**
        const flame = flamesQueue.shift() // Get the first available flame
        if (flame) {
          flame.style.opacity = '0'

          setTimeout(() => {
            flame.remove()
          }, 600)
        }

        setTimeout(() => {
          // Create the falling skull
          const skull = document.createElement('span')
          skull.textContent = '💀'
          skull.classList.add('falling-skull') // Add animation class

          const randomOffset = (Math.random() - 0.5) * 40 // Random X offset to avoid perfect stacking

          Object.assign(skull.style, {
            position: 'absolute',
            top: `${rect.top + window.scrollY}px`,
            left: `${rect.left + window.scrollX + randomOffset}px`,
            fontSize: '24px', // Adjust size
            zIndex: 9999,
            pointerEvents: 'none',
            animationDuration: `${Math.random() * 3 + 3}s`,
          })

          document.body.appendChild(skull)
        }, 150)

        pointer.remove()

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

    // **Run final function when all explosions are done**
    const totalDuration = allElements.length * explosionDelay + 1000
    setTimeout(() => {
      console.log('All explosions done, clearing pointers...')
      instance.pointers.clear()
    }, totalDuration)
  }
  startFlamingSequence()
}
