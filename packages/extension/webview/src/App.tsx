import { useEffect, useMemo } from "react";
import { DagApp, useDagMessages, type DagAdapter, type DagMessage } from "@michinori/ui";

interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

let vscodeApi: VSCodeApi | null = null;
function getVSCodeApi(): VSCodeApi | null {
  if (vscodeApi) return vscodeApi;
  try {
    vscodeApi = acquireVsCodeApi();
    return vscodeApi;
  } catch {
    return null;
  }
}

export default function App() {
  const { state, dispatch } = useDagMessages();
  const vscode = getVSCodeApi();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as DagMessage;
      if (msg.type === "dagUpdate" || msg.type === "loading" || msg.type === "error") {
        dispatch(msg);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [dispatch]);

  const adapter: DagAdapter = useMemo(
    () => ({
      generate: (repoUrl, prompt) =>
        vscode?.postMessage({ type: "generate", repoUrl, prompt }),
      modify: (prompt) =>
        vscode?.postMessage({ type: "modify", prompt }),
      changeStatus: (nodeId, status) =>
        vscode?.postMessage({ type: "statusChange", nodeId, status }),
      updateNode: (nodeId, fields) =>
        vscode?.postMessage({ type: "updateNode", nodeId, fields }),
      changePosition: (nodeId, x, y) =>
        vscode?.postMessage({ type: "positionChange", nodeId, x, y }),
      onReady: () =>
        vscode?.postMessage({ type: "ready" }),
      reset: () =>
        vscode?.postMessage({ type: "reset" }),
    }),
    [vscode],
  );

  return (
    <DagApp
      adapter={adapter}
      dispatch={dispatch}
      nodes={state.nodes}
      derived={state.derived}
      loading={state.loading}
      error={state.error}
      hasDag={state.hasDag}
      defaultPrompt="QwenCodeを対応プラットフォームとして追加したい"
    />
  );
}
