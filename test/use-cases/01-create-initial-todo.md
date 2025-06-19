# テストケース: 初回のTODO.md作成

## 概要

新規プロジェクトでpcheck
initコマンドを使用して、初回のTODO.mdファイルを作成し、基本的なTODOスキャンが動作することを確認する。

## 前提条件

- pcheckがインストールされている
- 空のプロジェクトディレクトリ
- Gitリポジトリが初期化されている

## 手順

1. 空のプロジェクトディレクトリに移動
2. `pcheck init`コマンドを実行してTODO.mdを作成
3. 作成されたTODO.mdの内容を確認
4. `pcheck`コマンドでTODOをスキャン
5. `pcheck validate`でフォーマットを検証

## 期待結果

- TODO.mdファイルがGTDテンプレートで作成される
- pcheckがTODO.mdの内容を正しく表示
- validateで警告やエラーが出ない

## 検証方法

```bash
# TODO.mdが存在することを確認
test -f TODO.md

# pcheckでスキャンできることを確認
pcheck | grep -q "TODO.md"

# validateでエラーがないことを確認
pcheck validate | grep -q "✅"
```

## 備考

デフォルトテンプレートには、TODO、ICEBOX、COMPLETEDセクションが含まれる。
GTDテンプレートを使用する場合は `pcheck init --template=gtd` を実行する。
