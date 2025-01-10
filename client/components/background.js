import './background.html'

import { streamer } from '../../both/streamer.js'

Template.background.onCreated(function () {
  //Listen to admin calls to action (like displaying score ou quoi)
  streamer.on('pupitreAction', handlePupitreAction)
})

Template.background.helpers({
  getBg() {
    // return 'bg-[blue]'
    console.log(instance.bgColor.get())
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
  console.log(message)
  switch (message.content) {
    case 'bgToblue':
      instance.bgColor.set('blue')
      break
    case 'bgToblack':
      instance.bgColor.set('#1C1917')
      break
  }
}
