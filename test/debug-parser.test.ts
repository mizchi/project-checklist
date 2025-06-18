import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  type ParsedMarkdown,
  type ParsedTask,
  parseMarkdown,
  parseTask,
} from "../src/core/markdown-parser.ts";

// デバッグ用：パーサーの動作を詳細に確認
Deno.test("デバッグ - コードブロック内チェックリスト風記述の処理", () => {
  const content = `# テスト

## 実際のチェックリスト
- [ ] 正常なタスク1
- [x] 正常なタスク2

## コードブロック
\`\`\`markdown
- [ ] コードブロック内のタスク
- [x] コードブロック内の完了タスク
\`\`\`

## インラインコード
テキスト \`- [ ] インラインコード内\` テキスト`;

  const { sections } = parseMarkdown(content);

  console.log("=== セクション情報 ===");
  sections.forEach((section, i) => {
    console.log(`セクション ${i}: ${section.name} (レベル: ${section.level})`);
    console.log(`  開始行: ${section.startLine}, 終了行: ${section.endLine}`);
    console.log(`  タスク数: ${section.tasks.length}`);
    section.tasks.forEach((task, j) => {
      console.log(
        `    タスク ${j}: "${task.content}" (行: ${task.lineNumber}, チェック: ${task.checked})`,
      );
    });
  });

  // 全タスクを収集
  const allTasks: ParsedTask[] = [];
  for (const section of sections) {
    allTasks.push(...section.tasks);
  }

  console.log(`\n=== 全タスク数: ${allTasks.length} ===`);
  allTasks.forEach((task, i) => {
    console.log(`${i}: "${task.content}" (行: ${task.lineNumber})`);
  });

  // コードブロック内の項目が誤認識されているかチェック
  const codeBlockTasks = allTasks.filter((task) =>
    task.content.includes("コードブロック内")
  );

  console.log(
    `\nコードブロック内として認識されたタスク数: ${codeBlockTasks.length}`,
  );
  codeBlockTasks.forEach((task) => {
    console.log(`  - "${task.content}" (行: ${task.lineNumber})`);
  });
});

Deno.test("デバッグ - parseTask関数の動作確認", () => {
  const testLines = [
    "- [ ] 正常なタスク",
    "- [x] 完了タスク",
    "```markdown",
    "- [ ] コードブロック内",
    "```",
    "`- [ ] インラインコード内`",
    "<!-- - [ ] コメント内 -->",
    "- 通常のリスト項目",
  ];

  console.log("=== parseTask関数テスト ===");
  testLines.forEach((line, i) => {
    const result = parseTask(line, i);
    console.log(`行 ${i}: "${line}"`);
    console.log(
      `  結果: ${
        result ? `タスクとして認識 - "${result.content}"` : "タスクではない"
      }`,
    );
  });
});

Deno.test("デバッグ - セクション名の大文字小文字問題", () => {
  const content = `# テスト

## 異なるインデントスタイル（タブとスペース混在）
- [ ] スペースタスク
	- [ ] タブタスク

## 優先度付きネスト構造  
- [ ] [HIGH] 優先度タスク`;

  const { sections } = parseMarkdown(content);

  console.log("=== セクション名デバッグ ===");
  sections.forEach((section, i) => {
    console.log(`セクション ${i}: "${section.name}"`);
    console.log(`  文字数: ${section.name.length}`);
    console.log(
      `  文字コード: ${
        Array.from(section.name)
          .map((c) => c.charCodeAt(0))
          .join(", ")
      }`,
    );
  });

  // セクション検索テスト
  const searchNames = [
    "異なるインデントスタイル",
    "異なるインデントスタイル（タブとスペース混在）",
    "優先度付きネスト構造",
  ];

  searchNames.forEach((name) => {
    const found = sections.find((s) => s.name === name);
    console.log(
      `"${name}" の検索結果: ${found ? "見つかった" : "見つからない"}`,
    );
  });
});
