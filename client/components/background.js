import './background.html'
import { streamer } from '../../both/streamer.js'

flamesBgContainer = []

streamer.on('pupitreAction', function (message) {
  handlePupitreAction(message)
})

Template.flamesBg.onRendered(function () {
  document.getElementById('flamesContainer').style.opacity = '1'
})

Template.background.helpers({
  getBg() {
    // return 'bg-[blue]'
    return 'background-color :' + instance.bgColor.get() + ';'
    // let currentView = Template.instance().view

    // while (currentView != null) {
    //   if (currentView.name == "Template.show") {
    //     break
    //   }
    //   currentView = currentView.parentView
    // }

    // if (currentView.templateInstance().whichBackground.get() == "graphe_revenus_vs_repas.png") {
    //   return "background-size : contain; background-image:url('./backgrounds/" + currentView.templateInstance().whichBackground.get() + "');"
    // } else {
    //   return "background-image:url('./backgrounds/" + currentView.templateInstance().whichBackground.get() + "');"
    // }
  },
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'bgToblue':
      instance.bgColor.set('blue')
      break
    case 'bgToblack':
      instance.bgColor.set('#1C1917')
      break
    case 'bgTogrey':
      instance.bgColor.set('oklch(0.869 0.022 252.894)')
      break
    case 'bgToFlames':
      console.log('PROUT')
      const bg = document.getElementById('background')
      flamesBgContainer.push(Blaze.render(Template.flamesBg, bg))
      break
  }
}
