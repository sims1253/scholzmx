// Browser-compatible version of sunlit-script.ts
// This version doesn't use exports and makes functions globally available

// --- Main Function Definitions ---
function toggleTheme(): void {
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

function initArtShowcase(): void {
  let currentArtworkIndex = 0;
  const artShowcase = document.getElementById('art-showcase');
  if (!artShowcase) return;
  
  const artworks = artShowcase.querySelectorAll('.artwork');
  if (artworks.length === 0) return;

  const rotateArtwork = (): void => {
    artworks[currentArtworkIndex].classList.remove('active');
    currentArtworkIndex = (currentArtworkIndex + 1) % artworks.length;
    artworks[currentArtworkIndex].classList.add('active');
  };

  let artRotationInterval = setInterval(rotateArtwork, 6000);

  artShowcase.addEventListener('click', (event: Event) => {
    event.stopPropagation();
    clearInterval(artRotationInterval);
    rotateArtwork();
    artRotationInterval = setInterval(rotateArtwork, 10000);
  });
  
  artShowcase.addEventListener('mouseenter', () => clearInterval(artRotationInterval));
  artShowcase.addEventListener('mouseleave', () => {
    artRotationInterval = setInterval(rotateArtwork, 6000);
  });
}

function initFlipCard(): void {
  const flipCard = document.querySelector('.flip-card-container') as HTMLElement;
  if (flipCard) {
    flipCard.addEventListener('click', () => {
      flipCard.classList.toggle('is-flipped');
    });
  }
}

function initMobileMenu(): void {
  // Enhance Quarto's existing Bootstrap navbar collapse for better mobile experience
  const navbarCollapse = document.getElementById('navbarCollapse');
  const navbar = document.querySelector('.navbar-nav');
  if (!navbarCollapse || !navbar) return;

  // Only add mobile search on mobile/tablet devices
  const isMobile = window.innerWidth < 992;
  if (isMobile) {
    // Add search functionality to mobile menu
    const searchContainer = document.createElement('div');
    searchContainer.className = 'mobile-search-container';
    searchContainer.style.cssText = `
      padding: 1rem 0;
      border-bottom: 1px solid var(--paper-shadow);
      margin-bottom: 1rem;
    `;
    
    if (document.body.classList.contains('dark')) {
      searchContainer.style.borderBottomColor = 'rgba(255, 255, 255, 0.1)';
    }

    const searchInput = document.createElement('input') as HTMLInputElement;
    searchInput.type = 'search';
    searchInput.className = 'mobile-search-input';
    searchInput.placeholder = 'Search...';
    searchInput.setAttribute('aria-label', 'Search');
    searchInput.style.cssText = `
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--paper-shadow);
      border-radius: 6px;
      background: var(--paper-white);
      color: var(--text-dark);
      font-size: 1rem;
      transition: border-color 0.3s ease;
    `;
    
    if (document.body.classList.contains('dark')) {
      searchInput.style.background = 'var(--night)';
      searchInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      searchInput.style.color = 'var(--day)';
    }

    // Add search button (mobile only)
    const searchButton = document.createElement('button');
    searchButton.textContent = 'Search';
    searchButton.className = 'mobile-search-button';
    searchButton.style.cssText = `
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--accent-terracotta);
      color: var(--paper-white);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s ease;
      width: 100%;
    `;

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchButton);

    // Insert search at the beginning of the navbar collapse
    navbarCollapse.insertBefore(searchContainer, navbarCollapse.firstChild);

    // Enhanced search functionality in mobile menu
    searchInput.addEventListener('keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          searchInCurrentPage(query);
        }
      }
    });

    // Search button functionality
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        searchInCurrentPage(query);
      }
    });
  }
}

function showSimpleSearch(): void {
  // Check if overlay already exists
  if (document.getElementById('simple-search-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'simple-search-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    z-index: 10000;
  `;

  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    background: var(--paper-white);
    border-radius: 8px;
    padding: 1rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  `;
  
  if (document.body.classList.contains('dark')) {
    searchContainer.style.background = 'var(--night)';
  }

  const searchInput = document.createElement('input') as HTMLInputElement;
  searchInput.type = 'search';
  searchInput.placeholder = 'Search...';
  searchInput.style.cssText = `
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--paper-shadow);
    border-radius: 4px;
    font-size: 1rem;
    background: transparent;
    color: var(--text-dark);
  `;
  
  if (document.body.classList.contains('dark')) {
    searchInput.style.color = 'var(--day)';
    searchInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
  }

  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-dark);
  `;
  
  if (document.body.classList.contains('dark')) {
    closeButton.style.color = 'var(--day)';
  }

  searchContainer.style.position = 'relative';
  searchContainer.appendChild(closeButton);
  searchContainer.appendChild(searchInput);
  overlay.appendChild(searchContainer);
  document.body.appendChild(overlay);

  // Focus the input
  searchInput.focus();

  // Close handlers
  const closeSearch = (): void => {
    document.body.removeChild(overlay);
  };

  closeButton.addEventListener('click', closeSearch);
  overlay.addEventListener('click', (e: Event) => {
    if (e.target === overlay) closeSearch();
  });

  const escapeHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      closeSearch();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // Search handler
  searchInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        searchInCurrentPage(query);
        closeSearch();
      }
    }
  });
}

function searchInCurrentPage(query: string): { query: string; totalMatches: number } {
  // Clear previous highlights
  clearSearchHighlights();
  
  if (!query) return { query, totalMatches: 0 };

  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
  let totalMatches = 0;

  // Search in text content
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node: Node): number {
        // Skip script, style, and search elements
        const parent = node.parentNode as Element;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
            parent.closest('#simple-search-overlay') ||
            parent.closest('#quarto-search')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes: Text[] = [];
  let node: Node | null;
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  // Highlight matches
  textNodes.forEach(textNode => {
    const text = textNode.textContent || '';
    const lowerText = text.toLowerCase();
    
    let hasMatch = false;
    for (const term of searchTerms) {
      if (lowerText.includes(term)) {
        hasMatch = true;
        break;
      }
    }

    if (hasMatch) {
      const parent = textNode.parentNode as Element;
      const wrapper = document.createElement('span');
      wrapper.innerHTML = highlightText(text, searchTerms);
      parent.insertBefore(wrapper, textNode);
      parent.removeChild(textNode);
      
      const matches = wrapper.querySelectorAll('.search-highlight');
      totalMatches += matches.length;
    }
  });

  // Show results notification
  showSearchResults(query, totalMatches);
  
  return { query, totalMatches };
}

function highlightText(text: string, searchTerms: string[]): string {
  let highlightedText = text;
  searchTerms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  });
  return highlightedText;
}

function clearSearchHighlights(): void {
  const highlights = document.querySelectorAll('.search-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode as Element;
    parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
    parent.normalize();
  });

  // Remove existing notification
  const notification = document.getElementById('search-notification');
  if (notification) {
    notification.remove();
  }
}

function showSearchResults(query: string, count: number): void {
  // Remove existing notification
  const existing = document.getElementById('search-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'search-notification';
  notification.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: var(--paper-white);
    border: 1px solid var(--paper-shadow);
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    max-width: 300px;
  `;
  
  if (document.body.classList.contains('dark')) {
    notification.style.background = 'var(--night)';
    notification.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    notification.style.color = 'var(--day)';
  }

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  `;

  closeBtn.addEventListener('click', () => {
    clearSearchHighlights();
    notification.remove();
  });

  notification.innerHTML = `
    <strong>Search Results</strong><br>
    Found ${count} matches for "${query}"
    ${count > 0 ? '<br><small>Highlighted on this page</small>' : ''}
  `;
  notification.appendChild(closeBtn);

  document.body.appendChild(notification);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// --- Main Initializer ---
// Runs when the page is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set up theme toggle button
  const themeToggleButton = document.getElementById('theme-toggle');
  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', (event: Event) => {
      event.preventDefault();
      toggleTheme();
    });
  }

  // Initialize other interactive elements
  initArtShowcase();
  initFlipCard();
  initMobileMenu();

  // Add a small delay to ensure all styles are loaded before animations
  setTimeout(() => {
    document.body.classList.add('sunlit-ready');
  }, 100);

  // Add the mouse-tracking glow effect
  document.addEventListener('mousemove', (e: MouseEvent) => {
    document.body.style.setProperty('--mx', e.clientX + 'px');
    document.body.style.setProperty('--my', e.clientY + 'px');
  });
});