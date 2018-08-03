var _ = require('lodash')
var path = require('path')
var async = require('neo-async')
var constants = require('./constants')
var logger = require('./logger')
var common = require('./common')

async function getList (fb) {
  logger.info('Start getting videos from Facebook')
  let endpoint = 'me/videos'
  let params = { fields: 'id,title,description,source,created_time', type: 'uploaded', limit: 10 }
  let videos = await common.graphApiWalk(fb, endpoint, params)
  logger.info(`Retrieved ${videos.length} videos`)
  return videos
}

async function download (videos) {
  let dir = path.join(__dirname, '../', constants.DL_VIDEO_PATH)
  await common.makeDir(dir)
  common.clearDir(dir)
  let iterator = async function (video, done) {
    let title = _.isNil(video.title) ? (_.isNil(video.description) ? 'no_name' : video.description) : video.title
    title = common.nomarlizeVietnamese(title)
    title = common.shortenStr(title)
    let localFile = path.join(dir, common.makeFileName(video.id, title, video.source))
    let req = await common.download(video.source, localFile, 0)
    done()
  }
  async.eachLimit(videos, constants.DL_MAX_CONCURRENT, iterator, function (err, res) {
    if (err) {
      logger.error(err)
      return
    }
    logger.info('All videos have been downloaded successfully')
  })
}

module.exports = async (fb) => {
  common.terminateIfNotInit()
  let videos = await getList(fb)
  videos = common.uniqueById(videos)
  await download(videos)
}
