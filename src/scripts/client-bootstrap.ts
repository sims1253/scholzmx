/**
 * Client-side bootstrap utility for idempotent component initialization
 * with cleanup/teardown support.
 */

/**
 * Private store for tracking initialized components and their cleanup functions.
 * Using a module-level Map ensures state persists across imports.
 */
const componentRegistry = new Map<
  string,
  {
    initialized: boolean;
    cleanup: (() => void) | null;
  }
>();

/**
 * Run a function when DOM is ready (or immediately if already ready).
 *
 * @param callback - Function to execute when DOM is ready
 *
 * @example
 * ```ts
 * domReady(() => {
 *   console.log('DOM is ready!');
 * });
 * ```
 */
export function domReady(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    // DOM is already ready, run immediately
    callback();
  }
}

/**
 * Bootstrap a client component with idempotency and cleanup support.
 *
 * This function ensures a component is only initialized once per key.
 * If the init function returns a cleanup function, it will be stored
 * and can be called later to tear down the component.
 *
 * @param key - Unique identifier for this component instance
 * @param init - Initialization function, optionally returns a cleanup function
 * @returns A cleanup function that removes listeners and resets state
 *
 * @example
 * ```ts
 * // Basic usage
 * const cleanup = bootstrapComponent('toc', () => {
 *   const container = document.querySelector('.toc-container');
 *   if (!container) return;
 *
 *   const handleClick = (e: Event) => { };
 *   document.addEventListener('click', handleClick);
 *
 *   // Return cleanup function
 *   return () => {
 *     document.removeEventListener('click', handleClick);
 *   };
 * });
 *
 * // Later, to tear down:
 * cleanup();
 * ```
 *
 * @example
 * ```ts
 * // With conditional initialization
 * bootstrapComponent('theme-toggle', () => {
 *   const toggle = document.querySelector('[data-theme-toggle]');
 *   if (!toggle) return; // No cleanup needed if element doesn't exist
 *
 *   const handleToggle = () => { };
 *   toggle.addEventListener('click', handleToggle);
 *
 *   return () => toggle.removeEventListener('click', handleToggle);
 * });
 * ```
 */
export function bootstrapComponent(key: string, init: () => void | (() => void)): () => void {
  // Check if already initialized
  const existing = componentRegistry.get(key);
  if (existing?.initialized) {
    // Return existing cleanup function (idempotent)
    return () => {
      if (existing.cleanup) {
        existing.cleanup();
      }
      componentRegistry.delete(key);
    };
  }

  // Run initialization when DOM is ready
  domReady(() => {
    // Double-check idempotency inside domReady callback
    const current = componentRegistry.get(key);
    if (current?.initialized) {
      return;
    }

    // Run the init function and capture any cleanup function
    const cleanup = init() ?? null;

    // Store the initialization state and cleanup function
    componentRegistry.set(key, {
      initialized: true,
      cleanup,
    });
  });

  // Return a cleanup function
  return () => {
    const entry = componentRegistry.get(key);
    if (entry) {
      if (entry.cleanup) {
        entry.cleanup();
      }
      componentRegistry.delete(key);
    }
  };
}

/**
 * Check if a component has already been initialized.
 *
 * @param key - The component identifier to check
 * @returns true if the component has been initialized, false otherwise
 *
 * @example
 * ```ts
 * if (!isInitialized('toc')) {
 *   bootstrapComponent('toc', initToc);
 * }
 * ```
 */
export function isInitialized(key: string): boolean {
  const entry = componentRegistry.get(key);
  return entry?.initialized ?? false;
}

/**
 * Reset a specific component's initialization state.
 * Useful for testing or hot module replacement.
 *
 * @param key - The component identifier to reset
 *
 * @example
 * ```ts
 * resetComponent('toc');
 * // Now bootstrapComponent('toc', ...) will run init again
 * ```
 */
export function resetComponent(key: string): void {
  const entry = componentRegistry.get(key);
  if (entry?.cleanup) {
    try {
      entry.cleanup();
    } catch (error) {
      console.error(`Cleanup failed for component: ${key}`, error);
    }
  }
  componentRegistry.delete(key);
}

/**
 * Reset all components. Useful for testing.
 */
export function resetAll(): void {
  for (const [key, entry] of componentRegistry) {
    if (entry.cleanup) {
      try {
        entry.cleanup();
      } catch (error) {
        console.error(`Cleanup failed for component: ${key}`, error);
      }
    }
  }
  componentRegistry.clear();
}
