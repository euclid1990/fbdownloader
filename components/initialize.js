var fs = require('fs')
var path = require('path')
var dotenv = require('dotenv')
var inquirer = require('inquirer')
var oauth = require('./oauth')
var logger = require('./logger')
var constants = require('./constants')

// Constants env file
const ENCODING = 'utf-8'
const ENV_FILE = path.join(__dirname, '../.env')
const ENV_EXAMPLE = path.join(__dirname, '../.env.example')

function createQuestions () {
  let configs = dotenv.parse(fs.readFileSync(ENV_EXAMPLE, { encoding: ENCODING }))
  let questions = []
  for (var key of Object.keys(configs)) {
    questions.push({
      type: 'input',
      name: key,
      message: `${key}: `,
      default: configs[key]
    })
  }
  return questions
}

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
  if (fs.existsSync(ENV_FILE)) {
    logger.info('Unable to override existing .env.')
    return
  }

  logger.info('Please enter value for generating .env.')
  let questions = createQuestions()
  inquirer.prompt(questions).then((answers) => {
    let content = createEnvContent(answers)
    fs.writeFileSync(ENV_FILE, content)
    logger.info('Created .env!')
    logger.info(`\n+------------------+\n${content}\n+------------------+`)
    oauth(fb, emitter)
    emitter.on(constants.EVENT_RECEIVE_ACCESS_TOKEN, (accessToken, expires) => {
      let newContent = addAccessTokenToEnvObj(accessToken, expires)
      fs.writeFileSync(ENV_FILE, createEnvContent(newContent))
      emitter.emit(constants.EVENT_CLOSE_SERVER)
    })
  })
}
