import { getWorldConditions } from '../game/worldConditions.js'

/**
 * ゲーム環境のデフォルト値をシステム時刻から動的に生成して返す。
 * MapScene からの data で上書きされる想定。
 */
export function getDefaultEnv() {
  return { point: 'pointA', ...getWorldConditions() }
}

/** 後方互換用（直接参照が残っている箇所向け） */
export const DEFAULT_ENV = getDefaultEnv()
