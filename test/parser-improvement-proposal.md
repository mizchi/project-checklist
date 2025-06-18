# Markdown パーサー安全性改善提案

## 発見された重大な問題

### 1. コードブロック内チェックリスト風記述の誤認識 🚨 **重大**

**問題**: コードブロック（```で囲まれた部分）内の `- [ ]` パターンが実際のチェックリストタスクとして認識される

**影響**:

- コード例やドキュメント内の記述が誤って更新される
- データの整合性が損なわれる
- 予期しない動作を引き起こす

**現在の動作**:

````markdown
## コードブロック

```markdown
- [ ] コードブロック内のタスク ← これが誤認識される
```
````

````

**期待される動作**: コードブロック内の内容は完全に無視されるべき

### 2. HTMLコメント内の処理（要確認）
**問題**: HTMLコメント内の `- [ ]` パターンの処理が不明確

### 3. インラインコード内の処理（正常）
**確認済み**: インラインコード（`- [ ]`）は正しく無視されている

## 修正提案

### 1. コードブロック検出機能の追加
```typescript
export function isInsideCodeBlock(lines: string[], lineIndex: number): boolean {
  let inCodeBlock = false;
  let codeBlockStart = -1;

  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i].trim();

    // コードブロックの開始/終了を検出
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = i;
      } else if (i > codeBlockStart) {
        inCodeBlock = false;
        codeBlockStart = -1;
      }
    }
  }

  return inCodeBlock;
}
````

### 2. parseTask 関数の改善

```typescript
export function parseTask(
  line: string,
  lineNumber: number,
  allLines?: string[]
): ParsedTask | null {
  // コードブロック内かチェック
  if (allLines && isInsideCodeBlock(allLines, lineNumber)) {
    return null;
  }

  // 既存のロジック...
  const checklistMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
  if (!checklistMatch) {
    return null;
  }

  // 残りの処理...
}
```

### 3. parseMarkdown 関数の改善

```typescript
export function parseMarkdown(content: string): ParsedMarkdown {
  const lines = content.split("\n");
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#+)\s+(.+)$/);

    if (headerMatch) {
      // セクション処理...
    } else if (currentSection) {
      // コードブロック検出を含むタスク解析
      const task = parseTask(line, i, lines); // 全行を渡す
      if (task) {
        currentSection.tasks.push(task);
      }
    }
  }

  return { sections, lines };
}
```

### 4. HTML コメント検出機能の追加

```typescript
export function isInsideHTMLComment(
  lines: string[],
  lineIndex: number
): boolean {
  let inComment = false;
  let commentStart = -1;

  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i];

    // HTMLコメントの開始を検出
    const commentStartMatch = line.indexOf("<!--");
    if (commentStartMatch !== -1 && !inComment) {
      inComment = true;
      commentStart = i;

      // 同じ行でコメントが終了するかチェック
      const commentEndMatch = line.indexOf("-->", commentStartMatch + 4);
      if (commentEndMatch !== -1) {
        inComment = false;
        commentStart = -1;
      }
    }

    // HTMLコメントの終了を検出
    if (inComment && line.indexOf("-->") !== -1 && i > commentStart) {
      inComment = false;
      commentStart = -1;
    }
  }

  return inComment;
}
```

## テストケースの追加提案

### 1. エッジケーステスト

- ネストしたコードブロック
- 複数行にわたる HTML コメント
- コードブロックと HTML コメントの組み合わせ
- 不正な形式のコードブロック（閉じタグなし）

### 2. パフォーマンステスト

- 大きなファイルでの処理速度
- 多数のコードブロックを含むファイル

### 3. 回帰テスト

- 修正後も既存の正常な機能が動作することを確認

## 実装優先度

1. **最高優先度**: コードブロック内チェックリスト誤認識の修正
2. **高優先度**: HTML コメント内チェックリスト誤認識の修正
3. **中優先度**: セクション名検索の改善
4. **低優先度**: パフォーマンス最適化

## 影響範囲

この修正により以下の機能に影響が出る可能性があります：

- `moveCompletedTasksToDone` 関数
- `clearDoneSection` 関数
- その他のタスク操作関数

すべての関数で修正されたパーサーを使用するように更新が必要です。
