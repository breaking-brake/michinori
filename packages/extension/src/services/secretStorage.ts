import * as vscode from "vscode";

const KEY = "michinori.apiKey";

export async function getApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
  return secrets.get(KEY);
}

export async function setApiKey(secrets: vscode.SecretStorage, key: string): Promise<void> {
  await secrets.store(KEY, key);
}

export async function ensureApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
  let key = await getApiKey(secrets);
  if (key) return key;

  key = await vscode.window.showInputBox({
    prompt: "Gemini APIキーを入力してください（Google AI Studio）",
    password: true,
    ignoreFocusOut: true,
  });

  if (key) {
    await setApiKey(secrets, key);
  }
  return key;
}
