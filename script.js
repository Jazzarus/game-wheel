// ===== ACTIVE GAME =====
const activeGame = GAME_CONFIGS[ACTIVE_GAME_ID];
const initialWheelEntries = activeGame.selectionModes?.classes || activeGame.classes;
const allWheelEntries = activeGame.selectionModes
  ? Object.values(activeGame.selectionModes).flat()
  : activeGame.classes;
const classConfigs = new Map(
  allWheelEntries.map((classConfig) => [classConfig.name, classConfig])
);
let classOptions = initialWheelEntries.map((classConfig) => classConfig.name);
const selectedClasses = initialWheelEntries
  .filter((classConfig) => classConfig.selectedByDefault)
  .map((classConfig) => classConfig.name);
const segmentColors = activeGame.wheel.segmentColors;
const imageBackgroundColor = activeGame.wheel.imageBackgroundColor;
const classColors = {};
const classImagePaths = {};
const classImages = {};
const imageConfigs = Object.fromEntries(
  allWheelEntries.map((classConfig) => [
    classConfig.name,
    { ...classConfig.wheelImageConfig },
  ])
);

const BLOOD_DELAY = 30;
const BLOOD_RANDOM_RANGE = 30;
const BLOOD_VERTICAL_OFFSET = -20;
const GUNSHOT_DELAY = 850;
const SHAKE_DURATION = 200;
const SPIN_DURATION = 10000;
const TICK_POOL_SIZE = 6;
const POINTER_ANGLE = 0;
const SOUND_PRELOAD_TIMEOUT = 4000;

// ===== DOM REFERENCES =====
const classWheel = document.getElementById("classWheel");
const wheelContext = classWheel.getContext("2d");
const wheelCacheCanvas = document.createElement("canvas");
const wheelCacheContext = wheelCacheCanvas.getContext("2d");
const wheelPointer = document.querySelector(".wheel-pointer");
const modalOverlay = document.getElementById("modalOverlay");
const modalContent = document.getElementById("modalContent");
const modalText = document.getElementById("modalText");
const modalPortrait = document.getElementById("modalPortrait");
const modalReminder = document.getElementById("modalReminder");
const modalOk = document.getElementById("modalOk");
const findBuildsBtn = document.getElementById("findBuildsBtn");
const bloodSplatter = document.getElementById("bloodSplatter");
const classSelectorPanel = document.getElementById("classSelectorPanel");
const classSelectorList = document.getElementById("classSelectorList");
const classSelectorToggle = document.getElementById("classSelectorToggle");
const modeToggleImage = document.getElementById("modeToggleImage");
const modeLabels = document.querySelectorAll("#modeToggle .mode-label");
const wowWheelTypeToggle = document.getElementById("wowWheelTypeToggle");
const wowWheelTypeToggleImage = document.getElementById("wowWheelTypeToggleImage");
const wowWheelTypeLabels = document.querySelectorAll(
  "#wowWheelTypeToggle .mode-label"
);
const restartButton = document.getElementById("restartButton");
const siteBase = document.getElementById("siteBase");
const gameLogo = document.getElementById("gameLogo");
const gameSwitchLinks = document.getElementById("gameSwitchLinks");
const gameHeading = document.getElementById("gameHeading");
const loader = document.getElementById("loader");
const siteRootUrl = new URL(siteBase.getAttribute("href"), window.location.href);

siteBase.href = siteRootUrl.href;

// ===== STATE =====
let tickIndex = 0;
let pendingElimination = null;
let isFinished = false;
let wheelRotation = 0;
let isSpinning = false;
let previousSegmentIndex = null;
let areClassImagesLoaded = false;
let isTuningMode = false;
let currentClassIndex = 0;
let isWheelCacheDirty = true;
let audioUnlocked = false;
let isClassicMode = false;
let isClassSelectorLocked = false;
let isWowSpecializationMode = false;
let isWowWheelTypeLocked = false;
let spinFrameId = null;
let currentBuildsLeague = activeGame.buildsLeague;
const pendingTimeouts = new Set();

// ===== AUDIO =====
const finalSound = new Audio("sounds/howl.mp3");
const cheersSound = new Audio("sounds/cheers.mp3");
const reloadSound = new Audio("sounds/reload.mp3");
const gunshotSound = new Audio("sounds/gunshot.mp3");
const tickSounds = [];

finalSound.loop = false;
cheersSound.loop = false;
gunshotSound.volume = 0.6;
reloadSound.volume = 0.7;
reloadSound.preload = "auto";
gunshotSound.preload = "auto";

for (let i = 0; i < TICK_POOL_SIZE; i++) {
  const sound = new Audio("sounds/tick.mp3");
  sound.preload = "auto";
  tickSounds.push(sound);
}

const allSounds = [finalSound, cheersSound, reloadSound, gunshotSound, ...tickSounds];

// Plays a sound from the start. A browser refusing playback is ignored instead of throwing an error.
function playSound(sound) {
  sound.isPriming = false;
  sound.muted = false;
  sound.currentTime = 0;

  const playback = sound.play();

  if (playback) {
    playback.catch(() => {});
  }
}

function stopAllSounds() {
  allSounds.forEach((sound) => {
    sound.isPriming = false;
    sound.pause();
    sound.muted = false;
    sound.currentTime = 0;
  });
}

// Phones (iOS especially) only let a sound play later if it was first started by a tap or click,
// so every sound is started silently once, on the first click, and stopped straight away.
function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  audioUnlocked = true;

  allSounds.forEach((sound) => {
    if (!sound.paused) {
      return;
    }

    const finishPriming = () => {
      if (!sound.isPriming) {
        return;
      }

      sound.isPriming = false;
      sound.pause();
      sound.currentTime = 0;
      sound.muted = false;
    };

    sound.isPriming = true;
    sound.muted = true;

    const playback = sound.play();

    if (playback) {
      playback.then(finishPriming, finishPriming);
    } else {
      finishPriming();
    }
  });
}

function playTickSound() {
  playSound(tickSounds[tickIndex]);

  tickIndex = (tickIndex + 1) % TICK_POOL_SIZE;
}

function schedule(callback, delay) {
  const timeoutId = setTimeout(() => {
    pendingTimeouts.delete(timeoutId);
    callback();
  }, delay);

  pendingTimeouts.add(timeoutId);
}

// ===== PRELOAD =====
function getGameRouteUrl(gameId) {
  return new URL(GAME_CONFIGS[gameId].route, siteRootUrl);
}

function getGameEntryUrl(gameId) {
  const routeUrl = getGameRouteUrl(gameId);

  return new URL("index.html", routeUrl);
}

function normalizeActiveGameUrl() {
  const requestedGameId = new URLSearchParams(window.location.search).get("game");

  if (
    window.location.protocol !== "file:" &&
    requestedGameId &&
    Object.hasOwn(GAME_CONFIGS, requestedGameId)
  ) {
    window.history.replaceState(null, "", getGameRouteUrl(ACTIVE_GAME_ID));
  }
}

function applyActiveGameConfig() {
  const inactiveGames = Object.values(GAME_CONFIGS).filter((gameConfig) => {
    return gameConfig.id !== ACTIVE_GAME_ID;
  });

  document.title = activeGame.ui.documentTitle;
  gameHeading.textContent = activeGame.ui.heading;
  gameLogo.src = activeGame.ui.logo.src;
  gameLogo.alt = activeGame.ui.logo.alt;
  wowWheelTypeToggle.classList.toggle("hidden", !activeGame.selectionModes);
  gameSwitchLinks.replaceChildren(
    ...inactiveGames.map((gameConfig) => {
      const link = document.createElement("a");
      const logo = document.createElement("img");

      link.className = "game-logo-secondary-link";
      link.href = getGameEntryUrl(gameConfig.id).href;
      link.setAttribute("aria-label", `Switch to ${gameConfig.ui.logo.alt}`);
      link.title = `Switch to ${gameConfig.ui.logo.alt}`;

      logo.className = "game-logo-secondary";
      logo.src = gameConfig.ui.logo.src;
      logo.alt = gameConfig.ui.logo.alt;
      link.append(logo);

      return link;
    })
  );
}

function initializeClassAssets() {
  allWheelEntries.forEach((classConfig, index) => {
    const className = classConfig.name;

    classColors[className] = segmentColors[index % segmentColors.length];
    classImagePaths[className] = classConfig.assets.wheel.primary;
  });
}

function preloadClassImages() {
  const imagePromises = allWheelEntries.map(({ name: className }) => {
    return new Promise((resolve) => {
      const image = new Image();
      const fallbackPath = classConfigs.get(className).assets.wheel.fallback;

      image.onload = () => {
        classImages[className] = image;
        resolve();
      };

      image.onerror = () => {
        image.onerror = resolve;
        image.src = fallbackPath;
      };

      image.src = classImagePaths[className];
    });
  });

  return Promise.all(imagePromises);
}

// Loads elimination portraits in the background. Only the entries currently on offer are loaded
// (WoW loads its spec portraits once you switch to specializations).
function preloadPortraits(classNames = classOptions) {
  const portraitPromises = classNames.map((className) => {
    return preloadImage(classConfigs.get(className).assets.portrait);
  });

  return Promise.all(portraitPromises);
}

const requestedImages = new Map();

function preloadImage(path) {
  if (!requestedImages.has(path)) {
    requestedImages.set(path, new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = path;
    }));
  }

  return requestedImages.get(path);
}

// Classes with their own winner artwork (WoW) load it as soon as the winner is certain,
// so the winner popup never waits for it and the page doesn't download every artwork up front.
function preloadFinalArtwork(className) {
  const classConfig = className && classConfigs.get(className);

  if (classConfig && classConfig.assets.hasOwnFinalArtwork) {
    preloadImage(classConfig.assets.finalArtwork);
  }
}

// Images visible as soon as the page shows.
const CRITICAL_UI_IMAGES = [
  "images/arrow.webp",
  "images/ring.webp",
  ...Object.values(GAME_CONFIGS).map((gameConfig) => gameConfig.ui.logo.src),
  "images/banner.webp",
  "images/jazzarus-logo.webp",
  "images/youtube-logo.png",
  ...(activeGame.ui.criticalImages || [
    "images/window.webp",
    "images/check.png",
    "images/uncheck.png",
    "images/goldbutton.webp",
  ]),
];

// Images only needed in the popups; they load in the background after the wheel is ready.
const POPUP_UI_IMAGES = [
  "images/blood.webp",
  "images/elimination.png",
  "images/classic.png",
  ...(activeGame.ui.criticalImages ? [] : ["images/frame.webp", "images/ok.webp"]),
];

const CHECKBOX_IMAGES = activeGame.ui.checkbox || {
  on: "images/check.png",
  off: "images/uncheck.png",
};

function preloadUIImages(uiImagePaths) {
  const promises = uiImagePaths.map((path) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = path;
    });
  });

  return Promise.all(promises);
}

// Waits until each sound can play, but never longer than SOUND_PRELOAD_TIMEOUT:
// some phone browsers never report that, which used to leave the loading screen up forever.
function preloadSounds() {
  const sounds = [finalSound, cheersSound, reloadSound, gunshotSound];

  return Promise.all(
    sounds.map((sound) => {
      return new Promise((resolve) => {
        const done = () => {
          clearTimeout(timeoutId);
          sound.removeEventListener("canplaythrough", done);
          sound.removeEventListener("error", done);
          resolve();
        };
        const timeoutId = setTimeout(done, SOUND_PRELOAD_TIMEOUT);

        sound.addEventListener("canplaythrough", done);
        sound.addEventListener("error", done);
        sound.load();
      });
    })
  );
}

// Reads leagues.json (kept up to date by the update-leagues job) so "Find Builds" opens the current league.
// If the file is missing or unreadable, the league written in game-config.js is used.
function loadCurrentBuildsLeague() {
  if (!activeGame.buildsLeague || window.location.protocol === "file:") {
    return;
  }

  fetch("leagues.json", { cache: "no-cache" })
    .then((response) => (response.ok ? response.json() : null))
    .then((leagues) => {
      const league = leagues && leagues[ACTIVE_GAME_ID];

      if (typeof league === "string" && /^[a-z0-9]+$/.test(league)) {
        currentBuildsLeague = league;
      }
    })
    .catch(() => {});
}

// ===== CLASS SELECTOR =====
function clampCurrentClassIndex() {
  if (currentClassIndex >= selectedClasses.length) {
    currentClassIndex = 0;
  }
}

function updateClassSelectorToggleText() {
  classSelectorToggle.textContent =
    selectedClasses.length === classOptions.length ? "Deselect All" : "Select All";
}

function updateSelectedClasses() {
  if (isClassSelectorLocked) {
    return;
  }

  const selectedNames = [
    ...classSelectorList.querySelectorAll(".class-selector-check[data-selected='true']"),
  ].map((toggle) => toggle.dataset.className);

  if (selectedNames.length === 0) {
    return;
  }

  // Update the active entries from the selector.
  for (let i = selectedClasses.length - 1; i >= 0; i--) {
    if (!selectedNames.includes(selectedClasses[i])) {
      selectedClasses.splice(i, 1);
    }
  }

  // Add newly selected classes (append to end)
  classOptions.forEach((className) => {
    if (
      selectedNames.includes(className) &&
      !selectedClasses.includes(className)
    ) {
      selectedClasses.push(className);
    }
  });

  shuffleClasses(selectedClasses);
  clampCurrentClassIndex();
  updateClassSelectorToggleText();
  markWheelCacheDirty();
  drawWheel();
}

function setClassSelectorToggle(toggle, isSelected) {
  toggle.dataset.selected = String(isSelected);
  toggle.src = isSelected ? CHECKBOX_IMAGES.on : CHECKBOX_IMAGES.off;
  toggle.alt = isSelected ? "Selected" : "Not selected";
}

function renderClassSelector() {
  classSelectorList.innerHTML = "";

  const selectorOptions = isWowSpecializationMode
    ? classOptions
    : [...classOptions].sort((firstClass, secondClass) => {
        return getSelectorLabel(firstClass).localeCompare(
          getSelectorLabel(secondClass)
        );
      });

  selectorOptions
    .forEach((className) => {
      const item = document.createElement("button");
      const toggle = document.createElement("img");
      const text = document.createElement("span");
      const isSelected = selectedClasses.includes(className);

      item.className = "class-selector-item";
      item.type = "button";
      toggle.className = "class-selector-check";
      toggle.dataset.className = className;
      toggle.setAttribute("aria-hidden", "true");
      text.textContent = getSelectorLabel(className);
      setClassSelectorToggle(toggle, isSelected);

      item.addEventListener("click", () => {
        const shouldSelect = toggle.dataset.selected !== "true";

        if (!shouldSelect && selectedClasses.length === 1) {
          return;
        }

        setClassSelectorToggle(toggle, shouldSelect);
        updateSelectedClasses();
      });

      item.append(toggle, text);
      classSelectorList.append(item);
    });

  updateClassSelectorToggleText();
}

function getSelectorLabel(className) {
  return classConfigs.get(className).selectorLabel || className;
}

function updateWowWheelTypeVisuals() {
  if (!activeGame.selectionModes) {
    return;
  }

  wowWheelTypeLabels.forEach((label, index) => {
    const isActive = isWowSpecializationMode ? index === 1 : index === 0;

    label.classList.toggle("active", isActive);
    label.classList.toggle("inactive", !isActive);
  });

  wowWheelTypeToggleImage.src = isWowSpecializationMode
    ? "images/elimination.png"
    : "images/classic.png";
  classSelectorPanel.setAttribute(
    "aria-label",
    isWowSpecializationMode ? "Specialization selection" : "Class selection"
  );
}

function setWowWheelType(isSpecializationMode) {
  if (!activeGame.selectionModes || isWowWheelTypeLocked) {
    return;
  }

  isWowSpecializationMode = isSpecializationMode;
  const choices = activeGame.selectionModes[
    isWowSpecializationMode ? "specializations" : "classes"
  ];

  classOptions = choices.map((choice) => choice.name);
  preloadPortraits(classOptions);
  selectedClasses.length = 0;
  selectedClasses.push(
    ...choices
      .filter((choice) => choice.selectedByDefault)
      .map((choice) => choice.name)
  );
  shuffleClasses(selectedClasses);
  currentClassIndex = 0;
  pendingElimination = null;
  wheelRotation = 0;
  updateWowWheelTypeVisuals();
  renderClassSelector();
  markWheelCacheDirty();
  drawWheel();
}

function lockClassSelector() {
  isClassSelectorLocked = true;
  isWowWheelTypeLocked = true;
  classSelectorPanel.classList.add("is-locked");

  classSelectorList.querySelectorAll(".class-selector-item").forEach((item) => {
    item.disabled = true;
  });
  classSelectorToggle.disabled = true;
}

function toggleAllClasses() {
  if (isClassSelectorLocked) {
    return;
  }

  const shouldSelectAll = selectedClasses.length !== classOptions.length;
  const toggles = [...classSelectorList.querySelectorAll(".class-selector-check")];

  toggles.forEach((toggle) => {
    setClassSelectorToggle(toggle, shouldSelectAll);
  });

  if (!shouldSelectAll) {
    setClassSelectorToggle(toggles[0], true);
  }

  updateSelectedClasses();
}

// ===== WHEEL RENDERING =====
function markWheelCacheDirty() {
  isWheelCacheDirty = true;
}

function syncWheelCacheSize() {
  if (
    wheelCacheCanvas.width === classWheel.width &&
    wheelCacheCanvas.height === classWheel.height
  ) {
    return;
  }

  wheelCacheCanvas.width = classWheel.width;
  wheelCacheCanvas.height = classWheel.height;
  markWheelCacheDirty();
}

function drawImageInSlice(context, className, image, radius, segmentAngle) {
  const config = imageConfigs[className];
  const imageCenterDistance = selectedClasses.length === 1 ? 0 : radius * 0.55;
  const imageAngle = segmentAngle / 2;
  const imageCenterX = Math.cos(imageAngle) * imageCenterDistance;
  const imageCenterY = Math.sin(imageAngle) * imageCenterDistance;
  const drawSize = selectedClasses.length <= 3 ? radius * 2.2 : radius * 1.35;
  const imageRatio = image.width / image.height;
  let drawWidth = drawSize;
  let drawHeight = drawSize;

  if (imageRatio > 1) {
    drawWidth = drawSize * imageRatio;
  } else {
    drawHeight = drawSize / imageRatio;
  }

  context.save();
  context.translate(imageCenterX + config.offsetX, imageCenterY + config.offsetY);
  context.rotate(config.rotation);
  context.scale(config.scale, config.scale);

  if (config.hasGoldIconFrame) {
    const framePadding = 14;

    context.save();
    context.fillStyle = "rgba(8, 7, 4, 0.92)";
    context.shadowColor = "rgba(0, 0, 0, 0.78)";
    context.shadowBlur = 20;
    context.shadowOffsetY = 14;
    context.fillRect(
      -drawWidth / 2 - framePadding,
      -drawHeight / 2 - framePadding,
      drawWidth + framePadding * 2,
      drawHeight + framePadding * 2
    );
    context.restore();
  }

  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  if (config.hasGoldIconFrame) {
    context.save();
    context.lineJoin = "round";
    context.strokeStyle = "#4c2e00";
    context.lineWidth = 18;
    context.strokeRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.strokeStyle = "#f4c946";
    context.lineWidth = 6;
    context.strokeRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();
  }

  context.restore();
}

// Rebuilds the static wheel into an offscreen canvas so animation only rotates a cached image.
function updateWheelCache() {
  clampCurrentClassIndex();
  syncWheelCacheSize();

  const centerX = wheelCacheCanvas.width / 2;
  const centerY = wheelCacheCanvas.height / 2;
  const radius = Math.min(wheelCacheCanvas.width, wheelCacheCanvas.height) / 2 - 8;
  const segmentAngle = (Math.PI * 2) / selectedClasses.length;

  wheelCacheContext.clearRect(0, 0, wheelCacheCanvas.width, wheelCacheCanvas.height);

  selectedClasses.forEach((className, index) => {
    const startAngle = index * segmentAngle;
    const classImage = classImages[className];

    wheelCacheContext.save();
    wheelCacheContext.translate(centerX, centerY);
    wheelCacheContext.rotate(startAngle);
    wheelCacheContext.beginPath();
    wheelCacheContext.moveTo(0, 0);
    wheelCacheContext.arc(0, 0, radius, 0, segmentAngle);
    wheelCacheContext.closePath();

    const sliceBackgroundColor =
      classConfigs.get(className).wheelImageConfig.sliceBackgroundColor ||
      imageBackgroundColor;

    if (sliceBackgroundColor) {
      wheelCacheContext.fillStyle = sliceBackgroundColor;
      wheelCacheContext.fill();
    }

    if (classImage) {
      wheelCacheContext.save();
      wheelCacheContext.clip();
      drawImageInSlice(
        wheelCacheContext,
        className,
        classImage,
        radius,
        segmentAngle
      );
      wheelCacheContext.restore();
    } else {
      wheelCacheContext.fillStyle = classColors[className];
      wheelCacheContext.fill();
    }

    if (isTuningMode && index === currentClassIndex) {
      wheelCacheContext.strokeStyle = "#fff1a8";
      wheelCacheContext.lineWidth = 6;
    } else {
      wheelCacheContext.strokeStyle = "#111318";
      wheelCacheContext.lineWidth = 1;
    }

    wheelCacheContext.stroke();
    wheelCacheContext.restore();
  });

  selectedClasses.forEach((_, index) => {
    const markerAngle = index * segmentAngle;
    const pegX = centerX + Math.cos(markerAngle) * (radius - 5);
    const pegY = centerY + Math.sin(markerAngle) * (radius - 5);
    const pegGradient = wheelCacheContext.createRadialGradient(
      pegX - 4,
      pegY - 4,
      2,
      pegX,
      pegY,
      10
    );

    pegGradient.addColorStop(0, "#fff1a8");
    pegGradient.addColorStop(0.45, "#d6a63f");
    pegGradient.addColorStop(1, "#7a5018");

    wheelCacheContext.beginPath();
    wheelCacheContext.arc(pegX, pegY, 10, 0, Math.PI * 2);
    wheelCacheContext.fillStyle = pegGradient;
    wheelCacheContext.fill();
    wheelCacheContext.strokeStyle = "rgba(255, 255, 255, 0.45)";
    wheelCacheContext.lineWidth = 2;
    wheelCacheContext.stroke();
  });

  isWheelCacheDirty = false;
}

function drawWheel() {
  syncWheelCacheSize();

  if (isWheelCacheDirty) {
    updateWheelCache();
  }

  const centerX = classWheel.width / 2;
  const centerY = classWheel.height / 2;

  wheelContext.clearRect(0, 0, classWheel.width, classWheel.height);
  wheelContext.save();
  wheelContext.translate(centerX, centerY);
  wheelContext.rotate(wheelRotation);
  wheelContext.drawImage(wheelCacheCanvas, -centerX, -centerY);
  wheelContext.restore();
}

// ===== SPIN LOGIC =====
function shuffleClasses(options) {
  for (let index = options.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentClass = options[index];

    options[index] = options[randomIndex];
    options[randomIndex] = currentClass;
  }
}

function getRandomClass(options) {
  const randomIndex = Math.floor(Math.random() * options.length);

  return {
    index: randomIndex,
    name: options[randomIndex],
  };
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function normalizeAngle(angle) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function getSegmentAtPointer() {
  const segmentAngle = (Math.PI * 2) / selectedClasses.length;
  const angleUnderPointer = normalizeAngle(POINTER_ANGLE - wheelRotation);

  return Math.floor(angleUnderPointer / segmentAngle);
}

function pushPointer() {
  wheelPointer.classList.remove("is-pushed");
  void wheelPointer.offsetWidth;
  wheelPointer.classList.add("is-pushed");
}

// Animates to the selected segment while playing tick sounds as segment boundaries pass.
function spinWheelToClass(selectedClass) {
  const segmentAngle = (Math.PI * 2) / selectedClasses.length;
  const selectedSegmentStart = selectedClass.index * segmentAngle;
  const randomPointInSegment = selectedSegmentStart + Math.random() * segmentAngle;
  const targetAngle = POINTER_ANGLE - randomPointInSegment;
  const extraSpins = 3 + Math.floor(Math.random() * 3);
  const startRotation = wheelRotation;
  const rotationChange =
    ((targetAngle - startRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const endRotation = startRotation + extraSpins * Math.PI * 2 + rotationChange;
  const startTime = performance.now();

  isSpinning = true;
  previousSegmentIndex = getSegmentAtPointer();

  function animateSpin(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / SPIN_DURATION, 1);
    const easedProgress = easeOutCubic(progress);

    wheelRotation = startRotation + (endRotation - startRotation) * easedProgress;
    drawWheel();

    const currentSegmentIndex = getSegmentAtPointer();

    if (currentSegmentIndex !== previousSegmentIndex) {
      playTickSound();
      pushPointer();
      previousSegmentIndex = currentSegmentIndex;
    }

    if (progress < 1) {
      spinFrameId = requestAnimationFrame(animateSpin);
      return;
    }

    spinFrameId = null;
    isSpinning = false;
    previousSegmentIndex = null;

    if (isClassicMode) {
      selectedClasses.length = 1;
      selectedClasses[0] = selectedClass.name;
      showFinalClass();
    } else {
      showEliminatedClass(selectedClass.name);
    }
  }

  spinFrameId = requestAnimationFrame(animateSpin);
}

function tuneCurrentClass(event) {
  const currentClass = selectedClasses[currentClassIndex];
  const config = imageConfigs[currentClass];
  const offsetStep = 10;
  const scaleStep = 0.05;
  const rotationStep = 0.05;

  if (!config) {
    return false;
  }

  if (event.key === "ArrowLeft") {
    config.offsetX -= offsetStep;
  } else if (event.key === "ArrowRight") {
    config.offsetX += offsetStep;
  } else if (event.key === "ArrowUp") {
    config.offsetY -= offsetStep;
  } else if (event.key === "ArrowDown") {
    config.offsetY += offsetStep;
  } else if (event.key === "+" || event.key === "=") {
    config.scale += scaleStep;
  } else if (event.key === "-") {
    config.scale = Math.max(scaleStep, config.scale - scaleStep);
  } else if (event.key.toLowerCase() === "q") {
    config.rotation -= rotationStep;
  } else if (event.key.toLowerCase() === "e") {
    config.rotation += rotationStep;
  } else if (event.key === "Tab") {
    currentClassIndex = (currentClassIndex + 1) % selectedClasses.length;
  } else if (event.key.toLowerCase() === "s") {
    console.log(currentClass, { ...config });
  } else if (event.key.toLowerCase() === "a") {
    console.log(JSON.stringify(imageConfigs, null, 2));
  } else {
    return false;
  }

  return true;
}

// ===== MODAL =====
function showModal(message, className = message, isFinal = false) {
  bloodSplatter.classList.remove("show");

  const classConfig = classConfigs.get(className);
  const classImage = classImages[className];
  const imagePath = isFinal
    ? classConfig.assets.hasOwnFinalArtwork
      ? classConfig.assets.finalArtwork
      : classImage?.src || classConfig.assets.finalArtwork
    : classConfig.assets.portrait;

  if (!isFinal) {
    modalText.innerHTML = `
      ${message}
      <div class="eliminated-text">Eliminated</div>
    `;
  } else {
    modalText.textContent = message;
  }

  modalPortrait.src = imagePath;
  modalPortrait.alt = className;
  modalPortrait.className = isFinal
    ? "popup-portrait final-popup-image"
    : "popup-portrait";
  modalContent.classList.toggle("is-final-popup", isFinal);
  modalReminder.classList.toggle("hidden", !isFinal);
  if (isFinal && typeof activeGame.getBuildUrl === "function") {
    findBuildsBtn.classList.remove("hidden");

    findBuildsBtn.onclick = () => {
      window.open(activeGame.getBuildUrl(className, currentBuildsLeague), "_blank");
    };
  } else {
    findBuildsBtn.classList.add("hidden");

    // Important: remove any previous click handler
    findBuildsBtn.onclick = null;
  }
  document.body.classList.add("popup-active");
  modalOverlay.classList.remove("hidden");

  if (!isFinal) {
    playEliminationEffects();
  }
}

function playEliminationEffects() {
  playSound(reloadSound);

  schedule(() => {
    playSound(gunshotSound);

    modalContent.classList.add("shake");
    schedule(() => {
      modalContent.classList.remove("shake");
    }, SHAKE_DURATION);

    schedule(() => {
      const randomX = (Math.random() - 0.5) * BLOOD_RANDOM_RANGE;
      const randomY = (Math.random() - 0.5) * BLOOD_RANDOM_RANGE;

      bloodSplatter.style.transform =
        `translate(calc(-50% + ${randomX}px), ` +
        `calc(-50% + ${randomY + BLOOD_VERTICAL_OFFSET}px)) scale(0.9)`;
      bloodSplatter.classList.add("show");
    }, BLOOD_DELAY);
  }, GUNSHOT_DELAY);
}

function hideModal() {
  modalOverlay.classList.add("hidden");
  document.body.classList.remove("popup-active");
}

function showFinalClass() {
  isFinished = true;
  playSound(finalSound);
  showModal(
    activeGame.getFinalMessage(selectedClasses[0]),
    selectedClasses[0],
    true
  );
}

function showEliminatedClass(className) {
  showModal(className);
}

function showFinalClassAfterCheers() {
  if (cheersSound.ended || cheersSound.paused) {
    showFinalClass();
    return;
  }

  cheersSound.addEventListener("ended", showFinalClass, { once: true });
}

// ===== EVENTS =====
function updateModeToggleVisuals() {
  modeToggleImage.src = isClassicMode
    ? "images/classic.png"
    : "images/elimination.png";

  if (isClassicMode) {
    modeLabels[0].classList.add("active");
    modeLabels[0].classList.remove("inactive");
    modeLabels[1].classList.add("inactive");
    modeLabels[1].classList.remove("active");
  } else {
    modeLabels[1].classList.add("active");
    modeLabels[1].classList.remove("inactive");
    modeLabels[0].classList.add("inactive");
    modeLabels[0].classList.remove("active");
  }
}

function handleWheelClick() {
  if (!areClassImagesLoaded || pendingElimination || isFinished || isSpinning) {
    return;
  }

  lockClassSelector();

  if (selectedClasses.length === 1) {
    preloadFinalArtwork(selectedClasses[0]);
    showFinalClass();
    return;
  }

  pendingElimination = getRandomClass(selectedClasses);

  // The winner is already certain in Classic mode, or when this spin leaves one entry standing.
  if (isClassicMode) {
    preloadFinalArtwork(pendingElimination.name);
  } else if (selectedClasses.length === 2) {
    preloadFinalArtwork(selectedClasses[1 - pendingElimination.index]);
  }

  spinWheelToClass(pendingElimination);
}

function handleModalOkClick() {
  if (isFinished) {
    hideModal();
    return;
  }

  hideModal();

  selectedClasses.splice(pendingElimination.index, 1);
  pendingElimination = null;
  shuffleClasses(selectedClasses);
  clampCurrentClassIndex();
  markWheelCacheDirty();
  drawWheel();

  if (selectedClasses.length === 1) {
    showFinalClassAfterCheers();
  }
}

function handleKeydown(event) {
  if (event.key.toLowerCase() === "d") {
    isTuningMode = !isTuningMode;
    markWheelCacheDirty();
    drawWheel();
    return;
  }

  if (isTuningMode && tuneCurrentClass(event)) {
    event.preventDefault();
    markWheelCacheDirty();
    drawWheel();
    return;
  }

  if (
    event.key.toLowerCase() !== "f" ||
    selectedClasses.length <= 3 ||
    isClassSelectorLocked
  ) {
    return;
  }

  const selectedIndexes = [];

  while (selectedIndexes.length < 3) {
    const randomIndex = Math.floor(Math.random() * selectedClasses.length);

    if (!selectedIndexes.includes(randomIndex)) {
      selectedIndexes.push(randomIndex);
    }
  }

  selectedIndexes.sort((firstIndex, secondIndex) => firstIndex - secondIndex);

  const fastForwardClasses = selectedIndexes.map((index) => selectedClasses[index]);

  selectedClasses.length = 0;
  selectedClasses.push(...fastForwardClasses);
  shuffleClasses(selectedClasses);
  pendingElimination = null;
  isSpinning = false;
  previousSegmentIndex = null;
  currentClassIndex = 0;
  hideModal();
  renderClassSelector();
  markWheelCacheDirty();
  drawWheel();
}

function handleModeToggleClick() {
  isClassicMode = !isClassicMode;
  updateModeToggleVisuals();
}

function handleWowWheelTypeToggleClick() {
  setWowWheelType(!isWowSpecializationMode);
}

// Puts everything back exactly as it is right after the page loads, without downloading the page again.
function restartApp() {
  if (spinFrameId !== null) {
    cancelAnimationFrame(spinFrameId);
    spinFrameId = null;
  }

  pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  pendingTimeouts.clear();
  cheersSound.removeEventListener("ended", showFinalClass);
  stopAllSounds();

  hideModal();
  modalContent.classList.remove("shake");
  bloodSplatter.classList.remove("show");
  wheelPointer.classList.remove("is-pushed");

  tickIndex = 0;
  pendingElimination = null;
  isFinished = false;
  wheelRotation = 0;
  isSpinning = false;
  previousSegmentIndex = null;
  isTuningMode = false;
  currentClassIndex = 0;
  isClassicMode = false;
  isClassSelectorLocked = false;
  isWowSpecializationMode = false;
  isWowWheelTypeLocked = false;

  allWheelEntries.forEach((classConfig) => {
    imageConfigs[classConfig.name] = { ...classConfig.wheelImageConfig };
  });

  classOptions = initialWheelEntries.map((classConfig) => classConfig.name);
  selectedClasses.length = 0;
  selectedClasses.push(
    ...initialWheelEntries
      .filter((classConfig) => classConfig.selectedByDefault)
      .map((classConfig) => classConfig.name)
  );
  shuffleClasses(selectedClasses);

  classSelectorPanel.classList.remove("is-locked");
  classSelectorToggle.disabled = false;
  renderClassSelector();
  updateModeToggleVisuals();
  updateWowWheelTypeVisuals();
  markWheelCacheDirty();
  drawWheel();
}

function bindEvents() {
  document.addEventListener("click", unlockAudio);
  document.addEventListener("keydown", handleKeydown);
  classWheel.addEventListener("click", handleWheelClick);
  modalOk.addEventListener("click", handleModalOkClick);
  modeToggleImage.addEventListener("click", handleModeToggleClick);
  wowWheelTypeToggleImage.addEventListener("click", handleWowWheelTypeToggleClick);
  restartButton.addEventListener("click", restartApp);
  classSelectorToggle.addEventListener("click", toggleAllClasses);
}

// ===== INIT =====
function init() {
  normalizeActiveGameUrl();
  applyActiveGameConfig();
  shuffleClasses(selectedClasses);
  initializeClassAssets();
  bindEvents();
  renderClassSelector();
  updateModeToggleVisuals();
  updateWowWheelTypeVisuals();

  loadCurrentBuildsLeague();

  Promise.all([
    preloadClassImages(),
    preloadSounds(),
    preloadUIImages(CRITICAL_UI_IMAGES),
  ]).then(() => {
    areClassImagesLoaded = true;
    markWheelCacheDirty();
    drawWheel();
    document.body.classList.remove("loading");
    loader.style.display = "none";

    preloadPortraits();
    preloadUIImages(POPUP_UI_IMAGES);
  });
}

init();
