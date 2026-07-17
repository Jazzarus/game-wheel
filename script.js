// ===== ACTIVE GAME =====
const activeGame = GAME_CONFIGS[ACTIVE_GAME_ID];
const classConfigs = new Map(
  activeGame.classes.map((classConfig) => [classConfig.name, classConfig])
);
const classOptions = activeGame.classes.map((classConfig) => classConfig.name);
const selectedClasses = activeGame.classes
  .filter((classConfig) => classConfig.selectedByDefault)
  .map((classConfig) => classConfig.name);
const segmentColors = activeGame.wheel.segmentColors;
const imageBackgroundColor = activeGame.wheel.imageBackgroundColor;
const classColors = {};
const classImagePaths = {};
const classImages = {};
const imageConfigs = Object.fromEntries(
  activeGame.classes.map((classConfig) => [
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
const modeLabels = document.querySelectorAll(".mode-label");
const restartButton = document.getElementById("restartButton");
const siteBase = document.getElementById("siteBase");
const gameLogo = document.getElementById("gameLogo");
const gameSwitchLink = document.getElementById("gameSwitchLink");
const inactiveGameLogo = document.getElementById("inactiveGameLogo");
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

function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  const testAudio = new Audio("sounds/tick.mp3");
  testAudio.volume = 0;
  testAudio.play().catch(() => {});
  audioUnlocked = true;
}

function playTickSound() {
  const sound = tickSounds[tickIndex];

  sound.currentTime = 0;
  sound.play();

  tickIndex = (tickIndex + 1) % TICK_POOL_SIZE;
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
  const inactiveGame = Object.values(GAME_CONFIGS).find((gameConfig) => {
    return gameConfig.id !== ACTIVE_GAME_ID;
  });

  document.title = activeGame.ui.documentTitle;
  gameHeading.textContent = activeGame.ui.heading;
  gameLogo.src = activeGame.ui.logo.src;
  gameLogo.alt = activeGame.ui.logo.alt;
  inactiveGameLogo.src = inactiveGame.ui.logo.src;
  inactiveGameLogo.alt = inactiveGame.ui.logo.alt;
  gameSwitchLink.href = getGameEntryUrl(inactiveGame.id).href;
  gameSwitchLink.setAttribute("aria-label", `Switch to ${inactiveGame.ui.logo.alt}`);
  gameSwitchLink.title = `Switch to ${inactiveGame.ui.logo.alt}`;
}

function initializeClassAssets() {
  classOptions.forEach((className, index) => {
    const classConfig = classConfigs.get(className);

    classColors[className] = segmentColors[index % segmentColors.length];
    classImagePaths[className] = classConfig.assets.wheel.primary;
  });
}

function preloadClassImages() {
  const imagePromises = classOptions.map((className) => {
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

function preloadPortraits() {
  const portraitPromises = classOptions.map((className) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = classConfigs.get(className).assets.portrait;
    });
  });

  return Promise.all(portraitPromises);
}

function preloadUIImages() {
  const uiImagePaths = [
    "images/window.png",
    "images/frame.png",
    "images/blood.png",
    "images/arrow.png",
    "images/ring.png",
    ...Object.values(GAME_CONFIGS).map((gameConfig) => gameConfig.ui.logo.src),
    "images/banner.png",
    "images/jazzarus-logo.png",
    "images/youtube-logo.png",
    "images/check.png",
    "images/uncheck.png",
    "images/goldbutton.png",
  ];

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

function preloadSounds() {
  const sounds = [finalSound, cheersSound, reloadSound, gunshotSound];

  return Promise.all(
    sounds.map((sound) => {
      return new Promise((resolve) => {
        sound.oncanplaythrough = resolve;
        sound.load();
      });
    })
  );
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

  // Remove deselected classes (preserve order)
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

  clampCurrentClassIndex();
  updateClassSelectorToggleText();
  markWheelCacheDirty();
  drawWheel();
}

function setClassSelectorToggle(toggle, isSelected) {
  toggle.dataset.selected = String(isSelected);
  toggle.src = isSelected ? "images/check.png" : "images/uncheck.png";
  toggle.alt = isSelected ? "Selected" : "Not selected";
}

function renderClassSelector() {
  classSelectorList.innerHTML = "";

  [...classOptions]
    .sort((firstClass, secondClass) => {
      return firstClass.localeCompare(secondClass);
    })
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
      text.textContent = className;
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

function lockClassSelector() {
  isClassSelectorLocked = true;
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
  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
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

    if (imageBackgroundColor) {
      wheelCacheContext.fillStyle = imageBackgroundColor;
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
      requestAnimationFrame(animateSpin);
      return;
    }

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

  requestAnimationFrame(animateSpin);
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
    ? classImage?.src || classConfig.assets.finalArtwork
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
  if (isFinal) {
    findBuildsBtn.classList.remove("hidden");

    findBuildsBtn.onclick = () => {
      window.open(activeGame.getBuildUrl(className), "_blank");
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
  reloadSound.currentTime = 0;
  reloadSound.play();

  setTimeout(() => {
    gunshotSound.currentTime = 0;
    gunshotSound.play();

    modalContent.classList.add("shake");
    setTimeout(() => {
      modalContent.classList.remove("shake");
    }, SHAKE_DURATION);

    setTimeout(() => {
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
  finalSound.currentTime = 0;
  finalSound.play();
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
    showFinalClass();
    return;
  }

  pendingElimination = getRandomClass(selectedClasses);
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

function bindEvents() {
  document.addEventListener("click", unlockAudio);
  document.addEventListener("keydown", handleKeydown);
  classWheel.addEventListener("click", handleWheelClick);
  modalOk.addEventListener("click", handleModalOkClick);
  modeToggleImage.addEventListener("click", handleModeToggleClick);
  restartButton.addEventListener("click", () => {
    location.reload();
  });
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

  Promise.all([
    preloadClassImages(),
    preloadPortraits(),
    preloadSounds(),
    preloadUIImages(),
  ]).then(() => {
    areClassImagesLoaded = true;
    markWheelCacheDirty();
    drawWheel();
    document.body.classList.remove("loading");
    loader.style.display = "none";
  });
}

init();
