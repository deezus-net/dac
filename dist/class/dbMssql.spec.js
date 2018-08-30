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
const dbMssql_1 = require("./dbMssql");
const utility_1 = require("./utility");
describe('DbMssql', () => {
    let sql;
    let db;
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        const hostText = yield util_1.promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText);
        sql = new dbMssql_1.DbMssql(hosts['mssql']);
        const dbText = yield util_1.promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = utility_1.yamlToDb(dbText);
        //  db = yaml.safeLoad(dbText) as Db;
    }));
    it.skip('query', () => __awaiter(this, void 0, void 0, function* () {
        yield sql.connect();
        const data = sql.query(db);
        console.log(data);
        yield sql.end();
    }));
    it.skip('create', () => __awaiter(this, void 0, void 0, function* () {
        yield sql.connect();
        const res = yield sql.create(db);
        expect(res).toBeTruthy();
        yield sql.end();
    }));
    it.skip('reCreate', () => __awaiter(this, void 0, void 0, function* () {
        yield sql.connect();
        const res = yield sql.reCreate(db);
        expect(res).toBeTruthy();
        yield sql.end();
    }));
    it.skip('extract', () => __awaiter(this, void 0, void 0, function* () {
        yield sql.connect();
        const res = yield sql.extract();
        const text = utility_1.dbToYaml(res);
        console.log(text);
        yield sql.end();
    }));
    it.skip('update', () => __awaiter(this, void 0, void 0, function* () {
        yield sql.connect();
        const res = yield sql.update(db);
        yield sql.end();
    }));
    it.skip('diff', () => __awaiter(this, void 0, void 0, function* () {
        yield sql.connect();
        const res = yield sql.diff(db);
        yield sql.end();
    }));
    afterAll(() => {
    });
});
//# sourceMappingURL=dbMssql.spec.js.map