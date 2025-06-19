#!/bin/bash
# ドキュメント駆動テストのランナースクリプト

set -e

# カラー出力の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# テストケースの実行
run_test_case() {
    local test_file="$1"
    local test_name=$(basename "$test_file" .md)
    local test_dir=$(dirname "$0")
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running test case: ${test_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # テストケースの内容を表示
    echo -e "${YELLOW}Test Description:${NC}"
    grep "^## 概要" -A 2 "$test_file" | tail -n +2 | sed 's/^/  /'
    echo ""
    
    # セットアップ
    local setup_script="${test_dir}/${test_name}.setup.sh"
    echo -e "${YELLOW}Setting up test environment...${NC}"
    "$test_dir/setup.sh" "$test_name" "$setup_script"
    
    # テストディレクトリに移動
    cd "./test-workspace/$test_name"
    
    # 手順の実行
    echo -e "\n${YELLOW}Executing test steps...${NC}"
    
    # ここでAIがテストケースの手順を読んで実行する
    # 今回は手動で実装
    case "$test_name" in
        "01-create-initial-todo")
            echo "1. Running pcheck init..."
            pcheck init
            echo ""
            echo "2. Checking TODO.md content..."
            head -n 20 TODO.md
            echo ""
            echo "3. Running pcheck scan..."
            pcheck
            echo ""
            echo "4. Running pcheck validate..."
            pcheck validate
            ;;
        *)
            echo -e "${RED}Test implementation not found for: $test_name${NC}"
            ;;
    esac
    
    # 元のディレクトリに戻る
    cd - > /dev/null
    
    # 検証
    echo -e "\n${YELLOW}Verifying results...${NC}"
    
    # 検証スクリプトを直接実行
    local verify_script="${test_dir}/${test_name}.verify.sh"
    if [ -f "$verify_script" ]; then
        (cd "./test-workspace/$test_name" && bash "../../$verify_script")
        local test_result=$?
    else
        echo "⚠️  No verification script found"
        local test_result=1
    fi
    
    # クリーンアップ
    if [ "$KEEP_RESULTS" != "true" ]; then
        rm -rf "./test-workspace/$test_name"
    else
        echo "📁 Keeping test results at: ./test-workspace/$test_name"
    fi
    
    return $test_result
}

# メイン処理
main() {
    local test_dir=$(dirname "$0")
    local test_pattern="${1:-*.md}"
    local failed_tests=0
    local passed_tests=0
    
    # --keepオプションのチェック
    for arg in "$@"; do
        if [ "$arg" = "--keep" ]; then
            export KEEP_RESULTS="true"
        fi
    done
    
    echo -e "${GREEN}🧪 Document-Driven Test Runner${NC}"
    echo -e "${GREEN}================================${NC}\n"
    
    # テストケースの検索と実行
    for test_file in "$test_dir"/*.md; do
        # TEMPLATEファイルはスキップ
        if [[ $(basename "$test_file") == "TEMPLATE.md" ]]; then
            continue
        fi
        
        # .mdファイルのみ処理
        if [[ "$test_file" == *.md ]]; then
            if run_test_case "$test_file"; then
                ((passed_tests++))
            else
                ((failed_tests++))
            fi
        fi
    done
    
    # サマリー表示
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Total tests: $((passed_tests + failed_tests))"
    echo -e "${GREEN}Passed: $passed_tests${NC}"
    echo -e "${RED}Failed: $failed_tests${NC}"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# スクリプトの実行
main "$@"