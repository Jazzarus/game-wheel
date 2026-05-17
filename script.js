const classOptions = [
  "Deadeye",
  "Pathfinder",
  "Amazon",
  "Spirit Walker",
  "Ritualist",
  "Martial Artist",
  "Invoker",
  "Acolyte of Chayula",
  "Infernalist",
  "Blood Mage",
  "Lich",
  "Stormweaver",
  "Chronomancer",
  "Disciple of Varashta",
  "Titan",
  "Warbringer",
  "Smith of Kitava",
  "Tactician",
  "Witchhunter",
  "Gemling Legionnaire",
  "Oracle",
  "Shaman",
];

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
const segmentColors = ["#8b2f39", "#2f5f8b", "#6f7f35", "#7a4f91"];
const classColors = {};
const classImagePaths = {};
const classImages = {};
const imageConfigs = {
  "Smith of Kitava": {
    offsetX: 110,
    offsetY: 150,
    scale: 1.6500000000000006,
    rotation: 0,
  },
  "Warbringer": {
    offsetX: 130,
    offsetY: 260,
    scale: 1.7000000000000006,
    rotation: 0,
  },
  "Disciple of Varashta": {
    offsetX: 110,
    offsetY: -20,
    scale: 1.8000000000000007,
    rotation: 0,
  },
  "Titan": {
    offsetX: 140,
    offsetY: 160,
    scale: 1.8500000000000008,
    rotation: 0,
  },
  "Acolyte of Chayula": {
    offsetX: 20,
    offsetY: 120,
    scale: 2.3999999999999995,
    rotation: 0,
  },
  "Infernalist": {
    offsetX: 10,
    offsetY: 360,
    scale: 2.3499999999999996,
    rotation: 0,
  },
  "Tactician": {
    offsetX: 0,
    offsetY: 270,
    scale: 1.8500000000000008,
    rotation: 0,
  },
  "Pathfinder": {
    offsetX: 90,
    offsetY: 150,
    scale: 1.6500000000000006,
    rotation: 0,
  },
  "Witchhunter": {
    offsetX: -20,
    offsetY: 210,
    scale: 1.7000000000000006,
    rotation: 0,
  },
  "Lich": {
    offsetX: 0,
    offsetY: 280,
    scale: 2.2,
    rotation: 0,
  },
  "Deadeye": {
    offsetX: 10,
    offsetY: 210,
    scale: 1.8000000000000007,
    rotation: 0,
  },
  "Amazon": {
    offsetX: 120,
    offsetY: 140,
    scale: 2.000000000000001,
    rotation: 0,
  },
  "Ritualist": {
    offsetX: -10,
    offsetY: 240,
    scale: 1.7000000000000006,
    rotation: 0,
  },
  "Gemling Legionnaire": {
    offsetX: 140,
    offsetY: 390,
    scale: 2.3,
    rotation: 0,
  },
  "Spirit Walker": {
    offsetX: 190,
    offsetY: 190,
    scale: 1.8500000000000008,
    rotation: 0,
  },
  "Stormweaver": {
    offsetX: 220,
    offsetY: 300,
    scale: 2.3999999999999995,
    rotation: 0,
  },
  "Chronomancer": {
    offsetX: 80,
    offsetY: 260,
    scale: 2.1500000000000004,
    rotation: 0,
  },
  "Shaman": {
    offsetX: 110,
    offsetY: 330,
    scale: 2.549999999999999,
    rotation: 0,
  },
  "Blood Mage": {
    offsetX: 40,
    offsetY: 210,
    scale: 1.9500000000000008,
    rotation: 0,
  },
  "Martial Artist": {
    offsetX: 60,
    offsetY: 140,
    scale: 1.6000000000000005,
    rotation: 0,
  },
  "Oracle": {
    offsetX: 30,
    offsetY: 340,
    scale: 2.849999999999998,
    rotation: 0,
  },
  "Invoker": {
    offsetX: 70,
    offsetY: 340,
    scale: 2.25,
    rotation: 0,
  },
};
const finalSound = new Audio("sounds/howl.mp3");
const cheersSound = new Audio("sounds/cheers.mp3");
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

document.addEventListener("click", () => {
  if (!audioUnlocked) {
    const testAudio = new Audio("sounds/tick.mp3");
    testAudio.volume = 0;
    testAudio.play().catch(() => {});
    audioUnlocked = true;
  }
});

finalSound.loop = false;
cheersSound.loop = false;

function shuffleClasses(options) {
  for (let index = options.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentClass = options[index];

    options[index] = options[randomIndex];
    options[randomIndex] = currentClass;
  }
}

shuffleClasses(classOptions);

function getClassAssetName(className) {
  return className.toLowerCase().replace(/\s+/g, "-");
}

classOptions.forEach((className, index) => {
  classColors[className] = segmentColors[index % segmentColors.length];
  classImagePaths[className] = `images/${getClassAssetName(className)}.jpg`;
  initializeImageConfig(className);
});

function initializeImageConfig(className) {
  if (imageConfigs[className]) {
    return;
  }

  imageConfigs[className] = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
  };
}

function preloadClassImages() {
  const imagePromises = classOptions.map((className) => {
    return new Promise((resolve) => {
      const image = new Image();
      const pngPath = classImagePaths[className].replace(".jpg", ".png");

      image.onload = () => {
        classImages[className] = image;
        resolve();
      };

      image.onerror = () => {
        image.onerror = resolve;
        image.src = pngPath;
      };

      image.src = classImagePaths[className];
    });
  });

  return Promise.all(imagePromises);
}

function getRandomClass(options) {
  const randomIndex = Math.floor(Math.random() * options.length);

  return {
    index: randomIndex,
    name: options[randomIndex],
  };
}

function clampCurrentClassIndex() {
  if (currentClassIndex >= classOptions.length) {
    currentClassIndex = 0;
  }
}

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

function updateWheelCache() {
  clampCurrentClassIndex();
  syncWheelCacheSize();

  const centerX = wheelCacheCanvas.width / 2;
  const centerY = wheelCacheCanvas.height / 2;
  const radius = Math.min(wheelCacheCanvas.width, wheelCacheCanvas.height) / 2 - 8;
  const segmentAngle = (Math.PI * 2) / classOptions.length;

  wheelCacheContext.clearRect(0, 0, wheelCacheCanvas.width, wheelCacheCanvas.height);

  classOptions.forEach((className, index) => {
    const startAngle = index * segmentAngle;
    const classImage = classImages[className];

    wheelCacheContext.save();
    wheelCacheContext.translate(centerX, centerY);
    wheelCacheContext.rotate(startAngle);
    wheelCacheContext.beginPath();
    wheelCacheContext.moveTo(0, 0);
    wheelCacheContext.arc(0, 0, radius, 0, segmentAngle);
    wheelCacheContext.closePath();

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

  classOptions.forEach((_, index) => {
    const markerAngle = index * segmentAngle;
    const pegX = centerX + Math.cos(markerAngle) * (radius - 10);
    const pegY = centerY + Math.sin(markerAngle) * (radius - 10);
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

function drawImageInSlice(context, className, image, radius, segmentAngle) {
  const config = imageConfigs[className];
  const imageCenterDistance = classOptions.length === 1 ? 0 : radius * 0.55;
  const imageAngle = segmentAngle / 2;
  const imageCenterX = Math.cos(imageAngle) * imageCenterDistance;
  const imageCenterY = Math.sin(imageAngle) * imageCenterDistance;
  const drawSize = classOptions.length <= 3 ? radius * 2.2 : radius * 1.35;
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

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function normalizeAngle(angle) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function getSegmentAtPointer() {
  const pointerAngle = -Math.PI / 2;
  const segmentAngle = (Math.PI * 2) / classOptions.length;
  const angleUnderPointer = normalizeAngle(pointerAngle - wheelRotation);

  return Math.floor(angleUnderPointer / segmentAngle);
}

function playTickSound() {
  const tickSound = new Audio("sounds/tick.mp3");

  tickSound.play();
}

function pushPointer() {
  wheelPointer.classList.remove("is-pushed");
  void wheelPointer.offsetWidth;
  wheelPointer.classList.add("is-pushed");
}

function spinWheelToClass(selectedClass) {
  const segmentAngle = (Math.PI * 2) / classOptions.length;
  const selectedSegmentStart = selectedClass.index * segmentAngle;
  const randomPointInSegment = selectedSegmentStart + Math.random() * segmentAngle;
  const targetAngle = -Math.PI / 2 - randomPointInSegment;
  const extraSpins = 3 + Math.floor(Math.random() * 3);
  const startRotation = wheelRotation;
  const rotationChange =
    ((targetAngle - startRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const endRotation = startRotation + extraSpins * Math.PI * 2 + rotationChange;
  const duration = 10000;
  const startTime = performance.now();

  isSpinning = true;
  previousSegmentIndex = getSegmentAtPointer();

  function animateSpin(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
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
    showEliminatedClass(selectedClass.name);
  }

  requestAnimationFrame(animateSpin);
}

function showModal(message, className = message, isFinal = false) {
  const classImage = classImages[className];
  const imagePath = isFinal
    ? classImage?.src || classImagePaths[className]
    : `portraits/${getClassAssetName(className)}.png`;

  modalText.textContent = message;
  modalPortrait.src = imagePath;
  modalPortrait.alt = className;
  modalPortrait.className = isFinal
    ? "popup-portrait final-popup-image"
    : "popup-portrait";
  modalContent.classList.toggle("is-final-popup", isFinal);
  modalReminder.classList.toggle("hidden", !isFinal);
  document.body.classList.add("popup-active");
  modalOverlay.classList.remove("hidden");
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
    `CONGRATULATIONS, YOU'LL PLAY ${classOptions[0].toUpperCase()}`,
    classOptions[0],
    true
  );
}

function showEliminatedClass(className) {
  cheersSound.currentTime = 0;
  cheersSound.play();
  showModal(className);
}

function showFinalClassAfterCheers() {
  if (cheersSound.ended || cheersSound.paused) {
    showFinalClass();
    return;
  }

  cheersSound.addEventListener("ended", showFinalClass, { once: true });
}

function tuneCurrentClass(event) {
  const currentClass = classOptions[currentClassIndex];
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
    currentClassIndex = (currentClassIndex + 1) % classOptions.length;
  } else if (event.key.toLowerCase() === "s") {
    console.log(currentClass, { ...config });
  } else if (event.key.toLowerCase() === "a") {
    console.log(JSON.stringify(imageConfigs, null, 2));
  } else {
    return false;
  }

  return true;
}

classWheel.addEventListener("click", () => {
  if (!areClassImagesLoaded || pendingElimination || isFinished || isSpinning) {
    return;
  }

  pendingElimination = getRandomClass(classOptions);
  spinWheelToClass(pendingElimination);
});

modalOk.addEventListener("click", () => {
  if (isFinished) {
    return;
  }

  hideModal();

  classOptions.splice(pendingElimination.index, 1);
  pendingElimination = null;
  clampCurrentClassIndex();
  markWheelCacheDirty();
  drawWheel();

  if (classOptions.length === 1) {
    showFinalClassAfterCheers();
  }
});

document.addEventListener("keydown", (event) => {
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

  if (event.key.toLowerCase() !== "f" || classOptions.length <= 3) {
    return;
  }

  const selectedIndexes = [];

  while (selectedIndexes.length < 3) {
    const randomIndex = Math.floor(Math.random() * classOptions.length);

    if (!selectedIndexes.includes(randomIndex)) {
      selectedIndexes.push(randomIndex);
    }
  }

  selectedIndexes.sort((firstIndex, secondIndex) => firstIndex - secondIndex);

  const selectedClasses = selectedIndexes.map((index) => classOptions[index]);

  classOptions.length = 0;
  classOptions.push(...selectedClasses);
  pendingElimination = null;
  isSpinning = false;
  previousSegmentIndex = null;
  currentClassIndex = 0;
  hideModal();
  markWheelCacheDirty();
  drawWheel();
});

preloadClassImages().then(() => {
  areClassImagesLoaded = true;
  markWheelCacheDirty();
  drawWheel();
});
