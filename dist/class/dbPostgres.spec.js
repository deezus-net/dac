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
const dbPostgres_1 = require("./dbPostgres");
const utility_1 = require("./utility");
describe('DbPostgres', () => {
    let pg;
    let db;
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        const hostText = yield util_1.promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText);
        pg = new dbPostgres_1.DbPostgres(hosts['postgres']);
        const dbText = yield util_1.promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = utility_1.yamlToDb(dbText);
        //  db = yaml.safeLoad(dbText) as Db;
    }));
    it.skip('query', () => __awaiter(this, void 0, void 0, function* () {
        yield pg.connect();
        const query = pg.query(db);
        console.log(query);
        yield pg.exec(query);
        yield pg.end();
    }));
    it.skip('create', () => __awaiter(this, void 0, void 0, function* () {
        yield pg.connect();
        const res = yield pg.create(db);
        expect(res).toBeTruthy();
        yield pg.end();
    }));
    it.skip('reCreate', () => __awaiter(this, void 0, void 0, function* () {
        yield pg.connect();
        const res = yield pg.reCreate(db);
        expect(res).toBeTruthy();
        yield pg.end();
    }));
    it.skip('extract', () => __awaiter(this, void 0, void 0, function* () {
        yield pg.connect();
        const res = yield pg.extract();
        const text = utility_1.dbToYaml(res);
        console.log(text);
        yield pg.end();
    }));
    it.skip('update', () => __awaiter(this, void 0, void 0, function* () {
        yield pg.connect();
        const res = yield pg.update(db);
        yield pg.end();
    }));
    it('diff', () => __awaiter(this, void 0, void 0, function* () {
        yield pg.connect();
        const res = yield pg.diff(db);
        console.log(res.modifiedIndexes['users']);
        yield pg.end();
    }));
    afterAll(() => {
    });
});
//# sourceMappingURL=dbPostgres.spec.js.map