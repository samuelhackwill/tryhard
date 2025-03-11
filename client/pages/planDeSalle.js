import { Template } from 'meteor/templating'
import { ReactiveVar } from 'meteor/reactive-var'
import { SalleLayout, disabledMice } from '../../both/api.js'

import './planDeSalle.html'

Template.planDeSalle.onCreated(function () {
  this.connectedDevices = new ReactiveVar([]) // Initialisation
  const self = this

  // Exemple : simulate load or fetch (remplace ceci par ta vraie source)
  self.autorun(() => {
    this.subscribe('salleLayout')
    this.subscribe('disabledMice')

    // Tu peux injecter ici les devices de manière réactive
    // const dummyDevices = [
    //   { _id: 'd1', name: 'th1'},
    //   { _id: 'd2', name: 'th2'},
    //   { _id: 'd3', name: 'th3'},
    // ]
    // self.connectedDevices.set(dummyDevices)
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
    }, 10000)
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
            console.error('[DROP] Update failed:', err)
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
  mouseSlotNumbers(row, col) {
    const layout = SalleLayout.findOne()
    if (!layout || !layout.cells) return []

    const devices = Template.instance().connectedDevices.get()
    if (!devices || devices === '') return []

    const disabled = disabledMice.find({}).fetch()
    const disabledSet = new Set(disabled.map((item) => `${item.rasp}_${item.brand}`))

    const rows = layout.rows
    const cols = layout.columns

    // Step 1: Build zigzag order of cells
    const orderedCells = []
    for (let r = rows - 1; r >= 0; r--) {
      const rowCells = []
      for (let c = 0; c < cols; c++) {
        rowCells.push({ row: r, col: c })
      }
      if ((rows - 1 - r) % 2 === 0) {
        // Even-indexed line from bottom → reverse row (right to left)
        rowCells.reverse()
      }
      orderedCells.push(...rowCells)
    }

    // Step 2: Assign mouse slot numbers preserving order and padding at disabled indices
    let currentNumber = 1
    const cellSlotMap = {} // key = "row_col" → [ { number, mouseId } | '' ]

    orderedCells.forEach((cell) => {
      const assignment = layout.cells.find((c) => c.row === cell.row && c.col === cell.col)
      if (!assignment) return

      const device = devices.find((d) => d.name === assignment.deviceId)
      if (!device || !device.mice) return

      const slots = []
      device.mice.forEach((mouseBrand) => {
        const fullKey = `${device.name}_${mouseBrand}`
        if (disabledSet.has(fullKey)) {
          slots.push('') // placeholder for disabled mouse
        } else {
          slots.push({ number: currentNumber++, mouseId: fullKey })
        }
      })

      // Ensure array length is always 4
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
    // console.log(disabledMice.find({ rasp: _rasp, brand: String(this) }).fetch().length == 0)
    if (disabledMice.find({ rasp: _rasp, brand: String(this) }).fetch().length == 0) {
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
      brand: e.target.dataset.brand,
    })
  },
})
