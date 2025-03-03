import { handlePupitreMessage } from './components/feed'

export const observing = []

const mouseTimeStamps = []

export const observe = function (what, args) {
  // check that observing contains what.
  // if it doesn't, just return here and there.
  switch (what) {
    case 'newClick':
      if (observing.includes(what)) {
        console.log("we're observing new clicks.")
        if (mouseTimeStamps.length >= 5) {
          console.log("we're removing the observation of new clicks cause everybody's here.")
          // stop looking for new mice if the array already contains everybody, i.e. everybody has moved.
          observing = observing.filter((elem) => elem !== what)
        }
        // check in mousetimestamps if there is an object with the same id as args.id. if it's the case, return. if it's not, send a pupitre action.
        // if mousetimestamps contains as many elements as totalActiveMice
        // then remove thyself from the observing array.
        if (mouseTimeStamps.find((item) => item.id === args)) {
          console.log('this mouse has already been greeted.')
          return
        } else {
          mouseTimeStamps.push({ id: args, timestamp: Date.now() })
          handlePupitreMessage({
            type: 'newLine',
            content: `une ${mouseTimeStamps.length}e souris a produit un clic.`,
          })
        }
      } else {
        console.log('observing does not include newclick.')
        return
      }
      break

    default:
      break
  }
}
