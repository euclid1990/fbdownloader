var _ = require('lodash')
var path = require('path')
var async = require('neo-async')
var constants = require('./constants')
var logger = require('./logger')
var common = require('./common')

async function getListAlbum (fb) {
  logger.info('Start getting albums from Facebook')
  let endpoint = 'me/albums'
  let params = { fields: 'id,name,photo_count,created_time', limit: 50 }
  let albums = await common.graphApiWalk(fb, endpoint, params)
  logger.info(`Retrieved ${albums.length} albums`)
  return albums
}

async function getPhotoOfAlbum (fb, id) {
  let endpoint = `${id}/photos`
  let params = { fields: 'id,name,images,created_time', limit: 50 }
  let photos = await common.graphApiWalk(fb, endpoint, params)
  logger.info(`Retrieved ${photos.length} photos`)
  return photos
}

async function download (albumDir, photos) {
  let iterator = async (photo, done) => {
    let image = _.minBy(photo.images, (o) => {
      return o.height * o.width
    })
    let localFile = path.join(albumDir, common.makeFileName(photo.id, '', image.source))
    let req = await common.download(image.source, localFile, 0)
    done()
  }
  return new Promise((resolve, reject) => {
    async.eachLimit(photos, constants.DL_MAX_CONCURRENT, iterator, (err, res) => {
      if (err) {
        logger.error(err)
        return reject(err)
      }
      return resolve(photos.length)
    })
  })
}

module.exports = async (fb) => {
  common.terminateIfNotInit()
  let albums = await getListAlbum(fb)
  let baseDir = path.join(__dirname, '../', constants.DL_PHOTO_PATH)
  common.clearDir(baseDir)
  downloaded = 0
  for (const album of albums) {
    let albumDir = path.join(baseDir, album.name.replace(/\//g, '-'))
    await common.makeDir(albumDir)
    logger.info(`[${album.name}] starting download ${album.photo_count} photos`)
    let photos = await getPhotoOfAlbum(fb, album.id)
    photos = common.uniqueById(photos)
    downloaded += await download(albumDir, photos)
    logger.info(`[${album.name}] finish download`)
  }
  logger.info(`${downloaded} photos have been downloaded successfully`)
}
