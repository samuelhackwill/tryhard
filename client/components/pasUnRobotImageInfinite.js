import './pasUnRobotImageInfinite.html'

import { ReactiveDict } from 'meteor/reactive-dict'

Template.pasUnRobotImageInfinite.onCreated(function () {
  this.isRendered = new ReactiveVar(false)
  this.images = new ReactiveDict()
  this.imageKeys = []

  const promptHeight = 128
  const padding = 32 // (margins 4 + 4)
  const gap = 8 // gap-2 = 0.5rem = 8px

  // max-w-[90vw] max-h-[80vh]
  const vw = window.innerWidth * 0.9
  const vh = window.innerHeight * 0.8

  const imageSize = 140 // image size + margin/gap buffer

  const usableWidth = vw - padding
  const cols = Math.floor((usableWidth + gap) / (imageSize + gap))
  const usableHeight = vh - promptHeight - padding
  const rows = Math.floor((usableHeight + gap) / (imageSize + gap))
  const totalImages = cols * rows

  console.log(`ok, available space is ${usableHeight} = ${vh}vh - ${promptHeight} - ${padding}`)
  console.log(`ok we should be able to fit ${cols} cols and ${rows} rows in here`)
  console.log(`the total of images is ${totalImages}`)

  this.gridColumns = new ReactiveVar(cols)
  this.gridRows = new ReactiveVar(rows)

  const folders = ['basmati', 'arborio']
  const imagesPerFolder = 1499

  for (let i = 0; i < totalImages; i++) {
    const folder = folders[Math.floor(Math.random() * folders.length)]
    const imgId = Math.floor(Math.random() * imagesPerFolder) + 1
    const key = `img-${i}`

    this.images.set(key, {
      src: `/images/captchas/rice/${folder}/${imgId}.jpg`,
      isSelected: false,
      index: i,
    })

    this.imageKeys.push(key)
  }
})
Template.pasUnRobotImageInfinite.onRendered(function () {
  console.log('hoho')
  console.log(this.imageKeys)
  setTimeout(() => {
    console.log(this.isRendered.get())
    this.isRendered.set(true)
  }, 50)
})

export const ImgCapInfinite = function (message) {
  const prompt = message.args[0]
  const type = message.args[1]
  const number = message.args[2]

  Blaze.renderWithData(
    Template.pasUnRobotImageInfinite,
    {
      type: 'infinite',
      captchaPrompt: prompt,
      path: type,
      winCondition: number,
    },
    document.getElementsByClassName('milieuContainer')[0],
  )
}

Template.pasUnRobotImageInfinite.helpers({
  isRendered() {
    return Template.instance().isRendered.get()
  },
  isInfinite() {
    return Template.instance().data.type === 'ImgCapInfinite'
  },

  imageKeys() {
    return Template.instance().imageKeys
  },
  getImage(key) {
    return Template.instance().images.get(key)
  },
  gridColumns() {
    return Template.instance().gridColumns.get()
  },
  gridRows() {
    return Template.instance().gridRows.get()
  },
})

// if (type === 'ImgCapInfinite') {
//   if (images[index]._locked) return // Prevent double trigger
//   images[index]._locked = true
//   const el = event.currentTarget

//   // Let selection effect (scale + check) animate (~250ms)
//   setTimeout(() => {
//     const imgEl = el.querySelector('img')
//     if (imgEl) imgEl.classList.add('opacity-0', 'transition-opacity', 'duration-300')

//     // Replace image only after fade
//     setTimeout(() => {
//       const folders = ['basmati', 'arborio']
//       const imagesPerFolder = 1499
//       const folder = folders[Math.floor(Math.random() * folders.length)]
//       const imgId = Math.floor(Math.random() * imagesPerFolder) + 1

//       images[index] = {
//         src: `/images/captchas/rice/${folder}/${imgId}.jpg?v=${Date.now()}`,
//         isSelected: false,
//         index,
//       }

//       instance.images.set([...images])
//     }, 300) // Wait for fade
//   }, 250) // Let check animation finish
// }
