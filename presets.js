/* presets.js - bundled preset maps. Two kinds:
 *   structure : which categories/items to sound, sounds left BLANK (you assign).
 *   example   : full example maps with sound names filled in.
 * Sound names here are just the default library names; upload your own audio
 * for them or rename to your files. */
window.PRESETS = [
  {
    id: "structure-tiers",
    name: "Structure — universal sound tiers (blank)",
    kind: "structure",
    description: "The 6 FilterBlade value tiers. Works on ANY filter — stock (PlayAlertSound) or any custom pack (Mathil, Bex, …). Assign a sound to each.",
    map: {
      sound_dir: "sound", default_volume: 300,
      categories: [
        { soundTier: 1, sound: "" }, { soundTier: 2, sound: "" }, { soundTier: 3, sound: "" },
        { soundTier: 4, sound: "" }, { soundTier: 5, sound: "" }, { soundTier: 6, sound: "" }
      ],
      items: []
    }
  },
  {
    id: "structure-categories",
    name: "Structure — main categories (blank)",
    kind: "structure",
    description: "Currency, uniques, maps + a couple of chase items. Assign your own sound to each.",
    map: {
      sound_dir: "sound", default_volume: 300,
      categories: [
        { type: "currency", sound: "" },
        { type: "uniques", sound: "" },
        { type: "maps", sound: "" },
        { type: "divination", sound: "" }
      ],
      items: [
        { baseType: "Divine Orb", sound: "" },
        { baseType: "Mirror of Kalandra", sound: "" }
      ]
    }
  },
  {
    id: "structure-buckets",
    name: "Structure — existing sound buckets (blank)",
    kind: "structure",
    description: "One row per sound the filter currently uses. Swap each to your own sound.",
    map: {
      sound_dir: "sound", default_volume: 300,
      categories: [
        { bucket: "Mathil-vulgarity_1maybevaluable.mp3", sound: "" },
        { bucket: "Mathil-vulgarity_2currency.mp3", sound: "" },
        { bucket: "Mathil-vulgarity_3uniques.mp3", sound: "" },
        { bucket: "Mathil-vulgarity_4maps.mp3", sound: "" },
        { bucket: "Mathil-vulgarity_5highmaps.mp3", sound: "" },
        { bucket: "Mathil-vulgarity_6veryvaluable.mp3", sound: "" }
      ],
      items: []
    }
  },
  {
    id: "example-basic",
    name: "Example — basic (filled)",
    kind: "example",
    description: "Semantic categories with a quiet-to-loud volume gradient, plus a few chase items.",
    map: {
      sound_dir: "sound", default_volume: 300,
      categories: [
        { type: "gold", tier: "stack3", sound: "aurul si banii deloc n-au valoare.mp3", volume: 280 },
        { type: "uniques", sound: "ce miracol ce minune.mp3", volume: 210 },
        { type: "currency", sound: "tagidigiddam_ram.mp3", volume: 120 },
        { bucket: "Mathil-vulgarity_4maps.mp3", sound: "ah lelele.mp3", volume: 180 },
        { bucket: "Mathil-vulgarity_5highmaps.mp3", sound: "ah lelelelele.mp3", volume: 230 },
        { bucket: "Mathil-vulgarity_6veryvaluable.mp3", sound: "simt mirosul banilor.mp3", volume: 280 }
      ],
      items: [
        { baseType: "Divine Orb", sound: "se lipesc banii de mine.mp3", volume: 300 },
        { baseType: "Exalted Orb", sound: "mi s-a despocovit calu.mp3", volume: 300 },
        { baseTypes: ["Mirror of Kalandra", "Hinekora's Lock", "Fracturing Orb"], sound: "toate diamantele n-au valoarea mea.mp3", volume: 300 }
      ]
    }
  },
  {
    id: "example-conditions",
    name: "Example — unique bases & custom stack (conditions)",
    kind: "example",
    description: "Shows the conditions feature: unique belts/shields and a custom gold stack.",
    map: {
      sound_dir: "sound", default_volume: 300,
      categories: [],
      items: [
        { baseTypes: ["Heavy Belt", "Leather Belt"], conditions: ["Rarity Unique"], sound: "de ce ma minti.mp3", volume: 280 },
        { baseType: "Elegant Round Shield", conditions: ["Rarity Unique"], sound: "eu n-am nici un chef de viata.mp3", volume: 280 },
        { baseType: "Gold", conditions: ["StackSize >= 1000"], sound: "aurul si banii deloc n-au valoare.mp3", volume: 200 }
      ]
    }
  }
];
