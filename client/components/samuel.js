import './samuel.html'
import { streamer } from '../../both/streamer.js'

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})

Template.samuel.onRendered(function () {
  let samuel = document.getElementById('samuel')
  setTimeout(() => {
    samuel.style.opacity = '1'
    document.getElementById('samuel').classList.add('saveme-animated')
  }, 50)

  // Example usage:
  const screenWidth = window.innerWidth // screen width in pixels
  const screenHeight = window.innerHeight // screen height in pixels
  const logoWidth = samuel.offsetWidth // logo width in pixels
  const logoHeight = samuel.offsetHeight // logo height in pixels
  const speed = 180 // speed in pixels per second > check in ANIMATIONS.CSS

  console.log(screenWidth, screenHeight, logoWidth, logoHeight, speed)

  const time = timeToNextCorner(screenWidth, screenHeight, logoWidth, logoHeight, speed)
  console.log(`Time to next corner bounce: ${time} seconds`) // this looks acurate

  setTimeout(() => {
    console.log('corner hit!')

    // Get current position of the logo
    const rect = samuel.getBoundingClientRect()

    // Remove the animation class to stop it
    samuel.classList.remove('saveme-animated')

    // Apply new styles based on the current position of the element
    samuel.style.position = 'absolute'
    samuel.style.left = `${rect.left}px`
    samuel.style.top = `${rect.top}px`

    setTimeout(() => {
      // smile and then fadeout
      document.getElementById('samuelImg').classList.add('bg-samuelSmile')
      document.getElementById('samuelImg').classList.remove('bg-samuel')
      setTimeout(() => {
        samuel.style.opacity = '0'
      }, 1000)
    }, 1000)
  }, time * 1000 + 50) // wait for the time before corner hit
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'samuelDVD':
      document.getElementById('samuel').classList.add('saveme-animated')
      break
  }
}

// dvd logo stuff down here

function lcm(a, b) {
  return (a * b) / gcd(a, b)
}

function gcd(a, b) {
  while (b !== 0) {
    let temp = b
    b = a % b
    a = temp
  }
  return a
}

const timeToNextCorner = function (screenWidth, screenHeight, logoWidth, logoHeight, speed) {
  // Adjust the screen dimensions by subtracting the logo dimensions
  const adjustedWidth = screenWidth - logoWidth
  const adjustedHeight = screenHeight - logoHeight

  // Calculate the LCM of the adjusted dimensions
  const bounceDistance = lcm(adjustedWidth, adjustedHeight)

  // Calculate the time to hit the next corner (time = distance / speed)
  const timeToBounce = bounceDistance / speed

  return timeToBounce
}
