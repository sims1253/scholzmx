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

// Art Showcase Rotation Functionality
let currentArtworkIndex = 0;
let artRotationInterval;

function rotateArtwork() {
  const artShowcase = document.getElementById('art-showcase');
  if (!artShowcase) return;
  
  const artworks = artShowcase.querySelectorAll('.artwork');
  if (artworks.length === 0) return;
  
  // Remove active class from current artwork
  artworks[currentArtworkIndex].classList.remove('active');
  
  // Move to next artwork (loop back to 0 if at end)
  currentArtworkIndex = (currentArtworkIndex + 1) % artworks.length;
  
  // Add active class to new artwork
  artworks[currentArtworkIndex].classList.add('active');
}

function initArtShowcase() {
  const artShowcase = document.getElementById('art-showcase');
  if (!artShowcase) return;
  
  // Start automatic rotation every 4 seconds
  artRotationInterval = setInterval(rotateArtwork, 4000);
  
  // Allow manual rotation on click
  artShowcase.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent the sunlit toggle
    clearInterval(artRotationInterval); // Stop automatic rotation temporarily
    rotateArtwork();
    
    // Restart automatic rotation after a delay
    setTimeout(function() {
      artRotationInterval = setInterval(rotateArtwork, 4000);
    }, 8000);
  });
  
  // Pause rotation on hover, resume on leave
  artShowcase.addEventListener('mouseenter', function() {
    clearInterval(artRotationInterval);
  });
  
  artShowcase.addEventListener('mouseleave', function() {
    artRotationInterval = setInterval(rotateArtwork, 4000);
  });
}

// Initialize the page with proper styling
document.addEventListener('DOMContentLoaded', function() {
  // Add a small delay to ensure all styles are loaded
  setTimeout(function() {
    document.body.classList.add('sunlit-ready');
    initArtShowcase(); // Initialize art showcase functionality
  }, 100);
});