#!/bin/bash
# 01-create-initial-todo テストの前提条件セットアップ

echo "📝 Setting up for initial TODO.md creation test"

# 空のREADME.mdを作成
cat > README.md << EOF
# Test Project

This is a test project for pcheck.
EOF

# package.jsonを作成（プロジェクトとして認識させるため）
cat > package.json << EOF
{
  "name": "test-project",
  "version": "1.0.0",
  "description": "Test project for pcheck"
}
EOF

echo "✅ Test-specific setup completed"