import { Mongo } from 'meteor/mongo'

export const disabledMice = new Mongo.Collection('disabledMice')
export const SalleLayout = new Mongo.Collection('salleLayout')

SalleLayout.allow({
  insert() {
    return true
  },

  update() {
    return true
  },
})
