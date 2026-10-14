import { backupSave, getBackupSummaries, restoreLatestBackup } from './saveSystem.js'
import {
  isHapticsEnabled,isReducedMotion,isSoundEnabled,
  setHapticsEnabled,setReducedMotion,setSoundEnabled,supportsHaptics,
} from './feedback.js'

// The approved portrait Settings and QA-only wide Settings share the exact
// same transaction callbacks. Never duplicate backup/restore/import logic.
export function buildSettingsCards(scene) {
    const backups = getBackupSummaries()
    const validBackups = backups.filter(item => item.exists && item.valid).length
    const hapticsSupported = supportsHaptics()
    return [
      ['サウンド', isSoundEnabled() ? 'ON' : 'OFF', () => { setSoundEnabled(!isSoundEnabled()); scene.scene.restart() }],
      ['振動', hapticsSupported ? (isHapticsEnabled() ? 'ON' : 'OFF') : 'この端末では非対応', () => {
        if (!hapticsSupported) { scene._toast('この端末では振動APIを利用できません'); return }
        setHapticsEnabled(!isHapticsEnabled()); scene.scene.restart()
      }],
      ['動きを減らす', isReducedMotion() ? 'ON' : 'OFF', () => { setReducedMotion(!isReducedMotion()); scene.scene.restart() }],
      ['バックアップ', '3世代 / 有効 ' + validBackups, () => {
        if (!backupSave()) { scene._toast('保存に失敗・空き容量を確認'); return }
        scene._toast('バックアップしました')
        scene.time.delayedCall(350, () => scene.scene.restart())
      }],
      ['最新を復旧', validBackups ? '復元可能' : 'バックアップなし', () => { if (restoreLatestBackup()) { scene._toast('復元しました'); scene.time.delayedCall(350, () => scene.scene.start('HomeScene')) } else scene._toast('復元できません') }],
      ['データを書き出す', 'JSONをコピー', () => scene._export()],
      ['データを読み込む', 'JSONから復元', () => scene._import()],
      ['診断ログを書き出す', '端末内ログをコピー', () => scene._exportDiagnostics()],
    ]
}
