# project-checklist

プロジェクト内の TODO を再帰的に探索して表示する Deno ベースの CLI ツールです。

**正式名称**: project-checklist  
**コマンド名**: pcheck

開発用の CLI は pcheck-dev としてインストールされています。デバッグ時は pcheck-dev を使ってください。

## 概要

- TODO.md ファイルの探索と解析
- ソースコード内の TODO コメント検索
- 結果を入れ子構造で表示
- 複数の検索エンジンサポート（ripgrep をデフォルトとして、git
  grep、grep、ネイティブ）
- doctor コマンドで環境診断
- 将来的に MCP サーバーとして動作予定

## プロジェクト構造

```
project-checklist/
├── src/
│   ├── cli.ts              # CLIエントリーポイント
│   ├── mod.ts              # コア機能の実装
│   ├── search-engines.ts   # 検索エンジンアダプター
│   ├── doctor.ts           # 環境診断機能
│   ├── mod.test.ts         # テスト
│   └── search-engines.test.ts # 検索エンジンテスト
├── docs/                    # VitePress ドキュメント
│   ├── .vitepress/         # VitePress 設定
│   ├── guide/              # ガイドドキュメント
│   ├── commands/           # コマンドリファレンス
│   └── development/        # 開発者向けドキュメント
├── deno.jsonc       # Deno設定ファイル
├── TODO.md          # プロジェクトのTODOリスト
└── .gitignore
```

## 使用方法

```bash
# 現在のディレクトリをスキャン
deno run --allow-read --allow-run src/cli.ts

# 特定のディレクトリをスキャン
deno run --allow-read --allow-run src/cli.ts ./path/to/project

# TODO.mdのみスキャン（コードは除外）
deno run --allow-read --allow-run src/cli.ts --no-code

# 特定の検索エンジンを使用
deno run --allow-read --allow-run src/cli.ts --engine rg

# 利用可能な検索エンジンを表示
deno run --allow-read --allow-run src/cli.ts --list-engines

# 環境診断を実行
deno run --allow-read --allow-run src/cli.ts doctor

# コンパイル済みバイナリの作成
deno task compile
```

## 開発コマンド

```bash
# 開発モード（ファイル監視）
deno task dev

# テスト実行
deno task test

# コード品質チェック（lint、format、test）
deno task check

# カバレッジ付きテスト
deno task test:cov

# ドキュメント開発サーバー
deno task doc:dev

# ドキュメントビルド
deno task doc:build
```

## 技術スタック

- Deno 2.x
- TypeScript
- @std/fs - ファイルシステム操作
- @std/path - パス操作
- @std/cli - CLI パース
- @std/expect - テストアサーション

## 今後の拡張予定

- MCP サーバー機能の実装
- より多くの TODO 形式のサポート（FIXME、HACK、NOTE 等）
- JSON 出力形式
- 設定ファイル（.pcheck.json）のサポート
- カスタム無視パターン
- キャッシング機能
