#!/bin/bash
# Document-Driven Test Runner
# AIエージェントと人間が協調して実行できるテストランナー

set -e

# ==============================
# 設定とデフォルト値
# ==============================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="${WORKSPACE_DIR:-./test-workspace}"
KEEP_RESULTS=false
DRY_RUN=false
VERBOSE=false
TEST_PATTERN="*.md"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==============================
# ヘルプ表示
# ==============================
show_help() {
    cat << EOF
Document-Driven Test Runner

Usage: $(basename "$0") [OPTIONS] [TEST_PATTERN]

Options:
    -h, --help          Show this help message
    -k, --keep          Keep test workspace after execution
    -d, --dry-run       Show what would be executed without running
    -v, --verbose       Enable verbose output
    -w, --workspace DIR Set workspace directory (default: ./test-workspace)

Examples:
    $(basename "$0")                    # Run all tests
    $(basename "$0") example.md         # Run specific test
    $(basename "$0") "tests/*.md"       # Run tests matching pattern
    $(basename "$0") --keep --verbose   # Run with debug options

EOF
}

# ==============================
# ユーティリティ関数
# ==============================
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_info() {
    echo -e "${CYAN}ℹ${NC}  $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $*"
}

# ==============================
# テストケース解析
# ==============================
parse_test_case() {
    local test_file="$1"
    local section=""
    
    # 基本情報の抽出
    export TEST_NAME=$(basename "$test_file" .md)
    export TEST_FILE="$test_file"
    export TEST_DIR="$WORKSPACE_DIR/$TEST_NAME"
    
    # セクションの存在確認
    if grep -q "^## 概要" "$test_file"; then
        export HAS_OVERVIEW=true
    fi
    
    if grep -q "^## 前提条件" "$test_file"; then
        export HAS_PREREQUISITES=true
    fi
    
    if grep -q "^## 手順" "$test_file"; then
        export HAS_STEPS=true
    fi
    
    if grep -q "^## 期待結果" "$test_file"; then
        export HAS_EXPECTED=true
    fi
    
    if grep -q "^## 検証方法" "$test_file"; then
        export HAS_VALIDATION=true
    fi
}

# ==============================
# テスト環境のセットアップ
# ==============================
setup_test_environment() {
    local test_name="$1"
    local test_dir="$WORKSPACE_DIR/$test_name"
    
    log_info "Setting up test environment: $test_name"
    
    # 既存ディレクトリのクリーンアップ
    if [ -d "$test_dir" ]; then
        rm -rf "$test_dir"
    fi
    
    # ワークスペース作成
    mkdir -p "$test_dir"
    
    # 共通セットアップの実行
    if [ -f "$SCRIPT_DIR/setup.sh" ]; then
        (cd "$test_dir" && source "$SCRIPT_DIR/setup.sh")
    fi
    
    # テスト固有のセットアップ
    local setup_script="${test_file%.md}.setup.sh"
    if [ -f "$setup_script" ]; then
        log_info "Running test-specific setup"
        (cd "$test_dir" && source "$setup_script")
    fi
    
    log_success "Test environment ready"
}

# ==============================
# テストケースの実行
# ==============================
execute_test_case() {
    local test_file="$1"
    local test_name="$2"
    local test_dir="$WORKSPACE_DIR/$test_name"
    
    log_info "Executing test steps"
    
    # ここでAIまたは実装されたスクリプトが手順を実行
    # デフォルトでは実行スクリプトを探す
    local exec_script="${test_file%.md}.exec.sh"
    if [ -f "$exec_script" ]; then
        (cd "$test_dir" && bash "$exec_script")
    else
        log_warning "No execution script found. Manual execution required."
        echo ""
        echo "Test steps from $test_file:"
        echo "----------------------------------------"
        sed -n '/^## 手順/,/^##/p' "$test_file" | sed '$d' | tail -n +2
        echo "----------------------------------------"
        echo ""
        
        if [ "$DRY_RUN" = false ]; then
            read -p "Press Enter after manual execution..."
        fi
    fi
}

# ==============================
# テスト結果の検証
# ==============================
validate_test_results() {
    local test_file="$1"
    local test_name="$2"
    local test_dir="$WORKSPACE_DIR/$test_name"
    
    log_info "Validating test results"
    
    # 検証スクリプトの実行
    local verify_script="${test_file%.md}.verify.sh"
    if [ -f "$verify_script" ]; then
        (cd "$test_dir" && bash "$verify_script")
        return $?
    else
        # Markdownから検証コマンドを抽出して実行
        local validation_commands=$(sed -n '/^## 検証方法/,/^##/p' "$test_file" | \
            sed -n '/^```bash/,/^```/p' | sed '1d;$d')
        
        if [ -n "$validation_commands" ]; then
            (cd "$test_dir" && eval "$validation_commands")
            return $?
        else
            log_warning "No validation method found"
            return 0
        fi
    fi
}

# ==============================
# テストのクリーンアップ
# ==============================
cleanup_test_environment() {
    local test_name="$1"
    local test_dir="$WORKSPACE_DIR/$test_name"
    
    if [ "$KEEP_RESULTS" = true ]; then
        log_info "Keeping test results at: $test_dir"
    else
        log_info "Cleaning up test environment"
        rm -rf "$test_dir"
    fi
}

# ==============================
# 単一テストの実行
# ==============================
run_single_test() {
    local test_file="$1"
    
    # テストファイルの存在確認
    if [ ! -f "$test_file" ]; then
        log_error "Test file not found: $test_file"
        return 1
    fi
    
    # テストケースの解析
    parse_test_case "$test_file"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test Case: $TEST_NAME${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 概要の表示
    if [ "$HAS_OVERVIEW" = true ]; then
        echo ""
        echo -e "${YELLOW}Overview:${NC}"
        sed -n '/^## 概要/,/^##/p' "$test_file" | sed '1d;$d' | sed 's/^/  /'
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run mode - skipping execution"
        return 0
    fi
    
    # テストの実行
    local start_time=$(date +%s)
    
    # セットアップ
    setup_test_environment "$TEST_NAME"
    
    # 実行
    execute_test_case "$test_file" "$TEST_NAME"
    
    # 検証
    validate_test_results "$test_file" "$TEST_NAME"
    local test_result=$?
    
    # 実行時間の計算
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 結果の表示
    echo ""
    if [ $test_result -eq 0 ]; then
        log_success "Test passed (${duration}s)"
    else
        log_error "Test failed (${duration}s)"
    fi
    
    # クリーンアップ
    cleanup_test_environment "$TEST_NAME"
    
    return $test_result
}

# ==============================
# メイン処理
# ==============================
main() {
    local test_files=()
    local failed_count=0
    local passed_count=0
    local total_count=0
    
    # オプション解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -k|--keep)
                KEEP_RESULTS=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            -w|--workspace)
                WORKSPACE_DIR="$2"
                shift 2
                ;;
            -*)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                TEST_PATTERN="$1"
                shift
                ;;
        esac
    done
    
    # ヘッダー表示
    echo -e "${GREEN}🧪 Document-Driven Test Runner${NC}"
    echo -e "${GREEN}================================${NC}"
    log_info "Workspace: $WORKSPACE_DIR"
    [ "$KEEP_RESULTS" = true ] && log_info "Keep results: enabled"
    [ "$DRY_RUN" = true ] && log_info "Dry run: enabled"
    [ "$VERBOSE" = true ] && log_info "Verbose: enabled"
    
    # テストファイルの検索
    if [ -f "$TEST_PATTERN" ]; then
        test_files=("$TEST_PATTERN")
    else
        while IFS= read -r -d '' file; do
            test_files+=("$file")
        done < <(find . -name "$TEST_PATTERN" -type f -print0 | sort -z)
    fi
    
    if [ ${#test_files[@]} -eq 0 ]; then
        log_warning "No test files found matching: $TEST_PATTERN"
        exit 0
    fi
    
    log_info "Found ${#test_files[@]} test file(s)"
    
    # 各テストの実行
    for test_file in "${test_files[@]}"; do
        ((total_count++))
        
        if run_single_test "$test_file"; then
            ((passed_count++))
        else
            ((failed_count++))
        fi
    done
    
    # サマリー表示
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Total:  $total_count"
    echo -e "${GREEN}Passed: $passed_count${NC}"
    [ $failed_count -gt 0 ] && echo -e "${RED}Failed: $failed_count${NC}"
    
    echo ""
    if [ $failed_count -eq 0 ]; then
        log_success "All tests passed! 🎉"
        exit 0
    else
        log_error "Some tests failed"
        exit 1
    fi
}

# スクリプトの実行
main "$@"