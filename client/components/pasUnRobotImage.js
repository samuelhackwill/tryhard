import './pasUnRobotImage.html'

Template.pasUnRobotImage.onCreated(function () {
  // console.log(this.data)
  this.gridColumns = new ReactiveVar(this.data.gridColumns) // Example default
  this.images = new ReactiveVar(this.data.images) // Array of {src, isSelected, index}
  this.isFadingOut = new ReactiveVar(false)

  // Example init (replace with real data)
  // const imgArray = Array.from({ length: 9 }).map((_, i) => ({
  //   src: `/images/captcha/image${i + 1}.jpg`,
  //   isSelected: false,
  //   index: i,
  // }))
  // this.images.set(imgArray)
})

Template.pasUnRobotImage.helpers({
  images() {
    return Template.instance().images.get()
  },
  gridColumns() {
    return Template.instance().gridColumns.get()
  },
  isFadingOut() {
    return Template.instance().isFadingOut.get()
  },
})

Template.pasUnRobotImage.events({
  'mousedown .captcha-image'(event) {
    console.log('PROUTOS')
    const index = Number(event.currentTarget.dataset.index)
    const instance = Template.instance()
    const images = instance.images.get()

    images[index].isSelected = !images[index].isSelected
    instance.images.set([...images])
  },

  'mousedown #submitCaptchaButton'(event, instance) {
    // Do something with selected images
    const selected = instance.images.get().filter((img) => img.isSelected)
    console.log('Selected images:', selected)

    // Start fade out
    instance.isFadingOut.set(true)

    setTimeout(() => {
      // Optionally trigger server validation or remove template
      Blaze.remove(Blaze.getView(instance.firstNode))
    }, 500) // Match transition duration
  },
})

export const newCaptchaImage = function (message) {
  console.log(message)
  // message[O] is prompt
  // message[1] is imageSet path
  // message[2] is optional modifier
  const prompt = message.args[0]
  const imageSetFolder = message.args[1]
  const optionalModifier = message.args[2] || null
  let _images = []

  switch (optionalModifier) {
    case 'randomGrid':
      for (let i = 0; i < 9; i++) {
        const rand = Math.random() < 0.5 ? 1 : 2
        const obj = {}
        obj.src = `/images/captchas/${imageSetFolder}/${rand}.png`
        obj.isSelected = false
        obj.index = i
        _images.push(obj)
      }

      break

    default:
      break
  }

  Blaze.renderWithData(
    Template.pasUnRobotImage,
    {
      gridColumns: 3,
      captchaPrompt: prompt,
      images: _images,
    },
    document.getElementsByClassName('milieuContainer')[0],
  )
}
