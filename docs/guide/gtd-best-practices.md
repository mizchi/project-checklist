# GTD (Getting Things Done) Best Practices with pcheck

## GTDの基本原則

GTD（Getting Things Done）は、David Allenによって開発されたタスク管理メソッドです。pcheckは、ソフトウェア開発プロジェクトにGTDの原則を適用するのに最適なツールです。

### GTDの5つのステップ

1. **収集（Capture）** - すべてのタスクやアイデアを記録
2. **明確化（Clarify）** - タスクの意味と必要なアクションを明確に
3. **整理（Organize）** - タスクを適切なカテゴリーに分類
4. **見直し（Review）** - 定期的にタスクリストを確認
5. **実行（Engage）** - 優先順位に基づいてタスクを実行

## pcheckでのGTD実践

### 1. 収集（Capture）- すばやくタスクを追加

```bash
# 思いついたらすぐに追加
pcheck add -m "ユーザー認証のバグを修正" -p high
pcheck add -m "データベースのインデックスを最適化" -p mid
pcheck add -m "新しいAPIエンドポイントのアイデア" -p low
```

### 2. 明確化（Clarify）- タスクの詳細化

pcheckでは、タスクを階層化して詳細を追加できます：

```markdown
# TODO.md
## TODO
- [ ] [HIGH] ユーザー認証のバグを修正
  - [ ] セッションタイムアウトの問題を調査
  - [ ] リフレッシュトークンの実装
  - [ ] テストケースの追加
```

### 3. 整理（Organize）- プロジェクトの構造化

#### 基本的な整理方法

```markdown
# TODO.md
## TODO
### 今週のタスク
- [ ] [HIGH] 本番環境のバグ修正
- [ ] [HIGH] セキュリティパッチの適用

### 次のスプリント
- [ ] [MID] パフォーマンス改善
- [ ] [MID] ドキュメントの更新

## ICEBOX
### 将来的な機能
- [ ] [LOW] ダークモードの実装
- [ ] [LOW] 多言語対応
```

#### GTDテンプレートの使用

```bash
# GTDテンプレートでプロジェクトを初期化
pcheck init --template gtd
```

### 4. 見直し（Review）- 定期的なレビュー

#### 毎日のレビュー
```bash
# 現在のタスクを確認
pcheck

# 未完了のタスクのみ表示
pcheck --unchecked

# IDを表示して特定のタスクを管理
pcheck --show-ids
```

#### 週次レビュー
```bash
# 完了したタスクを整理
pcheck update --completed

# 優先順位でソート
pcheck update --priority

# 完了タスクを確認してから削除
pcheck update --vacuum
```

### 5. 実行（Engage）- タスクの完了

```bash
# タスクを完了
pcheck check <task-id>

# 一度に複数のタスクを選択して完了
pcheck --select-multiple
```

## pcheck特有のGTD機能

### コードTODOの統合

開発中に書いたコードコメントも一元管理：

```bash
# コード内のTODOも含めて表示
pcheck --code

# コードTODOをTODO.mdに取り込む
pcheck update --code
```

### プロジェクト全体の俯瞰

```bash
# Git リポジトリ全体をスキャン
pcheck --gitroot

# サブディレクトリのTODOをマージ
pcheck merge --all
```

### AIフレンドリーな出力

```bash
# AI assistantに渡しやすいJSON形式
pcheck --json

# 特定のフィールドのみ抽出
pcheck --json --fields content,priority
```

## ベストプラクティス

### 1. 2分ルール
GTDの原則：2分以内に終わるタスクはすぐに実行。それ以外はpcheckに記録。

### 2. コンテキストの活用
```markdown
## TODO
### @office - オフィスでのタスク
- [ ] [HIGH] チームミーティングの準備

### @home - リモートでできるタスク
- [ ] [MID] コードレビュー
- [ ] [LOW] ドキュメント作成
```

### 3. 定期的な整理
```bash
# 毎週金曜日に実行
pcheck update --completed --priority
git add TODO.md && git commit -m "Weekly TODO cleanup"
```

### 4. プライベートタスクの分離
```bash
# 個人的なTODOは ~/.todo に保存
pcheck --private
pcheck add --private -m "個人的な学習計画"
```

## 実践例：開発サイクルでのGTD

### 月曜日 - 週の計画
```bash
# 現状確認
pcheck --gitroot

# 新しいタスクを追加
pcheck add -m "新機能の実装" -p high
pcheck add -m "バグ修正 #123" -p high
```

### 毎日 - 進捗管理
```bash
# 朝：今日のタスクを確認
pcheck --unchecked

# 作業中：タスクを完了
pcheck check <id>

# 夕方：進捗を更新
pcheck update
```

### 金曜日 - 週次レビュー
```bash
# 完了タスクを整理
pcheck update --completed --priority

# コミット前にクリーンアップ
pcheck update --vacuum > completed-tasks.md
git add TODO.md completed-tasks.md
git commit -m "Weekly tasks completed 🎉"
```

## Tips & Tricks

### 1. 優先度の使い分け
- **HIGH/P0-P1**: 今週中に完了すべきタスク
- **MID/P2**: 次のスプリントで対応
- **LOW/P3**: 時間があるときに対応

### 2. ICEBOXの活用
将来のアイデアはICEBOXセクションに保存し、定期的に見直して優先度を再評価。

### 3. 完了タスクの記録
`--vacuum`で削除する前に、完了タスクを別ファイルに保存しておくと、後で振り返りができます。

### 4. チーム連携
```bash
# チーム全体のTODOを統合
pcheck merge src/ docs/ tests/ --target team-todos.md
```

## まとめ

pcheckを使うことで、GTDの原則をソフトウェア開発に効果的に適用できます：

- **収集**: `pcheck add`で素早くタスクを記録
- **明確化**: 階層構造でタスクを詳細化
- **整理**: セクションと優先度で分類
- **見直し**: `pcheck update`で定期的に整理
- **実行**: `pcheck check`でタスクを完了

開発者向けに最適化されたGTDワークフローで、生産性を最大化しましょう！