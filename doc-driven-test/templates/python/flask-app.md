# テストケース: Flask アプリケーションのセットアップと動作確認

## 概要
Pythonを使用したFlask Webアプリケーションの環境構築、依存関係管理、テスト実行、デプロイまでの流れを検証します。

## 前提条件
- Python 3.8 以上がインストールされていること
- pip または poetry が利用可能であること
- Git がインストールされていること

## 手順
1. 仮想環境の作成と有効化
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # または
   # venv\Scripts\activate  # Windows
   ```

2. 依存関係の定義とインストール
   ```bash
   cat > requirements.txt << 'EOF'
   Flask==3.0.0
   Flask-CORS==4.0.0
   Flask-SQLAlchemy==3.1.1
   python-dotenv==1.0.0
   gunicorn==21.2.0
   pytest==7.4.3
   pytest-flask==1.3.0
   black==23.11.0
   flake8==6.1.0
   EOF
   
   pip install -r requirements.txt
   ```

3. アプリケーションの作成
   ```bash
   mkdir -p app
   cat > app/__init__.py << 'EOF'
   from flask import Flask
   from flask_cors import CORS
   
   def create_app():
       app = Flask(__name__)
       CORS(app)
       
       @app.route('/health')
       def health():
           return {'status': 'healthy', 'service': 'flask-app'}
       
       @app.route('/api/users')
       def users():
           return {'users': [
               {'id': 1, 'name': 'Alice'},
               {'id': 2, 'name': 'Bob'}
           ]}
       
       return app
   EOF
   
   cat > app.py << 'EOF'
   from app import create_app
   import os
   
   app = create_app()
   
   if __name__ == '__main__':
       port = int(os.environ.get('PORT', 5000))
       app.run(host='0.0.0.0', port=port, debug=True)
   EOF
   ```

4. 環境変数の設定
   ```bash
   cat > .env << 'EOF'
   FLASK_APP=app.py
   FLASK_ENV=development
   PORT=5000
   EOF
   ```

5. テストの作成
   ```bash
   mkdir -p tests
   cat > tests/conftest.py << 'EOF'
   import pytest
   from app import create_app
   
   @pytest.fixture
   def client():
       app = create_app()
       app.config['TESTING'] = True
       
       with app.test_client() as client:
           yield client
   EOF
   
   cat > tests/test_health.py << 'EOF'
   def test_health_endpoint(client):
       response = client.get('/health')
       assert response.status_code == 200
       assert response.json['status'] == 'healthy'
   
   def test_users_endpoint(client):
       response = client.get('/api/users')
       assert response.status_code == 200
       assert len(response.json['users']) == 2
   EOF
   ```

6. コード品質チェック
   ```bash
   # フォーマット
   black app tests
   
   # リンティング
   flake8 app tests --max-line-length=88
   ```

7. テストの実行
   ```bash
   pytest -v
   ```

8. アプリケーションの起動
   ```bash
   # 開発サーバー
   python app.py &
   echo $! > .test.pid
   sleep 3
   
   # または本番サーバー
   # gunicorn -w 4 -b 0.0.0.0:5000 app:app &
   ```

## 期待結果
- 仮想環境が作成され、有効化されている
- すべての依存関係が正常にインストールされる
- Flaskアプリケーションが起動し、ポート5000でリッスンする
- /healthと/api/usersエンドポイントが正常に応答する
- すべてのテストがパスする
- コードがblackでフォーマットされ、flake8のチェックをパスする

## 検証方法
```bash
# 仮想環境の確認
test -d venv
python -c "import sys; print(sys.prefix)" | grep -q "venv"

# 依存関係の確認
pip list | grep -q "Flask"
pip list | grep -q "pytest"

# アプリケーション構造の確認
test -f app/__init__.py
test -f app.py
test -d tests

# サーバーの起動確認
sleep 5
curl -f http://localhost:5000/health || exit 1

# APIレスポンスの確認
curl -s http://localhost:5000/health | python -m json.tool | grep -q '"status": "healthy"'
curl -s http://localhost:5000/api/users | python -m json.tool | grep -q '"name": "Alice"'

# テスト結果の確認
pytest --tb=short | grep -q "passed"

# プロセスの停止
if [ -f .test.pid ]; then
    kill $(cat .test.pid) 2>/dev/null || true
    rm -f .test.pid
fi

# 仮想環境の無効化
deactivate || true
```

## トラブルシューティング
- **問題**: ImportError: No module named 'flask'
  - **解決策**: 仮想環境が有効化されているか確認し、`pip install -r requirements.txt`を再実行

- **問題**: Address already in use
  - **解決策**: `lsof -ti:5000 | xargs kill -9` でポートを解放するか、別のポートを使用

- **問題**: pytest が app モジュールを見つけられない
  - **解決策**: `export PYTHONPATH=$PYTHONPATH:$(pwd)` を実行してPYTHONPATHを設定

## 参考情報
- [Flask公式ドキュメント](https://flask.palletsprojects.com/)
- [pytest公式ドキュメント](https://docs.pytest.org/)
- [Python仮想環境ガイド](https://docs.python.org/3/tutorial/venv.html)