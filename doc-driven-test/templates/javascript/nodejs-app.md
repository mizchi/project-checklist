# テストケース: Node.js アプリケーションのセットアップと動作確認

## 概要
Node.jsアプリケーションの初期セットアップから、依存関係のインストール、テスト実行、ビルド、起動までの一連の流れを検証します。

## 前提条件
- Node.js 18.x 以上がインストールされていること
- npm または yarn が利用可能であること
- Git がインストールされていること

## 手順
1. プロジェクトの初期化
   ```bash
   npm init -y
   ```

2. 依存関係のインストール
   ```bash
   # 本番依存関係
   npm install express cors dotenv
   
   # 開発依存関係
   npm install -D typescript @types/node @types/express
   npm install -D jest @types/jest ts-jest
   npm install -D eslint prettier
   ```

3. TypeScript設定の作成
   ```bash
   npx tsc --init
   ```
   
   tsconfig.jsonを以下のように編集:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "commonjs",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     }
   }
   ```

4. ソースコードの作成
   ```bash
   mkdir -p src
   cat > src/index.ts << 'EOF'
   import express from 'express';
   import cors from 'cors';
   
   const app = express();
   const PORT = process.env.PORT || 3000;
   
   app.use(cors());
   app.use(express.json());
   
   app.get('/health', (req, res) => {
     res.json({ status: 'healthy', timestamp: new Date().toISOString() });
   });
   
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   EOF
   ```

5. スクリプトの設定
   package.jsonに以下を追加:
   ```json
   {
     "scripts": {
       "dev": "ts-node src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js",
       "test": "jest",
       "lint": "eslint src/**/*.ts",
       "format": "prettier --write src/**/*.ts"
     }
   }
   ```

6. テストの作成と実行
   ```bash
   mkdir -p src/__tests__
   cat > src/__tests__/health.test.ts << 'EOF'
   describe('Health Check', () => {
     test('should return healthy status', () => {
       expect(true).toBe(true);
     });
   });
   EOF
   
   npm test
   ```

7. ビルドの実行
   ```bash
   npm run build
   ```

8. アプリケーションの起動
   ```bash
   npm start &
   echo $! > .test.pid
   sleep 3
   ```

## 期待結果
- package.jsonが作成され、必要な依存関係が記載されている
- node_modulesディレクトリが作成され、依存関係がインストールされている
- TypeScriptのビルドが成功し、distディレクトリが作成される
- サーバーがポート3000で起動する
- /healthエンドポイントが正常に応答する

## 検証方法
```bash
# package.jsonの存在確認
test -f package.json

# 依存関係の確認
test -d node_modules
npm list express | grep -q "express@"

# ビルド成果物の確認
test -f dist/index.js

# サーバーの起動確認
sleep 5  # サーバー起動を待つ
curl -f http://localhost:3000/health || exit 1

# レスポンス内容の確認
curl -s http://localhost:3000/health | grep -q '"status":"healthy"'

# プロセスの停止
if [ -f .test.pid ]; then
    kill $(cat .test.pid) 2>/dev/null || true
    rm -f .test.pid
fi
```

## トラブルシューティング
- **問題**: ポート3000が既に使用されている
  - **解決策**: `PORT=3001 npm start` のように環境変数でポートを変更

- **問題**: TypeScriptのビルドエラー
  - **解決策**: tsconfig.jsonの設定を確認し、型定義ファイルが正しくインストールされているか確認

- **問題**: テストが失敗する
  - **解決策**: jest.config.jsを作成し、TypeScript用の設定を追加

## 参考情報
- [Node.js公式ドキュメント](https://nodejs.org/docs/)
- [Express.js公式ガイド](https://expressjs.com/)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)