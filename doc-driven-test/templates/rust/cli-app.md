# テストケース: Rust CLIアプリケーションの開発と検証

## 概要
Rustを使用したコマンドラインツールの作成、テスト、ビルド、配布までの開発フローを検証します。

## 前提条件
- Rust 1.70 以上がインストールされていること（rustup推奨）
- cargo が利用可能であること
- Git がインストールされていること

## 手順
1. プロジェクトの作成
   ```bash
   cargo new --bin rust-cli-app
   cd rust-cli-app
   ```

2. 依存関係の追加
   ```bash
   # Cargo.tomlに依存関係を追加
   cat >> Cargo.toml << 'EOF'
   
   [dependencies]
   clap = { version = "4.4", features = ["derive"] }
   anyhow = "1.0"
   serde = { version = "1.0", features = ["derive"] }
   serde_json = "1.0"
   tokio = { version = "1.35", features = ["full"] }
   reqwest = { version = "0.11", features = ["json"] }
   
   [dev-dependencies]
   assert_cmd = "2.0"
   predicates = "3.0"
   tempfile = "3.8"
   EOF
   ```

3. CLIアプリケーションの実装
   ```bash
   cat > src/main.rs << 'EOF'
   use clap::{Parser, Subcommand};
   use anyhow::Result;
   use serde::{Serialize, Deserialize};
   
   #[derive(Parser)]
   #[command(name = "rust-cli")]
   #[command(about = "A sample Rust CLI application", long_about = None)]
   struct Cli {
       #[command(subcommand)]
       command: Commands,
   }
   
   #[derive(Subcommand)]
   enum Commands {
       /// Shows greeting message
       Hello {
           /// Name to greet
           #[arg(short, long, default_value = "World")]
           name: String,
       },
       /// Checks system status
       Status,
       /// Processes JSON data
       Process {
           /// Input JSON file
           #[arg(short, long)]
           input: String,
       },
   }
   
   #[derive(Serialize, Deserialize)]
   struct StatusInfo {
       status: String,
       version: String,
       timestamp: String,
   }
   
   fn main() -> Result<()> {
       let cli = Cli::parse();
       
       match cli.command {
           Commands::Hello { name } => {
               println!("Hello, {}!", name);
           }
           Commands::Status => {
               let status = StatusInfo {
                   status: "healthy".to_string(),
                   version: env!("CARGO_PKG_VERSION").to_string(),
                   timestamp: chrono::Utc::now().to_rfc3339(),
               };
               println!("{}", serde_json::to_string_pretty(&status)?);
           }
           Commands::Process { input } => {
               let content = std::fs::read_to_string(&input)?;
               let data: serde_json::Value = serde_json::from_str(&content)?;
               println!("Processed {} items", data.as_array().map(|a| a.len()).unwrap_or(0));
           }
       }
       
       Ok(())
   }
   EOF
   
   # chronoを依存関係に追加
   sed -i '/\[dependencies\]/a chrono = "0.4"' Cargo.toml
   ```

4. テストの作成
   ```bash
   cat > tests/cli_test.rs << 'EOF'
   use assert_cmd::Command;
   use predicates::prelude::*;
   use std::fs;
   use tempfile::tempdir;
   
   #[test]
   fn test_hello_default() {
       let mut cmd = Command::cargo_bin("rust-cli-app").unwrap();
       cmd.arg("hello")
           .assert()
           .success()
           .stdout(predicate::str::contains("Hello, World!"));
   }
   
   #[test]
   fn test_hello_with_name() {
       let mut cmd = Command::cargo_bin("rust-cli-app").unwrap();
       cmd.args(&["hello", "--name", "Rust"])
           .assert()
           .success()
           .stdout(predicate::str::contains("Hello, Rust!"));
   }
   
   #[test]
   fn test_status() {
       let mut cmd = Command::cargo_bin("rust-cli-app").unwrap();
       cmd.arg("status")
           .assert()
           .success()
           .stdout(predicate::str::contains("healthy"))
           .stdout(predicate::str::contains("version"));
   }
   
   #[test]
   fn test_process_json() {
       let dir = tempdir().unwrap();
       let file_path = dir.path().join("test.json");
       fs::write(&file_path, r#"[{"id": 1}, {"id": 2}]"#).unwrap();
       
       let mut cmd = Command::cargo_bin("rust-cli-app").unwrap();
       cmd.args(&["process", "--input", file_path.to_str().unwrap()])
           .assert()
           .success()
           .stdout(predicate::str::contains("Processed 2 items"));
   }
   EOF
   ```

5. ユニットテストの追加
   ```bash
   cat >> src/main.rs << 'EOF'
   
   #[cfg(test)]
   mod tests {
       use super::*;
       
       #[test]
       fn test_status_serialization() {
           let status = StatusInfo {
               status: "test".to_string(),
               version: "1.0.0".to_string(),
               timestamp: "2024-01-15T10:00:00Z".to_string(),
           };
           
           let json = serde_json::to_string(&status).unwrap();
           assert!(json.contains("\"status\": \"test\""));
       }
   }
   EOF
   ```

6. コードの検証とフォーマット
   ```bash
   # フォーマット
   cargo fmt
   
   # リント
   cargo clippy -- -D warnings
   
   # セキュリティ監査
   cargo install cargo-audit
   cargo audit
   ```

7. テストの実行
   ```bash
   # ユニットテスト
   cargo test --lib
   
   # 統合テスト
   cargo test --test cli_test
   
   # すべてのテスト
   cargo test
   ```

8. ビルドとリリース
   ```bash
   # デバッグビルド
   cargo build
   
   # リリースビルド
   cargo build --release
   
   # バイナリサイズの最適化
   strip target/release/rust-cli-app
   ```

9. 動作確認
   ```bash
   # ビルドされたバイナリを実行
   ./target/release/rust-cli-app hello --name "Test"
   ./target/release/rust-cli-app status
   
   # JSONファイルでのテスト
   echo '[{"id": 1, "name": "item1"}, {"id": 2, "name": "item2"}]' > test.json
   ./target/release/rust-cli-app process --input test.json
   ```

## 期待結果
- Cargoプロジェクトが正常に作成される
- 依存関係が問題なくダウンロード・コンパイルされる
- すべてのテストがパスする
- リリースビルドが成功し、実行可能なバイナリが生成される
- CLIコマンドが期待通りに動作する
- cargo clippyで警告が出ない

## 検証方法
```bash
# プロジェクト構造の確認
test -f Cargo.toml
test -f src/main.rs
test -d tests

# ビルド成果物の確認
test -f target/release/rust-cli-app

# バイナリサイズの確認（5MB以下であることを確認）
size=$(stat -f%z target/release/rust-cli-app 2>/dev/null || stat -c%s target/release/rust-cli-app)
test $size -lt 5242880 || echo "Warning: Binary size is large: $size bytes"

# 実行確認
./target/release/rust-cli-app hello | grep -q "Hello, World!"
./target/release/rust-cli-app status | grep -q '"status": "healthy"'

# ヘルプの確認
./target/release/rust-cli-app --help | grep -q "A sample Rust CLI application"

# エラーハンドリングの確認
./target/release/rust-cli-app process --input nonexistent.json 2>&1 | grep -q "No such file"

# テスト結果の確認
cargo test --quiet 2>&1 | grep -q "test result: ok"
```

## トラブルシューティング
- **問題**: error[E0433]: failed to resolve: use of undeclared crate
  - **解決策**: Cargo.tomlに必要な依存関係が追加されているか確認

- **問題**: リンカーエラー (linking with `cc` failed)
  - **解決策**: 開発ツールがインストールされているか確認（build-essential on Linux, Xcode on macOS）

- **問題**: テストがタイムアウトする
  - **解決策**: `cargo test -- --test-threads=1` で並列実行を無効化

- **問題**: バイナリサイズが大きい
  - **解決策**: Cargo.tomlに以下を追加:
    ```toml
    [profile.release]
    opt-level = "z"
    lto = true
    codegen-units = 1
    strip = true
    ```

## 参考情報
- [The Rust Programming Language](https://doc.rust-lang.org/book/)
- [Cargo Book](https://doc.rust-lang.org/cargo/)
- [clap Documentation](https://docs.rs/clap/latest/clap/)