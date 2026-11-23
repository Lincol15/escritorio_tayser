export {};

declare global {
  interface TayserBridge {
    isElectron: true;
    saveProject(args: { content: string; filePath: string | null; saveAs: boolean; defaultName: string }): Promise<string | null>;
    openProject(): Promise<{ filePath: string; content: string } | null>;
    saveFile(args: { defaultName: string; data: Uint8Array | string; filters: { name: string; extensions: string[] }[] }): Promise<string | null>;
  }
  interface Window {
    tayser?: TayserBridge;
  }
}
