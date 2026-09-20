const SEASON_LABEL = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
const TIME_LABEL = { morning: '朝', noon: '昼', evening: '夕', night: '夜' }
const WEATHER_LABEL = { sunny: '晴れ', cloudy: 'くもり', rainy: '雨' }

function daySeed(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return y * 10000 + m * 100 + d
}

export function getWorldConditions(date = new Date()) {
  const month = date.getMonth() + 1
  const hour = date.getHours()
  const season = month >= 3 && month <= 5 ? 'spring'
    : month >= 6 && month <= 8 ? 'summer'
      : month >= 9 && month <= 11 ? 'autumn' : 'winter'
  const timeOfDay = hour >= 5 && hour < 10 ? 'morning'
    : hour >= 10 && hour < 16 ? 'noon'
      : hour >= 16 && hour < 19 ? 'evening' : 'night'
  const roll = daySeed(date) % 10
  const weather = roll <= 5 ? 'sunny' : roll <= 7 ? 'cloudy' : 'rainy'
  return {
    season,
    timeOfDay,
    weather,
    labels: {
      season: SEASON_LABEL[season],
      timeOfDay: TIME_LABEL[timeOfDay],
      weather: WEATHER_LABEL[weather],
    },
  }
}

export function getConditionSummary(date = new Date()) {
  const c = getWorldConditions(date)
  return `${c.labels.season}・${c.labels.timeOfDay}・${c.labels.weather}`
}
