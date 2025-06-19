# User Scenarios and Test Checklist

このドキュメントは、`pcheck`の主要なユーザーシナリオと、それぞれの動作確認チェックリストを定義します。

## シナリオ1: 新規プロジェクトのセットアップ

**ユーザー**: 新しいプロジェクトを開始する開発者
**目的**: プロジェクトにTODO管理を導入する

### チェックリスト

- [ ] `pcheck init`でTODO.mdが作成される
- [ ] 作成されたTODO.mdに初期タスクが含まれている
- [ ] `pcheck doctor`で環境が正しく認識される
- [ ] `pcheck`で作成したTODO.mdが表示される

### 実行コマンド
```bash
# 1. 新規ディレクトリ作成
mkdir test-project && cd test-project

# 2. 初期化
pcheck init

# 3. 環境確認
pcheck doctor

# 4. TODO表示
pcheck
```

## シナリオ2: タスクの追加と管理

**ユーザー**: 日常的にタスクを管理する開発者
**目的**: タスクの追加、確認、完了を行う

### チェックリスト

- [ ] `pcheck add`で新しいタスクが追加される
- [ ] 優先度付きタスクが正しく追加される
- [ ] `pcheck --show-ids`でタスクIDが表示される
- [ ] `pcheck check`でタスクの完了状態がトグルされる
- [ ] `pcheck -u`で未完了タスクのみ表示される

### 実行コマンド
```bash
# 1. タスク追加
pcheck add -m "ユーザー認証を実装する" -p high
pcheck add -m "ドキュメントを書く"
pcheck add bug -m "ログイン時のエラーを修正" -p p1

# 2. タスク確認
pcheck
pcheck --show-ids

# 3. タスク完了
pcheck check [タスクID]

# 4. 未完了タスク確認
pcheck -u
```

## シナリオ3: コードTODOとの統合

**ユーザー**: コード内にTODOコメントを書く開発者
**目的**: コード内のTODOとTODO.mdを統合管理する

### チェックリスト

- [ ] ソースファイルにTODOコメントを追加
- [ ] `pcheck --code`でコードTODOが表示される
- [ ] `pcheck update --code`でコードTODOがTODO.mdに追加される
- [ ] 統合後のTODO.mdが正しく構造化されている

### 実行コマンド
```bash
# 1. テストファイル作成
echo '// TODO: エラーハンドリングを追加する
// FIXME: メモリリークの可能性
function test() {
  // HACK: 一時的な回避策
}' > test.js

# 2. コードTODO確認
pcheck --code

# 3. TODO.mdに統合
pcheck update --code

# 4. 結果確認
pcheck
```

## シナリオ4: タスクの整理とクリーンアップ

**ユーザー**: プロジェクトの進捗を管理するリード開発者
**目的**: 完了タスクの整理とプロジェクト状態の把握

### チェックリスト

- [ ] `pcheck update --completed`で完了タスクがCOMPLETEDセクションに移動
- [ ] `pcheck update --priority`でタスクが優先度順にソート
- [ ] `pcheck update --vacuum`で完了タスクが削除され出力される
- [ ] `pcheck validate`でTODO.mdの構造が検証される

### 実行コマンド
```bash
# 1. タスク整理
pcheck update --completed --priority

# 2. 構造検証
pcheck validate

# 3. 完了タスク削除
pcheck update --vacuum > completed-tasks.md

# 4. 削除後の確認
pcheck
cat completed-tasks.md
```

## シナリオ5: 複数TODO.mdのマージ

**ユーザー**: モノレポや大規模プロジェクトの管理者
**目的**: サブディレクトリのTODO.mdを統合する

### チェックリスト

- [ ] サブディレクトリにTODO.mdを作成
- [ ] `pcheck merge`で対話的に選択できる
- [ ] マージ後のTODO.mdにセクションが作成される
- [ ] 元ファイルの扱い（削除/保持）が選択通りになる

### 実行コマンド
```bash
# 1. サブディレクトリ作成
mkdir -p src docs tests
echo "# TODO\n\n## Tasks\n- [ ] コア機能実装" > src/TODO.md
echo "# TODO\n\n## Tasks\n- [ ] APIドキュメント作成" > docs/TODO.md
echo "# TODO\n\n## Tasks\n- [ ] ユニットテスト追加" > tests/TODO.md

# 2. マージ実行
pcheck merge

# 3. 結果確認
pcheck
ls src/TODO.md docs/TODO.md tests/TODO.md 2>/dev/null || echo "ファイルが削除されました"
```

## シナリオ6: JSON出力とスクリプト連携

**ユーザー**: 自動化ツールを作成する開発者
**目的**: pcheckの出力を他のツールと連携する

### チェックリスト

- [ ] `pcheck --json`でJSON形式の出力が得られる
- [ ] JSONに必要な情報（file、items、checked、id等）が含まれる
- [ ] `--pretty`オプションで整形される
- [ ] jqなどでパース可能

### 実行コマンド
```bash
# 1. JSON出力
pcheck --json

# 2. 整形JSON
pcheck --json --pretty

# 3. jqでパース（jqがインストールされている場合）
pcheck --json | jq '.todos[].items[] | select(.checked==false)'

# 4. 統計情報取得
pcheck --json | jq '.summary'
```

## シナリオ7: 設定ファイルの使用

**ユーザー**: プロジェクト固有の設定が必要な開発者
**目的**: カスタム設定でpcheckの動作を調整する

### チェックリスト

- [ ] `pcheck.config.json`を作成
- [ ] カスタム除外パターンが機能する
- [ ] 検索エンジンの指定が反映される
- [ ] `--no-config`で設定を無視できる

### 実行コマンド
```bash
# 1. 設定ファイル作成
echo '{
  "searchEngine": "native",
  "exclude": ["temp/**", "*.log"],
  "codePatterns": ["TODO", "FIXME", "XXX"]
}' > pcheck.config.json

# 2. 設定適用確認
pcheck --code

# 3. 設定無視
pcheck --no-config --code
```

## 実行結果の記録

各シナリオ実行後、以下を記録：

1. **成功/失敗**: コマンドが期待通り動作したか
2. **出力内容**: 実際の出力（特に異常があった場合）
3. **パフォーマンス**: 体感的な実行速度
4. **エラーメッセージ**: エラーが発生した場合の内容
5. **改善提案**: ユーザビリティの観点から

## 総合評価項目

- [ ] インストールは簡単か
- [ ] コマンド体系は直感的か
- [ ] エラーメッセージは分かりやすいか
- [ ] ドキュメントと実際の動作は一致しているか
- [ ] AIツールとの連携は容易か