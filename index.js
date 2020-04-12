require('dotenv').config()
const app = require('./src/app')

const server = app.listen(process.env.port || 3000, () => {
    console.log(`API lancé sur http://127.0.0.1:${server.address().port}`)
})