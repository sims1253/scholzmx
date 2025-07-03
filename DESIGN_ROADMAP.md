# Design & Implementation Roadmap: scholzmx.com v2

## 1. Overview & Goals

This document outlines the plan for rebuilding the personal and professional website for Max Scholz (scholzmx.com). The primary goal is to create a visually distinct, content-focused, and highly personal website that serves as a hub for professional information, research, and personal blogging.

The new site will be built using Quarto, leveraging its powerful code-rendering capabilities while applying a completely custom theme to achieve a unique aesthetic.

## 2. Guiding Principles

- **Content-First:** The design must prioritize readability and put the user's written content at the forefront.
- **Embrace the Slow Web:** The site should be designed for longevity, not urgency. This means focusing on durable content, simple and robust technology, and a calm, intentional user experience. It is a rejection of the ephemeral, attention-grabbing trends of the modern web.
- **Tufte-Inspired Clarity:** The design will draw inspiration from Edward Tufte's principles of information design, emphasizing clarity, data-ink ratio, and avoiding unnecessary decoration.
- **"Paper-y" Aesthetic:** The visual theme should evoke the feeling of reading on high-quality paper—warm, comfortable, and classic.
- **Accessibility First (No-JS Core):** All core content and navigation must be perfectly functional and readable with JavaScript disabled.
- **Progressive Enhancement:** Interactive elements will be layered on top using non-essential JavaScript.
- **Personal Touch:** The site should feel unique, incorporating elements like the author's mother's artwork.
- **Desktop First, Mobile Responsive:** The primary design target is a desktop view, but the layout must be fully responsive.
- **Privacy-Focused:** No tracking or third-party dependencies from large corporations (e.g., Google Fonts).

## 3. Tech Stack

- **Engine:** Quarto
- **Styling:** Custom SCSS theme with privacy-friendly fonts (Bunny Fonts).
- **Interactivity:** Minimal, vanilla JavaScript for progressive enhancements.
- **Hosting:** GitHub Pages with a GitHub Actions workflow.

## 4. Design & Aesthetic Guide

### 4.1. Inspirations

- **`simonsarris.com`:** Model for the minimalist, single-column layout, clean header navigation, and overall focus on readable content. Particularly inspired by the landscape scribbles in the background and small illustrations at the bottom of pages.
- **`gwern.net` / `turntrout.com`:** Inspiration for future-state advanced hosting (caching, archival) and deep, interconnected content. Turntrout's fish with vine leaves, large illustrated initials, nice typography, and pixel art animations exemplify the handcrafted aesthetic we're aiming for.
- **`putanumonit.com` / `mailchi.mp/btiscience/ferns`:** Inspiration for the "paper-y" feel, warm color palettes, and classic typography. The fern botanical illustrations represent the organic, handcrafted aesthetic we want to achieve.
- **Edward Tufte:** The work of Edward Tufte will inform the site's commitment to data visualization, clarity, and information density.

### 4.2. Game UI Aesthetic Philosophy

**Core Principle: UI as Part of the World**
The website should feel like a cozy, discoverable world rather than a sterile corporate interface. This means:

- **Embedded Interface Elements:** Instead of generic floating buttons and menus, interface elements should feel integrated into the world (like Settlers 4's stone wall framing, or a scroll for navigation menus).
- **Hidden Discoveries:** Following the Peterson & Findus and Löwenzahn PC games philosophy, there should be small, delightful elements that users can discover by exploring - hidden animations, easter eggs, or subtle interactive details.
- **Handcrafted Materials:** Embrace organic textures, botanical illustrations, manuscript illuminations, and aged paper aesthetics over clean geometric shapes.
- **Cozy Adventure Feel:** The site should evoke the warmth of a point-and-click adventure game rather than the sterility of a modern corporate website.

**Visual References:**
- Century botanical illustrations: detailed, handcrafted, aged paper feel
- Manuscript illuminations: ornate initial letters, organic decorative elements
- Forest textures: moss, ferns, natural materials over stark minimalism
- Game world integration: interface elements that feel like natural parts of the environment

**Anti-Patterns to Avoid:**
- Generic "Unity UI" sterile modern look
- Floating buttons and menus that feel disconnected from the content
- Overly clean, geometric designs that lack soul and personality
- Corporate website aesthetics that prioritize "professional" over "personal"

**Achieving a "Haptic" Feel without Skeuomorphism:**
The goal is to make elements feel tangible and part of the world, but we must avoid the pitfalls of dated, overly literal skeuomorphism (e.g., a literal stone texture that looks like a 2000s video game UI). The approach should be subtle and focus on texture, depth, and material feel.

- **Texture over Graphics:** Instead of applying a repeating `stone.jpg` as a background, we can use subtle noise, paper-like textures, and layered CSS gradients to create a sense of depth and material.
- **Shadow and Light:** Use soft, complex shadows to lift elements off the page or give them an "embossed" or "impressed" feel, rather than hard, unrealistic drop-shadows.
- **Organic Borders & Edges:** Instead of sharp, geometric borders, we can use slightly irregular, organic-feeling borders or layered elements to soften the digital feel.
- **Subtle Animations:** Animations should reinforce the material feel. For example, a button press could have a subtle "squish" effect, as if pressing into a soft surface.

### 4.3. Layout

- **Main Layout:** A single, centered content column with generous whitespace. Max width of `800px`.
- **Header:** Simple header with "Max Scholz" on the left and navigation links (`Blog`, `Research`, `About`, `CV`) on the right.
- **Footer:** Minimal footer with copyright, CC license, and social/professional links.

### 4.4. Color Palette

- **Background:** Warm, off-white, paper-like color (e.g., `#fdfbf6`).
- **Text:** Dark, soft gray/black (e.g., `#333333`).
- **Accent Color:** Muted, earthy tone for links (e.g., a deep green or terracotta).

### 4.5. Typography (Privacy-Focused)

- **Font Source:** [Bunny Fonts](https://fonts.bunny.net/) (GDPR-compliant Google Fonts alternative).
- **Body Text:** A classic, readable serif font (e.g., "Lora" or "Source Serif Pro").
- **Headings:** A clean, complementary sans-serif font (e.g., "Lato" or "Source Sans Pro").
- **Accent Handwriting:** Sparingly use a highly readable handwriting font (e.g., from Bunny Fonts) for non-essential, personal touches like a signature. This adds personality without compromising the readability of core content.

## 5. Feature Specifications

This section details the specific features to be implemented, derived from the project's goals and design principles.

- **Homepage:** A welcoming landing page that introduces the author and provides clear navigation to other sections.
- **Blog:** A reverse-chronological listing of blog posts with support for categories. The design will prioritize readability.
- **Research Page:** A dedicated section to list academic publications, pre-prints, and ongoing research projects.
- **About Page:** A personal page containing a biography and contact information. It will feature a unique, interactive element like a flipping profile image.
- **Art Showcase:** A non-intrusive, desktop-only element that showcases personal artwork (e.g., paintings by the author's mother). This element will rotate through a series of images.
- **Custom Theme:** A completely custom visual theme with a "paper-y" aesthetic, warm color palette, and carefully selected typography.
- **Responsive Design:** The website will be fully responsive and functional on all screen sizes, from mobile to desktop.
- **Interactive Elements:**
  - **Flipping Profile Image:** A CSS-only interactive element on the About page.
  - **Rotating Art & Phrases:** JavaScript-powered elements to add a dynamic, personal touch.
  - **Stylized Drop Caps:** A decorative CSS element to enhance the manuscript feel of the text.
- **Deployment:** A fully automated deployment process using GitHub Actions to build and deploy the site to GitHub Pages.

## 6. Implementation Roadmap: Atomic Commits

This roadmap is broken into atomic commits. Each step should result in a single, self-contained commit.

---

### **Phase 1: Foundation & Structure**

**Task 1.1: Initialize Quarto Project**
- **Action:** Create the `_quarto.yml` file. Define the basic site properties and navigation structure for GitHub Pages deployment.
- **Files to Create:** `_quarto.yml`
- **`_quarto.yml` Content:**
  ```yaml
  project:
    type: website
    output-dir: docs

  website:
    title: "Max Scholz"
    site-url: "https://scholzmx.com" # Replace with your actual URL
    navbar:
      right:
        - href: index.qmd
          text: Home
        - href: blog.qmd
          text: Blog
        - href: research.qmd
          text: Research
        - href: about.qmd
          text: About
    page-footer:
      left: "© Max Scholz, 2025. Content licensed under CC BY-SA 4.0."
      right:
        - icon: github
          href: https://github.com/scholzmx
        - icon: twitter
          href: https://twitter.com/scholz_mx

  format:
    html:
      theme: theme.scss
      css: styles.css
      toc: true
  ```
- **Commit Message:** `feat: initialize Quarto project for GitHub Pages`

**Task 1.2: Establish Core Theme with Bunny Fonts**
- **Action:** Create the main theme file. Define fonts (from Bunny Fonts), colors, and basic layout rules.
- **Files to Create:** `theme.scss`
- **`theme.scss` Content:**
  ```scss
  /*-- scss:defaults --*/
  // Fonts (Privacy-focused from Bunny Fonts)
  @import url('https://fonts.bunny.net/css?family=lora:400,700|source-sans-pro:400,700');
  $font-family-sans-serif: "Source Sans Pro", sans-serif;
  $font-family-serif: "Lora", serif;
  $font-family-base: $font-family-serif;

  // Colors
  $body-bg: #fdfbf6;
  $body-color: #333333;
  $link-color: #8a3b3b; // A muted terracotta/red

  /*-- scss:rules --*/
  // Layout
  body {
    line-height: 1.7;
  }
  .navbar {
    font-family: $font-family-sans-serif;
  }
  ```
- **Commit Message:** `style: establish core theme with Bunny Fonts and color palette`

**Task 1.3: Migrate Homepage**
- **Action:** Create `index.qmd` and transfer the content from the old `index.Rmd`.
- **Files to Create:** `index.qmd`
- **Action:** Copy content from `index.Rmd`, adjusting metadata to Quarto's YAML format.
- **Commit Message:** `content: migrate homepage content to index.qmd`

---

### **Phase 2: Content Pages**

**Task 2.1: Create Blog Listing Page**
- **Action:** Create a `blog.qmd` file that will serve as the listing page for all posts.
- **Files to Create:** `blog.qmd`
- **`blog.qmd` Content:**
  ```yaml
  ---
  title: "Blog"
  listing:
    contents: post
    sort: "date desc"
    type: default
    categories: true
    sort-ui: false
    filter-ui: false
  page-layout: full
  title-block-banner: false
  ---
  ```
- **Commit Message:** `feat: create blog listing page`

**Task 2.2: Create Research Page**
- **Action:** Create a `research.qmd` file. For now, this can be a simple page where publication content will be added.
- **Files to Create:** `research.qmd`
- **`research.qmd` Content:**
  ```yaml
  ---
  title: "Research & Publications"
  ---

  This page lists my academic publications and research projects.
  ```
- **Commit Message:** `feat: create research page structure`

**Task 2.3: Create About Page**
- **Action:** Create the `about.qmd` page. This will house the bio and the flipping profile image.
- **Files to Create:** `about.qmd`
- **`about.qmd` Content:**
  ```yaml
  ---
  title: "About Me"
  ---

  This is the about page. The flipping image will go here.
  ```
- **Commit Message:** `feat: create about page structure`

---

### **Phase 3: Interactive & Personal Elements**

**Task 3.1: Implement CSS-Only Flipping Image**
- **Action:** Add the HTML structure to `about.qmd` and the required CSS to a new `styles.css` file.
- **Files to Modify:** `about.qmd`
- **Files to Create:** `styles.css`
- **`about.qmd` Addition:**
  ```html
  <!-- Add to the body of about.qmd -->
  <div class="flip-container">
    <input type="checkbox" id="flipper" aria-hidden="true">
    <label for="flipper" class="flip-card">
      <div class="card-front">
        <img src="/path/to/professional-image.jpg" alt="Professional headshot">
      </div>
      <div class="card-back">
        <img src="/path/to/casual-image.jpg" alt="Casual photo">
      </div>
    </label>
  </div>
  ```
- **`styles.css` Content:**
  ```css
  /* Flipping Image */
  .flip-container {
    perspective: 1000px;
    width: 250px;
    height: 250px;
  }
  .flip-container input[type=checkbox] { display: none; }
  .flip-card {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.8s;
    cursor: pointer;
  }
  .flip-container input[type=checkbox]:checked + .flip-card {
    transform: rotateY(180deg);
  }
  .card-front, .card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
  }
  .card-back {
    transform: rotateY(180deg);
  }
  ```
- **Commit Message:** `feat(about): add CSS-only flipping profile image`

**Task 3.2: Implement Art Showcase (Static)**
- **Action:** Add the HTML for the easel to the Quarto layout and style it in `styles.css`. It will only show one static image for now.
- **Files to Create:** `_partials/art-showcase.html` (or similar custom partial)
- **Action:** Modify `_quarto.yml` to include the partial.
- **`art-showcase.html` Content:**
  ```html
  <aside class="art-showcase">
    <figure>
      <img src="/path/to/moms-painting1.jpg" alt="A painting by my mother">
      <figcaption>Artwork by my mother</figcaption>
    </figure>
  </aside>
  ```
- **`styles.css` Addition:**
  ```css
  .art-showcase {
    position: fixed;
    top: 200px;
    right: 50px;
    width: 200px;
    display: none; /* Hidden by default */
  }
  @media (min-width: 1400px) {
    .art-showcase {
      display: block; /* Only show on very wide screens */
    }
  }
  ```
- **Commit Message:** `feat: add static art showcase element to layout`

**Task 3.3: Implement Rotating Art & Phrases (JS)**
- **Action:** Create a JavaScript file. Add code to rotate the art and the footer phrases.
- **Files to Create:** `site.js`
- **Action:** Update `_quarto.yml` to include the script.
- **`site.js` Content:**
  ```javascript
  document.addEventListener('DOMContentLoaded', () => {
    // Rotating Phrases
    const phrases = ["Phrase 1", "Phrase 2", "Phrase 3"];
    const phraseElement = document.querySelector('#rotating-phrase'); // Assumes an ID on the target element
    if (phraseElement) {
      phraseElement.textContent = phrases[Math.floor(Math.random() * phrases.length)];
    }

    // Rotating Art
    const paintings = ["/path/to/painting1.jpg", "/path/to/painting2.jpg"];
    const artElement = document.querySelector('.art-showcase img');
    if (artElement) {
      artElement.src = paintings[Math.floor(Math.random() * paintings.length)];
    }
  });
  ```
- **Commit Message:** `feat: add JS for rotating art and phrases`

**Task 3.4: Add Stylized Drop Caps**
- **Action:** Add CSS to `styles.css` to style the first letter of the main content area, creating a "drop cap" effect.
- **Files to Modify:** `styles.css`
- **`styles.css` Addition:**
  ```css
  /* Stylized Drop Cap */
  .quarto-body-content p:first-of-type::first-letter {
    font-family: "Lora", serif; /* Or a more decorative font */
    font-size: 4.5em;
    font-weight: bold;
    float: left;
    line-height: 0.7;
    padding-right: 0.1em;
    color: #8a3b3b; /* Use accent color */
  }
  ```
- **Commit Message:** `style: add CSS for stylized drop caps`

---

### **Phase 4: Deployment & Finalization**

**Task 4.1: Create GitHub Pages Deployment Workflow**
- **Action:** Create a GitHub Actions workflow file to build and deploy the Quarto site.
- **Files to Create:** `.github/workflows/deploy.yml`
- **`deploy.yml` Content:**
  ```yaml
  name: Deploy Website

  on:
    push:
      branches:
        - main # Or your default branch

  jobs:
    build-and-deploy:
      runs-on: ubuntu-latest
      steps:
        - name: Check out repository
          uses: actions/checkout@v3

        - name: Set up Quarto
          uses: quarto-dev/quarto-actions/setup@v2

        - name: Render Website
          run: quarto render

        - name: Deploy to GitHub Pages
          uses: peaceiris/actions-gh-pages@v3
          with:
            github_token: ${{ secrets.GITHUB_TOKEN }}
            publish_dir: ./docs
  ```
- **Commit Message:** `ci: add GitHub Actions workflow for deploying to GitHub Pages`

**Task 4.2: Final Review & Cleanup**
- **Action:** Review all pages, check for broken links, and clean up any placeholder content.
- **Commit Message:** `fix: perform final review and cleanup before launch`

## 7. Future Enhancements

This section captures advanced ideas for later implementation.

- **Tufte-Style Sidenotes:** Implement a system for Tufte-style sidenotes, allowing for marginal notes that don't interrupt the main flow of the text. This would be a significant step towards a more academic and information-rich presentation, especially for research articles and would align the website more with the core ideas of Tufte.
- **Evolve into a Digital Garden:** Move beyond a traditional blog structure towards a network of interconnected notes. This involves:
  - Creating a dedicated `/garden` section for evergreen notes, ideas, and summaries.
  - Prioritizing bidirectional linking between pages to create a web of knowledge.
  - Writing in a way that notes can be updated over time as understanding evolves.
  - Leveraging Quarto's built-in cross-referencing (`@page-title`) as a foundation and potentially exploring more advanced solutions for visualizing the network.
- **Illustrated Manuscript Initials:** Replace the CSS-based drop caps with a system that uses images of ornate, manuscript-style first letters. This could involve a small script to replace the first letter with an `<img>` tag pointing to a random initial from a collection. This could also be combined with a handwriting font for a more personal touch.
- **Advanced Caching & Archiving:** Investigate implementing a more robust hosting setup similar to `gwern.net`, potentially using a custom server or CDN rules to ensure long-term availability and performance of content and assets.
- **Full-Text Search:** Implement a client-side or serverless search function to allow users to search the full text of all blog posts and pages.