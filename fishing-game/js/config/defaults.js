/**
 * ゲーム環境のデフォルト値をシステム時刻から動的に生成して返す。
 * MapScene からの data で上書きされる想定。
 */
export function getDefaultEnv() {
  const month = new Date().getMonth() + 1
  const hour  = new Date().getHours()

  const season =
    month >= 3 && month <= 5  ? 'spring' :
    month >= 6 && month <= 8  ? 'summer' :
    month >= 9 && month <= 11 ? 'autumn' : 'winter'

  const timeOfDay =
    hour >= 5  && hour < 10 ? 'morning' :
    hour >= 10 && hour < 16 ? 'noon'    :
    hour >= 16 && hour < 19 ? 'evening' : 'night'

  return {
    point:     'pointA',
    season,
    weather:   'sunny',   // Phase3で天気APIから取得予定
    timeOfDay,
  }
}

/** 後方互換用（直接参照が残っている箇所向け） */
export const DEFAULT_ENV = getDefaultEnv()
