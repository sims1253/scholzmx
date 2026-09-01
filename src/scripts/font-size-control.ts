import { bootstrapComponent } from './client-bootstrap';

const STORAGE_KEY = 'font-size-preference';
const FONT_SIZES = {
  xsmall: 0.9,
  medium: 1,
  xlarge: 1.15,
} as const;

type FontSize = keyof typeof FONT_SIZES;
const FONT_SIZE_KEYS = Object.keys(FONT_SIZES) as FontSize[];

function isFontSize(value: string | null): value is FontSize {
  return Boolean(value && FONT_SIZE_KEYS.includes(value as FontSize));
}

function getStoredSize(): FontSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isFontSize(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  // Default to medium
  return 'medium';
}

function setStoredSize(size: FontSize): void {
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // Ignore storage errors
  }
}

function applyFontSize(size: FontSize): void {
  const root = document.documentElement;
  const scale = FONT_SIZES[size];

  // For medium (default), remove custom property to let CSS clamp() work naturally
  if (size === 'medium') {
    root.style.removeProperty('--font-scale');
    return;
  }

  // Set CSS custom property for font scale instead of fixed pixel value
  // This preserves CSS clamp() responsiveness on viewport resize
  root.style.setProperty('--font-scale', String(scale));
}

function handleFontSizeChange(size: FontSize): void {
  setStoredSize(size);
  applyFontSize(size);
  updateActiveState(size);
}

function updateActiveState(size: FontSize): void {
  // Update trigger icon size
  const trigger = document.getElementById('font-size-trigger');
  if (trigger) {
    const icon = trigger.querySelector<HTMLElement>('.font-size-icon');
    if (icon) {
      const iconSizes: Record<FontSize, string> = {
        xsmall: '13px',
        medium: '14px',
        xlarge: '15px',
      };
      icon.style.fontSize = iconSizes[size];
    }
  }

  // Update dropdown option states
  document.querySelectorAll<HTMLButtonElement>('.font-size-option').forEach((option) => {
    const optionSize = option.dataset.size as FontSize;
    if (optionSize === size) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

function toggleDropdown(): void {
  const trigger = document.getElementById('font-size-trigger') as HTMLButtonElement | null;
  const dropdown = document.getElementById('font-size-dropdown') as HTMLElement | null;

  if (!trigger || !dropdown) return;

  const isOpen = trigger.getAttribute('aria-expanded') === 'true';

  if (isOpen) {
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'true');
  } else {
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.setAttribute('aria-hidden', 'false');
  }
}

function closeDropdown(): void {
  const trigger = document.getElementById('font-size-trigger');
  const dropdown = document.getElementById('font-size-dropdown');

  if (trigger && dropdown) {
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'true');
  }
}

bootstrapComponent('font-size-control', () => {
  const trigger = document.getElementById('font-size-trigger') as HTMLButtonElement | null;
  const dropdown = document.getElementById('font-size-dropdown') as HTMLElement | null;

  if (!trigger || !dropdown) return;

  // Get initial preference
  const initialSize = getStoredSize();

  // Apply initial size
  applyFontSize(initialSize);
  updateActiveState(initialSize);

  // Store cleanup functions for event listeners
  const cleanupFns: (() => void)[] = [];

  // Toggle dropdown on trigger click
  const handleTriggerClick = (e: Event): void => {
    e.stopPropagation();
    toggleDropdown();
  };
  trigger.addEventListener('click', handleTriggerClick);
  cleanupFns.push(() => trigger.removeEventListener('click', handleTriggerClick));

  // Handle option clicks and keyboard
  dropdown.querySelectorAll<HTMLButtonElement>('.font-size-option').forEach((option) => {
    const handleOptionClick = (e: Event): void => {
      e.stopPropagation();
      const size = option.dataset.size ?? null;
      if (isFontSize(size)) {
        handleFontSizeChange(size);
        closeDropdown();
      }
    };
    option.addEventListener('click', handleOptionClick);
    cleanupFns.push(() => option.removeEventListener('click', handleOptionClick));

    // Keyboard support
    const handleOptionKeydown = (e: Event): void => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        e.preventDefault();
        const size = option.dataset.size ?? null;
        if (isFontSize(size)) {
          handleFontSizeChange(size);
          closeDropdown();
        }
      }
    };
    option.addEventListener('keydown', handleOptionKeydown);
    cleanupFns.push(() => option.removeEventListener('keydown', handleOptionKeydown));
  });

  // Close dropdown when clicking outside
  const handleDocumentClick = (e: Event): void => {
    if (!trigger.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      closeDropdown();
    }
  };
  document.addEventListener('click', handleDocumentClick);
  cleanupFns.push(() => document.removeEventListener('click', handleDocumentClick));

  // Close dropdown on escape key
  const handleDocumentKeydown = (e: Event): void => {
    if ((e as KeyboardEvent).key === 'Escape') {
      closeDropdown();
      // Return focus to trigger when closing via Escape
      if (
        document.activeElement &&
        (trigger.contains(document.activeElement) || dropdown.contains(document.activeElement))
      ) {
        trigger.focus();
      }
    }
  };
  document.addEventListener('keydown', handleDocumentKeydown);
  cleanupFns.push(() => document.removeEventListener('keydown', handleDocumentKeydown));

  // Return cleanup function
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
});
