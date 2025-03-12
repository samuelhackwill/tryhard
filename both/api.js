import { Mongo } from 'meteor/mongo'

export const disabledMice = new Mongo.Collection('disabledMice')
export const SalleLayout = new Mongo.Collection('salleLayout')
export const mouseOrder = new Mongo.Collection('mouseOrder')

SalleLayout.allow({
  insert() {
    return true
  },

  update() {
    return true
  },
})

mouseOrder.allow({
  insert() {
    return true
  },

  update() {
    return true
  },

  remove() {
    return true
  },
})
