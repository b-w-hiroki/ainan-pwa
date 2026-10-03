import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const output = process.argv[2]
if (!output) throw new Error('output path is required')

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
const [dataUrl] = await new Promise(resolve => {
  input.once('line', line => resolve([line]))
})

const match = /^data:image\/(?:png|webp|jpeg);base64,(.+)$/.exec(dataUrl)
if (!match) throw new Error('expected an image data URL')
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, Buffer.from(match[1], 'base64'))
console.log(output)
