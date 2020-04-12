const random = (items) => {
    return items[Math.floor(Math.random() * items.length)];
}

module.exports = {
    random
}