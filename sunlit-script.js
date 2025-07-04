// --- Main Function Definitions ---

function toggleTheme() {
  document.body.classList.add('animation-ready');
  document.body.classList.toggle('dark');
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    if (document.body.classList.contains('dark')) {
      themeToggle.className = 'fa-solid fa-moon';
    } else {
      themeToggle.className = 'fa-solid fa-sun';
    }
  }
}

function initArtShowcase() {
  let currentArtworkIndex = 0;
  const artShowcase = document.getElementById('art-showcase');
  if (!artShowcase) return;
  const artworks = artShowcase.querySelectorAll('.artwork');
  if (artworks.length === 0) return;

  const rotateArtwork = () => {
    artworks[currentArtworkIndex].classList.remove('active');
    currentArtworkIndex = (currentArtworkIndex + 1) % artworks.length;
    artworks[currentArtworkIndex].classList.add('active');
  };

  let artRotationInterval = setInterval(rotateArtwork, 6000);

  artShowcase.addEventListener('click', (event) => {
    event.stopPropagation();
    clearInterval(artRotationInterval);
    rotateArtwork();
    artRotationInterval = setInterval(rotateArtwork, 10000);
  });
  artShowcase.addEventListener('mouseenter', () => clearInterval(artRotationInterval));
  artShowcase.addEventListener('mouseleave', () => artRotationInterval = setInterval(rotateArtwork, 6000));
}

function initFlipCard() {
  const flipCard = document.querySelector('.flip-card-container');
  if (flipCard) {
    flipCard.addEventListener('click', () => {
      flipCard.classList.toggle('is-flipped');
    });
  }
}


// --- Main Initializer ---
// Runs when the page is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  
  // Set up theme toggle button
  const themeToggleButton = document.getElementById('theme-toggle');
  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      toggleTheme();
    });
  }
  
  // Initialize other interactive elements
  initArtShowcase();
  initFlipCard();
  
  // Add a small delay to ensure all styles are loaded before animations
  setTimeout(() => {
    document.body.classList.add('sunlit-ready');
  }, 100);
});