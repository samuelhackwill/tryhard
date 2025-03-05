import './samuel.html'
import { streamer } from '../../both/streamer.js'

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'samuelDVD':
      document.getElementById('samuel').classList.add('saveme-animated')
      break
  }
}
