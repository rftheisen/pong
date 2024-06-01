const canvas = document.getElementById('pong');
const context = canvas.getContext('2d');
const codeDisplay = document.getElementById('code-display');
const startButton = document.getElementById('start-button');

let gameInterval;

// Set canvas dimensions with a fixed aspect ratio
function setCanvasDimensions() {
    let aspectRatio = 2; // Width-to-height ratio (e.g., 2:1)
    let height = window.innerHeight * 0.8; // Use 80% of the window height
    let width = height * aspectRatio;

    // Ensure canvas fits within the window dimensions
    if (width > window.innerWidth * 0.9) {
        width = window.innerWidth * 0.9;
        height = width / aspectRatio;
    }

    canvas.width = width;
    canvas.height = height;

    // Adjust paddle positions based on new canvas dimensions
    user.height = canvas.height / 5;
    com.height = canvas.height / 5;
    user.y = canvas.height / 2 - user.height / 2;
    com.y = canvas.height / 2 - com.height / 2;
    com.x = canvas.width - com.width;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
}

// Initial canvas dimensions setup
setCanvasDimensions();

// Adjust canvas dimensions on window resize
window.addEventListener('resize', setCanvasDimensions);

// Load sound
const hitSound = new Audio('hit.mp3');
hitSound.load();

// Create the user paddle
const user = {
    x: 0,
    y: canvas.height / 2 - 50,
    width: 10,
    height: canvas.height / 5, // Paddle height relative to canvas height
    color: 'WHITE',
    score: 0
};

// Create the computer paddle
const com = {
    x: canvas.width - 10,
    y: canvas.height / 2 - 50,
    width: 10,
    height: canvas.height / 5, // Paddle height relative to canvas height
    color: 'WHITE',
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
    color: 'WHITE'
};

// Function to display code
function displayCode(code) {
    if (codeDisplay) {
        codeDisplay.textContent = code;
    } else {
        console.error("codeDisplay element not found");
    }
}

// Draw a rectangle, will be used to draw paddles
function drawRect(x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
    displayCode(`drawRect(${x}, ${y}, ${w}, ${h}, '${color}');`);
}

// Draw a circle, will be used to draw the ball
function drawCircle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2, false);
    context.closePath();
    context.fill();
    displayCode(`drawCircle(${x}, ${y}, ${r}, '${color}');`);
}

// Draw the net
function drawNet() {
    for (let i = 0; i <= canvas.height; i += 15) {
        drawRect(canvas.width / 2 - 1, i, 2, 10, 'WHITE');
    }
    displayCode(`drawNet();`);
}

// Draw text
function drawText(text, x, y, color) {
    context.fillStyle = color;
    context.font = '45px Arial';
    context.fillText(text, x, y);
    displayCode(`drawText('${text}', ${x}, ${y}, '${color}');`);
}

// Control the user paddle with mouse
canvas.addEventListener('mousemove', movePaddle);
function movePaddle(evt) {
    let rect = canvas.getBoundingClientRect();
    user.y = evt.clientY - rect.top - user.height / 2;
    displayCode(`movePaddle(evt);`);
}

// Control the user paddle with touch
canvas.addEventListener('touchmove', movePaddleTouch);
function movePaddleTouch(evt) {
    evt.preventDefault(); // Prevent scrolling when touching
    let rect = canvas.getBoundingClientRect();
    let touch = evt.touches[0]; // Get the first touch point
    user.y = touch.clientY - rect.top - user.height / 2;
    displayCode(`movePaddleTouch(evt);`);
}

// Collision detection
function collision(b, p) {
    p.top = p.y;
    p.bottom = p.y + p.height;
    p.left = p.x;
    p.right = p.x + p.width;

    b.top = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left = b.x - b.radius;
    b.right = b.x + b.radius;

    const isColliding = p.left < b.right && p.top < b.bottom && p.right > b.left && p.bottom > b.top;
    displayCode(`collision(ball, paddle) => ${isColliding}`);
    return isColliding;
}

// Reset the ball
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 5;
    ball.velocityX = -ball.velocityX;
    displayCode(`resetBall();`);
}
