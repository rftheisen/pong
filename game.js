// Get the canvas element by its ID and create a 2D rendering context
const canvas = document.getElementById('pong');
const context = canvas.getContext('2d');

// Load the sound file for when the ball hits the paddle
const hitSound = new Audio('hit.mp3');
hitSound.load(); // Ensure the sound file is loaded

// Define the user paddle object with its properties
const user = {
    x: 0, // Position on the x-axis (left side)
    y: canvas.height / 2 - 50, // Position on the y-axis (centered vertically)
    width: 10, // Width of the paddle
    height: 100, // Height of the paddle
    color: 'WHITE', // Color of the paddle
    score: 0 // Initial score
};

// Define the computer paddle object with its properties
const com = {
    x: canvas.width - 10, // Position on the x-axis (right side)
    y: canvas.height / 2 - 50, // Position on the y-axis (centered vertically)
    width: 10, // Width of the paddle
    height: 100, // Height of the paddle
    color: 'WHITE', // Color of the paddle
    score: 0 // Initial score
};

// Define the ball object with its properties
const ball = {
    x: canvas.width / 2, // Initial position on the x-axis (centered)
    y: canvas.height / 2, // Initial position on the y-axis (centered)
    radius: 10, // Radius of the ball
    speed: 5, // Initial speed of the ball
    velocityX: 5, // Initial horizontal velocity
    velocityY: 5, // Initial vertical velocity
    color: 'WHITE' // Color of the ball
};

// Function to draw a rectangle, used for drawing paddles
function drawRect(x, y, w, h, color) {
    context.fillStyle = color; // Set the fill color
    context.fillRect(x, y, w, h); // Draw the rectangle
}

// Function to draw a circle, used for drawing the ball
function drawCircle(x, y, r, color) {
    context.fillStyle = color; // Set the fill color
    context.beginPath(); // Begin a new path
    context.arc(x, y, r, 0, Math.PI * 2, false); // Draw the circle
    context.closePath(); // Close the path
    context.fill(); // Fill the circle
}

// Function to draw the net in the middle of the canvas
function drawNet() {
    for (let i = 0; i <= canvas.height; i += 15) {
        drawRect(canvas.width / 2 - 1, i, 2, 10, 'WHITE'); // Draw small rectangles to form the net
    }
}

// Function to draw text, used for displaying the score
function drawText(text, x, y, color) {
    context.fillStyle = color; // Set the fill color
    context.font = '45px Arial'; // Set the font size and style
    context.fillText(text, x, y); // Draw the text
}

// Event listener to control the user paddle with the mouse
canvas.addEventListener('mousemove', movePaddle);

function movePaddle(evt) {
    let rect = canvas.getBoundingClientRect(); // Get the canvas position relative to the viewport
    user.y = evt.clientY - rect.top - user.height / 2; // Update the paddle's position based on mouse movement
}

// Function to detect collision between the ball and a paddle
function collision(b, p) {
    p.top = p.y; // Top edge of the paddle
    p.bottom = p.y + p.height; // Bottom edge of the paddle
    p.left = p.x; // Left edge of the paddle
    p.right = p.x + p.width; // Right edge of the paddle

    b.top = b.y - b.radius; // Top edge of the ball
    b.bottom = b.y + b.radius; // Bottom edge of the ball
    b.left = b.x - b.radius; // Left edge of the ball
    b.right = b.x + b.radius; // Right edge of the ball

    // Check if the ball and paddle collide
    return p.left < b.right && p.top < b.bottom && p.right > b.left && p.bottom > b.top;
}

// Function to reset the ball to the center after scoring
function resetBall() {
    ball.x = canvas.width / 2; // Center the ball on the x-axis
    ball.y = canvas.height / 2; // Center the ball on the y-axis
    ball.speed = 5; // Reset the speed
    ball.velocityX = -ball.velocityX; // Change the direction
}

// Function to update the game state (positions, movements, scores)
function update() {
    // Update the score if the ball goes past the paddles
    if (ball.x - ball.radius < 0) {
        com.score++; // Increase the computer's score
        resetBall(); // Reset the ball
    } else if (ball.x + ball.radius > canvas.width) {
        user.score++; // Increase the user's score
        resetBall(); // Reset the ball
    }

    // Update the ball's position based on its velocity
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Simple AI to control the computer paddle
    com.y += ((ball.y - (com.y + com.height / 2))) * 0.1;

    // Reverse the ball's y-velocity if it hits the top or bottom walls
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.velocityY = -ball.velocityY;
    }

    // Check if the ball collides with the user or computer paddle
    let player = (ball.x + ball.radius < canvas.width / 2) ? user : com;

    if (collision(ball, player)) {
        // Play the hit sound when the ball collides with a paddle
        hitSound.currentTime = 0; // Rewind the sound to the start
        hitSound.play(); // Play the sound

        // Determine where the ball hits the paddle
        let collidePoint = (ball.y - (player.y + player.height / 2));
        collidePoint = collidePoint / (player.height / 2); // Normalize the value
        let angleRad = (Math.PI / 4) * collidePoint; // Calculate the angle in radians

        // Change the ball's velocity direction based on the collision
        let direction = (ball.x + ball.radius < canvas.width / 2) ? 1 : -1;
        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);

        // Increase the ball's speed after each paddle hit
        ball.speed += 0.5;
    }
}

// Function to render (draw) the game on the canvas
function render() {
    drawRect(0, 0, canvas.width, canvas.height, 'BLACK'); // Clear the canvas by drawing a black rectangle

    drawNet(); // Draw the net

    drawText(user.score, canvas.width / 4, canvas.height / 5, 'WHITE'); // Draw the user's score
    drawText(com.score, 3 * canvas.width / 4, canvas.height / 5, 'WHITE'); // Draw the computer's score

    drawRect(user.x, user.y, user.width, user.height, user.color); // Draw the user paddle
    drawRect(com.x, com.y, com.width, com.height, com.color); // Draw the computer paddle

    drawCircle(ball.x, ball.y, ball.radius, ball.color); // Draw the ball
}

// Main game loop function
function game() {
    update(); // Update the game state
    render(); // Render the game
}

// Set the frame rate for the game (50 frames per second)
const framePerSecond = 50;

// Call the game function repeatedly to create the game loop
setInterval(game, 1000 / framePerSecond);
