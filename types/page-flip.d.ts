declare module "page-flip" {
  export type PageFlipEvent = {
    readonly data: number | string | boolean | object;
    readonly object: PageFlip;
  };

  export type PageFlipSettings = {
    readonly startPage?: number;
    readonly size?: "fixed" | "stretch";
    readonly width: number;
    readonly height: number;
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
  };

  export type PageFlipBounds = {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly pageWidth: number;
  };

  export class PageFlip {
    constructor(root: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    on(eventName: string, callback: (event: PageFlipEvent) => void): PageFlip;
    off(eventName: string): void;
    flipNext(): void;
    flipPrev(): void;
    getBoundsRect(): PageFlipBounds;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    destroy(): void;
  }
}
