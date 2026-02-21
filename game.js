const canvas = document.getElementById('pong');
const context = canvas.getContext('2d');
const codeDisplay = document.getElementById('code-display');
const startButton = document.getElementById('start-button');

let gameInterval;

// ── Color palette ────────────────────────────────────────────────────────────
const PLAYER_COLOR = '#818cf8';
const PLAYER_GLOW  = 'rgba(129,140,248,0.85)';
const AI_COLOR     = '#f472b6';
const AI_GLOW      = 'rgba(244,114,182,0.85)';
const BALL_COLOR   = '#e0e0ff';
const BALL_GLOW    = 'rgba(210,210,255,0.95)';
const NET_COLOR    = 'rgba(255,255,255,0.15)';
const SCORE_COLOR  = 'rgba(255,255,255,0.7)';

// Create the user paddle
const user = {
    x: 0,
    y: canvas.height / 2 - 50,
    width: 10,
    height: 100,
    color: PLAYER_COLOR,
    score: 0
};

// Create the computer paddle
const com = {
    x: canvas.width - 10,
    y: canvas.height / 2 - 50,
    width: 10,
    height: 100,
    color: AI_COLOR,
    score: 0
};

// Create the ball
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 5,
    velocityX: 5,
    velocityY: 5,
    color: BALL_COLOR
};

// Ball trail
const trail = [];
const TRAIL_LENGTH = 8;

// ── Canvas sizing ─────────────────────────────────────────────────────────────
const CODE_PANEL_W = 300; // must match #code-container width in CSS

function setCanvasDimensions() {
    let aspectRatio = 2;
    let height = window.innerHeight * 0.85;
    let width = height * aspectRatio;

    // Cap width to available space (viewport minus the code panel)
    const maxW = (window.innerWidth - CODE_PANEL_W) * 0.97;
    if (width > maxW) {
        width = maxW;
        height = width / aspectRatio;
    }

    canvas.width = width;
    canvas.height = height;

    user.height = canvas.height / 5;
    com.height  = canvas.height / 5;
    user.y = canvas.height / 2 - user.height / 2;
    com.y  = canvas.height / 2 - com.height  / 2;
    com.x  = canvas.width - com.width;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
}

setCanvasDimensions();
window.addEventListener('resize', setCanvasDimensions);

// Load sound
const hitSound = new Audio('hit.mp3');
hitSound.load();

// ── Syntax-highlighted code display ──────────────────────────────────────────
function syntaxHighlight(code) {
    return code
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\b(function|const|let|var|if|else|return|Math|true|false|new|for)\b/g,
                 '<span class="kw">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>')
        .replace(/'([^']*)'/g, "<span class='str'>'$1'</span>");
}

function displayCode(code) {
    if (codeDisplay) codeDisplay.innerHTML = syntaxHighlight(code);
}

// ── Glow helpers ──────────────────────────────────────────────────────────────
function setGlow(color, blur) {
    context.shadowColor = color;
    context.shadowBlur  = blur;
}
function clearGlow() {
    context.shadowColor = 'transparent';
    context.shadowBlur  = 0;
}

// ── Drawing functions ─────────────────────────────────────────────────────────

// Draw a paddle with rounded corners and neon glow
function drawPaddle(x, y, w, h, color, glowColor) {
    setGlow(glowColor, 22);
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x, y, w, h, [5]);
    context.fill();
    clearGlow();
    displayCode(`drawPaddle(${Math.round(x)}, ${Math.round(y)}, '${color}');`);
}

// Draw the ball with trail and radial gradient glow
function drawBall(x, y, r) {
    // Draw trail
    trail.forEach((p, i) => {
        context.globalAlpha = (i / trail.length) * 0.3;
        context.fillStyle   = BALL_COLOR;
        context.beginPath();
        context.arc(p.x, p.y, r * 0.55 * (i / trail.length), 0, Math.PI * 2);
        context.fill();
    });
    context.globalAlpha = 1;

    // Draw ball with radial gradient + glow
    setGlow(BALL_GLOW, 28);
    const grad = context.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, BALL_COLOR);
    context.fillStyle = grad;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    clearGlow();

    displayCode(`drawBall(${Math.round(x)}, ${Math.round(y)}, ${r});`);
}

// Draw the center net
function drawNet() {
    for (let i = 0; i <= canvas.height; i += 20) {
        context.fillStyle = NET_COLOR;
        context.fillRect(canvas.width / 2 - 1, i, 2, 10);
    }
    displayCode(`drawNet();`);
}

// Draw score text with glow
function drawText(text, x, y, color) {
    setGlow(color, 18);
    context.fillStyle  = color;
    context.font       = 'bold 52px "Courier New", monospace';
    context.textAlign  = 'center';
    context.fillText(text, x, y);
    clearGlow();
    displayCode(`drawText('${text}', ${Math.round(x)}, ${Math.round(y)});`);
}

// ── Input handling ─────────────────────────────────────────────────────────────

canvas.addEventListener('mousemove', movePaddle);
function movePaddle(evt) {
    let rect = canvas.getBoundingClientRect();
    const rawY = evt.clientY - rect.top - user.height / 2;
    user.y = Math.max(0, Math.min(canvas.height - user.height, rawY));
    displayCode(`movePaddle(evt);`);
}

canvas.addEventListener('touchmove', movePaddleTouch);
function movePaddleTouch(evt) {
    evt.preventDefault();
    let rect  = canvas.getBoundingClientRect();
    let touch = evt.touches[0];
    const rawY = touch.clientY - rect.top - user.height / 2;
    user.y = Math.max(0, Math.min(canvas.height - user.height, rawY));
    displayCode(`movePaddleTouch(evt);`);
}

// ── Collision detection ───────────────────────────────────────────────────────
function collision(b, p) {
    p.top    = p.y;
    p.bottom = p.y + p.height;
    p.left   = p.x;
    p.right  = p.x + p.width;

    b.top    = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left   = b.x - b.radius;
    b.right  = b.x + b.radius;

    const isColliding = p.left < b.right && p.top < b.bottom && p.right > b.left && p.bottom > b.top;
    displayCode(`collision(ball, paddle) => ${isColliding}`);
    return isColliding;
}

// ── Reset ball ────────────────────────────────────────────────────────────────
function resetBall() {
    ball.x = canvas.width  / 2;
    ball.y = canvas.height / 2;
    ball.speed = 5;
    // Serve toward whoever just scored; random angle −30° to +30°
    const dir   = ball.velocityX > 0 ? -1 : 1;
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
    ball.velocityX = dir * ball.speed * Math.cos(angle);
    ball.velocityY = ball.speed * Math.sin(angle);
    trail.length = 0; // clear trail on reset
    displayCode(`resetBall(); // speed reset to ${ball.speed}`);
}

// ── Game update ───────────────────────────────────────────────────────────────
function update() {
    // Scoring
    if (ball.x - ball.radius < 0) {
        com.score++;
        resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
        user.score++;
        resetBall();
    }

    // Record trail position before moving
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > TRAIL_LENGTH) trail.shift();

    // Ball movement
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    displayCode(`ball.x += ${ball.velocityX.toFixed(1)}; ball.y += ${ball.velocityY.toFixed(1)};`);

    // AI paddle
    com.y += ((ball.y - (com.y + com.height / 2))) * 0.1;
    displayCode(`com.y += ((ball.y - (com.y + com.height / 2))) * 0.1;`);

    // Wall bounce
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.velocityY = -ball.velocityY;
        displayCode(`ball.velocityY = -ball.velocityY;`);
    }

    // Paddle collision
    let player = (ball.x + ball.radius < canvas.width / 2) ? user : com;

    if (collision(ball, player)) {
        hitSound.currentTime = 0;
        hitSound.play();
        displayCode(`hitSound.play();`);

        let collidePoint = (ball.y - (player.y + player.height / 2));
        collidePoint     = collidePoint / (player.height / 2);
        let angleRad     = (Math.PI / 4) * collidePoint;

        let direction  = (ball.x + ball.radius < canvas.width / 2) ? 1 : -1;
        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);

        // Speed up — capped at 15 to keep the game playable
        ball.speed = Math.min(ball.speed + 0.5, 15);
        displayCode(`ball.speed = ${ball.speed.toFixed(1)}; // capped at 15`);
    }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
    // Gradient background
    const bg = context.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#0d0b1e');
    bg.addColorStop(1, '#130e2a');
    context.fillStyle = bg;
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawNet();

    drawText(user.score, canvas.width / 4,     canvas.height / 5, SCORE_COLOR);
    drawText(com.score,  3 * canvas.width / 4, canvas.height / 5, SCORE_COLOR);

    drawPaddle(user.x, user.y, user.width, user.height, PLAYER_COLOR, PLAYER_GLOW);
    drawPaddle(com.x,  com.y,  com.width,  com.height,  AI_COLOR,     AI_GLOW);

    drawBall(ball.x, ball.y, ball.radius);
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function game() {
    update();
    render();
    displayCode("game() { update(); render(); }");
}

// Start the game when the start button is clicked
startButton.addEventListener('click', () => {
    startButton.style.display = 'none';
    gameInterval = setInterval(game, 1000 / 50);
    displayCode("setInterval(game, 1000 / 50);");
});
