export const ASSETS = {
  backgrounds: {
    titleHarborMorning: {
      key: 'bg_title_harbor_morning',
      path: '/fishing-game/assets/backgrounds/bg_title_harbor_morning.png',
      status: 'ready',
    },
    homeBase: {
      key: 'bg_home_base',
      path: '/fishing-game/assets/backgrounds/bg_home_base.png',
      status: 'ready',
    },
    mapTown: {
      key: 'bg_map_town',
      path: '/fishing-game/assets/backgrounds/bg_map_town.png',
      status: 'ready',
    },
    fishingHarbor: {
      key: 'bg_fishing_harbor',
      path: '/fishing-game/assets/backgrounds/bg_fishing_harbor.png',
      status: 'planned',
    },
    fishingBay: {
      key: 'bg_fishing_bay',
      path: '/fishing-game/assets/backgrounds/bg_fishing_bay.png',
      status: 'planned',
    },
    fishingCape: {
      key: 'bg_fishing_cape',
      path: '/fishing-game/assets/backgrounds/bg_fishing_cape.png',
      status: 'planned',
    },
  },
  characters: {
    guideDefault: {
      key: 'ch_guide_default',
      path: '/fishing-game/assets/characters/ch_guide_default.png',
      status: 'ready',
    },
    playerDefault: {
      key: 'ch_player_default',
      path: '/fishing-game/assets/characters/ch_player_default.png',
      status: 'ready',
    },
    playerDefaultUi: {
      key: 'ch_player_default_ui',
      path: '/fishing-game/assets/characters/ch_player_default_ui.png',
      status: 'ready',
    },
  },
  fish: {
    ajiIcon: {
      key: 'fish_aji_icon',
      path: '/fishing-game/assets/fish/fish_aji_icon.png',
      status: 'planned',
    },
    madaiIcon: {
      key: 'fish_madai_icon',
      path: '/fishing-game/assets/fish/fish_madai_icon.png',
      status: 'planned',
    },
    blackBassIcon: {
      key: 'fish_black_bass_icon',
      path: '/fishing-game/assets/fish/fish_black_bass_icon.png',
      status: 'planned',
    },
    buriIcon: {
      key: 'fish_buri_icon',
      path: '/fishing-game/assets/fish/fish_buri_icon.png',
      status: 'planned',
    },
    kueIcon: {
      key: 'fish_kue_icon',
      path: '/fishing-game/assets/fish/fish_kue_icon.png',
      status: 'planned',
    },
  },
  ui: {
    resultFrame: {
      key: 'ui_result_frame',
      path: '/fishing-game/assets/ui/ui_result_frame.png',
      status: 'planned',
    },
    spotPinHarbor: {
      key: 'ui_spot_pin_harbor',
      path: '/fishing-game/assets/ui/ui_spot_pin_harbor.png',
      status: 'planned',
    },
    spotPinBay: {
      key: 'ui_spot_pin_bay',
      path: '/fishing-game/assets/ui/ui_spot_pin_bay.png',
      status: 'planned',
    },
    spotPinCape: {
      key: 'ui_spot_pin_cape',
      path: '/fishing-game/assets/ui/ui_spot_pin_cape.png',
      status: 'planned',
    },
  },
}

export const flattenAssets = () => Object.values(ASSETS).flatMap(group => Object.values(group))
