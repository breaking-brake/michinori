interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

let api: VSCodeApi | null = null;

export function useVSCodeApi(): VSCodeApi | null {
  if (api) return api;
  try {
    api = acquireVsCodeApi();
    return api;
  } catch {
    return null;
  }
}
