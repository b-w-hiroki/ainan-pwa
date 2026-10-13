import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable = process.env.PATH.split(':')
  .map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from CI PATH')
const { chromium } = await import(pathToFileURL(
  join(dirname(realpathSync(executable)), 'index.mjs')).href)
mkdirSync('artifacts/e2e', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  try {
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=SettingsScene',
      { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() =>
      window.__game?.scene?.getScene('SettingsScene')?.sys?.isActive?.(),
      null, { timeout: 20000 })
    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('SettingsScene')
      window.__ainanSettingsToastHistory = []
      const originalToast = scene._toast
      scene._toast = function (message) {
        window.__ainanSettingsToastHistory.push(message)
        return originalToast.call(this, message)
      }
      const originalSet = Storage.prototype.setItem
      window.__ainanOriginalStorageSet = originalSet
      window.__ainanFailBackupCount = 0
      Storage.prototype.setItem = function (key, value) {
        if (key === 'ainan_save_backup_1') {
          window.__ainanFailBackupCount++
          throw new Error('simulated storage quota')
        }
        return originalSet.call(this, key, value)
      }
    })
    const regions = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('SettingsScene')
      return scene.children.list.filter(obj => obj.type === 'Rectangle'
        && obj.input?.enabled && obj.width === 96 && obj.height === 52)
        .map(obj => ({ x: obj.x, y: obj.y, width: obj.width, height: obj.height }))
    })
    assert.equal(regions.length, 8, 'All eight Settings actions require independent 96x52 targets')
    assert.ok(regions.every(region => region.width >= 44 && region.height >= 44),
      'Settings action touch target below 44 CSS px')

    // Click the *left edge* of the 96px hit region, not tiny '実行' text.
    await page.mouse.click(284, 306)
    await page.waitForFunction(() => window.__ainanSettingsToastHistory.length > 0)
    const error = await page.evaluate(() => ({
      toast: window.__ainanSettingsToastHistory.at(-1),
      backupAttempts: window.__ainanFailBackupCount,
      active: window.__game.scene.getScene('SettingsScene').sys.isActive(),
    }))
    assert.equal(error.toast, '保存に失敗・空き容量を確認')
    assert.equal(error.backupAttempts, 1, 'One tap must run backup at most once')
    assert.equal(error.active, true, 'Failed backup must not navigate/restart Settings')
    await page.screenshot({ path: 'artifacts/e2e/99-settings-backup-failed.png', animations: 'disabled' })
    assert.ok(statSync('artifacts/e2e/99-settings-backup-failed.png').size > 15000,
      'Actual Settings error screenshot must be rendered')

    // Clipboard unavailable: tap an actual right-hand 96px export control.
    // A JSON prompt is the fallback; no false "copied" toast is permitted.
    await page.evaluate(() => {
      Storage.prototype.setItem = window.__ainanOriginalStorageSet
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    })
    const copyToastBefore = await page.evaluate(() => window.__ainanSettingsToastHistory.length)
    let dialogSeen = false
    page.once('dialog', async dialog => {
      assert.equal(dialog.type(), 'prompt')
      assert.ok(dialog.defaultValue().includes('"format":"ainan-save"'))
      dialogSeen = true
      await dialog.dismiss()
    })
    await page.mouse.click(284, 428)
    await page.waitForTimeout(180)
    assert.ok(dialogSeen, 'Clipboard-unavailable export must open a JSON prompt')
    assert.equal(await page.evaluate(() => window.__ainanSettingsToastHistory.length),
      copyToastBefore, 'Clipboard fallback must not report copied success')

    console.log('Settings verified: 8 touch targets, backup failure once, copy fallback without false success')
  } finally {
    await page.close()
  }
} finally {
  await browser.close()
}
