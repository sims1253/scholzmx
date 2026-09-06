// Copy button functionality for code blocks
export function initCopyButtons(): void {
  document.querySelectorAll('.astro-code').forEach((codeBlock) => {
    if (codeBlock.querySelector('.copy-button')) return;
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16"><path d="M18 5.086L12.914 0H5a3 3 0 0 0-3 3v17h16zM4 18V3a1 1 0 0 1 1-1h7v4h4v12zm18-9v15H7v-2h13V7z" fill="currentColor"/></svg>';

    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const codeElement = codeBlock.querySelector('code');
        const codeContent = codeElement ? codeElement.textContent || '' : '';
        await navigator.clipboard.writeText(codeContent);
        button.setAttribute('aria-label', 'Code copied to clipboard');
        button.classList.add('copied');
        button.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.506 507.506" width="16" height="16"><path d="M163.865 436.934c-14.406.006-28.222-5.72-38.4-15.915L9.369 304.966c-12.492-12.496-12.492-32.752 0-45.248h0c12.496-12.492 32.752-12.492 45.248 0l109.248 109.248L452.889 79.942c12.496-12.492 32.752-12.492 45.248 0h0c12.492 12.496 12.492 32.752 0 45.248L202.265 421.019c-10.178 10.195-23.994 15.921-38.4 15.915z" fill="currentColor"/></svg>';
        setTimeout(() => {
          button.setAttribute('aria-label', 'Copy code to clipboard');
          button.classList.remove('copied');
          button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16"><path d="M18 5.086L12.914 0H5a3 3 0 0 0-3 3v17h16zM4 18V3a1 1 0 0 1 1-1h7v4h4v12zm18-9v15H7v-2h13V7z" fill="currentColor"/></svg>';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
        button.setAttribute('aria-label', 'Failed to copy code');
      }
    });

    codeBlock.appendChild(button);
  });
}

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initCopyButtons);
