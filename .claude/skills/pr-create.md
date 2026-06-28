---
name: pr-create
description: featureブランチからmainへのPRを作成する。Conventional Commits形式のタイトル、背景・概要・機能的な変更内容を含むbodyを自動生成。PR作成時やブランチをマージしたい時に使用。
---

# PR作成スキル

featureブランチからmainへのPRをConventional Commits形式で作成する。

## 手順

1. 現在のブランチがmainでないことを確認（mainなら中止）
2. `git log --oneline main..HEAD` で差分コミットを確認
3. `git diff --stat main..HEAD` で変更ファイルを確認
4. PRタイトルとbodyを生成
5. `git push -u origin <branch>` でリモートにpush
6. `gh pr create` でPR作成

## PRタイトル

Conventional Commits形式（日本語）:

```
<type>: <日本語の要約>
```

typeは以下から選択:
- `feat` — 新機能
- `fix` — バグ修正
- `refactor` — リファクタリング
- `docs` — ドキュメント
- `chore` — 雑務（依存関係更新、設定変更など）
- `perf` — パフォーマンス改善
- `test` — テスト

70文字以内に収める。

## PR Body

以下の3セクション構成（HEREDOC形式で `gh pr create --body` に渡す）:

```markdown
## 背景

なぜこの変更が必要なのか。どういう問題や課題があったのか。
AIが今後この文脈を理解するために十分な情報を含める。

## 概要

この変更で何が実現されるのか。1-3文で簡潔に。

## 変更内容

- **変更点1**: ユーザーやシステムの振る舞いがどう変わるか
- **変更点2**: 同上
```

実装の差分（どのファイルをどう変えたか）はGitHub上で確認できるため記載しない。
機能的な観点（何ができるようになったか、何が変わったか）で記述する。
セクション名は「変更内容」とするが、内容は機能的変更に限定すること。

## 注意事項

- PRをmainに作成する前に、pushが必要かを確認する
- ユーザーにPR内容を確認してもらってから `gh pr create` を実行する
- bodyはHEREDOCで渡す（改行・特殊文字の問題を回避）
