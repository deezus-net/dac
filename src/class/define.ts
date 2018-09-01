export class DbType {
    public static mysql = 'mysql';
    public static postgres = 'postgres';
    public static msSql = 'mssql';
}

export class Command {
    public static query = 'query';
    public static extract = 'extract';
    public static create = 'create';
    public static reCreate = 'recreate';
    public static update = 'update';
    public static diff = 'diff';
}