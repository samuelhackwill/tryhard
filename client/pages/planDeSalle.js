import { Template } from 'meteor/templating'
import { ReactiveVar } from 'meteor/reactive-var'
import { SalleLayout, disabledMice, mouseOrder } from '../../both/api.js'
import { streamer } from '../../both/streamer.js'
import { getMouseBrand } from './show.js'
import './planDeSalle.html'

Template.planDeSalle.onCreated(function () {
  this.connectedDevices = new ReactiveVar([]) // Initialisation
  this.index = new ReactiveVar(0)
  this.lastRow = new ReactiveVar(5)
  const self = this

  streamer.on('pupitreAction', function (message) {
    const _message = message
    _message.planInstance = self
    handlePupitreAction(_message)
  })

  self.autorun(() => {
    this.subscribe('salleLayout')
    this.subscribe('disabledMice')
    this.subscribe('mouseOrder')

    Meteor.setInterval(() => {
      setTimeout(() => {
        Meteor.call('getConnectedDevices', (err, res) => {
          if (err) {
            alert(err)
            document.getElementById('rasp_update_status').innerText =
              'there was an error during the mouse count :x'
          } else {
            if (!res || res.length < 1) {
              document.getElementById('rasp_update_status').innerText = 'no mice found!'
              self.connectedDevices.set('')
            } else {
              // ✅ Ajout d’un _id basé sur name
              const enrichedRes = res.map((entry) => ({
                ...entry,
                _id: entry.name,
              }))

              // console.log(enrichedRes)

              const totalMice = enrichedRes.reduce(
                (acc, entry) => acc + (entry.mice?.length || 0),
                0,
              )
              const activeMice = totalMice - disabledMice.find({}).fetch().length

              document.getElementById('rasp_update_status').innerText = `rasps polled!`
              document.getElementById(
                'rasp_update_count',
              ).innerText = `total of ${activeMice} active mice out of ${totalMice} mice connected.`

              self.connectedDevices.set(enrichedRes)
            }
          }
        })
      }, 250)
    }, 2000)
  })
})

Template.planDeSalle.onRendered(function () {
  const instance = this

  function initDragDrop() {
    const layout = SalleLayout.findOne()
    if (!layout) return

    // === INVENTORY DROPZONE ===
    const inventoryDropzone = document.getElementById('inventory-dropzone')

    if (inventoryDropzone && inventoryDropzone.dataset.processed !== 'true') {
      inventoryDropzone.addEventListener('dragover', (e) => {
        e.preventDefault()
      })

      inventoryDropzone.addEventListener('drop', (e) => {
        e.preventDefault()
        const deviceId = e.dataTransfer.getData('text/plain')
        //console.log('[DROP] Device dropped in INVENTORY →', deviceId)
        if (!deviceId) return

        const currentLayout = SalleLayout.findOne()
        if (!currentLayout) return

        // Retire le périphérique de toutes les cellules (→ retour inventaire)
        const newCells = currentLayout.cells.filter((cell) => cell.deviceId !== deviceId)

        SalleLayout.update(currentLayout._id, { $set: { cells: newCells } }, (err) => {
          if (err) console.error('[DROP INVENTORY] Update failed:', err)
          //console.log('[DROP INVENTORY] Device moved back to inventory')
        })
      })

      inventoryDropzone.dataset.processed = 'true'
    }

    const dropzones = instance.findAll('.dropzone')
    //console.log('[initDragDrop] Zones de drop détectées :', dropzones.length)

    dropzones.forEach((zone) => {
      // ✅ N'attacher les events qu'une seule fois
      if (zone.dataset.processed === 'true') return

      zone.addEventListener('dragover', (e) => e.preventDefault())

      zone.addEventListener('drop', (e) => {
        e.preventDefault()

        const deviceId = e.dataTransfer.getData('text/plain')
        const row = parseInt(zone.getAttribute('data-row'))
        const col = parseInt(zone.getAttribute('data-col'))

        //console.log('[DROP] DROP → deviceId:', deviceId, '→ row:', row, 'col:', col)
        if (!deviceId) return

        // ✅ Ne PAS utiliser layout.cells du début !
        const currentLayout = SalleLayout.findOne()
        if (!currentLayout) return

        // ✅ Toujours travailler avec la version actuelle des cells
        let newCells = currentLayout.cells.filter((cell) => cell.deviceId !== deviceId)
        newCells.push({ row, col, deviceId })

        //console.log('[DROP] New Cells:', newCells)

        SalleLayout.update(currentLayout._id, { $set: { cells: newCells } }, (err) => {
          if (err) {
            // console.error('[DROP] Update failed:', err)
          } else {
            //console.log('[DROP] Update successful.')
          }
        })
      })

      // ✅ Marquer cette zone comme "traitée"
      zone.dataset.processed = 'true'
    })

    const dragBlocks = instance.findAll('.drag-block')
    //console.log('[initDragDrop] Blocs draggables détectés :', dragBlocks.length)

    dragBlocks.forEach((block) => {
      if (block.dataset.processed === 'true') return

      const id = block.getAttribute('data-id')
      block.addEventListener('dragstart', (e) => {
        //console.log('[DRAG] dragstart pour', id)
        e.dataTransfer.setData('text/plain', id)
      })

      block.dataset.processed = 'true'
    })
  }

  // ✅ Force un flush complet + DOM delay
  instance.autorun(() => {
    instance.connectedDevices.get() // reactive trigger
    SalleLayout.findOne() // ← TRÈS IMPORTANT : ajoute ceci !
    Tracker.afterFlush(() => {
      setTimeout(() => {
        //console.log('[autorun → setTimeout] DOM mis à jour → initDragDrop')
        initDragDrop()
      }, 50)
    })
  })
})

Template.planDeSalle.helpers({
  getLastRow() {
    return Template.instance().lastRow.get()
  },
  // getMaxRows() {
  //   const currentLayout = SalleLayout.findOne()
  //   return currentLayout.rows
  // },
  getMouseOrder(mouseId) {
    const entry = mouseOrder.findOne({ device: mouseId })
    return entry?.order || ''
  },
  mouseSlotNumbers(row, col) {
    const layout = SalleLayout.findOne()
    if (!layout || !layout.cells) return []

    const devices = Template.instance().connectedDevices.get()
    if (!devices || devices === '') return []

    const disabled = disabledMice.find({}).fetch()
    const disabledSet = new Set(disabled.map((item) => `${item.rasp}_${item.brand}`))

    const rows = layout.rows
    const cols = layout.columns

    // Step 1: Build zigzag order of cells (bottom row right-to-left, then alternate)
    const orderedCells = []
    for (let r = rows - 1; r >= 0; r--) {
      const rowCells = []
      for (let c = 0; c < cols; c++) {
        rowCells.push({ row: r, col: c })
      }
      const rowFromBottom = rows - 1 - r
      if (rowFromBottom % 2 === 0) {
        rowCells.reverse() // Even index from bottom → right to left
      }
      orderedCells.push(...rowCells)
    }

    // console.log(orderedCells)
    let currentNumber = 1

    const cellSlotMap = {} // key = "row_col" → [ { number, mouseId } | '' ]

    // Prebuild full slot map before returning one cell's values
    orderedCells.forEach((cell) => {
      const assignment = layout.cells.find((c) => c.row === cell.row && c.col === cell.col)
      if (!assignment) {
        cellSlotMap[`${cell.row}_${cell.col}`] = ['', '', '', '']
        return
      }

      const device = devices?.find((d) => d.name === assignment.deviceId)
      if (!device || !device.mice) {
        cellSlotMap[`${cell.row}_${cell.col}`] = ['', '', '', '']
        return
      }

      const slots = []
      device.mice.forEach((mouseBrand) => {
        const fullKey = `${device.name}_${mouseBrand}`
        if (disabledSet.has(fullKey)) {
          slots.push('')
        } else {
          slots.push({ number: currentNumber++, mouseId: fullKey })
        }
      })

      while (slots.length < 4) {
        slots.push('')
      }

      cellSlotMap[`${cell.row}_${cell.col}`] = slots
    })

    return cellSlotMap[`${row}_${col}`] || ['', '', '', '']
  },
  gridColumns() {
    const layout = SalleLayout.findOne()
    return layout?.columns || 4
  },

  gridCells() {
    const layout = SalleLayout.findOne()
    const cells = []
    if (!layout) return cells
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.columns; c++) {
        cells.push({ row: r, col: c })
      }
    }
    return cells
  },

  deviceInCell(row, col) {
    const layout = SalleLayout.findOne()
    const assignment = layout?.cells?.find((cell) => cell.row === row && cell.col === col)
    if (!assignment) return null

    const devices = Template.instance().connectedDevices.get()
    return devices.find((d) => d._id === assignment.deviceId)
  },

  unassignedDevices() {
    const layout = SalleLayout.findOne()
    const assignedIds = layout?.cells?.map((cell) => cell.deviceId) || []

    const devices = Template.instance().connectedDevices.get()
    return devices.filter((d) => !assignedIds.includes(d._id))
  },
})

Template.deviceBlock.helpers({
  isChecked(_rasp) {
    console.log(_rasp, getMouseBrand(String(this)))
    // console.log(disabledMice.find({ rasp: _rasp, brand: String(this) }).fetch().length == 0)
    if (
      disabledMice.find({ rasp: _rasp, brand: getMouseBrand(String(this)) }).fetch().length == 0
    ) {
      return 'checked'
    }
    return 'unchecked'
  },
  isAssigned(deviceName) {
    const layout = SalleLayout.findOne()
    if (!layout) return false
    return layout.cells.some((cell) => cell.deviceId === deviceName)
  },
})

Template.planDeSalle.events({
  'click #flash'() {
    Meteor.call('eraseEveryDb')
  },
  'click #add-row'() {
    const layout = SalleLayout.findOne()
    if (layout) {
      SalleLayout.update(layout._id, { $inc: { rows: 1 } })
    }
  },
  'click #remove-row'() {
    const layout = SalleLayout.findOne()
    if (layout && layout.rows > 1) {
      const removedRow = layout.rows - 1
      const updatedCells = layout.cells.filter((cell) => cell.row !== removedRow)
      SalleLayout.update(layout._id, {
        $set: { rows: removedRow, cells: updatedCells },
      })
    }
  },
  'click #add-col'() {
    const layout = SalleLayout.findOne()
    if (layout) {
      SalleLayout.update(layout._id, { $inc: { columns: 1 } })
    }
  },
  'click #remove-col'() {
    const layout = SalleLayout.findOne()
    if (layout && layout.columns > 1) {
      const removedCol = layout.columns - 1
      const updatedCells = layout.cells.filter((cell) => cell.col !== removedCol)
      SalleLayout.update(layout._id, {
        $set: { columns: removedCol, cells: updatedCells },
      })
    }
  },
  'input #lastRow'(event) {
    Template.instance.lastRow.set(parseInt(event.target.value, 10))
  },
  'input .mouse-order-input'(event) {
    const mouseId = event.target.dataset.mouseid
    const newOrder = parseInt(event.target.value, 10)

    const dataLastRow = event.target.dataset.maxrow
    const lastRow = parseInt(dataLastRow, 10)

    const dataCurrentRow = event.target.dataset.row
    const row = parseInt(dataCurrentRow, 10) + 1 // coucou les amis on est obligé de faire un ti plus 1 ici parce que la data est structurée comme ça dans la db. on utilise length pour décider du nombr ede cols mais par contre col 0 est la première colone, etc. lulz

    console.log(event.target)

    if (!isNaN(newOrder) || !isNaN(lastRow) || !isNaN(row)) {
      Meteor.call(
        'updateMouseOrder',
        { device: mouseId, order: newOrder, gradin: row, dernierGradin: lastRow },
        (err, res) => {
          if (err) {
            console.error('Failed to update mouse order:', err)
          } else {
            console.log(
              `Updated ${mouseId} to order ${newOrder}, row ${row} and last row ${lastRow}`,
            )
          }
        },
      )
    }
  },
})

Template.deviceBlock.events({
  'click .mouseToggle'(e, t) {
    // quand un siege reste vide, on veut pouvoir désactiver la souris pour qu'elle ne soit jamais prise en compte pendant le spectacle.
    let _on = false

    if (e.target.checked) {
      console.log('activate mouse :', e.target.dataset.rasp + '_' + e.target.dataset.brand)
      // ça, ça veut dire qu'il faut lever l'interdiction de créer un pointeur en cas de mouvement de souris.
      _on = true
    } else {
      console.log('deactivate mouse :', e.target.dataset.rasp + '_' + e.target.dataset.brand)
      // HUM! ça, ça veut dire deux choses:
      // si il y a des mouvements parasite (dossier qui bouge ou quoi), ça ne doit pas faire apparaître de souris désactivée.
      // si il y a déjà un pointeur parce que y'a eu des mouvements parasites pendant l'entrée public, il faut le détruire.
    }
    Meteor.call('toggleMouse', {
      on: _on,
      rasp: e.target.dataset.rasp,
      brand: getMouseBrand(e.target.dataset.brand),
      dirtybrand: e.target.dataset.brand,
    })
  },
})

const handlePupitreAction = function (message) {
  switch (message.content) {
    case 'reqNextPlayer':
      {
        console.log('recieved reqNextPlayer from pupitre', message)
        let _index = message.planInstance.index.get()
        const highest = mouseOrder.findOne({}, { sort: { order: -1 } })
        const maxIndex = highest?.order || 0

        // if index WAS >= the max number of collection, go back to one
        if (_index >= maxIndex) {
          _index = 1
        } else {
          _index = _index + 1
        }

        const chosenOne = mouseOrder.findOne({ order: _index })

        message.planInstance.index.set(_index)
        streamer.emit('planDeSalleMessage', {
          type: 'nextPlayerIs',
          content: chosenOne,
          context: message.args,
        })
      }
      break
    case 'reqNextMultiplePlayers':
      console.log('recieved reqNextMultiplePlayers from pupitre', message)

      // what would be nice is to just loop through this with a short delay and send new players on the battlefiled.
      let howManyPlayers = message.args.players || 1
      let _loopindex = 0

      const getNextPlayer = function () {
        let _index = message.planInstance.index.get()
        const highest = mouseOrder.findOne({}, { sort: { order: -1 } })
        const maxIndex = highest?.order || 0

        // if index WAS >= the max number of collection, go back to one
        if (_index >= maxIndex) {
          _index = 1
        } else {
          _index = _index + 1
        }

        const chosenOne = mouseOrder.findOne({ order: _index })

        message.planInstance.index.set(_index)

        streamer.emit('planDeSalleMessage', {
          type: 'nextPlayerIs',
          content: chosenOne,
          context: message.args,
        })
      }

      let proutos = Meteor.setInterval(function () {
        _loopindex++
        if (_loopindex >= howManyPlayers) {
          clearInterval(proutos)
          return
        } else {
          getNextPlayer()
        }
      }, 1000)

      getNextPlayer()
      break
  }
}
