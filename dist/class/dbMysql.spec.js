"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const yaml = require("js-yaml");
const util_1 = require("util");
const dbMysql_1 = require("./dbMysql");
const utility_1 = require("./utility");
const mysqlx = require("@mysql/xdevapi");
describe('dbMysql', () => {
    let mysql;
    let db;
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        const hostText = yield util_1.promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText);
        mysql = new dbMysql_1.DbMysql(hosts['mysql']);
        const dbText = yield util_1.promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = utility_1.yamlToDb(dbText);
    }));
    it('test', () => __awaiter(this, void 0, void 0, function* () {
        yield new Promise(resolve => {
            mysqlx.getSession({
                host: 'localhost',
                port: 33060,
                password: 'dac',
                user: 'dac',
                schema: 'dac' // created by default
            }).then(e => {
                console.log(e);
                resolve();
            }).catch(e => {
                console.log(e.stack);
            });
        });
    }));
    it.skip('query', () => __awaiter(this, void 0, void 0, function* () {
        const query = mysql.query(db);
        console.log(query);
        yield mysql.end();
    }));
    it.skip('create', () => __awaiter(this, void 0, void 0, function* () {
        yield mysql.connect();
        const res = yield mysql.create(db);
        expect(res).toBeTruthy();
        yield mysql.end();
    }));
    it.skip('reCreate', () => __awaiter(this, void 0, void 0, function* () {
        yield mysql.connect();
        const res = yield mysql.reCreate(db);
        expect(res).toBeTruthy();
        yield mysql.end();
    }));
    it.skip('extract', () => __awaiter(this, void 0, void 0, function* () {
        yield mysql.connect();
        const res = yield mysql.extract();
        const text = utility_1.dbToYaml(res);
        console.log(text);
        yield mysql.end();
    }));
    it.skip('update', () => __awaiter(this, void 0, void 0, function* () {
        yield mysql.connect();
        const res = yield mysql.update(db);
        yield mysql.end();
    }));
    it.skip('diff', () => __awaiter(this, void 0, void 0, function* () {
        yield mysql.connect();
        const res = yield mysql.diff(db);
        yield mysql.end();
    }));
    afterAll(() => {
    });
});
//# sourceMappingURL=dbMysql.spec.js.map