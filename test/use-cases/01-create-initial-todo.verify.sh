#!/bin/bash
# 01-create-initial-todo テストの検証スクリプト

echo "🔍 Verifying initial TODO.md creation test"

# TODO.mdが存在するか確認
if [ ! -f "TODO.md" ]; then
    echo "❌ TODO.md not found"
    exit 1
fi
echo "✅ TODO.md exists"

# TODO.mdに必要なセクションが含まれているか確認
if ! grep -q "^## TODO" TODO.md; then
    echo "❌ TODO section not found in TODO.md"
    exit 1
fi
echo "✅ TODO section found"

if ! grep -q "^## ICEBOX" TODO.md; then
    echo "❌ ICEBOX section not found in TODO.md"
    exit 1
fi
echo "✅ ICEBOX section found"

if ! grep -q "^## COMPLETED" TODO.md; then
    echo "❌ COMPLETED section not found in TODO.md"
    exit 1
fi
echo "✅ COMPLETED section found"

# pcheckが実行できるか確認（TODOがない場合も正常）
if ! pcheck > /dev/null 2>&1; then
    echo "❌ pcheck command failed"
    exit 1
fi
echo "✅ pcheck command executed successfully"

# pcheck validateでエラーがないか確認
if ! pcheck validate | grep -q "✅"; then
    echo "❌ pcheck validate found errors"
    exit 1
fi
echo "✅ pcheck validate passed"

echo "✅ All verifications passed!"
exit 0