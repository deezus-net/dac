export class DbType {
    public static mysql = 'mysql';
    public static postgres = 'postgres';
    public static msSql = 'mssql';
}

export class Command {
    public static drop = 'drop';
    public static query = 'query';
    public static extract = 'extract';
    public static create = 'create';
    public static reCreate = 'recreate';
    public static update = 'update';
    public static diff = 'diff';
}

export class ConsoleColor {
    public static reset = '\x1b[0m';
    public static bright = '\x1b[1m';
    public static dim = '\x1b[2m';
    public static underscore = '\x1b[4m';
    public static blink = '\x1b[5m';
    public static reverse = '\x1b[7m';
    public static hidden = '\x1b[8m';

    public static fgBlack = '\x1b[30m';
    public static fgRed = '\x1b[31m';
    public static fgGreen = '\x1b[32m';
    public static fgYellow = '\x1b[33m';
    public static fgBlue = '\x1b[34m';
    public static fgMagenta = '\x1b[35m';
    public static fgCyan = '\x1b[36m';
    public static fgWhite = '\x1b[37m';

    public static bgBlack = '\x1b[40m';
    public static bgRed = '\x1b[41m';
    public static bgGreen = '\x1b[42m';
    public static bgYellow = '\x1b[43m';
    public static bgBlue = '\x1b[44m';
    public static bgMagenta = '\x1b[45m';
    public static bgCyan = '\x1b[46m';
    public static bgWhite = '\x1b[47m';
}