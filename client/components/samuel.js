import './samuel.html'
import { streamer } from '../../both/streamer.js'

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})

let time = undefined

Template.samuel.onRendered(function () {
  let samuel = document.getElementById('samuel')
  setTimeout(() => {
    samuel.style.opacity = '1'
  }, 50)

  // Example usage:
  const screenWidth = window.innerWidth // screen width in pixels
  const screenHeight = window.innerHeight // screen height in pixels
  const logoWidth = samuel.offsetWidth // logo width in pixels
  const logoHeight = samuel.offsetHeight // logo height in pixels
  const speed = 180 // speed in pixels per second > check in ANIMATIONS.CSS

  console.log(screenWidth, screenHeight, logoWidth, logoHeight, speed)

  time = timeToNextCorner(screenWidth, screenHeight, logoWidth, logoHeight, speed)
  console.log(`Time to next corner bounce: ${time} seconds`) // this looks acurate
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'samuelGo!':
      document.getElementById('samuel').classList.add('saveme-animated')

      setTimeout(() => {
        console.log('corner hit!')

        // Get current position of the logo
        const rect = samuel.getBoundingClientRect()

        // Remove the animation class to stop it
        samuel.classList.remove('saveme-animated')

        samuel.style.position = 'absolute'
        samuel.style.right = `${window.innerWidth - rect.right}px` // Align to the right
        samuel.style.top = `${rect.top}px`

        setTimeout(() => {
          // smile and then fadeout
          document.getElementById('samuelImg').classList.add('bg-samuelSmile')
          document.getElementById('samuelImg').classList.remove('bg-samuel')
          setTimeout(() => {
            samuel.classList.add('opacity-0')
            samuel.classList.remove('opacity-1')
          }, 2000)
        }, 1000)
      }, time * 1000 + 50) // wait for the time before corner hit
      break
    case 'samuelShow':
      document.getElementById('samuel').classList.remove('h-[18rem]', 'w-[32rem]')
      document.getElementById('samuel').classList.add('h-[12rem]', 'w-[14rem]')
      document
        .getElementById('samuelImg')
        .classList.remove('border-red-600', 'border-8', 'bg-samuelSmile')
      document.getElementById('samuelImg').classList.add('border-black', 'border-4', 'bg-samuel')

      setTimeout(() => {
        document.getElementById('samuel').classList.add('opacity-1')
        document.getElementById('samuel').classList.remove('opacity-0')
      }, 50)
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
