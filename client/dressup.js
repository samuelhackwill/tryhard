//The dressing
export const accessories = [
    "🕶️",
    "🦺","👔","👕","👗","🩱","👚",
    "🩳",
    "🧦","🩴","👞","🥾","👠","👢",
    "🧤","👜","🎒",
    "👒","🎓","🧢"
]

//Return a random accessory
export const getRandomAccessory = function() {
    let pick = Math.floor(Math.random() * accessories.length)
    return accessories[pick]
}

export const getRandomBossAccessory = function() {
    let collection = ["👑","🎩", ...accessories]
    let pick = Math.floor(Math.random() * collection.length)
    return collection[pick]
}
