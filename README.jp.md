# DAC
=====
DAC(Database As Codeの略)はデータベースのテーブル構造をyamlで管理するツールです

## インストール
npmで公開しています
```
npm install @deeszus/dac
```
```
yarn add @deezus/dac
```

## 使い方
```
dac [コマンド] [オプション]
```

## コマンド
|コマンド| 説明 |
|:---|:---|
| extract | データベースに接続しテーブルをymlとしてエクスポートします|
| create | ymlを元にテーブルを作成します |
| recreate| 既存テーブルをdropし、ymlを元にテーブルを再構成します |
| update | ymlとデータベースの差分を比較し、テーブルやカラムを更新します |
| diff | ymlとデータベースの差分を表示します |

## オプション
| オプション | 説明 | 例など | |
|:---|:---|:---|:---:|
| -f, --host <hosts>| データベースへの接続情報ymlファイルパス | hosts.yml |
| -H, --host <host> | データベースホスト|localhost| * |
| -t, --type <type> | データベースタイプ | mysql, postgres, mssql | * |
| -u, --user <user> | データベースに接続するユーザー |  | * |
| -p, --password <password> | データベースに接続する際のパスワード |  | * |
| -d, --database <database> | データベース名 | | * |
| -i, --input <input> | 入力ymlファイルパス | db.yml |
| -o, --outDir <outDir> | extract時の出力先ディレクトリ | |
| -q, --query | create, recreate, update 時にクエリを実行せずに画面に出力します|

※-f未指定の場合は*のオプションが必須です

## 使用例

### extract
引数で接続情報を指定する場合
```
dac extract -H localhost -t mysql -u root -p password -d dac -o .
```
ファイルで接続情報を設定する場合
```
dac extract -f hosts.yml -o .
```

### create
引数で接続情報を指定する場合
```
dac create -H localhost -t mysql -u root -p password -d dac -i db.yml
```
ファイルで接続情報を設定する場合
```
dac create -f hosts.yml -i db.yml
```
クエリを表示する場合
```
dac create -f hosts.yml -i db.yml -q
```

### recreate
引数で接続情報を指定する場合
```
dac recreate -H localhost -t mysql -u root -p password -d dac -i db.yml
```
ファイルで接続情報を設定する場合
```
dac recreate -f hosts.yml -i db.yml
```
クエリを表示する場合
```
dac recreate -f hosts.yml -i db.yml -q
```

### update
引数で接続情報を指定する場合
```
dac update -H localhost -t mysql -u root -p password -d dac -i db.yml
```
ファイルで接続情報を設定する場合
```
dac update -f hosts.yml -i db.yml
```
クエリを表示する場合
```
dac update -f hosts.yml -i db.yml -q
```

### diff
引数で接続情報を指定する場合
```
dac diff -H localhost -t mysql -u root -p password -d dac -i db.yml
```
ファイルで接続情報を設定する場合
```
dac diff -f hosts.yml -i db.yml
```

## hostsに関して
ymlで接続情報を複数記載することができます
下記のように種類の違うデータベースを混在させることもできます
-hオプションで名前を指定しない場合は全サーバに対してコマンドが実行されます
```yaml
server1:
  type: mysql
  hosts: localhost
  user: db_user_1
  password: password
  database: dac
 
server2:
  type: postgres
  hosts: localhost
  user: db_user_2
  password: password
  database: dac

```

### extractの例
全サーバに対して行う場合
server1.yml, server2.ymlとサーバごとにファイルが作成されます
```
dac extract -i hosts.yml -o .
```

サーバ名を指定する場合
server1のみをextractし、server1.ymlが作成されます
```
dac extract -i hosts.yml -h server1 -o .

```