import './pasUnRobotImage.html'

Template.pasUnRobotImage.onCreated(function () {
  // console.log(this.data)
  this.gridColumns = new ReactiveVar(this.data.gridColumns) // Example default
  this.images = new ReactiveVar(this.data.images) // Array of {src, isSelected, index}
  this.isRendered = new ReactiveVar(false)
  // Example init (replace with real data)
  // const imgArray = Array.from({ length: 9 }).map((_, i) => ({
  //   src: `/images/captcha/image${i + 1}.jpg`,
  //   isSelected: false,
  //   index: i,
  // }))
  // this.images.set(imgArray)
})

Template.pasUnRobotImage.onRendered(function () {
  setTimeout(() => {
    this.isRendered.set(true)
  }, 50)
})

Template.pasUnRobotImage.helpers({
  images() {
    return Template.instance().images.get()
  },
  gridColumns() {
    return Template.instance().gridColumns.get()
  },
  isRendered() {
    return Template.instance().isRendered.get()
  },
})

Template.pasUnRobotImage.events({
  'mousedown .captcha-image'(event) {
    let index = event.currentTarget.dataset.index

    if (index === undefined) {
      console.log("this image isn't selectable because it doens't have a index")
      return
    }

    index = Number(index)

    const instance = Template.instance()
    const images = instance.images.get()

    images[index].isSelected = !images[index].isSelected
    instance.images.set([...images])
  },

  'mousedown #submitCaptchaButton'(event, instance) {
    // Do something with selected images
    const selected = instance.images.get().filter((img) => img.isSelected)
    // console.log('Selected images:', selected)

    const type = Template.instance().data.type

    if (selected.length === 0 && type != 'ImgCapNoSelect') {
      console.log('No image selected — cannot submit captcha.')
      return
    }

    // Start fade out
    instance.isRendered.set(false)

    setTimeout(() => {
      // Optionally trigger server validation or remove template
      Blaze.remove(Blaze.getView(instance.firstNode))
    }, 500) // Match transition duration
  },
})

export const ImgCapNoSelect = function (message) {
  const _gridColumns = 1
  const prompt = message.args[0]
  const path = message.args[1]
  const fileName = message.args[2]
  const _buttons = message.args.slice(3)
  let _images = []

  const obj = {}
  obj.src = `/images/captchas/${path}/${fileName}.png`
  _images.push(obj)

  Blaze.renderWithData(
    Template.pasUnRobotImage,
    {
      type: 'ImgCapNoSelect',
      gridColumns: _gridColumns,
      captchaPrompt: prompt,
      images: _images,
      buttons: _buttons,
    },
    document.getElementsByClassName('milieuContainer')[0],
  )
}

export const ImgCapOnlyOneSubmit = function (message) {
  const _gridColumns = 2
  const prompt = message.args[0]
  const gridType = message.args[1]
  const _buttons = message.args.slice(2)
  let _images = []

  switch (gridType) {
    case 'duoGrid1':
      for (let i = 0; i < 2; i++) {
        const obj = {}
        obj.index = i
        if (i == 0) {
          obj.src = `/images/captchas/samcontan/1.png`
        }
        if (i == 1) {
          obj.src = `/images/captchas/drawings/0.png`
        }
        _images.push(obj)
      }
      break
    case 'duoGrid2':
      for (let i = 0; i < 2; i++) {
        const obj = {}
        obj.index = i
        if (i == 0) {
          obj.src = `/images/captchas/samcontan/1.png`
        }
        if (i == 1) {
          obj.src = `/images/captchas/misc/1.png`
        }
        _images.push(obj)
      }
      break
  }
  Blaze.renderWithData(
    Template.pasUnRobotImage,
    {
      type: 'ImgCapOnlyOneSubmit',
      gridColumns: _gridColumns,
      captchaPrompt: prompt,
      images: _images,
      buttons: _buttons,
    },
    document.getElementsByClassName('milieuContainer')[0],
  )
}

export const ImgCapGridSubmit = function (message) {
  console.log(message)
  // message[O] is prompt
  // message[1] is imageSet path
  // message[2] is optional modifier
  const prompt = message.args[0]
  const imageSetFolder = message.args[1]
  const gridType = message.args[2]
  const optionalModifier = message.args[3] || null
  let _images = []
  const _buttons = ['OK']

  const _gridColumns = 3

  switch (gridType) {
    case 'randomGrid':
      for (let i = 0; i < 9; i++) {
        const rand = Math.random() < 0.5 ? 1 : 2
        const obj = {}
        obj.src = `/images/captchas/${imageSetFolder}/${rand}.png`
        obj.isSelected = false
        obj.index = i
        switch (optionalModifier) {
          case 'rot':
            obj.customStyle = randomRot()
            break
          case 'zoom':
            obj.customStyle = randomZoom(3)
            break
          case 'zoomMAX':
            obj.src = `/images/captchas/${imageSetFolder}/sorted/${rand}.png`
            break
          case 'onlySam':
            obj.src = `/images/captchas/${imageSetFolder}/1.png`
            break
        }

        _images.push(obj)
      }

      break

    default:
      break
  }

  Blaze.renderWithData(
    Template.pasUnRobotImage,
    {
      type: 'ImgCapGridSubmit',
      gridColumns: _gridColumns,
      captchaPrompt: prompt,
      images: _images,
      buttons: _buttons,
    },
    document.getElementsByClassName('milieuContainer')[0],
  )
}

const randomRot = function () {
  const styles = [
    'transform: rotate(90deg);',
    'transform: rotate(180deg);',
    'transform: rotate(270deg);',
    'transform: rotate(360deg);',
    'transform: scaleX(-1);', // mirror X
    'transform: scaleY(-1);', // mirror Y
    '', // no style
  ]

  const randomIndex = Math.floor(Math.random() * styles.length)
  return styles[randomIndex]
}

const randomZoom = function (amount) {
  const originX = Math.floor(Math.random() * 101) // 0 to 100%
  const originY = Math.floor(Math.random() * 101) // 0 to 100%

  return `transform: scale(${amount}); transform-origin: ${originX}% ${originY}%;`
}
