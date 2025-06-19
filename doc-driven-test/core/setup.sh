#!/bin/bash
# 共通セットアップスクリプト
# すべてのテストで実行される初期化処理

echo "🔧 Running common setup..."

# Git初期化（必要に応じて）
if command -v git &> /dev/null && [ ! -d .git ]; then
    git init --quiet
    echo "✓ Git repository initialized"
fi

# 基本的な.gitignore作成
if [ ! -f .gitignore ]; then
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
venv/
vendor/
target/
*.egg-info/

# Build outputs
dist/
build/
*.o
*.so
*.exe
*.dll

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Test outputs
*.log
coverage/
.coverage
*.tmp

# Environment files
.env
.env.local
EOF
    echo "✓ Created .gitignore"
fi

# 基本ディレクトリ構造
mkdir -p src tests docs

echo "✓ Common setup completed"