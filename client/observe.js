import { handlePupitreMessage } from './components/feed'

export let observing = []
const clickTimestampsMap = {}
const moveTimestampsMap = {}
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

        // Inside your handler:
        if (clickTimestampsMap[args]) {
          // Mouse has already clicked before → ignore
          return
        } else {
          // First time this mouse clicks → record and log message
          clickTimestampsMap[args] = Date.now()

          const clickCount = Object.keys(clickTimestampsMap).length
          const nieme = clickCount > 1 ? clickCount + 'e' : ''
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

        // Inside your handler:
        if (moveTimestampsMap[args]) {
          // Mouse has already moved before → just update timestamp
          moveTimestampsMap[args] = Date.now()
          return
        } else {
          // First time this mouse moves → initialize and log message
          moveTimestampsMap[args] = Date.now()

          const mouseCount = Object.keys(moveTimestampsMap).length
          const nieme = mouseCount > 1 ? mouseCount + 'e' : ''
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
