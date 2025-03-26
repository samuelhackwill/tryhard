import './clickerGrid.html'
import { streamer } from '../../both/streamer.js'

Template.clickerGrid.onCreated(function () {
  streamer.on('pupitreAction', handlePupitreAction)
})

Template.clickerGrid.helpers({
  columns() {
    return [0, 1, 2].map((val, i) => ({ index: i, value: val }))
  },
  rows() {
    return [0, 1, 2, 3]
  },
})

Template.clicker.onCreated(function () {
  this.type = this.data
})

Template.clicker.onRendered(function () {
  console.log(this)
})

Template.clicker.helpers({
  is(typeName) {
    return Template.instance().type === typeName
  },
})

const handlePupitreAction = function (message) {
  // find the first empty clicker container and fill it
  const containers = document.getElementsByClassName('clickerContainer')
  let targetContainer = null

  for (let i = 0; i < containers.length; i++) {
    if (containers[i].children.length === 0) {
      targetContainer = containers[i]
      break
    }
  }

  switch (message.content) {
    case 'clicker':
      if (targetContainer) {
        Blaze.renderWithData(Template.clicker, message.args[0], targetContainer)
      }
      break
    case 'showClicker':
      console.log('prout ', message.args, 'prout 2', message.args[0])
      document.querySelector(`#clicker-${message.args[0]}`).classList.remove('opacity-0')
      break
    case 'startUpdatingStonks':
      stonksStepper = setInterval(() => {
        updateTopMouse()
      }, 100)
      break
    case 'stopUpdatingStonks':
      console.log('stop stonks stepper now!')
      clearInterval(stonksStepper)
      break
  }
}

const updateTopMouse = function () {
  const allDomPointers = Array.from(document.getElementsByClassName('pointer'))
  const lastGradin = allDomPointers[0].dataset.maxgradin || 'unknown'
  const gradinSums = {}

  // Sum money values by pointer.gradin
  allDomPointers.forEach((domPointer) => {
    const money = Number(domPointer.querySelector('#money')?.innerHTML.replace(/\s/g, '')) || 0

    const gradin = domPointer?.dataset.gradin || 'unknown'

    if (!gradinSums[gradin]) {
      gradinSums[gradin] = 0
    }

    gradinSums[gradin] += money
  })

  let richestGradin = null
  let richestScore = -Infinity

  Object.entries(gradinSums).forEach(([gradin, total]) => {
    if (total > richestScore) {
      richestGradin = gradin
      richestScore = total
    }
  })

  document.querySelector('#clickCounter-bestGradin').firstChild.nodeValue = richestScore
  let descriptor = ''

  if (richestGradin == 1) {
    descriptor = "fois. C'est le gradin tout devant! Premiers de la classe!"
  } else if (richestGradin == lastGradin) {
    descriptor = "fois. Et c'est le gradin du fond! c'est à l'arrière qu'on clique le plus fort."
  } else {
    descriptor = `fois. c'est le ${richestGradin}e gradin en partant de devant!`
  }

  document.querySelector('#clickDescriptor-bestGradin').firstChild.nodeValue = descriptor

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
  instance.FourthMouseScore.set(moneyElements[3] || 0)

  // **Rank Assignment (Handles Ties)**
  const ranking = new Map()
  let currentRank = 1
  for (const money of moneyElements) {
    if (!ranking.has(money)) {
      ranking.set(money, currentRank)
      currentRank++
      if (ranking.size >= 3) break // Stop when we have at least 4 ranks
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
