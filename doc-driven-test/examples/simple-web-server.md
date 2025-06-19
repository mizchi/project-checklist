# テストケース: シンプルなWebサーバーの構築

## 概要
プログラミング言語に依存しない、基本的なWebサーバーの構築とAPIエンドポイントの動作確認を行います。

## 前提条件
- Python 3.x、Node.js、またはその他のWeb開発環境
- curl コマンドが利用可能
- 空いているポート（デフォルト: 8080）

## 手順
1. プロジェクトディレクトリの作成
   ```bash
   mkdir simple-web-server
   cd simple-web-server
   ```

2. サーバーファイルの作成（Python例）
   ```bash
   cat > server.py << 'EOF'
   from http.server import HTTPServer, BaseHTTPRequestHandler
   import json
   import time
   
   class SimpleHandler(BaseHTTPRequestHandler):
       def do_GET(self):
           if self.path == '/':
               self.send_response(200)
               self.send_header('Content-type', 'text/html')
               self.end_headers()
               self.wfile.write(b'<h1>Welcome to Simple Web Server</h1>')
           elif self.path == '/api/health':
               self.send_response(200)
               self.send_header('Content-type', 'application/json')
               self.end_headers()
               response = {
                   'status': 'healthy',
                   'timestamp': int(time.time()),
                   'service': 'simple-web-server'
               }
               self.wfile.write(json.dumps(response).encode())
           elif self.path == '/api/info':
               self.send_response(200)
               self.send_header('Content-type', 'application/json')
               self.end_headers()
               response = {
                   'version': '1.0.0',
                   'endpoints': ['/', '/api/health', '/api/info']
               }
               self.wfile.write(json.dumps(response).encode())
           else:
               self.send_response(404)
               self.end_headers()
               self.wfile.write(b'Not Found')
       
       def log_message(self, format, *args):
           print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")
   
   if __name__ == '__main__':
       PORT = 8080
       server = HTTPServer(('0.0.0.0', PORT), SimpleHandler)
       print(f'Server running on port {PORT}')
       try:
           server.serve_forever()
       except KeyboardInterrupt:
           print('\nShutting down server...')
           server.shutdown()
   EOF
   ```

3. サーバーの起動
   ```bash
   python server.py &
   SERVER_PID=$!
   echo $SERVER_PID > .server.pid
   
   # サーバーの起動を待つ
   echo "Waiting for server to start..."
   sleep 2
   ```

4. エンドポイントのテスト
   ```bash
   # ルートパスのテスト
   echo "Testing root endpoint..."
   curl -s http://localhost:8080/
   
   # ヘルスチェックエンドポイント
   echo -e "\nTesting health endpoint..."
   curl -s http://localhost:8080/api/health | python -m json.tool
   
   # 情報エンドポイント
   echo -e "\nTesting info endpoint..."
   curl -s http://localhost:8080/api/info | python -m json.tool
   
   # 404エラーのテスト
   echo -e "\nTesting 404 error..."
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/not-found
   ```

## 期待結果
- サーバーがポート8080で起動する
- ルートパス(/)でHTMLウェルカムメッセージが表示される
- /api/healthでJSON形式のヘルスステータスが返される
- /api/infoでサーバー情報が返される
- 存在しないパスで404エラーが返される

## 検証方法
```bash
# サーバープロセスの確認
ps aux | grep -v grep | grep -q "python server.py" || { echo "Server not running"; exit 1; }

# ルートエンドポイントの確認
curl -s http://localhost:8080/ | grep -q "Welcome to Simple Web Server" || { echo "Root endpoint failed"; exit 1; }

# ヘルスチェックの確認
health_status=$(curl -s http://localhost:8080/api/health | python -c "import sys, json; print(json.load(sys.stdin)['status'])")
[ "$health_status" = "healthy" ] || { echo "Health check failed"; exit 1; }

# 情報エンドポイントの確認
version=$(curl -s http://localhost:8080/api/info | python -c "import sys, json; print(json.load(sys.stdin)['version'])")
[ "$version" = "1.0.0" ] || { echo "Info endpoint failed"; exit 1; }

# 404レスポンスの確認
status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/not-found)
[ "$status_code" = "404" ] || { echo "404 handling failed"; exit 1; }

echo "All tests passed!"

# クリーンアップ
if [ -f .server.pid ]; then
    kill $(cat .server.pid) 2>/dev/null || true
    rm -f .server.pid
fi
```

## トラブルシューティング
- **問題**: Address already in use
  - **解決策**: `lsof -ti:8080 | xargs kill -9` でポートを解放

- **問題**: Connection refused
  - **解決策**: サーバーが起動しているか確認、ファイアウォール設定を確認

- **問題**: JSONのパースエラー
  - **解決策**: `jq` コマンドをインストールするか、Pythonのjson.toolを使用

## 参考情報
- HTTPステータスコード: https://developer.mozilla.org/docs/Web/HTTP/Status
- RESTful API設計: https://restfulapi.net/