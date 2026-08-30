const keys = ["d", "f", "j", "k"];
let notes = [];
let pendingEvents = [];

let speed = 5;
let misses = 0;
let gameOver = false;
const maxMisses = 5;
let travelTime = 0;

const speedOutput = document.getElementById("speedOutput");
const spawnOutput = document.getElementById("spawnOutput");
const bAudio = document.getElementById("bAudio");
const bVideo = document.getElementById("bVideo");

let isMissing = false;
let keyMiss = false;
let missTimeout;

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");

startButton.addEventListener("click", () => {
    startScreen.style.display = "none";
    
    loadLevel("levels/demo.json");
});

async function loadLevel(levelFile) {
    try {
        const response = await fetch(levelFile);
        const levelData = await response.json();

        speed = levelData.meta.speed;
        speedOutput.innerHTML = speed;
        spawnOutput.innerHTML = "Fixed";

        bAudio.src = levelData.meta.audio;
        if (levelData.meta.video) {
            bVideo.src = levelData.meta.video;
            bVideo.style.opacity = "0.75";
            bVideo.style.transitionDuration = "30s";
        }

        pendingEvents = levelData.timeline.sort((a, b) => a.time - b.time);

        startGame();
    } catch (error) {
        console.error("Error loading level JSON:", error);
    }
}

function startGame() {
    const spawnY = -200;
    const hitZoneY = window.innerHeight - 180;
    const distanceToTravel = hitZoneY - spawnY;

    travelTime = (distanceToTravel / speed) / 60 * 1000;
    
    console.log(`Calculated travel time: ${travelTime.toFixed(0)}ms, Distance: ${distanceToTravel}px, Speed: ${speed}px/frame`);
    
    bAudio.play();
    if (bVideo.src) bVideo.play();
    requestAnimationFrame(update);
}

function spawnSpecificNotes(eventData) {
    const targets = eventData.pos.split("");

    targets.forEach((key) => {
        if (!keys.includes(key)) return;

        const lane = document.getElementById(`lane-${key}`);
        const noteEl = document.createElement("div");
        noteEl.classList.add("note");
        noteEl.style.backgroundColor = "white";
        noteEl.style.boxShadow = `0 0 15px white`;
        lane.appendChild(noteEl);

        notes.push({
            el: noteEl,
            y: -200,
            key: key,
        });
    });

    if (eventData.func === "flash") {
        document.body.style.backgroundColor = "white";
        setTimeout(() => (document.body.style.backgroundColor = "black"), 100);
    }
}

function update() {
    if (gameOver) return;

    const currentAudioTime = bAudio.currentTime * 1000;

    while (
        pendingEvents.length > 0 &&
        currentAudioTime >= pendingEvents[0].time - travelTime
    ) {
        const nextEvent = pendingEvents.shift(); // Remove from queue
        spawnSpecificNotes(nextEvent);
    }

    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        note.y += speed;
        note.el.style.top = note.y + "px";

        if (note.y > window.innerHeight) {
            triggerMiss();
            note.el.remove();
            notes.splice(i, 1);
        }
    }

    requestAnimationFrame(update);
}

document.addEventListener("keydown", (e) => {
    const keyElement = document.getElementById(e.key);
    if (keyElement) {
        keyElement.style.backgroundColor = "rgba(255,255,255,0.25)";
        keyElement.style.transform = "scale(0.9)";
        checkHit(e.key);
    }
});

document.addEventListener("keyup", (e) => {
    const keyElement = document.getElementById(e.key);
    if (keyElement) {
        keyElement.style.backgroundColor = "rgba(0,0,0,0.5)";
        keyElement.style.transform = "scale(1)";
    }
});

function checkHit(key) {
    const keyElement = document.getElementById(key);
    if (!keyElement) return;

    const keyRect = keyElement.getBoundingClientRect();
    let hitFound = false;

    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const noteRect = note.el.getBoundingClientRect();

        if (note.key === key) {
            const isOverlapping =
                noteRect.bottom >= keyRect.top &&
                noteRect.top <= keyRect.bottom;

            if (isOverlapping) {
                createHitEffect(keyElement);
                note.el.remove();
                notes.splice(i, 1);
                hitFound = true;
                break;
            }
        }
    }

    if (!hitFound) {
        keyMiss = true;
        document.body.style.backgroundColor = "white";
        clearTimeout(missTimeout);
        missTimeout = setTimeout(() => {
            keyMiss = false;
            document.body.style.backgroundColor = "black";
        }, 100);
    }
}

function createHitEffect(keyElement) {
    // const effect = document.createElement("div");
    // effect.style.position = "absolute";
    // effect.style.left = "50%";
    // effect.style.top = "50%";
    // effect.style.width = "100%";
    // effect.style.height = "100%";
    // effect.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
    // effect.style.borderRadius = "50%";
    // effect.style.transform = "translate(-50%, -50%) scale(1)";
    // effect.style.transition = "all 0.15s ease-out";
    // effect.style.pointerEvents = "none";
    // effect.style.zIndex = "10";

    // keyElement.style.position = "relative";
    // keyElement.appendChild(effect);

    // requestAnimationFrame(() => {
    //     effect.style.transform = "translate(-50%, -50%) scale(2.5)";
    //     effect.style.opacity = "0";
    // });

    // setTimeout(() => effect.remove(), 300);
}

function triggerMiss() {
    if (gameOver) return;
    misses++;
    isMissing = true;

    document.body.style.backgroundColor = "red";

    if (misses >= maxMisses) {
        gameOver = true;
        bAudio.pause();
        bVideo.pause();
        alert("Game Over!");
    }

    clearTimeout(missTimeout);
    missTimeout = setTimeout(() => {
        isMissing = false;
        document.body.style.backgroundColor = "black";
    }, 100);
}

window.addEventListener("resize", () => {
    if (!gameOver && bAudio.src) {
        gameOver = true;
        bAudio.pause();
        if (bVideo.src) bVideo.pause();
        alert("Game paused: Viewport changed. Reload to restart.");
    }
});