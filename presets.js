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
  },
  {
    id: "example-full-romanian",
    name: "Example — full map (Romanian pack)",
    kind: "example",
    description: "The complete walkthrough map: soundTier tiers + type/heist rules + item overrides (scarabs, oils, chase currency, unique belts/shields, div cards). Works on any NeverSink filter (stock or any custom pack). Uses the bundled Romanian sound names — upload those sounds to hear them.",
    map: {
      sound_dir: "sound",
      default_volume: 300,
      categories: [
        { type: "gold", tier: "stack3", sound: "aurul si banii deloc n-au valoare.mp3", volume: 280 },
        { type: "heist->contract", sound: "hoti adevarati.mp3", volume: 190 },
        { type: "heist->blueprint", sound: "hoti adevarati.mp3", volume: 190 },
        { type: "uniques", sound: "ce miracol ce minune.mp3", volume: 210 },
        { soundTier: 6, sound: "simt mirosul banilor.mp3", volume: 280 },
        { type: "currency", sound: "tagidigiddam_ram.mp3", volume: 120 },
        { soundTier: 1, sound: "baterie baterie foc.mp3", volume: 120 },
        { soundTier: 2, sound: "tagidigiddam_ram.mp3", volume: 120 },
        { soundTier: 3, sound: "ce miracol ce minune.mp3", volume: 180 },
        { soundTier: 4, sound: "ah lelele.mp3", volume: 180 },
        { soundTier: 5, sound: "ah lelelelele.mp3", volume: 230 }
      ],
      items: [
        { sound: "am norocul scris in frunte.mp3", volume: 230, baseTypes: [
          "Horned Scarab of Bloodlines", "Ultimatum Scarab of Catalysing", "Horned Scarab of Preservation",
          "Harvest Scarab of Cornucopia", "Ambush Scarab of Containment", "Legion Scarab of Eternal Conflict",
          "Blight Scarab of Blooming", "Harvest Scarab of Doubling", "Breach Scarab of Resonant Cascade" ] },
        { sound: "hoti adevarati.mp3", volume: 240, baseTypes: ["Tailoring Orb", "Tempering Orb"] },
        { sound: "aud banii cum vorbesc.mp3", volume: 230, baseTypes: ["Tainted Oil", "Silver Oil", "Golden Oil", "Prismatic Oil"] },
        { sound: "mi s-a despocovit calu.mp3", volume: 300, baseType: "Exalted Orb" },
        { sound: "se lipesc banii de mine.mp3", volume: 300, baseType: "Divine Orb" },
        { sound: "omu cu valoare il vezi din avion.mp3", volume: 300, baseTypes: [
          "Chaotic Astrolabe", "Enshrouded Astrolabe", "Fruiting Astrolabe", "Fungal Astrolabe",
          "Grasping Astrolabe", "Lightless Astrolabe", "Nameless Astrolabe", "Runic Astrolabe",
          "Templar Astrolabe", "Timeless Astrolabe" ] },
        { sound: "toate diamantele n-au valoarea mea.mp3", volume: 300, baseTypes: ["Hinekora's Lock", "Mirror of Kalandra", "Reflecting Mist", "Fracturing Orb"] },
        { sound: "si cand mor am valoare guta version.mp3", volume: 270, baseTypes: ["The Fortunate", "Brother's Gift", "Divine Beauty", "The Sephirot", "Portal"] },
        { sound: "eu n-am nici un chef de viata.mp3", volume: 280, baseType: "Elegant Round Shield", conditions: ["Rarity Unique"] },
        { sound: "de ce ma minti.mp3", volume: 280, baseTypes: ["Heavy Belt", "Leather Belt"], conditions: ["Rarity Unique"] },
        { sound: "unde sunt bani sunt si eu.mp3", volume: 250, baseTypes: [
          "House of Mirrors", "History", "Damnation", "The Slumbering Beast", "Unrequited Love",
          "Father's Love", "The Apothecary", "The Price of Devotion", "The Eye of Terror",
          "The Immortal", "Lucky Bastion", "The Demon", "The Insane Cat", "Seven Years Bad Luck",
          "Magnum Opus", "The Doctor" ] },
        { sound: "unde sunt bani sunt si eu.mp3", volume: 250, baseTypes: ["Cursed Words", "Fire of Unknown Origin"], conditions: ["Class \"Divination Card\""] }
      ]
    }
  }
];
