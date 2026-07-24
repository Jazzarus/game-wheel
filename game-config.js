// ===== GAME CONFIGURATIONS =====
const GAME_CONFIGS = (() => {
  function createPoe2Class(
    name,
    assetName,
    wheelImageConfig,
    { selectedByDefault = true, finalArtworkExtension = "jpg" } = {}
  ) {
    return Object.freeze({
      name,
      selectedByDefault,
      assets: Object.freeze({
        wheel: Object.freeze({
          primary: `images/${assetName}.jpg`,
          fallback: `images/${assetName}.png`,
        }),
        portrait: `portraits/${assetName}.png`,
        finalArtwork: `images/${assetName}.${finalArtworkExtension}`,
      }),
      wheelImageConfig: Object.freeze({
        ...wheelImageConfig,
        rotation: 0,
      }),
    });
  }

  function createPoe1Class(name, assetName, wheelImageConfig) {
    const imagePath = `images-poe1/${assetName}.png`;

    return Object.freeze({
      name,
      selectedByDefault: true,
      assets: Object.freeze({
        wheel: Object.freeze({
          primary: imagePath,
          fallback: imagePath,
        }),
        portrait: `portraits-poe1/${assetName}.png`,
        finalArtwork: imagePath,
      }),
      wheelImageConfig: Object.freeze({ ...wheelImageConfig }),
    });
  }

  const poe2 = Object.freeze({
    id: "poe2",
    route: "",
    ui: Object.freeze({
      documentTitle: "Path of Exile 2 Class Picker",
      heading: "Path of Exile 2 Class Picker",
      logo: Object.freeze({
        src: "images/poe2-logo.png",
        alt: "Path of Exile 2",
      }),
    }),
    wheel: Object.freeze({
      segmentColors: Object.freeze(["#8b2f39", "#2f5f8b", "#6f7f35", "#7a4f91"]),
    }),
    classes: Object.freeze([
      createPoe2Class("Deadeye", "deadeye", {
        offsetX: 10,
        offsetY: 210,
        scale: 1.8,
      }),
      createPoe2Class("Pathfinder", "pathfinder", {
        offsetX: 90,
        offsetY: 150,
        scale: 1.65,
      }),
      createPoe2Class("Amazon", "amazon", {
        offsetX: 120,
        offsetY: 140,
        scale: 2,
      }),
      createPoe2Class("Abyssal Lich", "abyssal-lich", {
        offsetX: 30,
        offsetY: 300,
        scale: 2.1,
      }, { selectedByDefault: false }),
      createPoe2Class("Spirit Walker", "spirit-walker", {
        offsetX: 190,
        offsetY: 190,
        scale: 1.85,
      }, { finalArtworkExtension: "png" }),
      createPoe2Class("Ritualist", "ritualist", {
        offsetX: -10,
        offsetY: 240,
        scale: 1.7,
      }),
      createPoe2Class("Martial Artist", "martial-artist", {
        offsetX: 60,
        offsetY: 140,
        scale: 1.6,
      }, { finalArtworkExtension: "png" }),
      createPoe2Class("Invoker", "invoker", {
        offsetX: 70,
        offsetY: 340,
        scale: 2.25,
      }),
      createPoe2Class("Acolyte of Chayula", "acolyte-of-chayula", {
        offsetX: 20,
        offsetY: 120,
        scale: 2.4,
      }),
      createPoe2Class("Infernalist", "infernalist", {
        offsetX: 10,
        offsetY: 360,
        scale: 2.35,
      }),
      createPoe2Class("Blood Mage", "blood-mage", {
        offsetX: 40,
        offsetY: 210,
        scale: 1.95,
      }),
      createPoe2Class("Lich", "lich", {
        offsetX: 0,
        offsetY: 280,
        scale: 2.2,
      }),
      createPoe2Class("Stormweaver", "stormweaver", {
        offsetX: 220,
        offsetY: 300,
        scale: 2.4,
      }),
      createPoe2Class("Chronomancer", "chronomancer", {
        offsetX: 80,
        offsetY: 260,
        scale: 2.15,
      }),
      createPoe2Class("Disciple of Varashta", "disciple-of-varashta", {
        offsetX: 110,
        offsetY: -20,
        scale: 1.8,
      }),
      createPoe2Class("Titan", "titan", {
        offsetX: 140,
        offsetY: 160,
        scale: 1.85,
      }),
      createPoe2Class("Warbringer", "warbringer", {
        offsetX: 130,
        offsetY: 260,
        scale: 1.7,
      }),
      createPoe2Class("Smith of Kitava", "smith-of-kitava", {
        offsetX: 110,
        offsetY: 150,
        scale: 1.65,
      }),
      createPoe2Class("Tactician", "tactician", {
        offsetX: 0,
        offsetY: 270,
        scale: 1.85,
      }),
      createPoe2Class("Witchhunter", "witchhunter", {
        offsetX: -20,
        offsetY: 210,
        scale: 1.7,
      }),
      createPoe2Class("Gemling Legionnaire", "gemling-legionnaire", {
        offsetX: 140,
        offsetY: 390,
        scale: 2.3,
      }),
      createPoe2Class("Oracle", "oracle", {
        offsetX: 30,
        offsetY: 340,
        scale: 2.85,
      }),
      createPoe2Class("Shaman", "shaman", {
        offsetX: 110,
        offsetY: 330,
        scale: 2.55,
      }),
    ]),
    getBuildUrl(className) {
      const base = "https://poe.ninja/poe2/builds/runesofaldur";
      const encodedClass = encodeURIComponent(className);

      return `${base}?class=${encodedClass}&items=!Headhunter%2C!Mageblood&min-level=90&min-ehp=15000&min-dps=75000`;
    },
    getFinalMessage(className) {
      return `CONGRATULATIONS, YOU'LL PLAY ${className.toUpperCase()}`;
    },
  });

  const poe1 = Object.freeze({
    id: "poe1",
    route: "poe1/",
    ui: Object.freeze({
      documentTitle: "Path of Exile 1 Class Picker",
      heading: "Path of Exile 1 Class Picker",
      logo: Object.freeze({
        src: "images-poe1/poe1-logo.png",
        alt: "Path of Exile 1",
      }),
    }),
    wheel: Object.freeze({
      segmentColors: poe2.wheel.segmentColors,
      imageBackgroundColor: "#181818",
    }),
    classes: Object.freeze([
      createPoe1Class("Ascendant", "ascendant", {
        offsetX: 30,
        offsetY: 10,
        scale: 0.4,
        rotation: 0,
      }),
      createPoe1Class("Assassin", "assassin", {
        offsetX: 120,
        offsetY: 290,
        scale: 1.0000000000000002,
        rotation: 0,
      }),
      createPoe1Class("Berserker", "berserker", {
        offsetX: 340,
        offsetY: 140,
        scale: 1.2000000000000004,
        rotation: 0,
      }),
      createPoe1Class("Champion", "champion", {
        offsetX: 110,
        offsetY: -50,
        scale: 1.1000000000000003,
        rotation: 0,
      }),
      createPoe1Class("Chieftain", "chieftain", {
        offsetX: 300,
        offsetY: 240,
        scale: 1.4000000000000004,
        rotation: 0,
      }),
      createPoe1Class("Deadeye", "deadeye", {
        offsetX: -240,
        offsetY: 250,
        scale: 1.4500000000000006,
        rotation: 0,
      }),
      createPoe1Class("Elementalist", "elementalist", {
        offsetX: 120,
        offsetY: 330,
        scale: 1.2500000000000004,
        rotation: 0,
      }),
      createPoe1Class("Gladiator", "gladiator", {
        offsetX: 190,
        offsetY: -50,
        scale: 1.2500000000000004,
        rotation: 0,
      }),
      createPoe1Class("Guardian", "guardian", {
        offsetX: 300,
        offsetY: 370,
        scale: 1.5000000000000004,
        rotation: 0,
      }),
      createPoe1Class("Hierophant", "hierophant", {
        offsetX: 210,
        offsetY: 210,
        scale: 0.8500000000000002,
        rotation: 0,
      }),
      createPoe1Class("Inquisitor", "inquisitor", {
        offsetX: 180,
        offsetY: 340,
        scale: 1.3500000000000005,
        rotation: 0,
      }),
      createPoe1Class("Juggernaut", "juggernaut", {
        offsetX: 430,
        offsetY: 90,
        scale: 0.9000000000000001,
        rotation: 0,
      }),
      createPoe1Class("Luminary", "luminary", {
        offsetX: 0,
        offsetY: 0,
        scale: 0.75,
        rotation: 0,
      }),
      createPoe1Class("Necromancer", "necromancer", {
        offsetX: 100,
        offsetY: 290,
        scale: 1.0500000000000003,
        rotation: 0,
      }),
      createPoe1Class("Occultist", "occultist", {
        offsetX: 270,
        offsetY: 300,
        scale: 1.3000000000000005,
        rotation: 0,
      }),
      createPoe1Class("Pathfinder", "pathfinder", {
        offsetX: -280,
        offsetY: 210,
        scale: 1,
        rotation: 0,
      }),
      createPoe1Class("Reliquarian", "reliquarian", {
        offsetX: 90,
        offsetY: 0,
        scale: 0.6,
        rotation: 0,
      }),
      createPoe1Class("Saboteur", "saboteur", {
        offsetX: -220,
        offsetY: 310,
        scale: 1.2000000000000004,
        rotation: 0,
      }),
      createPoe1Class("Slayer", "slayer", {
        offsetX: 70,
        offsetY: 0,
        scale: 1.2000000000000004,
        rotation: 0,
      }),
      createPoe1Class("Trickster", "trickster", {
        offsetX: -100,
        offsetY: 190,
        scale: 1.2500000000000004,
        rotation: 0,
      }),
      createPoe1Class("Warden", "warden", {
        offsetX: -100,
        offsetY: 20,
        scale: 1.4500000000000004,
        rotation: 0,
      }),
    ]),
    getBuildUrl(className) {
      const base = "https://poe.ninja/poe1/builds/mirage/";
      const encodedClass = encodeURIComponent(className);

      return `${base}?items=!Mageblood%2C!Screams+of+the+Desiccated%2C!Headhunter&class=${encodedClass}&min-level=90&min-ehp=20000&min-dps=250000`;
    },
    getFinalMessage(className) {
      return `CONGRATULATIONS,\nYOU'LL PLAY ${className.toUpperCase()}`;
    },
  });

  return Object.freeze({ poe2, poe1 });
})();

function resolveActiveGameId() {
  const requestedGameId = new URLSearchParams(window.location.search).get("game");

  if (Object.hasOwn(GAME_CONFIGS, requestedGameId)) {
    return requestedGameId;
  }

  const currentPath = `${window.location.pathname.replace(/\/+$/, "")}/`;
  const routeMatch = Object.values(GAME_CONFIGS).find((gameConfig) => {
    return gameConfig.route && currentPath.endsWith(`/${gameConfig.route}`);
  });

  return routeMatch?.id || "poe2";
}

const ACTIVE_GAME_ID = resolveActiveGameId();
