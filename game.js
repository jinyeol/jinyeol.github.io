"use strict";

(() => {
  const canvas = document.getElementById("game-board");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const scoreElement = document.getElementById("score");
  const levelElement = document.getElementById("level");
  const highScoreElement = document.getElementById("high-score");
  const messageElement = document.getElementById("game-message");
  const startButton = document.getElementById("start-game");
  const pauseButton = document.getElementById("pause-game");
  const restartButton = document.getElementById("restart-game");
  const gameSection = document.getElementById("games");
  const gridSize = 16;
  const cellSize = canvas.width / gridSize;
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  let snake;
  let food;
  let enemy;
  let direction;
  let queuedDirection;
  let score;
  let level;
  let timerId = null;
  let gameState = "ready";
  let highScore = Number.parseInt(localStorage.getItem("jy-snake-high-score") || "0", 10);

  const isSamePosition = (first, second) => first.x === second.x && first.y === second.y;
  const randomCell = () => ({ x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) });

  function openCell() {
    let cell = randomCell();
    while (snake.some((part) => isSamePosition(part, cell)) || (enemy && isSamePosition(enemy, cell))) cell = randomCell();
    return cell;
  }

  function resetGame() {
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    direction = directions.right;
    queuedDirection = direction;
    score = 0;
    level = 1;
    enemy = { x: 12, y: 5 };
    food = openCell();
    gameState = "ready";
    updateHud();
    draw();
    setMessage("시작 버튼을 누르거나 방향키로 시작하세요.");
    pauseButton.disabled = true;
    pauseButton.textContent = "일시정지";
  }

  function updateHud() {
    scoreElement.textContent = String(score);
    levelElement.textContent = String(level);
    highScoreElement.textContent = String(highScore);
  }

  function setMessage(message) { messageElement.textContent = message; }

  function startGame() {
    if (gameState === "running") return;
    if (gameState === "over") resetGame();
    gameState = "running";
    pauseButton.disabled = false;
    startButton.disabled = true;
    canvas.focus({ preventScroll: true });
    setMessage("달려보세요! 방향키, WASD 또는 터치로 이동합니다.");
    scheduleNextTick();
  }

  function scheduleNextTick() {
    if (timerId !== null) clearTimeout(timerId);
    timerId = window.setTimeout(() => {
      timerId = null;
      if (gameState !== "running") return;
      tick();
      scheduleNextTick();
    }, Math.max(70, 180 - (level - 1) * 15));
  }

  function pauseGame() {
    if (gameState === "running") {
      gameState = "paused";
      if (timerId !== null) { clearTimeout(timerId); timerId = null; }
      pauseButton.textContent = "재개";
      setMessage("일시정지 중입니다.");
    } else if (gameState === "paused") {
      gameState = "running";
      pauseButton.textContent = "일시정지";
      setMessage("게임을 계속합니다.");
      scheduleNextTick();
    }
  }

  function setDirection(nextDirection) {
    const next = directions[nextDirection];
    if (!next || (next.x === -direction.x && next.y === -direction.y)) return;
    queuedDirection = next;
    if (gameState === "ready") startGame();
  }

  function moveEnemy() {
    const choices = Object.values(directions).filter((candidate) => !(candidate.x === -direction.x && candidate.y === -direction.y));
    const candidate = choices[Math.floor(Math.random() * choices.length)];
    const next = { x: enemy.x + candidate.x, y: enemy.y + candidate.y };
    if (next.x >= 0 && next.x < gridSize && next.y >= 0 && next.y < gridSize) enemy = next;
  }

  function tick() {
    direction = queuedDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
    const hitSelf = snake.some((part) => isSamePosition(part, head));
    moveEnemy();
    if (hitWall || hitSelf || isSamePosition(head, enemy)) return endGame();
    snake.unshift(head);
    if (isSamePosition(head, food)) {
      score += 10;
      level = 1 + Math.floor(score / 50);
      if (score > highScore) { highScore = score; localStorage.setItem("jy-snake-high-score", String(highScore)); }
      food = openCell();
    } else snake.pop();
    updateHud();
    draw();
  }

  function endGame() {
    gameState = "over";
    if (timerId !== null) { clearTimeout(timerId); timerId = null; }
    pauseButton.disabled = true;
    startButton.disabled = false;
    setMessage(`게임 오버! 점수 ${score}점 · 재시작할 수 있습니다.`);
    draw();
  }

  function drawCell(cell, color, radius = 0.25) {
    const inset = cellSize * .12;
    const x = cell.x * cellSize + inset;
    const y = cell.y * cellSize + inset;
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x, y, cellSize - inset * 2, cellSize - inset * 2, cellSize * radius);
    context.fill();
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff8fd";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawCell(food, "#ffd873", .45);
    drawCell(enemy, "#ff8eb7", .45);
    snake.forEach((part, index) => drawCell(part, index === 0 ? "#8d78ed" : "#b9aaff", .35));
  }

  const keyDirections = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  document.addEventListener("keydown", (event) => {
    const gameIsVisible = gameSection && gameSection.getBoundingClientRect().bottom > 0 && gameSection.getBoundingClientRect().top < window.innerHeight;
    const gameHasFocus = document.activeElement === canvas;
    if (!gameIsVisible || !gameHasFocus) return;
    if (keyDirections[event.key]) { event.preventDefault(); setDirection(keyDirections[event.key]); }
    if (event.key === " " && gameState !== "ready" && gameState !== "over") { event.preventDefault(); pauseGame(); }
  });
  document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => setDirection(button.dataset.direction)));
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", pauseGame);
  restartButton.addEventListener("click", () => { if (timerId !== null) clearTimeout(timerId); timerId = null; resetGame(); });
  highScoreElement.textContent = String(highScore);
  resetGame();
})();
