var fs = require('fs')
var path = require('path')
var dotenv = require('dotenv')
var oauth = require('./oauth')
var logger = require('./logger')
var constants = require('./constants')

// Constants env file
const ENCODING = 'utf-8'
const ENV_FILE = path.join(__dirname, '../.env')

function createEnvContent (answers) {
  var content = ''
  for (var key of Object.keys(answers)) {
    content += `${key}=${answers[key]}\n`
  }
  return content.trim()
}

function addAccessTokenToEnvObj (accessToken, expires) {
  let configs = dotenv.parse(fs.readFileSync(ENV_FILE, { encoding: ENCODING }))
  configs = Object.assign({}, configs, { ACCESS_TOKEN: accessToken, EXPIRES: expires})
  return configs
}

module.exports = (fb, emitter) => {
  if (!fs.existsSync(ENV_FILE)) {
    logger.info('Please initialize .env before perform authenticate.')
    return
  }
  oauth(fb, emitter)
  emitter.on(constants.EVENT_RECEIVE_ACCESS_TOKEN, (accessToken, expires) => {
    let newContent = addAccessTokenToEnvObj(accessToken, expires)
    fs.writeFileSync(ENV_FILE, createEnvContent(newContent))
    emitter.emit(constants.EVENT_CLOSE_SERVER)
  })
}
