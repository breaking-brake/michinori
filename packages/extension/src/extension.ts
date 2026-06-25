import * as vscode from "vscode";
import { DagPanel } from "./panels/dagPanel";
import { callAnalyze } from "./services/apiClient";
import { readDagFile, writeDagFile, buildMichinoriFile } from "./services/dagFile";
import { computeCriticalPath } from "@michinori/shared";
import type { WebviewToExtension, DagNodeType, NodeStatusType } from "@michinori/shared";

export function activate(context: vscode.ExtensionContext) {
  let currentNodes: DagNodeType[] = [];
  let currentRepoUrl = "";

  function refreshPanel(panel: DagPanel) {
    const derived = computeCriticalPath(currentNodes);
    panel.postMessage({ type: "dagUpdate", nodes: currentNodes, derived });
  }

  async function persistAndRefresh(panel: DagPanel, prompt: string, model: string) {
    const derived = computeCriticalPath(currentNodes);
    const dag = buildMichinoriFile(currentNodes, derived, {
      repoUrl: currentRepoUrl,
      prompt,
      model,
    }, await readDagFile());
    await writeDagFile(dag);
    panel.postMessage({ type: "dagUpdate", nodes: currentNodes, derived });
  }

  async function handleWebviewMessage(msg: WebviewToExtension, panel: DagPanel) {
    switch (msg.type) {
      case "ready": {
        const existing = await readDagFile();
        if (existing) {
          currentNodes = existing.nodes;
          currentRepoUrl = existing.metadata.repoUrl;
          refreshPanel(panel);
        }
        break;
      }
      case "generate": {
        panel.postMessage({ type: "loading", loading: true });
        try {
          const result = await callAnalyze({
            repoUrl: msg.repoUrl,
            prompt: msg.prompt,
            currentDag: null,
          });
          currentNodes = result.nodes;
          currentRepoUrl = msg.repoUrl;
          await persistAndRefresh(panel, msg.prompt, result.model);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          panel.postMessage({ type: "error", message });
          vscode.window.showErrorMessage(`Michinori: ${message}`);
        } finally {
          panel.postMessage({ type: "loading", loading: false });
        }
        break;
      }
      case "modify": {
        const existing = await readDagFile();
        if (!existing) {
          vscode.window.showWarningMessage("先にDAGを生成してください");
          return;
        }

        panel.postMessage({ type: "loading", loading: true });
        try {
          const result = await callAnalyze({
            repoUrl: existing.metadata.repoUrl,
            prompt: msg.prompt,
            currentDag: existing,
          });
          currentNodes = result.nodes;
          await persistAndRefresh(panel, msg.prompt, result.model);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          panel.postMessage({ type: "error", message });
          vscode.window.showErrorMessage(`Michinori: ${message}`);
        } finally {
          panel.postMessage({ type: "loading", loading: false });
        }
        break;
      }
      case "statusChange": {
        const node = currentNodes.find((n) => n.id === msg.nodeId);
        if (node) {
          node.status = msg.status as NodeStatusType;
          const existing = await readDagFile();
          await persistAndRefresh(panel, existing?.metadata.prompt ?? "", existing?.metadata.model ?? "gemini-2.5-flash");
        }
        break;
      }
      case "positionChange": {
        const node = currentNodes.find((n) => n.id === msg.nodeId);
        if (node) {
          node.position = { x: msg.x, y: msg.y };
        }
        break;
      }
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("michinori.generate", () => {
      const panel = DagPanel.createOrShow(context.extensionUri);
      panel.setMessageHandler((msg) => handleWebviewMessage(msg, panel));
    }),

    vscode.commands.registerCommand("michinori.modify", () => {
      const panel = DagPanel.createOrShow(context.extensionUri);
      panel.setMessageHandler((msg) => handleWebviewMessage(msg, panel));
    }),

    vscode.commands.registerCommand("michinori.openDag", async () => {
      const panel = DagPanel.createOrShow(context.extensionUri);
      panel.setMessageHandler((msg) => handleWebviewMessage(msg, panel));
    }),
  );
}

export function deactivate() {}
