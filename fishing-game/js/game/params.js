/** @typedef {'basic' | 'carbon' | 'premium'} RodType */
/** @typedef {'worm' | 'shrimp' | 'special'} BaitType */

/** @type {{ id: RodType; label: string; pullPower: number }} */
export const DEFAULT_ROD = {
  id: 'carbon',
  label: 'カーボン竿',
  pullPower: 1.2,
}

/** @type {{ id: BaitType; label: string; biteRateBonus: number }} */
export const DEFAULT_BAIT = {
  id: 'worm',
  label: 'ミミズ',
  biteRateBonus: 0.15,
}
