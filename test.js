const ref = require('ref');
const Database = require('.');

let db = new Database();

db.loadExtension('build/memvfs.node');

db.close();

console.log('loaded');


(async () => {
    const dbbuf = require('fs').readFileSync('./x.db');
    const buf = Buffer.alloc(dbbuf.length * 2);
    dbbuf.copy(buf);
    console.log('hexAddress', buf.hexAddress());
    console.log('address', buf.address());    
    console.log('buf.length', buf.length);    
    
    const memdb = new Database(`file:/whatever?ptr=0x${buf.hexAddress()}&sz=${dbbuf.length}&max=${buf.length}`, { vfs: 'memvfs' });
    await memdb.pragma('journal_mode = memory');
    console.log('memdb.name', memdb.name);
    const res = await memdb.prepare('select * from ref').get();
    console.log(res);
    console.log('qui2');
    await memdb.exec('create table refssss (name text)');
    console.log('qui');
    memdb.loadExtension('build/memvfs.node');
    console.log('memvfs_dbsize()', await memdb.prepare('select memvfs_dbsize()').pluck().get());
})().catch((err) => console.log(err, err.stack));

