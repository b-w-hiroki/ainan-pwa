const BASE = import.meta.env.BASE_URL ?? '/'
const assetPath = (path) => `${BASE}${path.replace(/^\/+/, '')}`

export const ASSETS = {
  backgrounds: {
    titleHarborMorning: { key: 'bg_title_harbor_morning', path: assetPath('fishing-game/assets/backgrounds/bg_title_harbor_morning.png'), status: 'ready' },
    homeBase: { key: 'bg_home_base', path: assetPath('fishing-game/assets/backgrounds/bg_home_base.png'), status: 'ready' },
    mapTown: { key: 'bg_map_town', path: assetPath('fishing-game/assets/backgrounds/bg_map_town.png'), status: 'ready' },
    townQuiet: { key: 'bg_town_quiet', path: assetPath('fishing-game/assets/backgrounds/bg_town_quiet.svg'), status: 'ready' },
    townGrowing: { key: 'bg_town_growing', path: assetPath('fishing-game/assets/backgrounds/bg_town_growing.svg'), status: 'ready' },
    townBustling: { key: 'bg_town_bustling', path: assetPath('fishing-game/assets/backgrounds/bg_town_bustling.svg'), status: 'ready' },
    fishingHarbor: { key: 'bg_fishing_harbor', path: assetPath('fishing-game/assets/backgrounds/bg_fishing_harbor.svg'), status: 'ready' },
    fishingBay: { key: 'bg_fishing_bay', path: assetPath('fishing-game/assets/backgrounds/bg_fishing_bay.svg'), status: 'ready' },
    fishingCape: { key: 'bg_fishing_cape', path: assetPath('fishing-game/assets/backgrounds/bg_fishing_cape.svg'), status: 'ready' },
  },
  characters: {
    guideDefault: { key: 'ch_guide_default', path: assetPath('fishing-game/assets/characters/ch_guide_default.png'), status: 'ready' },
    playerDefault: { key: 'ch_player_default', path: assetPath('fishing-game/assets/characters/ch_player_default.png'), status: 'ready' },
    playerDefaultUi: { key: 'ch_player_default_ui', path: assetPath('fishing-game/assets/characters/ch_player_default_ui.png'), status: 'ready' },
    fishmonger: { key: 'ch_npc_fishmonger', path: assetPath('fishing-game/assets/characters/ch_npc_fishmonger.svg'), status: 'ready' },
    guideStaff: { key: 'ch_npc_guide_staff', path: assetPath('fishing-game/assets/characters/ch_npc_guide_staff.svg'), status: 'ready' },
    youngFisher: { key: 'ch_npc_young_fisher', path: assetPath('fishing-game/assets/characters/ch_npc_young_fisher.svg'), status: 'ready' },
    harborCaptain: { key: 'ch_npc_harbor_captain', path: assetPath('fishing-game/assets/characters/ch_npc_harbor_captain.svg'), status: 'ready' },
    dinerOwner: { key: 'ch_npc_diner_owner', path: assetPath('fishing-game/assets/characters/ch_npc_diner_owner.png'), status: 'planned' },
  },
  facilities: {
    market: { key: 'town_facility_market', path: assetPath('fishing-game/assets/town/town_facility_market.svg'), status: 'ready' },
    pier: { key: 'town_facility_pier', path: assetPath('fishing-game/assets/town/town_facility_pier.svg'), status: 'ready' },
    guide: { key: 'town_facility_guide', path: assetPath('fishing-game/assets/town/town_facility_guide.svg'), status: 'ready' },
    festival: { key: 'town_facility_festival', path: assetPath('fishing-game/assets/town/town_facility_festival.svg'), status: 'ready' },
    fishShop: { key: 'town_facility_fish_shop', path: assetPath('fishing-game/assets/town/town_facility_fish_shop.png'), status: 'planned' },
    diner: { key: 'town_facility_diner', path: assetPath('fishing-game/assets/town/town_facility_diner.png'), status: 'planned' },
  },
  fish: {
    ajiIcon: { key: 'fish_aji_icon', path: assetPath('fishing-game/assets/fish/fish_aji_icon.svg'), status: 'ready' },
    madaiIcon: { key: 'fish_madai_icon', path: assetPath('fishing-game/assets/fish/fish_madai_icon.svg'), status: 'ready' },
    blackBassIcon: { key: 'fish_black_bass_icon', path: assetPath('fishing-game/assets/fish/fish_black_bass_icon.svg'), status: 'ready' },
    buriIcon: { key: 'fish_buri_icon', path: assetPath('fishing-game/assets/fish/fish_buri_icon.svg'), status: 'ready' },
    kueIcon: { key: 'fish_kue_icon', path: assetPath('fishing-game/assets/fish/fish_kue_icon.svg'), status: 'ready' },
  },
  rewards: {
    sticker: { key: 'reward_sticker', path: assetPath('fishing-game/assets/rewards/reward_sticker.svg'), status: 'ready' },
    ticket: { key: 'reward_ticket', path: assetPath('fishing-game/assets/rewards/reward_ticket.svg'), status: 'ready' },
    icebox: { key: 'reward_icebox', path: assetPath('fishing-game/assets/rewards/reward_icebox.svg'), status: 'ready' },
  },
  ui: {
    resultFrame: { key: 'ui_result_frame', path: assetPath('fishing-game/assets/ui/ui_result_frame.png'), status: 'planned' },
    panelHarbor: { key: 'ui_panel_harbor', path: assetPath('fishing-game/assets/ui/ui_panel_harbor.png'), status: 'planned' },
    buttonPrimary: { key: 'ui_button_primary', path: assetPath('fishing-game/assets/ui/ui_button_primary.png'), status: 'planned' },
    spotPinHarbor: { key: 'ui_spot_pin_harbor', path: assetPath('fishing-game/assets/ui/ui_spot_pin_harbor.svg'), status: 'ready' },
    spotPinBay: { key: 'ui_spot_pin_bay', path: assetPath('fishing-game/assets/ui/ui_spot_pin_bay.svg'), status: 'ready' },
    spotPinCape: { key: 'ui_spot_pin_cape', path: assetPath('fishing-game/assets/ui/ui_spot_pin_cape.svg'), status: 'ready' },
  },
}

export const flattenAssets = () => Object.values(ASSETS).flatMap(group => Object.values(group))
