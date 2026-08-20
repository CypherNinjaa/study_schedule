interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
}

interface DocumentPictureInPictureEvent extends Event {
  readonly window: Window;
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  readonly window: Window | null;
  onenter: ((this: DocumentPictureInPicture, ev: DocumentPictureInPictureEvent) => unknown) | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export {};
