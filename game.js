const canvas = document.getElementById('pong');
const context = canvas.getContext('2d');
const codeDisplay = document.getElementById('code-display');
const startButton = document.getElementById('start-button');
const matchMessage = document.getElementById('match-message');

let animationFrameId;
let lastFrameTime = 0;
let gameState = 'ready';
let logicalWidth = canvas.width;
let logicalHeight = canvas.height;

// ── Color palette ────────────────────────────────────────────────────────────
const PLAYER_COLOR = '#818cf8';
const PLAYER_GLOW  = 'rgba(129,140,248,0.85)';
const AI_COLOR     = '#f472b6';
const AI_GLOW      = 'rgba(244,114,182,0.85)';
const BALL_COLOR   = '#e0e0ff';
const BALL_GLOW    = 'rgba(210,210,255,0.95)';
const NET_COLOR    = 'rgba(103,232,249,0.18)';
const SCORE_COLOR  = 'rgba(255,255,255,0.62)';
const BASE_BALL_SPEED = 300;
const MAX_BALL_SPEED = 900;
const SPEED_STEP = 30;
const AI_TRACKING = 6;
const KEYBOARD_PADDLE_SPEED = 520;
const MAX_DELTA = 1 / 30;
const WINNING_SCORE = 21;

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    w: false,
    s: false
};

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
    speed: BASE_BALL_SPEED,
    velocityX: BASE_BALL_SPEED,
    velocityY: BASE_BALL_SPEED,
    color: BALL_COLOR
};

// Ball trail
const trail = [];
const TRAIL_LENGTH = 8;

// ── Canvas sizing ─────────────────────────────────────────────────────────────
const CODE_PANEL_W = 300; // desktop: sidebar width  — must match #code-container width in CSS
const CODE_PANEL_H = 130; // mobile:  strip height   — must match @media height in CSS
const CODE_LOG_LIMIT = 8;
const codeLog = [];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function placePaddle(paddle, y) {
    paddle.y = clamp(y, 0, logicalHeight - paddle.height);
}

function resizeCanvas(width, height) {
    const pixelRatio = window.devicePixelRatio || 1;

    logicalWidth = width;
    logicalHeight = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function setCanvasDimensions() {
    const isMobile = window.innerWidth <= 768;
    const aspectRatio = 2;
    let width, height;

    if (isMobile) {
        // Full-width canvas; code panel is a strip at the bottom
        width  = window.innerWidth * 0.97;
        height = width / aspectRatio;
        const maxH = (window.innerHeight - CODE_PANEL_H) * 0.95;
        if (height > maxH) {
            height = maxH;
            width  = height * aspectRatio;
        }
    } else {
        // Desktop: height-first, then cap to available width beside the sidebar
        height = window.innerHeight * 0.85;
        width  = height * aspectRatio;
        const maxW = (window.innerWidth - CODE_PANEL_W) * 0.97;
        if (width > maxW) {
            width  = maxW;
            height = width / aspectRatio;
        }
    }

    resizeCanvas(width, height);

    user.height = logicalHeight / 5;
    com.height  = logicalHeight / 5;
    user.y = clamp(user.y, 0, logicalHeight - user.height);
    com.y  = clamp(com.y, 0, logicalHeight - com.height);
    com.x  = logicalWidth - com.width;
    ball.x = clamp(ball.x, ball.radius, logicalWidth - ball.radius);
    ball.y = clamp(ball.y, ball.radius, logicalHeight - ball.radius);
    displayCode(`resizeCanvas(${Math.round(logicalWidth)}, ${Math.round(logicalHeight)});`);
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
    if (!codeDisplay) return;

    if (codeLog[codeLog.length - 1] !== code) {
        codeLog.push(code);
        if (codeLog.length > CODE_LOG_LIMIT) codeLog.shift();
    }

    codeDisplay.innerHTML = codeLog.map(syntaxHighlight).join('\n');
    const codeBody = codeDisplay.parentElement;
    if (codeBody) codeBody.scrollTop = codeBody.scrollHeight;
}

function setMatchMessage(message) {
    if (!matchMessage) return;

    matchMessage.textContent = message;
    matchMessage.classList.toggle('is-visible', Boolean(message));
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

}

// Draw the center net
function drawNet() {
    for (let i = 0; i <= logicalHeight; i += 20) {
        context.fillStyle = NET_COLOR;
        context.fillRect(logicalWidth / 2 - 1, i, 2, 9);
    }
}

// Draw score text with glow
function drawText(text, x, y, color) {
    setGlow(color, 10);
    context.fillStyle  = color;
    context.font       = `bold ${Math.round(Math.min(48, logicalHeight * 0.18))}px "Courier New", monospace`;
    context.textAlign  = 'center';
    context.fillText(text, x, y);
    clearGlow();
}

// ── Input handling ─────────────────────────────────────────────────────────────

canvas.addEventListener('mousemove', movePaddle);
function movePaddle(evt) {
    let rect = canvas.getBoundingClientRect();
    const pointerY = (evt.clientY - rect.top) * (logicalHeight / rect.height);
    const rawY = pointerY - user.height / 2;
    placePaddle(user, rawY);
    displayCode(`movePaddle(evt);`);
}

canvas.addEventListener('touchmove', movePaddleTouch, { passive: false });
function movePaddleTouch(evt) {
    evt.preventDefault();
    let rect  = canvas.getBoundingClientRect();
    let touch = evt.touches[0];
    const pointerY = (touch.clientY - rect.top) * (logicalHeight / rect.height);
    const rawY = pointerY - user.height / 2;
    placePaddle(user, rawY);
    displayCode(`movePaddleTouch(evt);`);
}

window.addEventListener('keydown', (evt) => {
    if (Object.prototype.hasOwnProperty.call(keys, evt.key)) {
        keys[evt.key] = true;
        evt.preventDefault();
        displayCode(`keys['${evt.key}'] = true;`);
    }
});

window.addEventListener('keyup', (evt) => {
    if (Object.prototype.hasOwnProperty.call(keys, evt.key)) {
        keys[evt.key] = false;
        evt.preventDefault();
    }
});

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
    ball.x = logicalWidth  / 2;
    ball.y = logicalHeight / 2;
    ball.speed = BASE_BALL_SPEED;
    // Serve toward whoever just scored; random angle −30° to +30°
    const dir   = ball.velocityX > 0 ? -1 : 1;
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
    ball.velocityX = dir * ball.speed * Math.cos(angle);
    ball.velocityY = ball.speed * Math.sin(angle);
    trail.length = 0; // clear trail on reset
    displayCode(`resetBall(); // speed reset to ${Math.round(ball.speed)}`);
}

function resetMatch() {
    user.score = 0;
    com.score = 0;
    user.y = logicalHeight / 2 - user.height / 2;
    com.y = logicalHeight / 2 - com.height / 2;
    ball.velocityX = BASE_BALL_SPEED;
    resetBall();
    setMatchMessage('');
    displayCode(`resetMatch(); // first to ${WINNING_SCORE}`);
}

function endMatch(winner) {
    gameState = 'ended';
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    trail.length = 0;
    ball.x = logicalWidth / 2;
    ball.y = logicalHeight / 2;
    setMatchMessage(winner === user ? 'You Win' : 'AI Wins');
    startButton.textContent = '↻ Play Again';
    startButton.setAttribute('aria-label', 'Play Pong again');
    startButton.style.display = 'block';
    displayCode(`${winner === user ? 'user' : 'com'}.score === ${WINNING_SCORE};`);
    render();
}

function scorePoint(player) {
    player.score++;

    if (player.score >= WINNING_SCORE) {
        endMatch(player);
        return;
    }

    resetBall();
}

// ── Game update ───────────────────────────────────────────────────────────────
function update(deltaTime) {
    if (gameState !== 'playing') return;

    const previousX = ball.x;
    const previousY = ball.y;

    if (keys.ArrowUp || keys.w) {
        placePaddle(user, user.y - KEYBOARD_PADDLE_SPEED * deltaTime);
    }
    if (keys.ArrowDown || keys.s) {
        placePaddle(user, user.y + KEYBOARD_PADDLE_SPEED * deltaTime);
    }

    // Scoring
    if (ball.x - ball.radius < 0) {
        scorePoint(com);
        return;
    } else if (ball.x + ball.radius > logicalWidth) {
        scorePoint(user);
        return;
    }

    // Record trail position before moving
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > TRAIL_LENGTH) trail.shift();

    // Ball movement
    ball.x += ball.velocityX * deltaTime;
    ball.y += ball.velocityY * deltaTime;

    // AI paddle
    const aiTargetY = ball.y - com.height / 2;
    placePaddle(com, com.y + (aiTargetY - com.y) * AI_TRACKING * deltaTime);

    // Wall bounce
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.velocityY = Math.abs(ball.velocityY);
        displayCode(`ball.velocityY = Math.abs(ball.velocityY);`);
    } else if (ball.y + ball.radius > logicalHeight) {
        ball.y = logicalHeight - ball.radius;
        ball.velocityY = -Math.abs(ball.velocityY);
        displayCode(`ball.velocityY = -ball.velocityY;`);
    }

    // Paddle collision
    let player = (ball.velocityX < 0) ? user : com;
    const playerTop = player.y;
    const playerBottom = player.y + player.height;
    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    const crossedPaddle = ball.velocityX < 0
        ? previousX - ball.radius >= playerRight && ball.x - ball.radius <= playerRight
        : previousX + ball.radius <= playerLeft && ball.x + ball.radius >= playerLeft;
    const verticalOverlap = Math.max(previousY, ball.y) + ball.radius >= playerTop
        && Math.min(previousY, ball.y) - ball.radius <= playerBottom;

    if (collision(ball, player) || (crossedPaddle && verticalOverlap)) {
        hitSound.currentTime = 0;
        hitSound.play().catch(() => {});
        displayCode(`hitSound.play();`);

        let collidePoint = (ball.y - (player.y + player.height / 2));
        collidePoint     = clamp(collidePoint / (player.height / 2), -1, 1);
        let angleRad     = (Math.PI / 4) * collidePoint;

        let direction  = player === user ? 1 : -1;
        ball.x = player === user ? user.x + user.width + ball.radius : com.x - ball.radius;
        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);

        ball.speed = Math.min(ball.speed + SPEED_STEP, MAX_BALL_SPEED);
        displayCode(`ball.speed = ${Math.round(ball.speed)}; // capped`);
    }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
    // Gradient background
    const bg = context.createLinearGradient(0, 0, 0, logicalHeight);
    bg.addColorStop(0, '#080a19');
    bg.addColorStop(0.55, '#100d25');
    bg.addColorStop(1, '#15101f');
    context.fillStyle = bg;
    context.fillRect(0, 0, logicalWidth, logicalHeight);

    const accent = context.createLinearGradient(0, 0, logicalWidth, 0);
    accent.addColorStop(0, 'rgba(129,140,248,0.08)');
    accent.addColorStop(0.5, 'rgba(103,232,249,0.035)');
    accent.addColorStop(1, 'rgba(244,114,182,0.08)');
    context.fillStyle = accent;
    context.fillRect(0, 0, logicalWidth, logicalHeight);

    drawNet();

    drawText(user.score, logicalWidth / 4,     logicalHeight / 5, SCORE_COLOR);
    drawText(com.score,  3 * logicalWidth / 4, logicalHeight / 5, SCORE_COLOR);

    drawPaddle(user.x, user.y, user.width, user.height, PLAYER_COLOR, PLAYER_GLOW);
    drawPaddle(com.x,  com.y,  com.width,  com.height,  AI_COLOR,     AI_GLOW);

    drawBall(ball.x, ball.y, ball.radius);
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function game(time = 0) {
    const deltaTime = Math.min((time - lastFrameTime) / 1000 || 0, MAX_DELTA);
    lastFrameTime = time;

    update(deltaTime);
    render();
    if (gameState === 'playing') {
        animationFrameId = requestAnimationFrame(game);
    }
}

// Start the game when the start button is clicked
startButton.addEventListener('click', () => {
    if (gameState === 'playing') return;
    if (gameState === 'ended') resetMatch();

    gameState = 'playing';
    startButton.setAttribute('aria-label', 'Start Pong game');
    startButton.style.display = 'none';
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(game);
    displayCode("requestAnimationFrame(game);");
});

render();
displayCode("Click Play, then move with mouse, touch, W/S, or ↑/↓.");
