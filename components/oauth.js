var fs = require('fs')
var path = require('path')
var express = require('express')
var https = require('https')
var dotenv = require('dotenv')
var opn = require('opn')
var common = require('./common')
var logger = require('./logger')
var constants = require('./constants')

// Constants env file
const ENV_FILE = path.join(__dirname, '../.env')

// Constants protocol
const HTTPS_PORT = 8443
const HTTPS_HOST = '0.0.0.0'
const BASE = `https://${HTTPS_HOST}:${HTTPS_PORT}/`

module.exports = (fb, emitter) => {
  if (!fs.existsSync(ENV_FILE)) {
    logger.info('Please initialize .env before perform authenticate.')
    return
  }
  // Load all env variable
  dotenv.config()

  fb.options({
    version: 'v3.1',
    appId: common.env('APP_ID'),
    appSecret: common.env('APP_SECRET')
  })

  // SSL certs
  let key = fs.readFileSync('certs/domain.key')
  let cert = fs.readFileSync('certs/domain.crt')
  let options = {
    key: key,
    cert: cert
  }

  // Create https server wrap express
  let app = express()
  let server = https.createServer(options, app)
  server.listen(HTTPS_PORT, HTTPS_HOST)

  // Define home routing
  app.get('/', async (req, res) => {
    // We don't have a code yet so we'll redirect to the oauth dialog
    if (!req.query.code) {
      let oauthUrl = fb.getLoginUrl({
        scope: 'user_posts,user_videos,user_photos',
        redirect_uri: BASE
      })
      if (!req.query.error) {
        res.redirect(oauthUrl)
      } else {
        res.send('Access denied')
      }
    } else { // If this branch executes user is already being redirected back with code (whatever that is)
      logger.info('Oauth successful')
      // Exchange code for access token
      fb.api('oauth/access_token', {
        client_id: common.env('APP_ID'),
        client_secret: common.env('APP_SECRET'),
        redirect_uri: BASE,
        code: req.query.code
      }, (response) => {
        if (!response || response.error) {
          logger.error(response.error)
          res.send('Have error when exchange code for access token')
        }
        let accessToken = response.access_token
        let expires = response.expires ? response.expires : 0
        emitter.emit(constants.EVENT_RECEIVE_ACCESS_TOKEN, accessToken, expires)
        res.send('User is successfully authenticated')
      })
    }
  })
  emitter.on(constants.EVENT_CLOSE_SERVER, () => {
    server.close(() => process.exit())
  })

  logger.info(`Listening on ${BASE}`)
  logger.info(`[Oauth] If Browser is not automatically open > Go to the following link: \n${BASE}`)
  setTimeout(() => opn(BASE), 1000)
}
