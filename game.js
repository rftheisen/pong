const canvas = document.getElementById('pong');
const context = canvas.getContext('2d');
const codeDisplay = document.getElementById('code-display');

// Function to display code
function displayCode(code) {
    if (codeDisplay) {
        codeDisplay.textContent = code;
    } else {
        console.error("codeDisplay element not found");
    }
}

// Initial test to check if displayCode works
displayCode("Game Initialized");
