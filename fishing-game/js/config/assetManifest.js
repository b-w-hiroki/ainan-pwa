export const ASSETS = {
  backgrounds: {
    titleHarborMorning: {
      key: 'bg_title_harbor_morning',
      path: 'assets/backgrounds/bg_title_harbor_morning.png',
      status: 'ready',
    },
    homeBase: {
      key: 'bg_home_base',
      path: 'assets/backgrounds/bg_home_base.png',
      status: 'ready',
    },
    mapTown: {
      key: 'bg_map_town',
      path: 'assets/backgrounds/bg_map_town.png',
      status: 'ready',
    },
    fishingHarbor: {
      key: 'bg_fishing_harbor',
      path: 'assets/backgrounds/bg_fishing_harbor.png',
      status: 'planned',
    },
    fishingBay: {
      key: 'bg_fishing_bay',
      path: 'assets/backgrounds/bg_fishing_bay.png',
      status: 'planned',
    },
    fishingCape: {
      key: 'bg_fishing_cape',
      path: 'assets/backgrounds/bg_fishing_cape.png',
      status: 'planned',
    },
  },
  characters: {
    guideDefault: {
      key: 'ch_guide_default',
      path: 'assets/characters/ch_guide_default.png',
      status: 'ready',
    },
    playerDefault: {
      key: 'ch_player_default',
      path: 'assets/characters/ch_player_default.png',
      status: 'planned',
    },
  },
  fish: {
    ajiIcon: {
      key: 'fish_aji_icon',
      path: 'assets/fish/fish_aji_icon.png',
      status: 'planned',
    },
    madaiIcon: {
      key: 'fish_madai_icon',
      path: 'assets/fish/fish_madai_icon.png',
      status: 'planned',
    },
    blackBassIcon: {
      key: 'fish_black_bass_icon',
      path: 'assets/fish/fish_black_bass_icon.png',
      status: 'planned',
    },
    buriIcon: {
      key: 'fish_buri_icon',
      path: 'assets/fish/fish_buri_icon.png',
      status: 'planned',
    },
    kueIcon: {
      key: 'fish_kue_icon',
      path: 'assets/fish/fish_kue_icon.png',
      status: 'planned',
    },
  },
  ui: {
    footerHome: {
      key: 'ui_footer_home',
      path: 'assets/ui/ui_footer_home.png',
      status: 'ready',
    },
    footerEquip: {
      key: 'ui_footer_equip',
      path: 'assets/ui/ui_footer_equip.png',
      status: 'ready',
    },
    footerTown: {
      key: 'ui_footer_town',
      path: 'assets/ui/ui_footer_town.png',
      status: 'ready',
    },
    footerShop: {
      key: 'ui_footer_shop',
      path: 'assets/ui/ui_footer_shop.png',
      status: 'ready',
    },
    footerMenu: {
      key: 'ui_footer_menu',
      path: 'assets/ui/ui_footer_menu.png',
      status: 'ready',
    },
    resultFrame: {
      key: 'ui_result_frame',
      path: 'assets/ui/ui_result_frame.png',
      status: 'planned',
    },
    spotPinHarbor: {
      key: 'ui_spot_pin_harbor',
      path: 'assets/ui/ui_spot_pin_harbor.png',
      status: 'planned',
    },
    spotPinBay: {
      key: 'ui_spot_pin_bay',
      path: 'assets/ui/ui_spot_pin_bay.png',
      status: 'planned',
    },
    spotPinCape: {
      key: 'ui_spot_pin_cape',
      path: 'assets/ui/ui_spot_pin_cape.png',
      status: 'planned',
    },
  },
}

export const flattenAssets = () => Object.values(ASSETS).flatMap(group => Object.values(group))
