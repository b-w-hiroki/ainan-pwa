import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const [, , sourceArg, outputArg] = process.argv
if (!sourceArg || !outputArg) throw new Error('usage: node scripts/transcode-video-ios.mjs <source.webm> <output.mp4>')
const sourcePath = path.resolve(sourceArg)
const outputPath = path.resolve(outputArg)
const sourceBytes = await fs.readFile(sourcePath)
await fs.mkdir(path.dirname(outputPath), { recursive: true })

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ acceptDownloads: true })
await page.setContent('<video id="source" muted playsinline></video><canvas id="canvas"></canvas>')
const downloadPromise = page.waitForEvent('download')
const recordingPromise = page.evaluate(async ({ sourceUrl }) => {
  const video = document.querySelector('#source')
  const canvas = document.querySelector('#canvas')
  video.src = sourceUrl
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve
    video.onerror = () => reject(video.error)
  })
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d', { alpha: false })
  const recorder = new MediaRecorder(canvas.captureStream(30), {
    mimeType: 'video/mp4;codecs=avc1.42001f',
    videoBitsPerSecond: 3_000_000,
  })
  const chunks = []
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
  const stopped = new Promise(resolve => { recorder.onstop = resolve })
  let drawing = true
  const draw = () => {
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (drawing) requestAnimationFrame(draw)
  }
  recorder.start(250)
  draw()
  await video.play()
  await new Promise(resolve => { video.onended = resolve })
  drawing = false
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  recorder.stop()
  await stopped
  const blob = new Blob(chunks, { type: recorder.mimeType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'ios-video.mp4'
  link.click()
  return { mimeType: recorder.mimeType, sourceDuration: video.duration, width: canvas.width, height: canvas.height, bytes: blob.size }
}, { sourceUrl: `data:video/webm;base64,${sourceBytes.toString('base64')}` })
const [download, recording] = await Promise.all([downloadPromise, recordingPromise])
await download.saveAs(outputPath)

const outputBytes = await fs.readFile(outputPath)
const binary = outputBytes.toString('latin1')
const boxes = Object.fromEntries(['ftyp', 'moov', 'moof', 'mdat', 'avc1', 'avcC'].map(box => [box, binary.indexOf(box)]))
const verify = await browser.newPage()
await verify.setContent('<video id="video" muted playsinline></video>')
const playback = await verify.evaluate(async ({ url }) => {
  const video = document.querySelector('#video')
  video.src = url
  await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = () => reject(video.error) })
  await video.play()
  await new Promise(resolve => { video.onended = resolve })
  const quality = video.getVideoPlaybackQuality()
  return { duration: video.duration, width: video.videoWidth, height: video.videoHeight, frames: quality.totalVideoFrames, droppedFrames: quality.droppedVideoFrames }
}, { url: `data:video/mp4;base64,${outputBytes.toString('base64')}` })
await browser.close()

const result = {
  source: sourcePath,
  output: outputPath,
  recording,
  playback,
  boxes,
  faststart: boxes.moov >= 0 && boxes.mdat >= 0 && boxes.moov < boxes.mdat,
  hasH264: boxes.avc1 >= 0 && boxes.avcC >= 0,
  size: outputBytes.length,
}
if (!result.faststart || !result.hasH264 || playback.frames < 1) throw new Error(`iOS video verification failed: ${JSON.stringify(result)}`)
await fs.writeFile(`${outputPath}.verification.json`, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
