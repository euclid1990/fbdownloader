var _ = require('lodash')
var util = require('util')
var url = require('url')
var querystring = require('querystring')
var pretty = require('prettysize')
var path = require('path')
var mkdirp = require('mkdirp')
var mkdirpPromisify = util.promisify(mkdirp)
var rimraf = require('rimraf')
var fs = require('fs')
var request = require('request')
var ProgressBar = require('./progress')
var logger = require('./logger')

const ENV_FILE = path.join(__dirname, '../.env')

function env (e, d = '') {
  if (typeof process.env[e] === 'undefined' || process.env[e] === '') return d
  return process.env[e]
}

function shortenStr (str, maxLen = 30) {
  let trimStr = str.substr(0, maxLen)
  return trimStr.substr(0, _.min([trimStr.length, _.max([trimStr.lastIndexOf(' '), trimStr.lastIndexOf('　')])]))
}

function makeFileName (id, title, source) {
  let ext = path.extname(url.parse(source).pathname)
  let name = `${id}`
  if (title !== '') {
    name = _.snakeCase(path.basename(`${name}_${title}`))
  }
  return `${name}${ext}`
}

function makeDir (path) {
  return mkdirpPromisify(path).then((stats) => {
    return true
  }).catch((error) => {
    logger.error(error)
    return false
  })
}

function clearDir (path) {
  rimraf.sync(path + '/*', {})
}

function uniqueById (arr) {
  return _.uniqBy(arr, (e) => {
    return e.id
  })
}

function filterById (arr, ids) {
  return _.filter(arr, (e) => {
    return _.indexOf(ids, e.id) >= 0
  })
}

function splitToChunk (arr, size = 10) {
  return _.chunk(arr, size)
}

async function graphApi (fb, endpoint, params, after = '') {
  let res = null
  if (after !== '') {
    params = _.assign(params, { after: after })
  }
  params = querystring.stringify(params)
  try {
    res = await fb.api('', 'post', { batch: [{ relative_url: `${endpoint}?${params}` }] })
    if (!res || res.error) {
      logger.error(`${res.error.message}`)
      throw new Error(res.error.message)
    }
  } catch (error) {
    throw new Error(error)
  }
  res = JSON.parse(res[0].body)
  if (res.error) {
    logger.error(`${res.error.message}`)
    throw new Error(res.error.message)
  }
  return res
}

async function graphApiWalk (fb, endpoint, params) {
  let data = []
  let after = ''
  let maxDepth = 100
  let depth = 0
  do {
    depth++
    let response = await graphApi(fb, endpoint, params, after)
    data = _.concat(data, response.data)
    after = ''
    if (_.has(response, 'paging.next') && _.has(response, 'paging.cursors.after')) {
      after = response.paging.cursors.after
    }
    if (depth === maxDepth) {
      break
    }
  } while (after !== '')
  return data
}

function download (remoteUrl, localFile, redirectCount) {
  let fileName = path.basename(localFile)
  let ready = false
  let writeStream
  let tokens = {}
  let bar
  let size
  let downloadedBytes = 0
  let content = {
    length: 0,
    type: ''
  }
  if (redirectCount > 1) {
    logger.error(new Error(`[${fileName}]: Too many redirects while start downloading`))
    return
  }
  return new Promise((resolve, reject) => {
    const req = request({
      method: 'GET',
      uri: remoteUrl,
      timeout: 3600000,
      gzip: true
    },
    (error, response, body) => {
      if (error) {
        logger.error(error)
        reject(error)
      }
    }).on('response', (response) => {
      switch (response.statusCode) {
        case 200:
          if (!ready) {
            content.type = response.headers['content-type']
            content.length = parseInt(response.headers['content-length'], 10)
            size = pretty(content.length)
          }
          break
        case 302:
          let newRemoteUrl = response.headers.location
          download(newRemoteUrl, localFile, redirectCount + 1)
          return
        case 404:
          logger.error(new Error(`[${fileName}]: File not found`))
          return
        default:
          req.abort()
      }
    }).on('data', (chunk) => {
      if (!ready) {
        writeStream = fs.createWriteStream(localFile)
        bar = new ProgressBar({
          schema: ' :done [:bar] :current/:total :percent :elapseds' + ` | [${fileName} ${size}]`,
          total: content.length,
          width: 30,
          filled: '=',
          blank: ' '
        })
        ready = true
      }
      downloadedBytes += chunk.length
      writeStream.write(chunk)
      bar.tick(chunk.length, tokens)
    }).on('error', function (error) {
      logger.error(new Error(`[${remoteUrl}]: URL not found`))
      logger.error(error)
      reject(error)
    }).on('end', function () {
      writeStream.end()
      logger.debug(`[${fileName} ${size}] has been downloaded`)
      resolve({ name: fileName, size: size })
    })
  })
}

function nomarlizeVietnamese (str) {
  if (typeof str !== 'string') return ''
  str = str.replace(/(á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ)/g, 'a')
  str = str.replace(/(A|À|Ả|Ã|Ạ|Ă|Ắ|Ằ|Ẳ|Ẵ|Ặ|Â|Ấ|Ầ|Ẩ|Ẫ|Ậ)/g, 'A')
  str = str.replace(/đ/g, 'd')
  str = str.replace(/Đ/g, 'D')
  str = str.replace(/(é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ)/g, 'e')
  str = str.replace(/(É|È|Ẻ|Ẽ|Ẹ|Ê|Ế|Ề|Ể|Ễ|Ệ)/g, 'E')
  str = str.replace(/(í|ì|ỉ|ĩ|ị)/g, 'i')
  str = str.replace(/(Í|Ì|Ỉ|Ĩ|Ị)/g, 'I')
  str = str.replace(/(ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ)/g, 'o')
  str = str.replace(/(Ó|Ò|Ỏ|Õ|Ọ|Ô|Ố|Ồ|Ổ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ở|Ỡ|Ợ)/g, 'O')
  str = str.replace(/(ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự)/g, 'u')
  str = str.replace(/(Ú|Ù|Ủ|Ũ|Ụ|Ư|Ứ|Ừ|Ử|Ữ|Ự)/g, 'U')
  str = str.replace(/(ý|ỳ|ỷ|ỹ|ỵ)/g, 'y')
  str = str.replace(/(Ý|Ỳ|Ỷ|Ỹ|Ỵ)/g, 'Y')
  return str
}

function terminateIfNotInit () {
  if (!fs.existsSync(ENV_FILE)) {
    logger.info('Please initialize .env before perform authenticate.')
    process.exit()
  }
}

module.exports = {
  env,
  shortenStr,
  makeFileName,
  makeDir,
  clearDir,
  uniqueById,
  filterById,
  splitToChunk,
  graphApi,
  graphApiWalk,
  download,
  nomarlizeVietnamese,
  terminateIfNotInit
}
