var path = require('path')

const { createLogger, format, transports } = require('winston')
const { combine, timestamp, printf } = format

//
const level = 'info'
const LOG_DIR = path.join(__dirname, '../logs')

const enumerateErrorFormat = format(info => {
  if (info.message instanceof Error) {
    info.message = Object.assign({
      message: info.message.message,
      stack: info.message.stack
    }, info.message)
  }
  if (info instanceof Error) {
    return Object.assign({
      message: info.message,
      stack: info.stack
    }, info)
  }
  return info
})

const myFormat = printf(info => {
  const { timestamp, level, message, ...args } = info
  const ts = timestamp.slice(0, 19).replace('T', ' ')
  return `${ts} [${level}]: ${message}`
})

const logger = createLogger({
  level: level,
  format: combine(
    timestamp(),
    enumerateErrorFormat(),
    myFormat
  ),
  transports: [
    // Write log to the console output with color
    new transports.Console({ format: combine(format.colorize(), myFormat) }),
    // Write all logs error (and below) to `error.log`.
    new transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' }),
    // Write to all logs with declared const level and below to `combined.log`
    new transports.File({ filename: path.join(LOG_DIR, 'combined.log') })
  ]
})

module.exports = logger
