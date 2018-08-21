"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
class DbPostgres {
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
        console.log(dbHost.database);
        try {
            const client = new pg_1.Client({
                user: dbHost.user,
                host: dbHost.host,
                database: dbHost.database,
                password: dbHost.password
            });
            console.log(client);
            client.connect();
        }
        catch (e) {
            console.log(e);
        }
    }
}
exports.DbPostgres = DbPostgres;
//# sourceMappingURL=dbPostgres.js.map