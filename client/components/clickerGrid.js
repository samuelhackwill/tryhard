import './clickerGrid.html'
import { streamer } from '../../both/streamer.js'

import { HighScore } from '../../both/api.js'
import { speed } from 'jquery'

let inactiveThreshold = 10 * 1000
// this is to update speed/second
let tick = 1
let maxSpeed = 0
let maxChomdu = 0
let lowestGini = 1000
let clicksInThePastSecond = 0
let pastClicksTotal = 0
let targetDBItem

Template.clickerGrid.onCreated(function () {
  this._pupitreHandler = (message) => {
    message.context = this
    handlePupitreAction(message)
  }
  streamer.on('pupitreAction', this._pupitreHandler)

  this.autorun(() => {
    const sub = this.subscribe('highScore')

    if (sub.ready()) {
      // targetDBItem = HighScore.findOne({}, { sort: { topSpeed: 1 } })
      // console.log('🏁 Subscription ready, top speed:', targetDBItem)
      targetDBItem = HighScore.find({})
        .fetch()
        .map((doc) => ({
          ...doc,
          topSpeedNum: parseFloat(doc.topSpeed),
        }))
        .filter((doc) => !isNaN(doc.topSpeedNum))
        .sort((a, b) => b.topSpeedNum - a.topSpeedNum)[0]
    }
  })
})

Template.pasUnRobot.onDestroyed(function () {
  streamer.removeListener('pupitreAction', this._pupitreHandler)
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
  recordGet(arg) {
    return targetDBItem[arg]
  },
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
      // console.log('prout ', message.args, 'prout 2', message.args[0])
      document.querySelector(`#clicker-${message.args[0]}`).classList.remove('opacity-0')
      break
    case 'startUpdatingStonks':
      stonksStepper = setInterval(() => {
        updateTopMouse(message.context)
      }, 100)
      break
    case 'stopUpdatingStonks':
      console.log('stop stonks stepper now!')
      clearInterval(stonksStepper)
      break
    case 'clickerMsg':
      document.querySelector('#clickCounterWarn').firstChild.nodeValue =
        message.args[0] + ', ' + message.args[1]
      break
    case 'clickerAlert':
      // Set the warning text
      document.querySelector('#clickerTotalWarning').textContent = message.args[0]

      // Hide the counter without removing it
      const counter = document.querySelector('#clickerTotalCounter')
      counter.style.position = 'absolute'
      counter.style.left = '-9999px'
      counter.style.top = '-9999px'

      // Flash the first .clicker element
      const elements = Array.from(document.getElementsByClassName('clicker'))

      if (elements.length > 0) {
        const el = elements[0]
        el.classList.remove('bg-white')
        el.classList.add('bg-[red]')

        setTimeout(() => {
          el.classList.remove('bg-[red]')
          el.classList.add('bg-white')
        }, 500)
      }
      break
    // case 'blinkEveryone':
    //   const elements = Array.from(document.getElementsByClassName('clicker'))

    //   // Shuffle
    //   for (let i = elements.length - 1; i > 0; i--) {
    //     const j = Math.floor(Math.random() * (i + 1))
    //     ;[elements[i], elements[j]] = [elements[j], elements[i]]
    //   }

    //   // Apply class with delay, only if not already blinking
    //   let i = 0
    //   function next() {
    //     if (i >= elements.length) return

    //     const el = elements[i]
    //     if (!el.classList.contains('blink-red-gentle')) {
    //       el.classList.add('blink-red-gentle')
    //     }

    //     i++
    //     setTimeout(next, 500)
    //   }

    //   next()
    //   break
    case 'killClickerGrid':
      document.querySelector('#clickerGrid').classList.add('opacity-0')
      setTimeout(() => {
        Blaze.remove(message.context.view)
      }, 5000)
      break
    case 'save':
      HighScore.insert({
        gentillé: 'prout',
        date: new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        heure: 'la soirée',
        totalClics: Number(document.querySelector('#clickCounter-total').firstChild.nodeValue),
        topSpeed: maxSpeed,
        topPlayer: Number(document.querySelector('#clickCounter-goldMouse').firstChild.nodeValue),
        topGradin: Number(document.querySelector('#clickCounter-bestGradin').firstChild.nodeValue),
        topChomeurs: maxChomdu,
        bestGini: lowestGini,
      })

      break
  }
}

const updateTopMouse = function (context) {
  // calculating speed/s here
  if (tick > 9) {
    // update speed
    document.querySelector('#speedCounter').firstChild.nodeValue = clicksInThePastSecond
    if (clicksInThePastSecond > maxSpeed) {
      // update top speed if applicable
      maxSpeed = clicksInThePastSecond
      if (maxSpeed > targetDBItem.topSpeed) {
        // context.recordBeaten.set(true)
        const speedHTML = `
        <div>
          <span> Vous venez de battre le record du monde de cette performance du point de vue de votre production de clics/seconde, </span> 
          <span> avec une vitesse max de </span> 
          <span id="speedCounter" class="text-blue-600 font-mono font-bold"> ${maxSpeed} </span>
          <span> clics par seconde. </span>
          <span class="text-blue-600 font-bold"> Félicitations. </span>
        </div>
      `

        document.getElementById('speedWorldRecord').innerHTML = speedHTML
      }
    }
    tick = 0
    clicksInThePastSecond = 0
    pastClicksTotal = Number(document.querySelector('#clickCounter-total').firstChild.nodeValue)
    // also check if you beat the high score!
  } else {
    if (document.querySelector('#clickCounter-total')?.firstChild) {
      clicksInThePastSecond =
        Number(document.querySelector('#clickCounter-total').firstChild.nodeValue) - pastClicksTotal
    }
  }

  tick++

  const allDomPointers = Array.from(document.getElementsByClassName('pointer'))

  const lastGradin = allDomPointers[0].dataset.maxgradin || 'unknown'
  const gradinSums = {}
  const now = Date.now()

  // Sum money values by pointer.gradin
  allDomPointers.forEach((domPointer) => {
    const money = Number(domPointer.querySelector('#money')?.innerHTML.replace(/\s/g, '')) || 0
    const gradin = domPointer?.dataset.gradin || 'unknown'

    if (!gradinSums[gradin]) {
      gradinSums[gradin] = 0
    }

    gradinSums[gradin] += money
  })

  const inactiveDomPointers = allDomPointers.filter((domPointer) => {
    const moneySpan = domPointer.querySelector('#money')
    const lastUpdate = Number(moneySpan?.dataset.lastupdate || 0)
    return now - lastUpdate > inactiveThreshold
  })

  if (inactiveDomPointers.length > maxChomdu) {
    maxChomdu = inactiveDomPointers.length
  }
  document.querySelector('#clickCounter-chomdu').firstChild.nodeValue = inactiveDomPointers.length

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
    descriptor = "fois. Et c'est le gradin du fond! C'est à l'arrière qu'on clique le plus fort."
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

  // const mid = Math.floor(moneyElements.length / 2)
  // const median =
  //   moneyElements.length % 2 === 0
  //     ? (moneyElements[mid - 1] + moneyElements[mid]) / 2
  //     : moneyElements[mid]

  // // Store or display the median
  // document.querySelector('#médiane').firstChild.nodeValue = median

  const totalMice = moneyElements.length
  const decileCount = Math.max(1, Math.floor(totalMice * 0.1))

  const top10 = moneyElements.slice(0, decileCount)
  const bottom10 = moneyElements.slice(-decileCount)

  const avgTop10 = top10.reduce((a, b) => a + b, 0) / top10.length
  const avgBottom10 = bottom10.reduce((a, b) => a + b, 0) / bottom10.length || 1 // prevent divide-by-zero

  const decileRatio = Math.round((avgTop10 / avgBottom10) * 100) / 100 // rounded to 2 decimals
  document.querySelector('#gini').firstChild.nodeValue = decileRatio

  if (decileRatio < lowestGini) {
    lowestGini = decileRatio
  }

  if (decileRatio < 150) {
    document.querySelector('#france').firstChild.nodeValue =
      'La société des souris est donc plus égalitaire que celle des français (rapport inter-décile du patrimoine en France = 150)'
  } else {
    document.querySelector('#france').firstChild.nodeValue =
      'La société des souris est donc moins égalitaire que celle des français (rapport inter-décile du patrimoine en France = 150)'
  }

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
      if (ranking.size >= 4) break // Stop when we have at least 4 ranks
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
      // p.outlineColor = '#FFFFFF' // Default (white)
      instance.pointers.set(p.id, p)
    }
  })

  // **Assign Colors Based on Rank (No Overwriting)**
  rankedPointers.forEach(({ pointer, rank }) => {
    const _pointer = instance.pointers.get(pointer.id)
    if (!_pointer) return

    if (rank === 1) {
      _pointer.bgColor = '#FFD700' // Gold
      // _pointer.outlineColor = '#000000'

      document.querySelector('#clickCounter-goldMouse').firstChild.nodeValue = moneyElements[0]
      document.querySelector('#whois-goldMouse').firstChild.nodeValue = _pointer.order
    } else if (rank === 2) {
      _pointer.bgColor = '#C7C7C7' // Silver
      // _pointer.outlineColor = '#000000'

      document.querySelector('#clickCounter-silverMouse').firstChild.nodeValue = moneyElements[1]
      document.querySelector('#whois-silverMouse').firstChild.nodeValue = _pointer.order
    } else if (rank === 3) {
      _pointer.bgColor = '#815924' // Copper
      // _pointer.outlineColor = '#000000'

      document.querySelector('#clickCounter-bronzeMouse').firstChild.nodeValue = moneyElements[2]
      document.querySelector('#whois-bronzeMouse').firstChild.nodeValue = _pointer.order
    } else if (rank === 4) {
      _pointer.bgColor = '#000000' // no special color for you
      // _pointer.outlineColor = '#FFFFFF' // no special color for you

      document.querySelector('#clickCounter-fourthMouse').firstChild.nodeValue = moneyElements[3]
      document.querySelector('#whois-fourthMouse').firstChild.nodeValue = _pointer.order
    }

    instance.pointers.set(pointer.id, _pointer)
  })
}
