#!/bin/bash
# テストケースのセットアップスクリプト

# テストディレクトリの作成と初期化
setup_test_environment() {
    local test_name="$1"
    local test_dir="./test-workspace/$test_name"
    
    echo "🔧 Setting up test environment for: $test_name"
    
    # 既存のテストディレクトリを削除
    if [ -d "$test_dir" ]; then
        rm -rf "$test_dir"
    fi
    
    # テストディレクトリを作成
    mkdir -p "$test_dir"
    cd "$test_dir"
    
    echo "✅ Test environment ready at: $test_dir"
}

# 共通の前提条件をセットアップ
setup_common_prerequisites() {
    # Git リポジトリの初期化
    git init --quiet
    
    # .gitignore の作成
    cat > .gitignore << EOF
node_modules/
.DS_Store
*.log
EOF
    
    echo "✅ Common prerequisites set up"
}

# テスト固有の前提条件をセットアップ
setup_test_prerequisites() {
    local setup_script="$1"
    
    if [ -f "$setup_script" ]; then
        echo "🔧 Running test-specific setup..."
        source "$setup_script"
    fi
}

# メイン処理
if [ $# -lt 1 ]; then
    echo "Usage: $0 <test-name> [setup-script]"
    exit 1
fi

TEST_NAME="$1"
SETUP_SCRIPT="${2:-}"

setup_test_environment "$TEST_NAME"
setup_common_prerequisites
setup_test_prerequisites "$SETUP_SCRIPT"