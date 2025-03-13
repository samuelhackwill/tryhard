import { handlePupitreMessage } from './components/feed'

export let observing = []
const clickTimeStamps = []
const moveTimeStamps = []
const magellanHighScore = []

export const observe = function (what, args) {
  // check that observing contains what.
  // if it doesn't, just return here and there.

  if (observing.length <= 0) return
  // console.log('observe is empty, returning.')

  if (observing.includes(what)) {
    switch (what) {
      case 'newClick':
        // if (observing.includes(what) && clickTimeStamps.length >= 4) {
        //   // console.log(
        //   //   "we're removing the observation of new clicks (for performance reasons) cause everybody's here.",
        //   // )
        //   // stop looking for new mice if the array already contains everybody, i.e. everybody has moved.
        //   observing = observing.filter((elem) => elem !== what)
        // }

        // console.log("we're observing new clicks.")
        if (clickTimeStamps.find((item) => item.id === args)) {
          // console.log('this mouse has already been greeted.')
          return
        } else {
          clickTimeStamps.push({ id: args, timestamp: Date.now() })
          const nieme = clickTimeStamps.length > 1 ? clickTimeStamps.length + 'e' : ''
          handlePupitreMessage({
            type: 'newLine',
            content: `une ${nieme} souris a produit un clic.`,
          })
        }
        break

      case 'newMove':
        // if (observing.includes(what) && moveTimeStamps.length >= 4) {
        //   // console.log(
        //   //   "we're removing the observation of new moves (for performance reasons) cause everybody's here.",
        //   // )
        //   // stop looking for new mice if the array already contains everybody, i.e. everybody has moved.
        //   observing = observing.filter((elem) => elem !== what)
        // }

        // console.log("we're observing new moves.")
        if (moveTimeStamps.find((item) => item.id === args)) {
          // console.log('this mouse has already been greeted.')
          return
        } else {
          moveTimeStamps.push({ id: args, timestamp: Date.now() })
          const nieme = moveTimeStamps.length > 1 ? moveTimeStamps.length + 'e' : ''
          handlePupitreMessage({
            type: 'newLine',
            content: `une ${nieme} souris s'est déplacée.`,
          })
        }

        break

      case 'magellan':
        // console.log(args.p.cornersTouched)
        if (Object.keys(args.p.cornersTouched).length === 0)
          handlePupitreMessage({
            type: 'newLine',
            content: `une souris s'est heurtée aux bords de l'écran.`,
          })

        // first check if that corner was already touched by that one pointer
        if (!args.p.cornersTouched.hasOwnProperty(args.corner)) {
          console.log(`Pointer just touched ${args.corner} corner.`)
          let newPointer = args.p
          newPointer.cornersTouched[args.corner] = Date.now()
          instance.pointers.set(args.p.id, newPointer)

          if (Object.keys(args.p.cornersTouched).length === 4) {
            const times = Object.values(newPointer.cornersTouched)
            const rawDuration = Math.max(...times) - Math.min(...times)
            magellanHighScore.push(rawDuration)
            const legibleDuration = (rawDuration / 1000).toFixed(3).replace('.', ',')

            if (rawDuration === Math.min(...magellanHighScore) && magellanHighScore.length > 1) {
              handlePupitreMessage({
                type: 'newLine',
                content: `la souris ${args.p.order} a établi un nouveau record du monde de circumnavigation en ${legibleDuration} secondes.`,
              })
              return
            }
            handlePupitreMessage({
              type: 'newLine',
              content: `une souris a fait le tour du monde en ${legibleDuration} secondes.`,
            })
          }
        } else {
          console.log(`Pointer has already touched ${args.corner} corner.`)
        }
        break

      default:
        break
    }
  } else {
    console.log("we're not observing ", what)
  }
}
