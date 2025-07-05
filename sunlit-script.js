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

function initMobileMenu() {
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
    
    const searchInput = document.createElement('input');
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
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        // Try to use Quarto's search if available
        const quartoSearch = document.getElementById('quarto-search');
        if (quartoSearch) {
          // Try to trigger Quarto search
          const searchBtn = quartoSearch.querySelector('button, .aa-SubmitButton');
          if (searchBtn) {
            // Set the search query if there's an input
            const quartoInput = quartoSearch.querySelector('input, .aa-Input');
            if (quartoInput) {
              quartoInput.value = query;
              quartoInput.focus();
              // Trigger search
              quartoInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            searchBtn.click();
          } else {
            // Fallback to our search functionality
            searchInCurrentPage(query);
          }
        } else {
          // Use our search functionality
          searchInCurrentPage(query);
        }
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
  initMobileMenu();
  
  // Initialize search functionality
  setTimeout(() => {
    const searchEl = document.getElementById('quarto-search');
    console.log('Search element found:', searchEl);
    console.log('Search element innerHTML:', searchEl ? searchEl.innerHTML : 'N/A');
    console.log('Search element classes:', searchEl ? searchEl.className : 'N/A');
    
    // Check if autocomplete library is available
    console.log('Autocomplete library available:', typeof window['@algolia/autocomplete-js']);
    console.log('Quarto search options:', document.getElementById('quarto-search-options'));
    
    // Check if Quarto search initialized successfully
    const hasSearchContent = searchEl && (
      searchEl.innerHTML.trim() !== '' || 
      searchEl.querySelector('.aa-Form') ||
      searchEl.querySelector('input[type="search"]') ||
      searchEl.querySelector('.aa-Input')
    );
    
    console.log('Has search content:', hasSearchContent);
    
    if (searchEl && !hasSearchContent) {
      // Search widget failed to initialize, add a fallback search icon
      console.log('Search widget failed to initialize, adding fallback...');
      
      // Only add fallback for desktop - mobile should rely on the mobile menu search
      const isDesktop = window.innerWidth >= 992;
      
      if (isDesktop) {
        // Create a clean search icon for desktop that opens the search overlay
        const searchButton = document.createElement('button');
        searchButton.type = 'button';
        searchButton.title = 'Search';
        searchButton.className = 'desktop-search-fallback';
        searchButton.style.cssText = `
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 4px;
          transition: background-color 0.3s ease;
        `;
        
        // Add the search icon using Font Awesome
        const searchIcon = document.createElement('i');
        searchIcon.className = 'fa-solid fa-magnifying-glass';
        searchIcon.style.cssText = `
          font-size: 16px;
          color: var(--text-dark);
          opacity: 0.7;
          transition: opacity 0.3s ease;
        `;
        
        searchButton.appendChild(searchIcon);
        
        // Add hover effect
        searchButton.addEventListener('mouseenter', () => {
          searchIcon.style.opacity = '1';
          searchButton.style.backgroundColor = 'rgba(138, 59, 59, 0.1)';
        });
        searchButton.addEventListener('mouseleave', () => {
          searchIcon.style.opacity = '0.7';
          searchButton.style.backgroundColor = 'transparent';
        });
        
        // Add click handler to trigger search overlay
        searchButton.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Desktop search button clicked');
          // Always show the simple search overlay for desktop
          showSimpleSearch();
        });
        
        // Add the button to the search container
        searchEl.appendChild(searchButton);
        
        // Ensure proper styling for dark mode
        const updateIconColor = () => {
          if (document.body.classList.contains('dark')) {
            searchIcon.style.color = 'var(--day)';
            searchButton.addEventListener('mouseenter', () => {
              searchButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
          } else {
            searchIcon.style.color = 'var(--text-dark)';
            searchButton.addEventListener('mouseenter', () => {
              searchButton.style.backgroundColor = 'rgba(138, 59, 59, 0.1)';
            });
          }
        };
        
        // Initial color set
        updateIconColor();
        
        // Listen for theme changes
        const observer = new MutationObserver(() => {
          updateIconColor();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }
    }
  }, 2000);
  
  // Simple search overlay function
  function showSimpleSearch() {
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
    
    const searchInput = document.createElement('input');
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
    const closeSearch = () => {
      document.body.removeChild(overlay);
    };
    
    closeButton.addEventListener('click', closeSearch);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearch();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });
    
    // Search handler
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          // Try to perform search using the site's search functionality
          if (typeof window.performSearch === 'function') {
            window.performSearch(query);
          } else {
            // Filter current page content or show search results
            searchInCurrentPage(query);
          }
          closeSearch();
        }
      }
    });
  }
  
  // Simple search function for current page
  function searchInCurrentPage(query) {
    // Clear previous highlights
    clearSearchHighlights();
    
    if (!query) return;
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
    let totalMatches = 0;
    
    // Search in text content
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script, style, and search elements
          const parent = node.parentNode;
          if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || 
              parent.closest('#simple-search-overlay') || 
              parent.closest('#quarto-search')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Highlight matches
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const lowerText = text.toLowerCase();
      
      let hasMatch = false;
      for (const term of searchTerms) {
        if (lowerText.includes(term)) {
          hasMatch = true;
          break;
        }
      }
      
      if (hasMatch) {
        const parent = textNode.parentNode;
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
  }
  
  function highlightText(text, searchTerms) {
    let highlightedText = text;
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    });
    return highlightedText;
  }
  
  function clearSearchHighlights() {
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });
    
    // Remove existing notification
    const notification = document.getElementById('search-notification');
    if (notification) {
      notification.remove();
    }
  }
  
  function showSearchResults(query, count) {
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
  
  
  // Add a small delay to ensure all styles are loaded before animations
  setTimeout(() => {
    document.body.classList.add('sunlit-ready');
  }, 100);
  // Add the mouse-tracking glow effect
  document.addEventListener('mousemove', (e) => {
    document.body.style.setProperty('--mx', e.clientX + 'px');
    document.body.style.setProperty('--my', e.clientY + 'px');
  });
});