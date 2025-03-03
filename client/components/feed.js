import './feed.html'
import { streamer } from '../../both/streamer.js'

let emphasisTrigger = false

Template.feed.onCreated(function () {
  streamer.on('pupitreMessage', handlePupitreMessage)
  streamer.on('pupitreAction', handlePupitreAction)
})

export const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'textToBlack':
      instance.textColor.set('black')
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
  feedItem.className = 'ml-2 feedItem transition-opacity duration-1000 '
  feedItem.style.marginBottom = '32px'

  message.content.split('').forEach((char) => {
    // si c'est une étoile, passe en mode emphasis
    // si c'est une deuxième étoile passe en mode fin de l'emphasis
    if (char == '_') {
      emphasisTrigger = !emphasisTrigger
      return
    }
    const span = document.createElement('span')
    if (emphasisTrigger === true) {
      span.className = 'opacity-0 italic !font-serif !text-yellow-100'
    } else {
      span.className = 'opacity-0'
    }
    span.textContent = char // Assign the character to the span
    feedItem.appendChild(span) // Append the span to the div
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
  if (feed.children.length < 2) {
    return
  } else {
    Meteor.setTimeout(() => {
      feed.children[1].style.opacity = '0.2'
    }, 0)
  }
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
