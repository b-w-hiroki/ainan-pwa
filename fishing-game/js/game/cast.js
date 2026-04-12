const POWER_MIN = 0.15
const POWER_MAX = 0.95
const OSC_PERIOD_MS = 2000

/**
 * キャスト最大飛距離の上限倍率（rangePx に対する比率）
 * 1.0 = rangePx ちょうど（H * 0.65 相当）が上限
 */
export const MAX_CAST_DISTANCE = 1.0

/**
 * 長押し中に往復するパワー値（0〜1）
 * @param {number} elapsedMs
 */
export function oscillatePower(elapsedMs) {
  const t = (elapsedMs % OSC_PERIOD_MS) / OSC_PERIOD_MS
  const s = Math.sin(t * Math.PI * 2) * 0.5 + 0.5
  return POWER_MIN + s * (POWER_MAX - POWER_MIN)
}

/**
 * アンカー(ロッド先端)からポインタ位置への角度（度）を返す。
 * 真上＝0deg、右＝+、左＝−。海方向（上半球）に制限。
 * @param {number} ax - anchor X
 * @param {number} ay - anchor Y
 * @param {number} px - pointer X
 * @param {number} py - pointer Y
 */
export function computeCastAngle(ax, ay, px, py) {
  const dx = px - ax
  const dy = py - ay
  let deg = Math.atan2(dx, -dy) * (180 / Math.PI)
  // キャスト可能な範囲：−75°〜＋75°（真上に近い向き）
  return Math.max(-75, Math.min(75, deg))
}

/**
 * 放物線上の点列（着水まで n ステップ）
 * @param {number} anchorX
 * @param {number} anchorY
 * @param {number} angleDeg
 * @param {number} power01
 * @param {number} rangePx - 画面高さ * 0.65 程度を渡す（実際の飛距離スケール）
 */
export function buildTrajectory(anchorX, anchorY, angleDeg, power01, rangePx) {
  const rad = (angleDeg * Math.PI) / 180
  const vx = Math.sin(rad)
  const vy = -Math.cos(rad)
  // power01=0.95 のとき rangePx * 1.0 ≈ 画面高さの 65% 相当の速度（上限を MAX_CAST_DISTANCE で制限）
  const speed = Math.min(rangePx * MAX_CAST_DISTANCE, rangePx * (0.40 + power01 * 0.60))
  const steps = 40
  /** @type {{ x: number; y: number }[]} */
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push({
      x: anchorX + vx * speed * t * 1.2,
      y: anchorY + vy * speed * t + 0.5 * 900 * t * t * 0.28,
    })
  }
  return pts
}

/**
 * 着弾点（pts の末尾）を海エリア内にクランプする（純粋関数・Phaser 不要）
 * @param {{ x: number; y: number }[]} pts
 * @param {{ minX: number; maxX: number; minY: number; maxY: number }} bounds
 */
export function clampLanding(pts, { minX, maxX, minY, maxY }) {
  const last = pts[pts.length - 1]
  last.x = Math.max(minX, Math.min(maxX, last.x))
  last.y = Math.max(minY, Math.min(maxY, last.y))
  return pts
}
