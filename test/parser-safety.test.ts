import { assertEquals, assertNotEquals } from "@std/assert";
import { join } from "@std/path";
import {
  parseMarkdown,
  parseTask,
  parsePriority,
  findSection,
  moveCompletedTasksToDone,
  clearDoneSection,
  insertSection,
  addTaskToSection,
  type ParsedMarkdown,
  type ParsedTask,
  type ParsedSection,
} from "../src/core/markdown-parser.ts";

// テストファイルのパスを取得するヘルパー関数
function getFixturePath(filename: string): string {
  return join(import.meta.dirname!, "fixtures", filename);
}

// ファイル内容を読み込むヘルパー関数
async function readFixture(filename: string): Promise<string> {
  return await Deno.readTextFile(getFixturePath(filename));
}

// 文字単位での差分チェック関数
function assertExactMatch(actual: string, expected: string, message?: string) {
  if (actual !== expected) {
    const actualLines = actual.split("\n");
    const expectedLines = expected.split("\n");
    const maxLines = Math.max(actualLines.length, expectedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const actualLine = actualLines[i] || "<missing>";
      const expectedLine = expectedLines[i] || "<missing>";
      if (actualLine !== expectedLine) {
        throw new Error(
          `${message || "Content mismatch"} at line ${i + 1}:\n` +
            `Expected: "${expectedLine}"\n` +
            `Actual:   "${actualLine}"`
        );
      }
    }
  }
}

Deno.test(
  "パーサー安全性テスト - コードブロック内のチェックリスト風記述を無視",
  async () => {
    const content = await readFixture("edge-cases.md");
    const { sections } = parseMarkdown(content);

    // コードブロック内の `- [ ]` は解析されないことを確認
    const allTasks: ParsedTask[] = [];
    for (const section of sections) {
      allTasks.push(...section.tasks);
    }

    // 実際のチェックリスト項目のみが解析されることを確認
    const actualChecklistTasks = allTasks.filter(
      (task) =>
        task.content.includes("正常なチェックリスト") ||
        task.content.includes("完了済みチェックリスト") ||
        task.content.includes("優先度付きタスク") ||
        task.content.includes("ネストした") ||
        task.content.includes("日本語タスク") ||
        task.content.includes("絵文字付き") ||
        task.content.includes("特殊文字") ||
        task.content.includes("URL")
    );

    // コードブロック内やHTMLコメント内の項目は含まれないことを確認
    const invalidTasks = allTasks.filter(
      (task) =>
        task.content.includes("コードブロック内") ||
        task.content.includes("JavaScriptコメント") ||
        task.content.includes("文字列内の") ||
        task.content.includes("HTMLコメント内") ||
        task.content.includes("インラインコード内")
    );

    assertEquals(
      invalidTasks.length,
      0,
      "コードブロックやコメント内のチェックリスト風記述が誤認識されています"
    );
    assertEquals(
      actualChecklistTasks.length >= 8,
      true,
      "実際のチェックリスト項目が正しく認識されていません"
    );
  }
);

Deno.test(
  "パーサー安全性テスト - 通常のリスト項目とチェックリストの区別",
  async () => {
    const content = await readFixture("edge-cases.md");
    const { sections } = parseMarkdown(content);

    const allTasks: ParsedTask[] = [];
    for (const section of sections) {
      allTasks.push(...section.tasks);
    }

    // 通常のリスト項目（`- item`）がチェックリストとして認識されないことを確認
    const normalListItems = allTasks.filter((task) =>
      task.content.includes("通常のリスト項目")
    );

    assertEquals(
      normalListItems.length,
      0,
      "通常のリスト項目がチェックリストとして誤認識されています"
    );
  }
);

Deno.test(
  "パーサー安全性テスト - 特殊文字・マルチバイト文字の処理",
  async () => {
    const content = await readFixture("edge-cases.md");
    const { sections } = parseMarkdown(content);

    const allTasks: ParsedTask[] = [];
    for (const section of sections) {
      allTasks.push(...section.tasks);
    }

    // 日本語タスクの確認
    const japaneseTasks = allTasks.filter((task) =>
      task.content.includes("日本語タスク")
    );
    assertEquals(
      japaneseTasks.length,
      1,
      "日本語を含むタスクが正しく処理されていません"
    );

    // 絵文字タスクの確認
    const emojiTasks = allTasks.filter((task) => task.content.includes("🚀"));
    assertEquals(
      emojiTasks.length,
      1,
      "絵文字を含むタスクが正しく処理されていません"
    );

    // 特殊文字タスクの確認
    const specialCharTasks = allTasks.filter((task) =>
      task.content.includes("@#$%")
    );
    assertEquals(
      specialCharTasks.length,
      1,
      "特殊文字を含むタスクが正しく処理されていません"
    );

    // URLタスクの確認
    const urlTasks = allTasks.filter((task) =>
      task.content.includes("https://")
    );
    assertEquals(
      urlTasks.length,
      1,
      "URLを含むタスクが正しく処理されていません"
    );
  }
);

Deno.test("パーサー安全性テスト - 複雑な入れ子構造の処理", async () => {
  const content = await readFixture("nested-structure.md");
  const { sections } = parseMarkdown(content);

  // プロジェクト管理セクションを確認
  const projectSection = findSection(sections, "プロジェクト管理");
  assertEquals(
    projectSection !== null,
    true,
    "プロジェクト管理セクションが見つかりません"
  );

  if (projectSection) {
    // 深いネスト構造のタスクが正しく解析されることを確認
    const deepNestedTasks = projectSection.tasks.filter(
      (task) =>
        task.content.includes("カテゴリ関連") ||
        task.content.includes("在庫管理")
    );

    // ネスト構造が保持されることを確認（インデントレベルで判定）
    const indentLevels = projectSection.tasks.map((task) => task.indent);
    const maxIndent = Math.max(...indentLevels);
    assertEquals(
      maxIndent >= 8,
      true,
      "深いネスト構造が正しく処理されていません"
    );
  }
});

Deno.test("パーサー安全性テスト - 異なるインデントスタイルの処理", async () => {
  const content = await readFixture("nested-structure.md");
  const { sections } = parseMarkdown(content);

  // 異なるインデントスタイルセクションを確認
  const indentSection = findSection(sections, "異なるインデントスタイル");
  assertEquals(
    indentSection !== null,
    true,
    "異なるインデントスタイルセクションが見つかりません"
  );

  if (indentSection) {
    // タブとスペース混在でも正しく解析されることを確認
    const tabIndentedTasks = indentSection.tasks.filter((task) =>
      task.content.includes("タブでインデント")
    );
    assertEquals(
      tabIndentedTasks.length >= 1,
      true,
      "タブインデントのタスクが正しく処理されていません"
    );
  }
});

Deno.test("パーサー安全性テスト - 優先度の処理精度", async () => {
  const content = await readFixture("nested-structure.md");
  const { sections } = parseMarkdown(content);

  // 優先度付きネスト構造セクションを確認
  const prioritySection = findSection(sections, "優先度付きネスト構造");
  assertEquals(
    prioritySection !== null,
    true,
    "優先度付きネスト構造セクションが見つかりません"
  );

  if (prioritySection) {
    // 各優先度が正しく解析されることを確認
    const highPriorityTasks = prioritySection.tasks.filter(
      (task) => task.priority === "HIGH"
    );
    const midPriorityTasks = prioritySection.tasks.filter(
      (task) => task.priority === "MID"
    );
    const lowPriorityTasks = prioritySection.tasks.filter(
      (task) => task.priority === "LOW"
    );
    const numericPriorityTasks = prioritySection.tasks.filter(
      (task) => task.priority === "1" || task.priority === "99"
    );

    assertEquals(
      highPriorityTasks.length >= 1,
      true,
      "HIGH優先度が正しく処理されていません"
    );
    assertEquals(
      midPriorityTasks.length >= 1,
      true,
      "MID優先度が正しく処理されていません"
    );
    assertEquals(
      lowPriorityTasks.length >= 1,
      true,
      "LOW優先度が正しく処理されていません"
    );
    assertEquals(
      numericPriorityTasks.length >= 2,
      true,
      "数値優先度が正しく処理されていません"
    );
  }
});

Deno.test("フォーマット保持テスト - 元のインデントスタイル保持", async () => {
  const originalContent = await readFixture("line-endings.md");
  const { sections, lines } = parseMarkdown(originalContent);

  // パーサーを通した後も元の行が保持されることを確認
  const reconstructedContent = lines.join("\n");

  // 基本的な構造が保持されることを確認
  assertEquals(
    reconstructedContent.includes("# 改行コードテスト"),
    true,
    "ヘッダーが保持されていません"
  );
  assertEquals(
    reconstructedContent.includes("## LF改行のセクション"),
    true,
    "セクションヘッダーが保持されていません"
  );

  // 空行パターンが保持されることを確認
  const emptyLineCount = (reconstructedContent.match(/\n\n/g) || []).length;
  const originalEmptyLineCount = (originalContent.match(/\n\n/g) || []).length;
  assertEquals(
    emptyLineCount,
    originalEmptyLineCount,
    "空行パターンが保持されていません"
  );
});

Deno.test(
  "フォーマット保持テスト - チェックリスト以外の部分が変更されない",
  async () => {
    const originalContent = await readFixture("edge-cases.md");
    const { sections, lines } = parseMarkdown(originalContent);

    // パーサーを通しても非チェックリスト部分は変更されないことを確認
    const reconstructedContent = lines.join("\n");

    // コードブロックが保持されることを確認
    assertEquals(
      reconstructedContent.includes("```markdown"),
      true,
      "Markdownコードブロックが保持されていません"
    );
    assertEquals(
      reconstructedContent.includes("```javascript"),
      true,
      "JavaScriptコードブロックが保持されていません"
    );

    // HTMLコメントが保持されることを確認
    assertEquals(
      reconstructedContent.includes("<!--"),
      true,
      "HTMLコメントが保持されていません"
    );
    assertEquals(
      reconstructedContent.includes("-->"),
      true,
      "HTMLコメント終了が保持されていません"
    );

    // インラインコードが保持されることを確認
    assertEquals(
      reconstructedContent.includes("`- [ ] インラインコード内のタスク`"),
      true,
      "インラインコードが保持されていません"
    );
  }
);

Deno.test(
  "更新処理の精度テスト - 正確なチェックリスト項目のみ更新",
  async () => {
    const content = `# テスト

## TODO
- [ ] タスク1
- [x] タスク2
- [ ] [HIGH] タスク3

\`\`\`
- [ ] コードブロック内
\`\`\`

<!-- - [ ] コメント内 -->`;

    const { sections } = parseMarkdown(content);
    const todoSection = findSection(sections, "TODO");

    assertEquals(todoSection !== null, true, "TODOセクションが見つかりません");

    if (todoSection) {
      // 実際のチェックリスト項目のみが認識されることを確認
      assertEquals(
        todoSection.tasks.length,
        3,
        "チェックリスト項目数が正しくありません"
      );

      // 各タスクの内容を確認
      const taskContents = todoSection.tasks.map((task) => task.content);
      assertEquals(
        taskContents.includes("タスク1"),
        true,
        "タスク1が認識されていません"
      );
      assertEquals(
        taskContents.includes("タスク2"),
        true,
        "タスク2が認識されていません"
      );
      assertEquals(
        taskContents.includes("[HIGH] タスク3"),
        true,
        "タスク3が認識されていません"
      );

      // コードブロックやコメント内の項目は含まれないことを確認
      const invalidContents = todoSection.tasks.filter(
        (task) =>
          task.content.includes("コードブロック内") ||
          task.content.includes("コメント内")
      );
      assertEquals(invalidContents.length, 0, "無効な項目が含まれています");
    }
  }
);

Deno.test("更新処理の精度テスト - 行番号の管理精度", async () => {
  const content = `# テスト
- [ ] 1行目のタスク
- [x] 2行目のタスク

- [ ] 4行目のタスク（空行後）`;

  const { sections } = parseMarkdown(content);
  const tasks: ParsedTask[] = [];
  for (const section of sections) {
    tasks.push(...section.tasks);
  }

  // 行番号が正確に記録されることを確認
  assertEquals(tasks.length, 3, "タスク数が正しくありません");

  // 各タスクの行番号を確認
  const task1 = tasks.find((t) => t.content === "1行目のタスク");
  const task2 = tasks.find((t) => t.content === "2行目のタスク");
  const task4 = tasks.find((t) => t.content === "4行目のタスク（空行後）");

  assertEquals(task1?.lineNumber, 1, "1行目のタスクの行番号が正しくありません");
  assertEquals(task2?.lineNumber, 2, "2行目のタスクの行番号が正しくありません");
  assertEquals(task4?.lineNumber, 4, "4行目のタスクの行番号が正しくありません");
});

Deno.test("更新処理の精度テスト - moveCompletedTasksToDone の安全性", () => {
  const content = `# TODO

- [ ] 未完了タスク
- [x] 完了タスク1
- [x] [HIGH] 完了タスク2

\`\`\`markdown
- [x] コードブロック内の完了風タスク
\`\`\`

## ICEBOX
- [x] アイスボックスの完了タスク`;

  const result = moveCompletedTasksToDone(content);

  // 実際の完了タスクのみが移動されることを確認
  assertEquals(result.movedCount, 3, "移動されたタスク数が正しくありません");

  // コードブロック内の項目は移動されないことを確認
  assertEquals(
    result.content.includes("コードブロック内の完了風タスク"),
    true,
    "コードブロック内容が誤って変更されました"
  );

  // DONEセクションが作成されることを確認
  assertEquals(
    result.content.includes("## DONE"),
    true,
    "DONEセクションが作成されていません"
  );

  // 優先度が除去されることを確認
  assertEquals(
    result.content.includes("- 完了タスク2"),
    true,
    "優先度が正しく除去されていません"
  );
  assertEquals(
    result.content.includes("[HIGH]"),
    false,
    "優先度が除去されていません"
  );
});
