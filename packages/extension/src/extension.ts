import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("michinori.generate", () => {
      vscode.window.showInformationMessage("Michinori: DAG生成 (TODO)");
    }),
    vscode.commands.registerCommand("michinori.modify", () => {
      vscode.window.showInformationMessage("Michinori: DAG修正 (TODO)");
    }),
    vscode.commands.registerCommand("michinori.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Gemini APIキーを入力してください",
        password: true,
      });
      if (key) {
        await context.secrets.store("michinori.apiKey", key);
        vscode.window.showInformationMessage("APIキーを保存しました");
      }
    }),
    vscode.commands.registerCommand("michinori.openDag", () => {
      vscode.window.showInformationMessage("Michinori: DAGを開く (TODO)");
    }),
  );
}

export function deactivate() {}
