import './samuel.html'
import { streamer } from '../../both/streamer.js'

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})

Template.samuel.onRendered(function () {
  setTimeout(() => {
    document.getElementById('samuel').style.opacity = '1'
  }, 50)
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'samuelDVD':
      document.getElementById('samuel').classList.add('saveme-animated')
      break
  }
}
