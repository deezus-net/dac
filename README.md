# DAC
DAC (Database As Code) is a tool to manage the database table structure with yaml  
[![CircleCI](https://circleci.com/gh/deezus-net/dac/tree/master.svg?style=svg)](https://circleci.com/gh/deezus-net/dac/tree/master)

## Installation
It is published in npm
```
npm install @ deezus / dac
```
```
yarn add @ deezus / dac
```

## How to use
```
dac [command] [option]
```

## command
| Command | Description |
|:---|:---|
| extract | Connect to the database and export the tables as yml |
| create | Create tables from yml |
| recreate | drops the existing tables and reconstructs the tables from yml |
| update | Compare the differences between yml and the database and update tables and columns |
| diff | Display difference between yml and database |

## option
| Options | Description | Examples etc. | |
|:---|:---|:---|:---:|
| -f, --host &lt;hosts&gt; | Connection information to the database yml file path | hosts.yml | |
| -H, --host &lt;host&gt; | database host (connection destination name when -f is specified) | localhost | * ||
| -t, --type &lt;type&gt; | database type | mysql, postgres, mssql | * |
| -u, --user &lt;user&gt;| users connecting to the database | | * |
| -p, --password &lt;password&gt; | Password for connecting to the database | | * |
| -d, --database &lt;database&gt; | database name | | * |
| -i, --input &lt;input&gt; | input yml file path | db.yml | |
| -o, --outDir &lt;outDir&gt; | output directory of extract directory | | |
| -q, --query | Output to screen without executing query at create, recreate, update | | |

*-f option is required for unspecified

## Example of use

### extract
When specifying connection information with argument
```
dac extract - H localhost - t mysql - u root - p password - d dac - o.
```
When setting connection information in a file
```
dac extract - f hosts.yml - o.
```
--------------
  
### create
When specifying connection information with argument
```
dac create - H localhost - t mysql - u root - p password - d dac - i db.yml
```
When setting connection information in a file
```
dac create -f hosts.yml -i db.yml
```
When query is displayed
```
dac create -f hosts.yml -i db.yml -q
```
--------------
  
### recreate
When specifying connection information with argument
```
dac recreate - H localhost - t mysql - u root - p password - d dac - i db.yml
```
When setting connection information in a file
```
dac recreate -f hosts.yml -i db.yml
```
When query is displayed
```
dac recreate -f hosts.yml -i db.yml -q
```
--------------
  
### update
When specifying connection information with argument
```
dac update - H localhost - t mysql - u root - p password - d dac - i db.yml
```
When setting connection information in a file
```
dac update -f hosts.yml -i db.yml
```
When query is displayed
```
dac update - f hosts.yml - i db.yml - q
```
--------------
  
### diff
When specifying connection information with argument
```
dac diff - H localhost - t mysql - u root - p password - d dac - i db.yml
```
When setting connection information in a file
```
dac diff -f hosts.yml -i db.yml
```

## About hosts
You can list multiple connection information in yml
You can mix different types of databases as follows
If you do not specify a name with the -h option, the command is executed for all destinations
```yaml: hosts.yml
server 1:
  type: mysql
  hosts: localhost
  user: db_user_1
  password: password
  database: dac
 
server 2:
  type: postgres
  hosts: localhost
  user: db_user_2
  password: password
  database: dac
```

### extract example
When doing to all connection destinations
A file is created for server1.yml, server2.yml and connection destination
```
dac extract -i hosts.yml -o.
```

When specifying the connection destination name
It extracts only 'server1' and creates server1.yml
```
dac extract - i hosts.yml - h server1 - o.
```