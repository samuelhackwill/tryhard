import './clock.html'
import { streamer } from '../../both/streamer.js'

import { toggleColumn } from './btnDashboard.js'

import { die } from '../pages/show.js'

let startTime = null
let animationFrameId = null
const duration = 60000 // x miliseconds duration

let countdownTime = duration / 1000 // Start at 60 seconds
let colonVisible = true
let isBlinkingFast = false
let intervalId
let countdown = null

Template.clock.onCreated(function () {
  //Listen to admin calls to action (like displaying score ou quoi)
  streamer.on('pupitreAction', handlePupitreAction)
})

const handlePupitreAction = function (message) {
  console.log(message)
  switch (message.content) {
    case 'startTimer':
      startCountdown()
      requestAnimationFrame(animateFirst)
      break
  }
}
// First animation: Rotate needle and reveal red background trail
const animateFirst = function (time) {
  const needle = document.getElementById('needle')
  const clockFace = document.getElementById('clock-face')

  if (!startTime) startTime = time

  const elapsed = time - startTime
  const progress = Math.min(elapsed / duration, 1) // Calculate progress (0 to 1)

  // Calculate the current angle
  const angle = 360 * progress

  // Update the needle's rotation
  needle.style.transform = `translateX(-50%) rotate(${angle}deg)`

  // Create a conic gradient to reveal the red trail
  clockFace.style.background = `white conic-gradient(
    rgba(255, 0, 0, 1) ${angle}deg,
    rgba(255, 0, 0, 0) ${angle}deg
  )`

  // Continue the animation if not finished
  if (progress < 1) {
    animationFrameId = requestAnimationFrame(animateFirst)
  } else {
    console.log('First animation complete!')
    startTime = null // Reset start time for second animation
    endCountdown()
  }
}

// Second animation: Rotate needle again and override with pink background trail
const animateSecond = function (time) {
  const needle = document.getElementById('needle')
  const clockFace = document.getElementById('clock-face')

  if (!startTime) startTime = time

  const elapsed = time - startTime
  const progress = Math.min(elapsed / duration, 1) // Calculate progress (0 to 1)

  // Calculate the current angle
  const angle = 360 * progress

  // Update the needle's rotation
  needle.style.transform = `translateX(-50%) rotate(${angle}deg)`

  // Create a conic gradient to overwrite the red trail with pink
  clockFace.style.background = `conic-gradient(
    rgba(125, 0, 255, 1) ${angle}deg,
    rgba(125, 0, 255, 0) ${angle}deg,
    rgba(255, 0, 0, 1) ${angle}deg
  )`

  // Continue the animation if not finished
  if (progress < 1) {
    animationFrameId = requestAnimationFrame(animateSecond)
  } else {
    console.log('Second animation complete!')
  }
}

// Function to interrupt the animation
const interrupt = function () {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
    clearInterval(countdown)
    clearInterval(intervalId)
    console.log('Animation interrupted.')
  }
  const minutesEl = document.getElementById('minutes')
  const secondsEl = document.getElementById('seconds')

  // Display minutes and seconds
  minutesEl.textContent = String('00')
  secondsEl.textContent = String('00')
}

function updateCountdown() {
  const minutesEl = document.getElementById('minutes')
  const secondsEl = document.getElementById('seconds')
  const button = document.getElementById('bonjourSamuel')

  // Decrease the countdown timer
  countdownTime--

  // Calculate minutes and seconds
  const minutes = Math.floor(countdownTime / 60)
  const seconds = countdownTime % 60

  // Display minutes and seconds
  minutesEl.textContent = String(minutes).padStart(2, '0')
  secondsEl.textContent = String(seconds).padStart(2, '0')

  // Change blink and pulse speed in the last 10 seconds
  if (countdownTime <= 10 && !isBlinkingFast) {
    isBlinkingFast = true
    clearInterval(intervalId) // Clear existing interval
    intervalId = setInterval(blinkAndPulse, 500) // Blink and pulse faster
    button.classList.add('pulse-fast')
  }

  // Continue counting down into negative numbers
  if (countdownTime < 0) {
    minutesEl.textContent = '-'
    secondsEl.textContent = String(Math.abs(countdownTime)).padStart(2, '0')
  }
}

function blinkAndPulse() {
  const colonEl = document.getElementById('colon')
  // Toggle colon visibility
  colonVisible = !colonVisible
  colonEl.classList.toggle('opacity-0', !colonVisible)
}

export const startCountdown = function () {
  const minutesEl = document.getElementById('minutes')
  const secondsEl = document.getElementById('seconds')

  // Calculate minutes and seconds
  const minutes = Math.floor(countdownTime / 60)
  const seconds = countdownTime % 60

  // Display minutes and seconds
  minutesEl.textContent = String(minutes).padStart(2, '0')
  secondsEl.textContent = String(seconds).padStart(2, '0')

  // Start updating the countdown every second
  countdown = setInterval(updateCountdown, 1000)

  // Blink the colon every second
  intervalId = setInterval(blinkAndPulse, 500)
}

const endCountdown = function () {
  const button = document.getElementById('bonjourSamuel')

  interrupt()
  button.classList.remove('pulse-fast')
  button.classList.add('!bg-[red]')

  setTimeout(() => {
    // animationFrameId = requestAnimationFrame(animateSecond)
    toggleColumn()
    setTimeout(() => {
      die(button)
    }, 3000)
  }, 3000) // Optional delay between animations
}

// First animation: Rotate needle and reveal red background trail
export const animateMiniClocks = function (time) {
  // Get all clock elements
  const needles = document.querySelectorAll('.miniclock-needles') // Select all needles
  const clockFaces = document.querySelectorAll('.miniclock-faces') // Select all clock faces
  const clocks = document.querySelectorAll('.miniclock') // Select all needles

  if (!startTime) startTime = time

  const elapsed = time - startTime
  const progress = Math.min(elapsed / duration, 1) // Calculate progress (0 to 1)

  // Calculate the current angle
  const angle = 360 * progress

  // Update each needle and clock face
  needles.forEach((needle) => {
    needle.style.transform = `translateX(-50%) rotate(${angle}deg)`
  })

  clockFaces.forEach((clockFace) => {
    clockFace.style.background = `white conic-gradient(
      rgba(255, 0, 0, 1) ${angle}deg,
      rgba(255, 0, 0, 0) ${angle}deg
    )`
  })

  // Continue the animation if not finished
  if (progress < 1) {
    animationFrameId = requestAnimationFrame(animateMiniClocks)
  } else {
    clocks.forEach((clock) => {
      setTimeout(() => {
        element = findParentWithClassPointer(clock)
        element.classList.add('opacity-0')
        die(clock)
        // but also pointer die
      }, 3000) // Optional delay between animations
    })

    interrupt()

    console.log('Animation complete!')
    startTime = null // Reset start time
  }
}

function findParentWithClassPointer(element) {
  // Traverse up the DOM tree until a parent with class 'pointer' is found
  while (element && element !== document) {
    if (element.classList.contains('pointer')) {
      return element
    }
    element = element.parentElement
  }
  // Return null if no parent with the class 'pointer' is found
  return null
}
