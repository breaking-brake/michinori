import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import type { ExtensionToWebview, WebviewToExtension } from "../types/messages";

export class DagPanel {
  public static current: DagPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private onMessage: ((msg: WebviewToExtension) => void) | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg: WebviewToExtension) => this.onMessage?.(msg),
      null,
      this.disposables,
    );
  }

  static createOrShow(extensionUri: vscode.Uri): DagPanel {
    if (DagPanel.current) {
      DagPanel.current.panel.reveal();
      return DagPanel.current;
    }

    const panel = vscode.window.createWebviewPanel(
      "michinoriDag",
      "Michinori",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "webview", "dist"),
        ],
      },
    );

    DagPanel.current = new DagPanel(panel, extensionUri);
    DagPanel.current.panel.webview.html = DagPanel.current.getHtml();
    return DagPanel.current;
  }

  setMessageHandler(handler: (msg: WebviewToExtension) => void) {
    this.onMessage = handler;
  }

  postMessage(msg: ExtensionToWebview) {
    this.panel.webview.postMessage(msg);
  }

  private getHtml(): string {
    const webview = this.panel.webview;
    const distUri = vscode.Uri.joinPath(this.extensionUri, "webview", "dist");

    const htmlPath = vscode.Uri.joinPath(distUri, "index.html").fsPath;
    let html = fs.readFileSync(htmlPath, "utf-8");

    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "assets", "main.js"));
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "assets", "main.css"));

    const nonce = getNonce();

    html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
  <link rel="stylesheet" href="${cssUri}">
  <title>Michinori</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;

    return html;
  }

  private dispose() {
    DagPanel.current = undefined;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
