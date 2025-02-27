import { randomBetween, positionOnCircle, randomPointInArea } from '../both/math-helpers.js'

import { pushToClientEventQueue } from '../client/stepper.js'

autoclickerIntervals = {}

export const moveOffOfCaptcha = function (pointer) {
  // Randomly decide if we pick from the 1st or 4th quarter
  const inFirstQuarter = Math.random() < 0.5

  // Generate X coordinate within 5%-25% OR 75%-95% of width
  const _x = inFirstQuarter
    ? Math.random() * (window.innerWidth * 0.2) + window.innerWidth * 0.05 // Between 5% - 25%
    : Math.random() * (window.innerWidth * 0.2) + window.innerWidth * 0.75 // Between 75% - 95%

  // Generate Y coordinate between 5% - 95% of height
  const _y = Math.random() * (window.innerHeight * 0.9) + window.innerHeight * 0.05

  pushToClientEventQueue({
    origin: 'autoplay',
    payload: {
      type: 'move',
      from: null,
      to: {
        x: Math.floor(_x),
        y: Math.floor(_y),
      },
      duration: 1000,
      pointer: pointer,
    },
  })
}

export const moveInFrontOfCaptcha = function (pointer) {
  // get captcha position in the screen
  // get catpcha height
  // position yourself at x pixels below dat captcha

  pushToClientEventQueue({
    origin: 'autoplay',
    payload: {
      type: 'move',
      from: null,
      to: { x: window.innerWidth / 2, y: (window.innerHeight / 4) * 3 },
      duration: 1000,
      pointer: pointer,
    },
  })
}

//A proof of concept "choreography" to test the bot AI logic
export const circleRoutine = function (pointer, numberOfPointers, indexOfPointer, radius) {
  pointer.events = []
  // //Wait for a moment
  // pointer.events.push({
  //   type: "wait",
  //   duration: randomBetween(500,5000),
  // })

  const _radius = radius || window.innerHeight / 2 - 150

  // let samuelRect = document.querySelector("#pointersamuel").getBoundingClientRect()
  // let targetCoords = {x:samuelRect.x, y:samuelRect.y}

  const angle = ((2 * Math.PI) / numberOfPointers) * indexOfPointer // Angle for each div

  // get middle of screen
  targetCoords = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  //Move to a position on a circle
  pointer.events.push({
    type: 'move',
    duration: 1000,
    from: null,
    to: positionOnCircle(targetCoords, _radius, angle),
  })
  // //Move to another position on the circle
  // pointer.events.push({
  //   type: "humanizedMove",
  //   duration: randomBetween(1100, 2100),
  //   from: null,
  //   to: positionOnCircle(targetCoords, 300, randomBetween(0,360)),
  // })
  // //Move to another position on the circle
  // pointer.events.push({
  //   type: "humanizedMove",
  //   duration: randomBetween(1100, 2100),
  //   from: null,
  //   to: positionOnCircle(targetCoords, 300, randomBetween(0,360)),
  // })

  //Wait forever
  pointer.events.push({ type: 'wait' })
}

//Send pointers to the edge of a rectangular area
export const sendToSides = function (pointers, area) {
  //Move the bots to random position on either side of the screen
  pointers = pointers.map((p) => {
    //Half of them will go left, half will go right
    if (Math.random() > 0.5) {
      p.coords.x = randomBetween(0, 200) //up to 200px from the edge
    } else {
      p.coords.x = randomBetween(area.width - 200, area.width)
    }
    p.coords.y = Math.round(Math.random() * area.height)

    //Store these coords as "home coordinates", so we can easily go back to them later
    p.homeCoords = { ...p.coords }
    return p
  })
}

export const squareRoutine = function (pointer) {
  pointer.events = []
  //Wait for a moment
  pointer.events.push({
    type: 'wait',
    duration: randomBetween(500, 5000),
  })

  let samuelRect = document.querySelector('#pointersamuel').getBoundingClientRect()
  let side = randomBetween(0, 4)
  let squareSize = 400
  let xMin = samuelRect.x - squareSize / 2.0
  let xMax = samuelRect.x + squareSize / 2.0
  let yMin = samuelRect.y - squareSize / 2.0
  let yMax = samuelRect.y + squareSize / 2.0
  let targetCoords = { x: 0, y: 0 }
  switch (side) {
    case 0:
      targetCoords.x = randomBetween(xMin, xMax)
      targetCoords.y = yMin
      break
    case 1:
      targetCoords.x = xMax
      targetCoords.y = randomBetween(yMin, yMax)
      break
    case 2:
      targetCoords.x = randomBetween(xMin, xMax)
      targetCoords.y = yMax
      break
    case 3:
      targetCoords.x = xMin
      targetCoords.y = randomBetween(yMin, yMax)
      break
  }

  //Move to a position on a square
  pointer.events.push({
    type: 'humanizedMove',
    duration: randomBetween(1100, 2100),
    from: null,
    to: targetCoords,
  })
  //Move to another position on the square
  pointer.events.push({
    type: 'humanizedMove',
    duration: randomBetween(1100, 2100),
    from: null,
    to: null,
  })

  //Wait forever
  pointer.events.push({ type: 'wait' })
}

export const dressupAnimation = function (pointer, accessory) {
  pointer.events.push({ type: 'fade', from: null, to: 0, duration: 150 })
  pointer.events.push({ type: 'lock', state: true })
  pointer.events.push({ type: 'wait', duration: 800 })
  pointer.events.push({ type: 'accessory', accessory: accessory })
  pointer.events.push({ type: 'fade', from: null, to: 1, duration: 150 })
  pointer.events.push({
    type: 'move',
    from: null,
    to: { x: pointer.coords.x + 80, y: pointer.coords.y },
    duration: 350,
  })
  pointer.events.push({ type: 'lock', state: false })
}
export const treePickUpAnimation = function (pointer, tree) {
  pointer.events.push({ type: 'fade', from: null, to: 0, duration: 150 })
  pointer.events.push({ type: 'lock', state: true })
  pointer.events.push({ type: 'wait', duration: 800 })
  pointer.events.push({ type: 'tree', tree: tree })
  pointer.events.push({ type: 'fade', from: null, to: 1, duration: 150 })
  pointer.events.push({
    type: 'move',
    from: null,
    to: { x: pointer.coords.x + 80, y: pointer.coords.y },
    duration: 350,
  })
  pointer.events.push({ type: 'lock', state: false })
}

const idleRoutines = [
  {
    weight: 2,
    apply: function (pointer) {
      //Go dress up
      //- Move there
      let targetCoords = randomPointInArea(
        document.querySelector('#folderVestiaire').getBoundingClientRect(),
      )
      pointer.events.push({
        type: 'humanizedMove',
        from: null,
        to: targetCoords,
        duration: randomBetween(1200, 1800),
      })
      //- Click
      pointer.events.push({ type: 'bufferClick' })
    },
  },
  {
    weight: 1,
    apply: function (pointer) {
      //Go hit the plus button, a bunch of times
      let amount = randomBetween(1, 11)
      for (let i = 0; i < amount; i++) {
        //- Move there
        let targetCoords = randomPointInArea(
          document.querySelector('#plusminus-plus').getBoundingClientRect(),
        )
        pointer.events.push({
          type: 'humanizedMove',
          from: null,
          to: targetCoords,
          duration: randomBetween(1200, 1800),
        })
        //- Click
        pointer.events.push({ type: 'bufferClick' })
        //- Wait
        pointer.events.push({ type: 'wait', duration: randomBetween(500, 1300) })
      }
    },
  },
  {
    weight: 1,
    apply: function (pointer) {
      //Go hit the plus button, a bunch of times
      let amount = randomBetween(1, 11)
      for (let i = 0; i < amount; i++) {
        //- Move there
        let targetCoords = randomPointInArea(
          document.querySelector('#plusminus-minus').getBoundingClientRect(),
        )
        pointer.events.push({
          type: 'humanizedMove',
          from: null,
          to: targetCoords,
          duration: randomBetween(1200, 1800),
        })
        //- Click
        pointer.events.push({ type: 'bufferClick' })
        //- Wait
        pointer.events.push({ type: 'wait', duration: randomBetween(500, 1300) })
      }
    },
  },
  {
    weight: 100,
    apply: function (pointer) {
      //Go sit
      pointer.events.push({
        type: 'humanizedMove',
        from: null,
        to: pointer.homeCoords ?? { x: 0, y: 0 },
        duration: randomBetween(2000, 3000),
      })
      //Wiggly wait
      pointer.events.push({
        type: 'humanizedMove',
        from: null,
        to: null,
        duration: randomBetween(2000, 3000),
      })
    },
  },
  {
    weight: 800,
    apply: function (pointer) {
      //Wait
      pointer.events.push({ type: 'wait', duration: randomBetween(500, 1200) })
    },
  },
]
export const getRandomIdleRoutine = function (pointer) {
  //Sum all the weights of all the routines
  let totalWeights = idleRoutines.reduce((sum, n) => sum + n.weight, 0)
  //Pick a random number
  let pick = randomBetween(0, totalWeights)
  //Look through every routine, subtracting its weight score until pick reaches 0
  let currentIndex = 0
  do {
    pick -= idleRoutines[currentIndex].weight
    //Once we reach 0: apply that routine
    if (pick <= 0) idleRoutines[currentIndex].apply(pointer)
    currentIndex++
  } while (pick > 0)

  //This isn't super readable but:
  // it picks a random routine, with proportionally chance to pick one with a high weight
}

export const killAnimation = function (pointer) {
  pointer.events = []
  pointer.tree = null
  pointer.locked = true
  pointer.gravity = 400
  pointer.opacity = 0.75
  pointer.accessory = '💀'
}

export const resetRoutine = function (pointer) {
  pointer.locked = true
  pointer.opacity = 0
  pointer.gravity = 0
  pointer.events = []
  pointer.tree = null
  pointer.accessory = ''
  pointer.killable = false
}
export const welcomeRoutine = function (pointer) {
  pointer.events = []
  //Unlock everyone, fade them in
  pointer.events.push({ type: 'lock', state: false })
  pointer.events.push({ type: 'fade', from: 0, to: 1, duration: 3000 })
  pointer.events.push({ type: 'wait' })
}
export const regroupRoutine = function (pointer) {
  pointer.events = []
  //Wait a bit
  pointer.events.push({ type: 'wait', duration: randomBetween(2000, 8000) })
  pointer.events.push({ type: 'wait', duration: randomBetween(2000, 8000) })
  //Regroup near Samuel
  let samuelRect = document.querySelector('#pointersamuel').getBoundingClientRect()
  let targetCoords = randomPointInArea({
    x: samuelRect.x - 250,
    y: samuelRect.y + 210,
    width: 500,
    height: 200,
  })
  pointer.events.push({
    type: 'humanizedMove',
    from: null,
    to: targetCoords,
    duration: randomBetween(1200, 4000),
  })
  //Wait forever
  pointer.events.push({ type: 'wait' })
}

export const axisRoutine = function (pointer, axisData) {
  pointer.events = []

  //Wait for a moment
  pointer.events.push({
    type: 'wait',
    duration: randomBetween(500, 5000),
  })

  let axisXMin = axisData.xMin
  let axisXMax = axisData.xMax
  let axisY = axisData.y
  let lineWidth = 18
  //Move to a target position on a line
  console.log(axisXMin, axisXMax, axisY, lineWidth)
  let targetCoords = randomPointInArea({
    x: axisXMin,
    y: axisY,
    width: axisXMax - axisXMin,
    height: lineWidth,
  })
  pointer.events.push({
    type: 'humanizedMove',
    duration: randomBetween(1100, 2100),
    from: null,
    to: targetCoords,
  })
  pointer.events.push({
    type: 'humanizedMove',
    duration: randomBetween(1100, 2100),
    from: null,
    to: null,
  })

  //Wait forever
  pointer.events.push({ type: 'wait' })
}

export const autoClickerMine = function (father, bot) {
  // okay let's go, destroy pointer and add html svg with animation
  // this is superb performance-wise
  console.log(bot.id)
  instance.pointers.delete(bot.id)
  addFakePointer(bot)
}

export const autoclickerSpawn = function (father, bot) {
  parentCoords = father.coords
  newCoords = {
    x: parentCoords.x + randomBetween(-50, 50),
    y: parentCoords.y + randomBetween(-50, 50),
  }

  pushToClientEventQueue({
    origin: 'autoplay',
    payload: {
      type: 'move',
      from: null,
      to: { x: newCoords.x, y: newCoords.y },
      duration: 200,
      pointer: bot,
    },
  })
}

export const graphRoutine = function (pointer, graphData) {
  pointer.events = []

  //Go home while waiting for instructions
  pointer.events.push({
    type: 'humanizedMove',
    from: null,
    to: pointer.homeCoords ?? { x: 0, y: 0 },
    duration: randomBetween(2000, 3000),
  })
  //Wait for a moment
  pointer.events.push({
    type: 'wait',
    duration: randomBetween(8000, 15000),
  })

  let graphXMin = graphData.xMin
  let graphXMax = graphData.xMax
  let graphYMin = graphData.yMin
  let graphYMax = graphData.yMax
  let targetCoords = randomPointInArea({
    x: graphXMin,
    y: graphYMin,
    width: graphXMax - graphXMin,
    height: graphYMax - graphYMin,
  })
  pointer.events.push({
    type: 'humanizedMove',
    duration: randomBetween(1100, 2100),
    from: null,
    to: targetCoords,
  })
  pointer.events.push({
    type: 'humanizedMove',
    duration: randomBetween(4000, 8000),
    from: null,
    to: null,
  })

  //Wait forever
  pointer.events.push({ type: 'wait' })
}

export const playgroundRoutine = function (pointer) {
  pointer.events = []
}

export const arrangeInCircle = function (pointer) {}

addFakePointer = function (bot) {
  const targetDiv = document.getElementById('pointersContainer')

  const svgHTML = `
    <div 
      style='position:absolute;
      left:${bot.coords.x}px;
      top:${bot.coords.y}px;
      height:${instance.pointerHeight.get()}rem;
      width:${instance.pointerWidth.get()}rem'
      class="clic-animation autoclicker"
    >
      <svg
        version="1.1"
        id="pointerSvg"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        x="0px"
        y="0px"
        viewBox="8 4.3 13 20"
        enable-background="new 0 0 28 28"
        xml:space="preserve"
        style="width: 100%; height: 100%; filter: drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.4))"
      >
        <polygon
          class="transition-all duration-[10s]"
          fill="white"
          points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 "
        />
        <polygon
          class="transition-all duration-[10s]"
          fill="white"
          points="17.3,21.6 13.7,23.1 9,12 12.7,10.5 "
        />
        <rect
          class="transition-all duration-[10s]"
          fill="black"
          x="12.5"
          y="13.6"
          transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)"
          width="2"
          height="8"
        />
        <polygon
          class="transition-all duration-[10s]"
          fill="black"
          points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 "
        />
      </svg>
    </div>
  `

  targetDiv.insertAdjacentHTML('beforeend', svgHTML)
}
