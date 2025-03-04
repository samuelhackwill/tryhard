import './background.html'
import { streamer } from '../../both/streamer.js'

flamesBgView = null

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})

Template.flamesBg.onRendered(function () {
  flamesBgView = Template.instance().view

  document.getElementById('flamesContainer').style.opacity = '1'
  fadeAudio(document.getElementById('bg-audio'), 'in', 5000)
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
      backgroundSize: `${columns * frameWidth}px ${rows * frameHeight}px`, // 640px × 384px
      backgroundRepeat: 'no-repeat',
      zIndex: 9999,
      pointerEvents: 'none',
    })

    document.body.appendChild(flame)

    // Separate animations for X and Y
    flame.style.animation = `playv ${animationDuration / 1000}s steps(${rows}) infinite, playh ${
      animationDuration / (columns * 10)
    }s steps(${columns}) infinite`
  }
  function startFlamingSequence() {
    const totalElements = allElements.length
    const firstBatchCount = 5
    const pauseDuration = 2000 // Pause for 500ms after the first batch
    let currentDelay = 0

    allElements.forEach((element, index) => {
      if (index < firstBatchCount) {
        // First 10 elements: spaced by maxDelay
        currentDelay += maxDelay
      } else if (index === firstBatchCount) {
        // Short pause before continuing
        currentDelay += pauseDuration
      } else {
        // Remaining elements: spaced by minDelay
        currentDelay += minDelay
      }

      setTimeout(() => {
        addFlameAtElement(element, currentDelay)
      }, currentDelay)
    })
  }

  startFlamingSequence()
}
