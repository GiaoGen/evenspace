declare module "page-flip" {
  export interface PageFlipEvent<T = unknown> {
    readonly data: T;
    readonly object: PageFlip;
  }

  export interface PageFlipSettings {
    readonly width: number;
    readonly height: number;
    readonly size?: "fixed" | "stretch";
    readonly minWidth?: number;
    readonly maxWidth?: number;
    readonly minHeight?: number;
    readonly maxHeight?: number;
    readonly drawShadow?: boolean;
    readonly flippingTime?: number;
    readonly usePortrait?: boolean;
    readonly startZIndex?: number;
    readonly autoSize?: boolean;
    readonly maxShadowOpacity?: number;
    readonly showCover?: boolean;
    readonly mobileScrollSupport?: boolean;
    readonly clickEventForward?: boolean;
    readonly useMouseEvents?: boolean;
    readonly swipeDistance?: number;
    readonly showPageCorners?: boolean;
    readonly disableFlipByClick?: boolean;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(elements: NodeListOf<HTMLElement> | HTMLElement[]): void;
    on<T = unknown>(eventName: string, callback: (event: PageFlipEvent<T>) => void): PageFlip;
    off(eventName: string): void;
    update(): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    destroy(): void;
  }
}
