import './pasUnRobotImageInfinite.html'

import { streamer } from '../../both/streamer.js'
import { ReactiveDict } from 'meteor/reactive-dict'

Template.pasUnRobotImageInfinite.onCreated(function () {
  this._pupitreHandler = (message) => {
    message.context = this
    handlePupitreAction(message)
  }

  streamer.on('pupitreAction', this._pupitreHandler)

  this.isRendered = new ReactiveVar(false)
  this.images = new ReactiveDict()
  this.imageKeys = []

  const promptHeight = 110
  const padding = 32 // (margins 4 + 4)
  const gap = 4 // gap-2 = 0.5rem = 8px

  // max-w-[90vw] max-h-[80vh]
  const vw = window.innerWidth * 0.9
  const vh = window.innerHeight * 0.9

  const imageSize = 70 // image size + margin/gap buffer

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

Template.pasUnRobotImageInfinite.events({
  'mousedown .captcha-image'(event, instance) {
    const index = Number(event.currentTarget.dataset.index)
    const key = `img-${index}`
    const image = instance.images.get(key)

    if (!image || image._locked) return

    // Lock the image to prevent double clicks
    image._locked = true
    image.isSelected = true
    instance.images.set(key, { ...image })

    const el = event.currentTarget

    // Let selection animation play (~250ms)
    setTimeout(() => {
      const imgEl = el.querySelector('img')
      if (imgEl) imgEl.classList.add('opacity-0')

      // After fade, replace the image
      setTimeout(() => {
        const folders = ['basmati', 'arborio']
        const imagesPerFolder = 1499
        const folder = folders[Math.floor(Math.random() * folders.length)]
        const imgId = Math.floor(Math.random() * imagesPerFolder) + 1

        instance.images.set(key, {
          src: `/images/captchas/rice/${folder}/${imgId}.jpg?v=${Date.now()}`,
          isSelected: false,
          index,
        })
        console.log(imgEl)
        if (imgEl) imgEl.classList.remove('opacity-0')

        // After replacing the clicked image
        const allKeys = instance.imageKeys
        const allImages = allKeys.map((k) => instance.images.get(k))
        const hasArborio = allImages.some((img) => img.src.includes('/arborio/'))

        if (!hasArborio) {
          console.log('No more arborio left — regenerating grid')

          const folders = ['basmati', 'arborio']
          const imagesPerFolder = 1499

          for (let i = 0; i < allKeys.length; i++) {
            const key = allKeys[i]
            const folder = folders[Math.floor(Math.random() * folders.length)]
            const imgId = Math.floor(Math.random() * imagesPerFolder) + 1

            instance.images.set(key, {
              src: `/images/captchas/rice/${folder}/${imgId}.jpg?v=${Date.now()}`,
              isSelected: false,
              index: i,
            })
          }
        }
      }, 300)
    }, 300)
  },
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

const handlePupitreAction = function (message) {
  // message.context contains the original template which was bound to the streamer. Hm i wonder what will happen when we have several templates of captcha in the same page.
  switch (message.content) {
    case 'killCaptchas':
      console.log('kill catpcahs', message.context)
      // hum that's an edge case, but if we launch a captcha by mistake, kill it immediately, and then launch another one, then that captcha will be eliminated by the old one's settimeout. So yeah we need to clear these timeouts. nice!
      // unchoosePlayer()

      // removeTimeouts(message.context)
      // well, now that we have a scenario where several captchas exist in the same
      // screen, maybe we need a more graceful way of hiding
      // everyone. We would need to access to each template's reactive data context
      // and switch this.rendered.set(false).
      const element = document.getElementById('pasUnRobotInfinite')

      if (element) {
        element.style.opacity = 0
      }

      // well, this won't remove multiple layered img captcha if
      // we missclick
      const viewAtCall = message.context.view

      Meteor.setTimeout(function () {
        Blaze.remove(viewAtCall)
      }, 1000)

      break
  }
}
