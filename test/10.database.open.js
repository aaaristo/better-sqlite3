'use strict';
const { existsSync } = require('fs');
const Database = require('../.');

describe('new Database()', function () {
	it('should throw when given invalid argument types', function () {
		expect(() => new Database('', '')).to.throw(TypeError);
		expect(() => new Database({}, '')).to.throw(TypeError);
		expect(() => new Database({}, {})).to.throw(TypeError);
		expect(() => new Database({})).to.throw(TypeError);
		expect(() => new Database(0)).to.throw(TypeError);
		expect(() => new Database(123)).to.throw(TypeError);
		expect(() => new Database(new String(util.next()))).to.throw(TypeError);
		expect(() => new Database(() => util.next())).to.throw(TypeError);
		expect(() => new Database([util.next()])).to.throw(TypeError);
	});
	it('should throw when boolean options are provided as non-booleans', function () {
		expect(() => new Database(util.next(), { readOnly: false })).to.throw(TypeError);
		expect(() => new Database(util.next(), { readonly: undefined })).to.throw(TypeError);
		expect(() => new Database(util.next(), { memory: undefined })).to.throw(TypeError);
		expect(() => new Database(util.next(), { fileMustExist: undefined })).to.throw(TypeError);
	});
	it('should not allow URI file paths', function () {
		expect(() => new Database(`FILE:${util.next()}`)).to.throw(TypeError);
		expect(() => new Database(`file:${util.next()}`)).to.throw(TypeError);
		expect(() => new Database(`file:${util.next()}?mode=memory&cache=shared`)).to.throw(TypeError);
	});
	it('should allow anonymous temporary databases to be created', function () {
		for (const args of [[''], [], [null], [undefined], ['', { timeout: 2000 }]]) {
			const db = new Database(...args);
			expect(db.name).to.equal('');
			expect(db.memory).to.be.true;
			expect(db.readonly).to.be.false;
			expect(db.open).to.be.true;
			expect(db.inTransaction).to.be.false;
			expect(existsSync('')).to.be.false;
			expect(existsSync('null')).to.be.false;
			expect(existsSync('undefined')).to.be.false;
			expect(existsSync('[object Object]')).to.be.false;
			db.close();
		}
	});
	it('should allow anonymous in-memory databases to be created', function () {
		const db = new Database(':memory:');
		expect(db.name).to.equal(':memory:');
		expect(db.memory).to.be.true;
		expect(db.readonly).to.be.false;
		expect(db.open).to.be.true;
		expect(db.inTransaction).to.be.false;
		expect(existsSync(':memory:')).to.be.false;
		db.close();
	});
	it('should allow named in-memory databases to be created', function () {
		expect(existsSync(util.next())).to.be.false;
		const db = new Database(util.current(), { memory: true });
		expect(db.name).to.equal(util.current());
		expect(db.memory).to.be.true;
		expect(db.readonly).to.be.false;
		expect(db.open).to.be.true;
		expect(db.inTransaction).to.be.false;
		expect(existsSync(util.current())).to.be.false;
		db.close();
	});
	it('should allow in-memory vfs databases to be created', function () {
		expect(existsSync(util.next())).to.be.false;
		const db = new Database('file:/whatever?ptr=0xf05538&sz=14336&max=65536', { vfs: 'memvfs' });
                console.log(db.name);
		db.close();
	});
	it('should allow disk-bound databases to be created', function () {
		expect(existsSync(util.next())).to.be.false;
		const db = Database(util.current());
		expect(db.name).to.equal(util.current());
		expect(db.memory).to.be.false;
		expect(db.readonly).to.be.false;
		expect(db.open).to.be.true;
		expect(db.inTransaction).to.be.false;
		expect(existsSync(util.current())).to.be.true;
		db.close();
	});
	it('should not allow conflicting in-memory options', function () {
		expect(() => new Database(':memory:', { memory: false })).to.throw(TypeError);
		expect(() => new Database('', { memory: false })).to.throw(TypeError);
		(new Database(':memory:', { memory: true })).close();
		(new Database('', { memory: true })).close();
	});
	it('should allow readonly database connections to be created', function () {
		expect(existsSync(util.next())).to.be.false;
		expect(() => new Database(util.current(), { readonly: true })).to.throw(Database.SqliteError).with.property('code', 'SQLITE_CANTOPEN');
		(new Database(util.current())).close();
		expect(existsSync(util.current())).to.be.true;
		const db = new Database(util.current(), { readonly: true });
		expect(db.name).to.equal(util.current());
		expect(db.memory).to.be.false;
		expect(db.readonly).to.be.true;
		expect(db.open).to.be.true;
		expect(db.inTransaction).to.be.false;
		expect(existsSync(util.current())).to.be.true;
		db.close();
	});
	it('should not allow the "readonly" option for in-memory databases', function () {
		expect(existsSync(util.next())).to.be.false;
		expect(() => new Database(util.current(), { memory: true, readonly: true })).to.throw(TypeError);
		expect(() => new Database(':memory:', { readonly: true })).to.throw(TypeError);
		expect(() => new Database('', { readonly: true })).to.throw(TypeError);
		expect(existsSync(util.current())).to.be.false;
	});
	it('should accept the "fileMustExist" option', function () {
		expect(existsSync(util.next())).to.be.false;
		expect(() => new Database(util.current(), { fileMustExist: true })).to.throw(Database.SqliteError).with.property('code', 'SQLITE_CANTOPEN');
		(new Database(util.current())).close();
		expect(existsSync(util.current())).to.be.true;
		const db = new Database(util.current(), { fileMustExist: true });
		expect(db.name).to.equal(util.current());
		expect(db.memory).to.be.false;
		expect(db.readonly).to.be.false;
		expect(db.open).to.be.true;
		expect(db.inTransaction).to.be.false;
		expect(existsSync(util.current())).to.be.true;
		db.close();
	});
	it('should accept the "timeout" option', function () {
		this.slow(2500);
		const testTimeout = (timeout) => {
			const db = new Database(util.current(), { timeout });
			const start = Date.now();
			expect(() => db.exec('BEGIN EXCLUSIVE')).to.throw(Database.SqliteError).with.property('code', 'SQLITE_BUSY');
			const end = Date.now();
			expect(end - start).to.be.within(timeout - 100, timeout + 100);
			db.close();
		};
		const blocker = new Database(util.next(), { timeout: 0x7fffffff });
		blocker.exec('BEGIN EXCLUSIVE');
		testTimeout(0);
		testTimeout(1000);
		blocker.close();
		expect(() => new Database(util.current(), { timeout: undefined })).to.throw(TypeError);
		expect(() => new Database(util.current(), { timeout: null })).to.throw(TypeError);
		expect(() => new Database(util.current(), { timeout: NaN })).to.throw(TypeError);
		expect(() => new Database(util.current(), { timeout: '75' })).to.throw(TypeError);
		expect(() => new Database(util.current(), { timeout: -1 })).to.throw(TypeError);
		expect(() => new Database(util.current(), { timeout: 75.01 })).to.throw(TypeError);
		expect(() => new Database(util.current(), { timeout: 0x80000000 })).to.throw(RangeError);
		blocker.close();
	});
	it('should throw an Error if the directory does not exist', function () {
		expect(existsSync(util.next())).to.be.false;
		const filepath = `temp/nonexistent/abcfoobar123/${util.current()}`;
		expect(() => new Database(filepath)).to.throw(TypeError);
		expect(existsSync(filepath)).to.be.false;
		expect(existsSync(util.current())).to.be.false;
	});
	it('should have a proper prototype chain', function () {
		const db = new Database(util.next());
		expect(db).to.be.an.instanceof(Database);
		expect(db.constructor).to.equal(Database);
		expect(Database.prototype.constructor).to.equal(Database);
		expect(Database.prototype.close).to.be.a('function');
		expect(Database.prototype.close).to.equal(db.close);
		expect(Database.prototype).to.equal(Object.getPrototypeOf(db));
		db.close();
	});
});
