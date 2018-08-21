"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = require("mysql");
class DbMysql {
    constructor(dbHost) {
        this.create = () => {
        };
        this.diff = () => {
        };
        this.extract = () => {
            return null;
        };
        this.query = () => {
            return '';
        };
        this.reCreate = () => {
        };
        this.update = () => {
        };
        console.log(dbHost);
        try {
            const con = mysql_1.createConnection({
                host: dbHost.host,
                user: dbHost.user,
                password: dbHost.password,
                database: dbHost.dataBase,
            });
            con.connect();
            //  console.log(con)
        }
        catch (e) {
            console.log(e);
        }
    }
}
exports.DbMysql = DbMysql;
//# sourceMappingURL=dbMysql.js.map