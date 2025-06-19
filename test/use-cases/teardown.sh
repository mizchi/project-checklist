#!/bin/bash
# テストケースのクリーンアップスクリプト

# テスト結果の検証
verify_test_results() {
    local test_name="$1"
    local verify_script="$2"
    local test_dir="./test-workspace/$test_name"
    
    echo "🔍 Verifying test results for: $test_name"
    
    if [ -f "$verify_script" ]; then
        # テストディレクトリ内で検証スクリプトを実行
        (cd "$test_dir" && bash "$verify_script")
    else
        echo "⚠️  No verification script found"
    fi
}

# テスト環境のクリーンアップ
cleanup_test_environment() {
    local test_name="$1"
    local keep_results="${2:-false}"
    
    if [ "$keep_results" = "true" ]; then
        echo "📁 Keeping test results for inspection"
    else
        echo "🧹 Cleaning up test environment"
        # テストディレクトリの削除
        test_dir="./test-workspace/$test_name"
        if [ -d "$test_dir" ]; then
            rm -rf "$test_dir"
        fi
    fi
}

# テスト結果のサマリー表示
show_test_summary() {
    local test_name="$1"
    local status="$2"
    
    echo ""
    echo "="*50
    echo "Test Case: $test_name"
    if [ "$status" = "pass" ]; then
        echo "Result: ✅ PASSED"
    else
        echo "Result: ❌ FAILED"
    fi
    echo "="*50
}

# メイン処理
if [ $# -lt 1 ]; then
    echo "Usage: $0 <test-name> [verify-script] [--keep]"
    exit 1
fi

TEST_NAME="$1"
VERIFY_SCRIPT="${2:-}"
KEEP_RESULTS="false"

# --keepオプションのチェック
for arg in "$@"; do
    if [ "$arg" = "--keep" ]; then
        KEEP_RESULTS="true"
    fi
done

verify_test_results "$TEST_NAME" "$VERIFY_SCRIPT"
TEST_STATUS=$?

if [ $TEST_STATUS -eq 0 ]; then
    show_test_summary "$TEST_NAME" "pass"
else
    show_test_summary "$TEST_NAME" "fail"
fi

cleanup_test_environment "$TEST_NAME" "$KEEP_RESULTS"

exit $TEST_STATUS