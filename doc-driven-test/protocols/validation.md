# Validation Protocol

テスト結果の検証方法を定義するプロトコル。

## 検証タイプ

### 1. コマンド検証

終了コードとコマンド出力の検証。

```yaml
validation:
  type: command
  command: "npm test"
  expected_exit_code: 0
  output_contains:
    - "All tests passed"
    - "0 failures"
  output_not_contains:
    - "Error"
    - "Failed"
```

### 2. ファイル検証

ファイルの存在、内容、権限の検証。

```yaml
validation:
  type: file
  checks:
    - path: "dist/bundle.js"
      exists: true
      min_size: 1000 # bytes
    - path: "config.json"
      exists: true
      content_contains:
        - '"version":'
        - '"debug": true'
      json_path:
        "$.port": 3000
        "$.features.auth": true
```

### 3. プロセス検証

実行中のプロセスの検証。

```yaml
validation:
  type: process
  checks:
    - name: "node"
      running: true
      port: 3000
    - command_contains: "python server.py"
      running: true
```

### 4. HTTP検証

HTTPエンドポイントの検証。

```yaml
validation:
  type: http
  checks:
    - url: "http://localhost:3000/health"
      method: GET
      expected_status: 200
      response_contains: "healthy"
      headers:
        "Content-Type": "application/json"
    - url: "http://localhost:3000/api/users"
      method: POST
      body: '{"name": "test"}'
      expected_status: 201
```

### 5. データベース検証

データベースの状態検証。

```yaml
validation:
  type: database
  connection: "sqlite:///test.db"
  checks:
    - query: "SELECT COUNT(*) FROM users"
      expected: 3
    - query: "SELECT name FROM users WHERE id = 1"
      expected: "Alice"
```

## 検証式

### 基本的な検証式

````markdown
## 検証方法

1. ファイルの存在確認
   ```bash
   test -f output.txt
   ```
````

2. 出力内容の確認
   ```bash
   grep -q "Success" output.txt
   ```

3. プロセスの確認
   ```bash
   pgrep -f "server.py"
   ```

4. 複合条件
   ```bash
   test -f output.txt && grep -q "Success" output.txt
   ```

````
### 高度な検証

```bash
# JSON検証
jq -e '.status == "success"' response.json

# ログ検証
tail -n 100 app.log | grep -c "ERROR" | test $(cat) -eq 0

# パフォーマンス検証
response_time=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3000)
echo "$response_time < 1.0" | bc -l | grep -q 1
````

## カスタム検証スクリプト

```bash
#!/bin/bash
# test-case.verify.sh

echo "🔍 Running custom validation..."

# 基本チェック
check_files() {
    local files=("dist/index.js" "dist/styles.css" "package-lock.json")
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            echo "❌ Missing file: $file"
            return 1
        fi
    done
    echo "✅ All files exist"
}

# サービスチェック
check_service() {
    if curl -sf http://localhost:3000/health > /dev/null; then
        echo "✅ Service is healthy"
    else
        echo "❌ Service is not responding"
        return 1
    fi
}

# データ整合性チェック
check_data() {
    local count=$(sqlite3 test.db "SELECT COUNT(*) FROM users")
    if [ "$count" -ge 1 ]; then
        echo "✅ Database has $count users"
    else
        echo "❌ No users in database"
        return 1
    fi
}

# メイン検証
check_files && check_service && check_data
```

## 検証結果のフォーマット

### 成功時

```json
{
  "status": "passed",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": 45.3,
  "checks": [
    {
      "name": "file_exists",
      "target": "dist/bundle.js",
      "status": "passed",
      "message": "File exists with size 15420 bytes"
    },
    {
      "name": "service_health",
      "target": "http://localhost:3000/health",
      "status": "passed",
      "message": "Service responded with status 200"
    }
  ]
}
```

### 失敗時

```json
{
  "status": "failed",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": 23.1,
  "checks": [
    {
      "name": "build_output",
      "target": "dist/",
      "status": "failed",
      "message": "Build directory not found",
      "error": "ENOENT: no such file or directory",
      "suggestion": "Run 'npm run build' first"
    }
  ],
  "logs": {
    "stdout": "...",
    "stderr": "Error: Cannot find module..."
  }
}
```

## アサーション関数

```bash
# 共通アサーション関数
assert_equals() {
    if [ "$1" != "$2" ]; then
        echo "❌ Assertion failed: '$1' != '$2'"
        return 1
    fi
}

assert_contains() {
    if ! echo "$1" | grep -q "$2"; then
        echo "❌ Assertion failed: '$1' does not contain '$2'"
        return 1
    fi
}

assert_file_exists() {
    if [ ! -f "$1" ]; then
        echo "❌ Assertion failed: File '$1' does not exist"
        return 1
    fi
}

assert_http_status() {
    local url="$1"
    local expected="$2"
    local actual=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    assert_equals "$actual" "$expected"
}
```

## 検証のベストプラクティス

1. **具体的な検証**: 曖昧な「動作する」ではなく、具体的な条件を記述
2. **タイムアウト設定**: 無限に待機しないよう、適切なタイムアウトを設定
3. **エラーメッセージ**: 失敗時に何が問題か分かるメッセージを提供
4. **リトライ機能**: ネットワークやタイミングに依存する検証にはリトライを実装
5. **クリーンアップ**: 検証後は必ず環境をクリーンアップ
