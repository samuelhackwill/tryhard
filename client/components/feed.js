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
    instance.textColor.get()
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
  const moneyElements = allDomPointers.map((pointer) => {
    const cleanValue = pointer.querySelector('#money').innerHTML.replace(/\s/g, '')
    const numberValue = Number(cleanValue)
    return numberValue
  })

  moneyElements.sort((a, b) => b - a)

  instance.GoldMouseScore.set(moneyElements[0])
  instance.SilverMouseScore.set(moneyElements[1])
  instance.CopperMouseScore.set(moneyElements[2])

  // const matchingPointer = allDomPointers.find((pointer) => {
  //   const moneySpan = pointer.querySelector('#money')
  //   if (!moneySpan) return false

  //   const cleanValue = moneySpan.innerHTML.replace(/\s/g, '')
  //   return Number(cleanValue) === moneyElements[0]
  // })

  // console.log('best mouse is ', matchingPointer ? matchingPointer.id : null)

  // Reset all previous top pointers' colors
  const pointers = Object.values(instance.pointers.all())

  pointers.forEach((p) => {
    p.bgColor = '#000000' // Default (black)
    p.outlineColor = '#FFFFFF' // Default (white)
    instance.pointers.set(p.id, p)
  })

  // if no one has clicked, please return. we don't want a random pointer to turn gold even before anyone has clicked
  if (moneyElements[0] === 0) return []

  // Find the top 3 pointers based on the highest money values
  const topPointers = moneyElements
    .slice(0, 3)
    .map((score) =>
      allDomPointers.find((pointer) => {
        const moneySpan = pointer.querySelector('#money')
        if (!moneySpan) return false
        return Number(moneySpan.innerHTML.replace(/\s/g, '')) === score
      }),
    )
    .filter(Boolean) // Remove any undefined/null values

  // Apply the colors to the top 3 pointers if they exist
  if (topPointers[0]) {
    _pointer = instance.pointers.get(topPointers[0].id)
    _pointer.bgColor = '#FFD700' // Gold
    _pointer.outlineColor = '#000000'
    instance.pointers.set(topPointers[0].id, _pointer)
  }

  if (topPointers[1]) {
    _pointer = instance.pointers.get(topPointers[1].id)
    _pointer.bgColor = '#C7C7C7' // Silver
    _pointer.outlineColor = '#000000'
    instance.pointers.set(topPointers[1].id, _pointer)
  }

  if (topPointers[2]) {
    _pointer = instance.pointers.get(topPointers[2].id)
    _pointer.bgColor = '#815924' // Copper
    _pointer.outlineColor = '#000000'
    instance.pointers.set(topPointers[2].id, _pointer)
  }
}
