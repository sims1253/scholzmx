declare module '@pagefind/default-ui' {
  export class PagefindUI {
    constructor(options: {
      element: HTMLElement;
      bundlePath: string;
      showImages?: boolean;
      debounceTimeoutMs?: number;
      pageSize?: number;
      excerptLength?: number;
      showResultsCount?: boolean;
      showEmptyFilters?: boolean;
      filters?: Record<string, string>;
      translations?: Record<string, string>;
    });
    triggerFilters(filters: Record<string, string>): void;
    destroy(): void;
  }
}
