import './feed.html'
import { streamer } from '../../both/streamer.js'
import './reactiveLine.js'

reactiveLinesContainer = []

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})
streamer.on('pupitreMessage', function (message) {
  handlePupitreMessage(message)
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'alertLine':
      document.getElementById('feed').firstChild.classList.add('flashing-text')
      break
    case 'textToBlack':
      instance.textColor.set('black')
      break
    case 'textToWhite':
      instance.textColor.set('white')
      break
    case 'hideFeed':
      instance.feedToggle.set(false)
      break
    case 'clearFeed':
      const myNode = document.getElementById('feed')
      while (myNode.firstChild) {
        myNode.removeChild(myNode.lastChild)
      }
      break
    case 'showFeed':
      document.getElementById('feed').classList.remove('duration-[10s]')
      document.getElementById('feed').classList.add('duration-[2s]')
      Meteor.setTimeout(function () {
        instance.feedToggle.set(true)
      }, 50)
      break
  }
}

export const handlePupitreMessage = function (message) {
  const feed = document.getElementById('feed')

  const feedItem = document.createElement('div')
  feedItem.className = 'ml-2 feedItem transition-opacity duration-1000'
  feedItem.style.marginBottom = '32px'

  function appendSpan(content, className = 'opacity-0') {
    const span = document.createElement('span')
    span.className = className
    span.textContent = content
    feedItem.appendChild(span)
  }

  let variableBuffer = null
  let emphasisTrigger = false

  message.content.split('').forEach((char) => {
    if (variableBuffer !== null) {
      // We're inside a [variable]
      if (char === ']') {
        // Variable finished — insert a span with the variable value
        // OK SO WHEN WE USE VARIABLES THIS WAY, THEY NEED TO BE
        // > SCOPED TO SHOW INSTANCE
        // > and also be reactive vars.
        // bye
        const variableName = variableBuffer
        // const variableValue = instance[variableName].get() ?? `[${variableName}]`

        feedItem.classList.add('reactiveLine')

        reactiveLinesContainer.push(
          Blaze.renderWithData(
            Template.reactiveLine,
            { name: variableName },
            feedItem, // Append directly into feedItem
          ),
        )

        // appendSpan(variableValue, `opacity-0 variable ${variableName}`)
        variableBuffer = null // exit variable mode
      } else {
        variableBuffer += char
      }
      return
    }

    if (char === '[') {
      // Start capturing variable name
      variableBuffer = ''
      return
    }

    if (char === '_') {
      // Toggle emphasis
      emphasisTrigger = !emphasisTrigger
      return
    }

    // Normal character
    const className = emphasisTrigger
      ? 'opacity-0 italic !font-serif !text-yellow-100'
      : 'opacity-0'

    appendSpan(char, className)
  })

  feed.prepend(feedItem)
  const arr = [...feed.children[0].children]
  let index = 0

  // TYPING ANIMATION HERE
  const interval = Meteor.setInterval(() => {
    if (index > arr.length - 1) {
      Meteor.clearInterval(interval)
      return
    }
    arr[index].style.opacity = 1
    index++
  }, 5)

  // ALTERNATIVE TYPING ANIMATION HERE, SLOWER BUT MORE FLUID.
  // function revealChar() {
  //   if (index >= arr.length) return

  //   arr[index].style.opacity = 1
  //   index++
  //   requestAnimationFrame(revealChar)
  // }

  // requestAnimationFrame(revealChar)

  // ANIMATION OF AVANT-DERNIERE LINE HERE

  // we need to fade all the lines as they are added, but not the first one. The feed has an empty children so length is 3 when we've only got 2 lines of test for some reason.
  // if (feed.children.length < 2) {
  //   return
  // } else {
  //   Meteor.setTimeout(() => {
  //     feed.children[1].style.opacity = '0.5'
  //   }, 0)
  // }
}

Template.feed.helpers({
  getTextColor() {
    return 'text-' + instance.textColor.get()
  },
  feedHider() {
    if (instance.feedToggle.get() === true) {
      return 'opacity : 1;'
    } else {
      return 'opacity : 0;'
    }
  },
})
export const updateTopMouse = function () {
  const allDomPointers = Array.from(document.getElementsByClassName('pointer'))

  // Extract and sort money values (descending order)
  const moneyElements = allDomPointers
    .map((pointer) => {
      const cleanValue = pointer.querySelector('#money')?.innerHTML.replace(/\s/g, '')
      return Number(cleanValue) || 0
    })
    .sort((a, b) => b - a)

  // If no one has clicked, prevent assigning colors randomly
  if (moneyElements[0] === 0) return []

  // Assign Gold, Silver, Copper scores (store their values)
  instance.GoldMouseScore.set(moneyElements[0] || 0)
  instance.SilverMouseScore.set(moneyElements[1] || 0)
  instance.CopperMouseScore.set(moneyElements[2] || 0)

  // **Rank Assignment (Handles Ties)**
  const ranking = new Map()
  let currentRank = 1
  for (const money of moneyElements) {
    if (!ranking.has(money)) {
      ranking.set(money, currentRank)
      currentRank++
      if (ranking.size >= 3) break // Stop when we have at least 3 ranks
    }
  }

  // console.log('Ranking Map:', ranking)

  // Find pointers corresponding to top ranked scores
  const rankedPointers = allDomPointers
    .map((pointer) => {
      const moneySpan = pointer.querySelector('#money')
      if (!moneySpan) return null
      const moneyValue = Number(moneySpan.innerHTML.replace(/\s/g, '')) || 0
      return { pointer, money: moneyValue, rank: ranking.get(moneyValue) || null }
    })
    .filter((entry) => entry.rank !== null) // Keep only ranked pointers

  // console.log('Ranked Pointers:', rankedPointers)

  // **Get Podium Pointer IDs Before Resetting**
  const podiumPointerIds = rankedPointers.map((entry) => entry.pointer.id)

  // **Reset only non-podium pointers**
  const allPointers = Object.values(instance.pointers.all())
  allPointers.forEach((p) => {
    if (!podiumPointerIds.includes(p.id)) {
      p.bgColor = '#000000' // Default (black)
      p.outlineColor = '#FFFFFF' // Default (white)
      instance.pointers.set(p.id, p)
    }
  })

  // **Assign Colors Based on Rank (No Overwriting)**
  rankedPointers.forEach(({ pointer, rank }) => {
    const _pointer = instance.pointers.get(pointer.id)
    if (!_pointer) return

    if (rank === 1) {
      _pointer.bgColor = '#FFD700' // Gold
      _pointer.outlineColor = '#000000'
    } else if (rank === 2) {
      _pointer.bgColor = '#C7C7C7' // Silver
      _pointer.outlineColor = '#000000'
    } else if (rank === 3) {
      _pointer.bgColor = '#815924' // Copper
      _pointer.outlineColor = '#000000'
    }

    instance.pointers.set(pointer.id, _pointer)
  })
}
