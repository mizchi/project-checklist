# Reporting Protocol

テスト結果のレポート形式とコミュニケーション方法を定義。

## レポート形式

### 1. サマリーレポート

```markdown
# Test Report: [Test Name]

**Status**: ✅ PASSED / ❌ FAILED  
**Duration**: 45.3 seconds  
**Timestamp**: 2024-01-15 10:30:00 UTC

## Summary
- Total Steps: 5
- Passed: 4
- Failed: 1
- Skipped: 0

## Key Findings
- ✅ Environment setup completed successfully
- ✅ Dependencies installed without errors
- ✅ Application started on port 3000
- ❌ API endpoint /users returned 500 instead of 200
- ⚠️ Warning: Deprecated packages detected

## Recommendations
1. Fix the database connection issue causing 500 error
2. Update deprecated packages to latest versions
```

### 2. 詳細レポート

```markdown
# Detailed Test Report

## Test Case Information
- **Name**: User Registration Flow
- **File**: tests/user-registration.md
- **Version**: 1.2.0
- **Environment**: Ubuntu 22.04, Node.js 18.x

## Execution Timeline

### 13:45:00 - Environment Setup
```
$ mkdir -p test-workspace
$ cd test-workspace
$ git init
✓ Initialized empty Git repository
```

### 13:45:05 - Dependencies Installation
```
$ npm install
added 234 packages in 12.3s
✓ All dependencies installed
```

### 13:45:18 - Server Start
```
$ npm start
Server listening on port 3000
✓ Server started successfully
```

### 13:45:20 - API Test
```
$ curl -X POST http://localhost:3000/api/users
Status: 500 Internal Server Error
✗ Expected status 201, got 500
```

## Error Analysis
The server returned 500 due to missing database configuration.
Stack trace indicates connection refused to PostgreSQL.

## Artifacts
- Log file: `test-workspace/server.log`
- Screenshot: `test-workspace/error-screenshot.png`
- Database dump: `test-workspace/db-state.sql`
```

### 3. JSON形式レポート

```json
{
  "report": {
    "version": "1.0.0",
    "test_name": "user-registration",
    "status": "failed",
    "start_time": "2024-01-15T13:45:00Z",
    "end_time": "2024-01-15T13:46:30Z",
    "duration_seconds": 90,
    "environment": {
      "os": "ubuntu-22.04",
      "node_version": "18.17.0",
      "test_runner": "doc-driven-test v1.0.0"
    },
    "steps": [
      {
        "id": 1,
        "name": "Setup environment",
        "status": "passed",
        "duration": 5.2,
        "output": "Environment ready"
      },
      {
        "id": 2,
        "name": "Install dependencies",
        "status": "passed",
        "duration": 12.3,
        "commands": ["npm install"],
        "packages_installed": 234
      },
      {
        "id": 3,
        "name": "Start server",
        "status": "passed",
        "duration": 2.1,
        "port": 3000,
        "process_id": 12345
      },
      {
        "id": 4,
        "name": "Test API endpoint",
        "status": "failed",
        "duration": 0.5,
        "error": {
          "type": "HTTP_ERROR",
          "message": "Expected status 201, got 500",
          "actual_status": 500,
          "expected_status": 201,
          "response_body": "{\"error\":\"Database connection failed\"}"
        }
      }
    ],
    "artifacts": [
      {
        "type": "log",
        "path": "server.log",
        "size_bytes": 4523
      },
      {
        "type": "screenshot",
        "path": "error-screenshot.png",
        "timestamp": "2024-01-15T13:46:25Z"
      }
    ],
    "metrics": {
      "total_steps": 4,
      "passed_steps": 3,
      "failed_steps": 1,
      "cpu_usage_avg": 23.5,
      "memory_usage_max_mb": 156.3
    }
  }
}
```

### 4. CI/CD形式レポート

```yaml
# GitHub Actions Annotation Format
::error file=tests/user-registration.md,line=45::API test failed - Expected status 201, got 500

# JUnit XML Format
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="doc-driven-tests" tests="4" failures="1" time="90.0">
  <testsuite name="user-registration" tests="4" failures="1" time="90.0">
    <testcase name="Setup environment" time="5.2" />
    <testcase name="Install dependencies" time="12.3" />
    <testcase name="Start server" time="2.1" />
    <testcase name="Test API endpoint" time="0.5">
      <failure message="Expected status 201, got 500">
        HTTP Error: Database connection failed
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

## レポートテンプレート

### Slack通知

```json
{
  "attachments": [{
    "color": "#ff0000",
    "title": "Test Failed: user-registration",
    "fields": [
      {
        "title": "Duration",
        "value": "90 seconds",
        "short": true
      },
      {
        "title": "Failed Step",
        "value": "API endpoint test",
        "short": true
      },
      {
        "title": "Error",
        "value": "Expected status 201, got 500"
      }
    ],
    "footer": "doc-driven-test",
    "ts": 1705320390
  }]
}
```

### Email通知

```
Subject: [FAILED] Test Report: user-registration

Test Execution Summary
=====================
Test Name: user-registration
Status: FAILED ❌
Duration: 90 seconds
Time: 2024-01-15 13:45:00 UTC

Failed Step
===========
Step 4: Test API endpoint
Error: Expected status 201, got 500
Details: Database connection failed

View full report: https://example.com/reports/12345

---
This is an automated message from doc-driven-test
```

## メトリクス収集

### パフォーマンスメトリクス

```json
{
  "performance": {
    "total_duration": 90.0,
    "steps": {
      "setup": 5.2,
      "install": 12.3,
      "start": 2.1,
      "test": 0.5
    },
    "resource_usage": {
      "cpu_percent": [12.5, 45.2, 23.1, 15.6],
      "memory_mb": [120.5, 156.3, 145.2, 142.1],
      "disk_io_mb": 234.5,
      "network_io_mb": 45.6
    }
  }
}
```

### カバレッジメトリクス

```json
{
  "coverage": {
    "test_cases": {
      "total": 10,
      "executed": 8,
      "passed": 7,
      "failed": 1,
      "skipped": 2
    },
    "requirements": {
      "total": 15,
      "covered": 12,
      "percentage": 80.0
    }
  }
}
```

## カスタムレポーター

```javascript
// custom-reporter.js
class CustomReporter {
  constructor(options) {
    this.format = options.format || 'markdown';
    this.output = options.output || 'console';
  }

  generateReport(testResult) {
    const report = this.formatReport(testResult);
    this.outputReport(report);
  }

  formatReport(result) {
    switch (this.format) {
      case 'markdown':
        return this.toMarkdown(result);
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'html':
        return this.toHTML(result);
      default:
        return result.toString();
    }
  }

  outputReport(report) {
    switch (this.output) {
      case 'console':
        console.log(report);
        break;
      case 'file':
        fs.writeFileSync('report.md', report);
        break;
      case 'api':
        this.sendToAPI(report);
        break;
    }
  }
}
```

## レポートのベストプラクティス

1. **即座に理解可能**: ステータスを最初に明確に表示
2. **実行可能な情報**: エラーの場合は修正方法を提案
3. **トレーサビリティ**: ログやアーティファクトへのリンク
4. **視覚的な表現**: 絵文字やカラーコードで視認性向上
5. **バージョン情報**: 環境やツールのバージョンを記録