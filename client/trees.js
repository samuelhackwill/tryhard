export const trees = [
    "🌲","🌳","🌴",
    "🌲","🌳","🌴",
    "🌲","🌳","🌴",
    "🌲","🌳","🌴",
    "🌲","🌳","🌴",
    "🌲","🌳","🌴",
    "🎄" //very rare!
]

export const getRandomTree = function() {
    return trees[Math.floor(Math.random() * trees.length)];
}