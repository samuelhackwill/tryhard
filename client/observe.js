import { handlePupitreMessage } from './components/feed'

export let observing = []

const clickTimeStamps = []
const moveTimeStamps = []

export const observe = function (what, args) {
  // check that observing contains what.
  // if it doesn't, just return here and there.

  if (observing.length <= 0) {
    console.log('observe is empty, returning.')
    return
  } else {
    switch (what) {
      case 'newClick':
        if (observing.includes(what) && clickTimeStamps.length >= 2) {
          console.log(
            "we're removing the observation of new clicks (for performance reasons) cause everybody's here.",
          )
          // stop looking for new mice if the array already contains everybody, i.e. everybody has moved.
          observing = observing.filter((elem) => elem !== what)
        }

        if (observing.includes(what)) {
          console.log("we're observing new clicks.")
          if (clickTimeStamps.find((item) => item.id === args)) {
            console.log('this mouse has already been greeted.')
            return
          } else {
            clickTimeStamps.push({ id: args, timestamp: Date.now() })
            handlePupitreMessage({
              type: 'newLine',
              content: `une ${clickTimeStamps.length}e souris a produit un clic.`,
            })
          }
        } else {
          console.log('observing does not include newclick.')
          return
        }
        break

      case 'newMove':
        if (observing.includes(what) && moveTimeStamps.length >= 2) {
          console.log(
            "we're removing the observation of new moves (for performance reasons) cause everybody's here.",
          )
          // stop looking for new mice if the array already contains everybody, i.e. everybody has moved.
          observing = observing.filter((elem) => elem !== what)
        }

        if (observing.includes(what)) {
          console.log("we're observing new moves.")
          if (moveTimeStamps.find((item) => item.id === args)) {
            console.log('this mouse has already been greeted.')
            return
          } else {
            moveTimeStamps.push({ id: args, timestamp: Date.now() })
            handlePupitreMessage({
              type: 'newLine',
              content: `une ${moveTimeStamps.length}e souris s'est déplacée.`,
            })
          }
        } else {
          console.log('observing does not include newMove.')
          return
        }
        break

      default:
        break
    }
  }
}
