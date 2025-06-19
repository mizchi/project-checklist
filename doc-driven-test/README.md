# Document-Driven Test Framework

AIエージェントと人間が協調して実行できる、自然言語ベースのテストフレームワーク。

## 概要

このフレームワークは、テストケースを自然言語（Markdown）で記述し、AIエージェントまたは人間が理解・実行できる形式で管理します。

## 特徴

- 📝 **自然言語でのテスト記述**: テストケースをMarkdownで記述
- 🤖 **AI対応**: Claude、ChatGPT、GitHub Copilotなどが理解・実行可能
- 🔄 **再現性**: 毎回クリーンな環境でテストを実行
- 🌍 **言語非依存**: あらゆるプログラミング言語・フレームワークに対応
- 🧩 **モジュラー設計**: セットアップ、実行、検証を分離

## ディレクトリ構造

```
doc-driven-test/
├── README.md              # このファイル
├── core/                  # コアフレームワーク
│   ├── runner.sh         # テストランナー
│   ├── setup.sh          # 共通セットアップ
│   └── teardown.sh       # 共通クリーンアップ
├── templates/            # 言語別テンプレート
│   ├── javascript/
│   ├── python/
│   ├── rust/
│   └── generic/
├── protocols/            # AI実行プロトコル
│   ├── execution.md      # 実行手順
│   ├── validation.md     # 検証手順
│   └── reporting.md      # レポート形式
└── examples/             # サンプルテストケース
```

## テストケース形式

### Markdown形式（推奨）

```markdown
# テストケース: [機能名]

## 概要

[このテストの目的を1-2文で説明]

## 前提条件

- [必要な環境やツール]
- [事前に必要な設定]

## 手順

1. [最初のステップ]
2. [次のステップ]
3. [最後のステップ]

## 期待結果

- [期待される動作や出力]
- [確認すべきポイント]

## 検証方法

\`\`\`bash

# 自動検証用のコマンド

[検証コマンド] \`\`\`
```

### YAML形式（オプション）

```yaml
test_case:
  name: "機能名"
  description: "このテストの目的"

  prerequisites:
    - "必要な環境"
    - "事前設定"

  steps:
    - action: "最初のステップ"
      expected: "期待される結果"
    - action: "次のステップ"
      expected: "期待される結果"

  validation:
    commands:
      - "検証コマンド1"
      - "検証コマンド2"
```

## 使用方法

### 基本的な使い方

```bash
# すべてのテストを実行
./core/runner.sh

# 特定のテストを実行
./core/runner.sh path/to/test-case.md

# デバッグモード（結果を保持）
./core/runner.sh --keep

# ドライラン（実行せずに確認）
./core/runner.sh --dry-run
```

### AIエージェントでの使用

1. AIにテストケースのMarkdownを提示
2. AIが手順を読んで実行
3. 検証方法に従って結果を確認
4. レポートを生成

### CI/CDでの使用

```yaml
# GitHub Actions例
- name: Run Document-Driven Tests
  run: |
    ./doc-driven-test/core/runner.sh tests/
```

## プロトコル

### 実行プロトコル

AIエージェントは以下の手順でテストを実行します：

1. **環境準備**: `setup.sh`を実行して初期環境を構築
2. **テスト実行**: テストケースの手順に従って実行
3. **結果検証**: 検証スクリプトまたはコマンドで確認
4. **クリーンアップ**: `teardown.sh`で環境を初期化

### エラーハンドリング

- 各ステップでエラーが発生した場合は即座に停止
- エラーログを保存して診断可能に
- `--keep`オプションで失敗時の状態を保持

## 拡張性

### カスタムテンプレート

新しい言語やフレームワーク用のテンプレートを追加：

```bash
# テンプレート作成
mkdir -p templates/mylang
cp templates/generic/* templates/mylang/
# カスタマイズ
```

### プラグイン

検証ロジックやレポート形式をカスタマイズ：

```bash
# カスタム検証スクリプト
test-case.verify.sh

# カスタムレポーター
test-case.report.sh
```

## ベストプラクティス

1. **明確な記述**: 曖昧さを避け、具体的に記述
2. **独立性**: 各テストは他のテストに依存しない
3. **冪等性**: 何度実行しても同じ結果
4. **検証可能性**: 自動検証できる明確な基準

## ライセンス

MIT License
