(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const $ = id => document.getElementById(id);

  const W = canvas.width;
  const H = canvas.height;

  const keys = {
    left: false,
    right: false,
    jump: false
  };

  let state = "menu";
  let levelIndex = 0;
  let score = 0;
  let totalCoins = 0;
  let lives = 3;

  let player;
  let platforms;
  let coins;
  let hazards;
  let exit;
  let cameraX;
  let particles = [];
  let invulnerable = 0;

  let lastTime = 0;
  let audioCtx = null;

  // THREE GAME LEVELS

  const levelData = [
    {
      name: "Downtown Dash",
      length: 2200,

      platforms: [
        [0,470,420,70],
        [500,420,220,28],
        [790,360,210,28],
        [1080,420,230,28],
        [1390,350,210,28],
        [1660,410,230,28],
        [1970,450,300,90]
      ],

      coins: [
        [170,425],[290,425],
        [575,375],[660,375],
        [865,315],[950,315],
        [1150,375],[1240,375],
        [1450,305],[1535,305],
        [1740,365],[1830,365],
        [2050,405],[2150,405]
      ],

      hazards: [
        [360,444,36,26],
        [930,334,34,26],
        [1260,394,36,26],
        [1770,384,36,26]
      ],

      exitX: 2160
    },

    {
      name: "Skyline Sprint",
      length: 2460,

      platforms: [
        [0,470,330,70],
        [410,410,190,28],
        [680,350,180,28],
        [940,410,180,28],
        [1200,330,190,28],
        [1470,390,190,28],
        [1740,320,180,28],
        [2010,390,190,28],
        [2290,450,250,90]
      ],

      coins: [
        [120,425],[220,425],
        [465,365],[545,365],
        [735,305],[805,305],
        [990,365],[1060,365],
        [1250,285],[1330,285],
        [1520,345],[1600,345],
        [1785,275],[1860,275],
        [2070,345],[2160,345],
        [2360,405]
      ],

      hazards: [
        [270,444,34,26],
        [730,324,34,26],
        [1030,384,34,26],
        [1550,364,34,26],
        [1810,294,34,26],
        [2110,364,34,26]
      ],

      exitX: 2410
    },

    {
      name: "Neon Heights",
      length: 2700,

      platforms: [
        [0,470,300,70],
        [380,400,170,28],
        [630,330,170,28],
        [880,390,170,28],
        [1130,310,170,28],
        [1380,380,170,28],
        [1630,300,170,28],
        [1880,370,170,28],
        [2130,300,170,28],
        [2390,410,170,28],
        [2610,450,200,90]
      ],

      coins: [
        [90,425],[180,425],
        [425,355],[500,355],
        [675,285],[750,285],
        [925,345],[1000,345],
        [1175,265],[1250,265],
        [1425,335],[1500,335],
        [1675,255],[1750,255],
        [1925,325],[2000,325],
        [2175,255],[2250,255],
        [2430,365],[2500,365],
        [2660,405]
      ],

      hazards: [
        [210,444,34,26],
        [680,304,34,26],
        [950,364,34,26],
        [1450,354,34,26],
        [1690,274,34,26],
        [1950,344,34,26],
        [2200,274,34,26],
        [2440,384,34,26]
      ],

      exitX: 2680
    }
  ];

  // SOUND EFFECTS

  function sound(freq = 600, duration = 0.08, type = "sine") {
    try {
      audioCtx ||= new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(
        0.055,
        audioCtx.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + duration
      );

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);

    } catch (_) {}
  }

  // SET UP A LEVEL

  function makeLevel(index) {
    const data = levelData[index];

    platforms = data.platforms.map(p => ({
      x: p[0],
      y: p[1],
      w: p[2],
      h: p[3]
    }));

    coins = data.coins.map((c, i) => ({
      x: c[0],
      y: c[1],
      r: 10,
      taken: false,
      phase: i * 0.7
    }));

    hazards = data.hazards.map(h => ({
      x: h[0],
      y: h[1],
      w: h[2],
      h: h[3]
    }));

    exit = {
      x: data.exitX,
      y: 370,
      w: 34,
      h: 80
    };

    player = {
      x: 55,
      y: 390,
      w: 30,
      h: 42,
      vx: 0,
      vy: 0,
      onGround: false,
      spawnX: 55,
      spawnY: 390
    };

    cameraX = 0;
    invulnerable = 0;
    particles = [];

    updateHud();
  }

  // UPDATE SCORE AND LIVES

  function updateHud() {
    $("level").textContent =
      `${levelIndex + 1} / 3`;

    $("score").textContent = score;
    $("coins").textContent = totalCoins;

    $("lives").textContent =
      "♥ ".repeat(lives).trim() || "—";
  }

  // MENU AND GAME SCREENS

  function showOverlay(title, text, button, action) {
    $("overlayTitle").textContent = title;
    $("overlayText").textContent = text;
    $("startButton").textContent = button;
    $("startButton").onclick = action;

    $("overlay").classList.remove("hidden");
  }

  function hideOverlay() {
    $("overlay").classList.add("hidden");
    canvas.focus();
  }

  // START GAME

  function startGame() {
    score = 0;
    totalCoins = 0;
    lives = 3;
    levelIndex = 0;

    makeLevel(0);

    state = "playing";
    hideOverlay();

    sound(660, 0.12);
  }

  // COMPLETE A LEVEL

  function nextLevel() {
    if (levelIndex < 2) {
      levelIndex++;

      makeLevel(levelIndex);

      sound(820, 0.18);

    } else {
      state = "won";

      showOverlay(
        "YOU DID IT!",
        `You conquered all three city levels and scored ${score} points! You collected ${totalCoins} coins.`,
        "PLAY AGAIN",
        startGame
      );
    }
  }

  // GAME OVER

  function gameOver() {
    state = "lost";

    showOverlay(
      "GAME OVER",
      `You scored ${score} points and collected ${totalCoins} coins. Give it another try!`,
      "TRY AGAIN",
      startGame
    );
  }

  // PAUSE GAME

  function pauseGame() {
    if (state === "playing") {
      state = "paused";

      showOverlay(
        "PAUSED",
        "Take a breather. Your progress is saved until you resume.",
        "RESUME",
        () => {
          state = "playing";
          hideOverlay();
        }
      );
    }
  }

  // COLLISION DETECTION

  function hit(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // PARTICLE EFFECT

  function burst(x, y, color) {
    for (let i = 0; i < 9; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.8) * 4,
        life: 30,
        color
      });
    }
  }

  // PLAYER LOSES A LIFE

  function hurt() {
    if (invulnerable > 0) return;

    lives--;

    updateHud();

    sound(130, 0.22, "sawtooth");

    burst(
      player.x + 15,
      player.y + 20,
      "#ff426f"
    );

    if (lives <= 0) {
      gameOver();
      return;
    }

    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;

    invulnerable = 100;

    cameraX = Math.max(0, player.x - 250);
  }

  // MAIN GAME LOGIC

  function update(dt) {
    if (state !== "playing") return;

    const step = Math.min(dt / 16.67, 2);
    const speed = 4.1;

    // MOVEMENT

    player.vx =
      (keys.right ? speed : 0) -
      (keys.left ? speed : 0);

    // JUMPING

    if (keys.jump && player.onGround) {
      player.vy = -12.8;
      player.onGround = false;

      sound(420, 0.06);
    }

    // GRAVITY

    player.vy += 0.58 * step;
    player.vy = Math.min(player.vy, 14);

    const oldY = player.y;

    player.x += player.vx * step;

    player.x = Math.max(
      0,
      Math.min(
        levelData[levelIndex].length - player.w,
        player.x
      )
    );

    player.y += player.vy * step;

    player.onGround = false;

    // PLATFORM COLLISION

    for (const p of platforms) {
      const horizontal =
        player.x + player.w > p.x &&
        player.x < p.x + p.w;

      if (
        horizontal &&
        player.vy >= 0 &&
        oldY + player.h <= p.y + 5 &&
        player.y + player.h >= p.y
      ) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // FALLING

    if (player.y > H + 100) {
      hurt();
      if (state !== "playing") return;
    }

    if (invulnerable > 0) {
      invulnerable -= step;
    }

    // COLLECT COINS

    for (const c of coins) {
      if (
        !c.taken &&
        hit(player, {
          x: c.x - c.r,
          y: c.y - c.r,
          w: c.r * 2,
          h: c.r * 2
        })
      ) {
        c.taken = true;

        score += 10;
        totalCoins++;

        updateHud();

        sound(900, 0.07, "triangle");

        burst(c.x, c.y, "#ffd85a");
      }
    }

    // OBSTACLES

    for (const h of hazards) {
      if (hit(player, h)) {
        hurt();
        break;
      }
    }

    if (state !== "playing") return;

    // FINISH LINE

    if (hit(player, exit)) {
      nextLevel();
      return;
    }

    // CAMERA FOLLOW

    const target = player.x - 260;

    cameraX += (
      Math.max(
        0,
        Math.min(
          levelData[levelIndex].length - W,
          target
        )
      ) - cameraX
    ) * 0.12;

    // PARTICLES

    particles = particles.filter(p => p.life > 0);

    for (const p of particles) {
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.life -= step;
    }
  }

  // CITY BACKGROUND

  function drawBackground() {
    const grad = ctx.createLinearGradient(
      0, 0, 0, H
    );

    grad.addColorStop(0, "#121b39");
    grad.addColorStop(1, "#29395b");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // MOON

    ctx.fillStyle = "#f8d58b";

    ctx.beginPath();
    ctx.arc(790, 95, 38, 0, Math.PI * 2);
    ctx.fill();

    // CITY BUILDINGS

    for (let i = 0; i < 18; i++) {
      const x =
        ((i * 105 - cameraX * 0.22) % 1900
        + 1900) % 1900 - 20;

      const bh = 110 + (i * 47 % 160);
      const bw = 65 + (i * 19 % 35);

      ctx.fillStyle =
        i % 2 ? "#202c4b" : "#1a2542";

      ctx.fillRect(x, H - bh - 55, bw, bh);

      for (
        let wy = H - bh - 40;
        wy < H - 75;
        wy += 24
      ) {
        for (
          let wx = x + 12;
          wx < x + bw - 8;
          wx += 20
        ) {
          ctx.fillStyle =
            Math.floor(wx + wy + i) % 3 === 0
              ? "#ffd77a"
              : "#425579";

          ctx.fillRect(wx, wy, 7, 10);
        }
      }
    }

    ctx.fillStyle = "#111a30";
    ctx.fillRect(0, 500, W, 40);
  }

  // DRAW EVERYTHING

  function draw() {
    ctx.save();

    drawBackground();

    ctx.translate(-cameraX, 0);

    // PLATFORMS

    for (const p of platforms) {
      ctx.fillStyle = "#252d49";
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = "#55e7ff";
      ctx.fillRect(p.x, p.y, p.w, 5);

      ctx.fillStyle = "#394565";

      for (
        let x = p.x + 14;
        x < p.x + p.w - 8;
        x += 34
      ) {
        ctx.fillRect(x, p.y + 14, 18, 5);
      }
    }

    // COINS

    for (const c of coins) {
      if (!c.taken) {
        const pulse =
          Math.sin(performance.now() / 180 + c.phase) * 2;

        ctx.fillStyle = "#ffd34e";

        ctx.beginPath();

        ctx.ellipse(
          c.x,
          c.y,
          7 + pulse * 0.25,
          10,
          0,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.strokeStyle = "#fff1a8";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#c57b22";
        ctx.fillRect(c.x - 1, c.y - 5, 2, 10);
      }
    }

    // OBSTACLES

    for (const h of hazards) {
      ctx.fillStyle = "#ff426f";

      ctx.beginPath();

      ctx.moveTo(h.x, h.y + h.h);
      ctx.lineTo(h.x + h.w * 0.2, h.y + 3);
      ctx.lineTo(h.x + h.w * 0.45, h.y + h.h);
      ctx.lineTo(h.x + h.w * 0.7, h.y + 2);
      ctx.lineTo(h.x + h.w, h.y + h.h);

      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff9ab0";

      ctx.fillRect(
        h.x + 5,
        h.y + h.h - 5,
        h.w - 10,
        4
      );
    }

    // EXIT

    ctx.shadowColor = "#55e7ff";
    ctx.shadowBlur = 22;

    ctx.fillStyle = "#55e7ff";

    ctx.fillRect(
      exit.x,
      exit.y,
      exit.w,
      exit.h
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#17243e";

    ctx.fillRect(
      exit.x + 7,
      exit.y + 8,
      exit.w - 14,
      exit.h - 8
    );

    ctx.fillStyle = "#b7f8ff";
    ctx.font = "bold 12px system-ui";

    ctx.fillText(
      "EXIT",
      exit.x - 2,
      exit.y - 8
    );

    // PLAYER CHARACTER

    if (
      invulnerable <= 0 ||
      Math.floor(invulnerable / 7) % 2 === 0
    ) {
      ctx.fillStyle = "#ff426f";

      ctx.fillRect(
        player.x + 5,
        player.y + 13,
        20,
        25
      );

      ctx.fillStyle = "#ffd4bd";

      ctx.fillRect(
        player.x + 5,
        player.y,
        20,
        17
      );

      ctx.fillStyle = "#202943";

      ctx.fillRect(player.x + 7, player.y + 5, 5, 4);
      ctx.fillRect(player.x + 18, player.y + 5, 5, 4);

      ctx.fillStyle = "#55e7ff";

      ctx.fillRect(player.x + 2, player.y + 36, 11, 6);
      ctx.fillRect(player.x + 18, player.y + 36, 11, 6);

      ctx.fillStyle = "#ff426f";

      ctx.fillRect(player.x + 2, player.y + 17, 5, 13);
      ctx.fillRect(player.x + 24, player.y + 17, 5, 13);
    }

    // PARTICLES

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / 30);

      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 5, 5);
    }

    ctx.globalAlpha = 1;

    ctx.restore();

    // LEVEL LABEL

    ctx.fillStyle = "#fff";
    ctx.font = "bold 17px system-ui";

    ctx.fillText(
      levelData[levelIndex].name,
      20,
      32
    );

    ctx.fillStyle = "#c0c9df";
    ctx.font = "12px system-ui";

    ctx.fillText("Find the exit →", 20, 52);
  }

  // GAME LOOP

  function loop(timestamp) {
    const dt = timestamp - lastTime;

    lastTime = timestamp;

    update(dt || 16.67);
    draw();

    requestAnimationFrame(loop);
  }

  // KEYBOARD CONTROLS

  function setKey(key, down) {
    const k = key.toLowerCase();

    if (["arrowleft", "a"].includes(k)) {
      keys.left = down;
    }

    if (["arrowright", "d"].includes(k)) {
      keys.right = down;
    }

    if ([" ", "arrowup", "w"].includes(k)) {
      keys.jump = down;
    }
  }

  window.addEventListener("keydown", e => {
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", " "]
        .includes(e.key)
    ) {
      e.preventDefault();
    }

    if (e.repeat && e.key.toLowerCase() === "p") {
      return;
    }

    if (e.key.toLowerCase() === "p") {
      pauseGame();
      return;
    }

    setKey(e.key, true);
  });

  window.addEventListener("keyup", e => {
    setKey(e.key, false);
  });

  window.addEventListener("blur", () => {
    keys.left = false;
    keys.right = false;
    keys.jump = false;
  });

  // MOBILE BUTTON CONTROLS

  function bindHold(id, key) {
    const el = $(id);

    const down = e => {
      e.preventDefault();
      keys[key] = true;
    };

    const up = e => {
      e.preventDefault();
      keys[key] = false;
    };

    el.addEventListener("pointerdown", down);

    [
      "pointerup",
      "pointerleave",
      "pointercancel"
    ].forEach(ev => {
      el.addEventListener(ev, up);
    });
  }

  bindHold("leftBtn", "left");
  bindHold("rightBtn", "right");
  bindHold("jumpBtn", "jump");

  // INITIALIZE GAME

  makeLevel(0);

  showOverlay(
    "CITY HOPPER",
    "Jump across city rooftops, collect coins, avoid hazards, and reach the glowing exit. You have three lives to finish all three levels.",
    "START GAME",
    startGame
  );

  requestAnimationFrame(loop);

})();
