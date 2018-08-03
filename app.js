var inquirer = require('inquirer')
var eventEmitter = require('events')
var dotenv = require('dotenv').config()
var common = require('./components/common')
var constants = require('./components/constants')
var initialize = require('./components/initialize')
var authenticate = require('./components/authenticate')
var video = require('./components/video')

function createQuestions () {
  var questions = []
  questions.push({
    type: 'list',
    name: 'cmd',
    message: 'What do you want ?',
    choices: [
      constants.CMD_INITIALIZE,
      constants.CMD_AUTHENTICATE,
      constants.CMD_POST,
      constants.CMD_PHOTO,
      constants.CMD_VIDEO,
      constants.CMD_QUIT
    ]
  })
  return questions
}

const emitter = new eventEmitter()
var { Facebook } = require('fb')
var fb = new Facebook()
fb.setAccessToken(common.env('ACCESS_TOKEN'))

function main () {
  inquirer.prompt(createQuestions()).then(answers => {
    switch (answers.cmd) {
      case constants.CMD_INITIALIZE:
        initialize(fb, emitter)
        break
      case constants.CMD_AUTHENTICATE:
        authenticate(fb, emitter)
        break
      case constants.CMD_VIDEO:
        video(fb)
        break
      case constants.CMD_QUIT:
        process.exit()
    }
  })
}

main()
