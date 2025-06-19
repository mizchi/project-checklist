# AI Agent Execution Protocol

AIエージェントがドキュメント駆動テストを実行する際の標準プロトコル。

## プロトコルバージョン

Version: 1.0.0

## 実行フロー

### 1. テストケースの理解

AIエージェントは以下の順序でテストケースを解析します：

1. **概要セクション**を読み、テストの目的を理解
2. **前提条件**を確認し、必要な環境が整っているか検証
3. **手順**を読み、実行すべきアクションを特定
4. **期待結果**を理解し、成功基準を把握
5. **検証方法**を確認し、自動検証の準備

### 2. 環境準備

```
Action: SETUP_ENVIRONMENT
Input: test_name, workspace_path
Steps:
  1. Create clean workspace directory
  2. Execute common setup script if exists
  3. Execute test-specific setup script if exists
  4. Verify prerequisites are met
Output: environment_ready (boolean)
```

### 3. テスト実行

```
Action: EXECUTE_TEST
Input: test_steps (array)
For each step:
  1. Parse step description
  2. Identify action type:
     - COMMAND: Execute shell command
     - FILE_CREATE: Create file with content
     - FILE_EDIT: Modify existing file
     - API_CALL: Make HTTP request
     - WAIT: Wait for condition
  3. Execute action
  4. Capture output/result
  5. Log execution details
Output: execution_log (array)
```

### 4. 結果検証

```
Action: VALIDATE_RESULTS
Input: validation_rules, execution_log
Steps:
  1. Execute validation commands if provided
  2. Compare actual vs expected results
  3. Check file existence/content
  4. Verify process states
  5. Analyze logs for errors
Output: validation_result (pass/fail), details
```

### 5. レポート生成

```
Action: GENERATE_REPORT
Input: test_info, execution_log, validation_result
Output: Test report in structured format
```

## アクションタイプ

### COMMAND

シェルコマンドの実行

```json
{
  "type": "COMMAND",
  "command": "npm install",
  "working_dir": "./",
  "timeout": 60000,
  "expected_exit_code": 0
}
```

### FILE_CREATE

ファイルの作成

```json
{
  "type": "FILE_CREATE",
  "path": "src/index.js",
  "content": "console.log('Hello World');",
  "mode": "0644"
}
```

### FILE_EDIT

ファイルの編集

```json
{
  "type": "FILE_EDIT",
  "path": "config.json",
  "operation": "replace",
  "search": "\"debug\": false",
  "replace": "\"debug\": true"
}
```

### API_CALL

API呼び出し

```json
{
  "type": "API_CALL",
  "method": "GET",
  "url": "http://localhost:3000/health",
  "expected_status": 200,
  "timeout": 5000
}
```

### WAIT

条件待機

```json
{
  "type": "WAIT",
  "condition": "port_open",
  "port": 3000,
  "timeout": 30000,
  "interval": 1000
}
```

## エラーハンドリング

### エラータイプ

1. **SETUP_ERROR**: 環境準備の失敗
2. **EXECUTION_ERROR**: テスト実行中のエラー
3. **VALIDATION_ERROR**: 検証の失敗
4. **TIMEOUT_ERROR**: タイムアウト
5. **DEPENDENCY_ERROR**: 依存関係の問題

### エラー時の動作

```
On Error:
  1. Log error details with context
  2. Capture current state (files, processes, logs)
  3. Execute emergency cleanup if needed
  4. Return structured error report
  5. Optionally keep workspace for debugging
```

## ベストプラクティス

### 1. 明示的な待機

```markdown
3. サーバーを起動し、ポート3000が開くまで待機（最大30秒）
```

### 2. 検証可能な出力

```markdown
4. `npm test`を実行し、すべてのテストがパスすることを確認
   - 出力に "All tests passed" が含まれること
   - 終了コードが0であること
```

### 3. エラーメッセージの活用

```markdown
5. ビルドを実行（`npm run build`）
   - エラーが出た場合は、エラーメッセージを記録
   - distディレクトリが作成されることを確認
```

## 実装例

### Claude/ChatGPT用プロンプト

```
I need to execute a document-driven test case. Please follow the AI Agent Execution Protocol v1.0.0.

Test file: [test-case.md]

Please:
1. Parse the test case sections
2. Set up the environment
3. Execute each step sequentially
4. Validate the results
5. Generate a summary report

Use the standard action types (COMMAND, FILE_CREATE, etc.) and handle errors according to the protocol.
```

### 自動実行スクリプト

```bash
#!/bin/bash
# Auto-generated from test case

# Setup
echo "Setting up environment..."
./setup.sh

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
npm install || exit 1

# Step 2: Create config file
echo "Step 2: Creating config..."
cat > config.json << 'EOF'
{
  "port": 3000,
  "debug": true
}
EOF

# Continue with remaining steps...
```

## プロトコル拡張

カスタムアクションタイプの追加：

```json
{
  "type": "CUSTOM_ACTION",
  "handler": "my-plugin",
  "params": {
    "custom_param": "value"
  }
}
```

## 互換性

- Claude 3+
- ChatGPT 4+
- GitHub Copilot
- Custom AI agents with tool use capability
