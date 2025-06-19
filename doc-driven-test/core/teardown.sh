#!/bin/bash
# 共通クリーンアップスクリプト
# テスト後の後処理

echo "🧹 Running common teardown..."

# プロセスのクリーンアップ
cleanup_processes() {
    # 実行中のサーバープロセスなどを停止
    if [ -f .test.pid ]; then
        PID=$(cat .test.pid)
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            echo "✓ Stopped process $PID"
        fi
        rm -f .test.pid
    fi
}

# 一時ファイルのクリーンアップ
cleanup_temp_files() {
    # 一時ファイルの削除
    find . -name "*.tmp" -type f -delete
    find . -name "*.log" -type f -delete
    echo "✓ Cleaned up temporary files"
}

# ポートの解放確認
check_ports() {
    # よく使われるテスト用ポートの確認
    for port in 3000 8000 8080 9000; do
        if lsof -ti:$port > /dev/null 2>&1; then
            echo "⚠️  Port $port is still in use"
        fi
    done
}

# メイン処理
cleanup_processes
cleanup_temp_files
check_ports

echo "✓ Common teardown completed"