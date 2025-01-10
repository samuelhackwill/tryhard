let bonjours = []

export const playAudio = function (which) {
  switch (which) {
    case 'bonjour':
      randomInt = Math.floor(Math.random() * 3 + 1)
      console.log(randomInt)
      bonjours.push(new Audio('/bonjours/b' + randomInt + '.mp3'))

      bonjours[bonjours.length - 1].play()
      break

    case 'oof':
      oof = new Audio('/oof.mp3')
      oof.play()
      break
    default:
      break
  }
}
