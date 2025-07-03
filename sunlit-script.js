// sunlit-script.js - Interactive toggle functionality for sunlit effects
function toggle() {
  document.body.classList.add('animation-ready');
  document.body.classList.toggle('dark');
}

document.addEventListener('keydown', function(event) {
  if (event.keyCode === 32) { // 32 is the keycode for spacebar
    event.preventDefault(); // Prevent default scrolling behavior
    toggle();
  }
});

document.addEventListener('click', function(event) {
  // Only toggle if clicking outside of interactive elements
  if (!event.target.closest('a, button, input, textarea, select')) {
    toggle();
  }
});

// Initialize the page with proper styling
document.addEventListener('DOMContentLoaded', function() {
  // Add a small delay to ensure all styles are loaded
  setTimeout(function() {
    document.body.classList.add('sunlit-ready');
  }, 100);
});