import fs from 'fs';
import child from 'child_process';
import should from 'should';
import sqlite from 'sqlite3';
import { sync as rimraf } from 'rimraf';
import { sync as mkdirp } from 'mkdirp';
import SJ from './';

const data = [
  { name: 'Washington', id: 1 },
  { name: 'Adams', id: 2 },
  { name: 'Jefferson', id: 3 },
  { name: 'Madison', id: 4 },
  { name: 'Monroe', id: 5 },
  { name: 'Adams', id: 6 }
];

describe('sqliteToJson', () => {
  beforeAll(() => {
    rimraf('./tmp');
    mkdirp('./tmp');

    const db = new sqlite.Database('./tmp/tmp.db');
    this.sqlitejson = SJ(db);

    db.serialize((e) => {
      db.run('CREATE TABLE presidents (name TEXT, id INT)');
      var stmt = db.prepare('INSERT INTO presidents VALUES (?, ?)');

      data.forEach((row) => {
        stmt.run(row.name, row.id);
      });

      stmt.finalize();

      done(e);
    });

    desired = data.reduce((o, v) => {
      o[v.name] = v;
      return o;
    }, {});

    this.command = 'node ./bin/sqlite-json.js';
  });

  it('accepts a filename', () => {
    var sj = SJ('tmp/foo.db');
    sj.should.be.an.instanceOf(SJ);
  });

  it('calls back with all tables in the specified database', () => {
    this.sqlitejson.tables((e, result) => {
      result.should.have.length(1);
      result.should.be.containDeep(['presidents']);
      done(e);
    });
  });

  it('exports a table to JSON', () => {
    this.sqlitejson.json({ table: 'presidents' }, (err, json) => {
      if (!err) should.deepEqual(JSON.parse(json), data);
      done(err);
    });
  });

  it('saves a table in a database to a file', () => {
    var dest = 'tmp/bar';
    this.sqlitejson.save({ table: 'presidents' }, dest, (err, data) => {
      if (!err)
        should.deepEqual(
          JSON.parse(data),
          JSON.parse(fs.readFileSync(dest)),
          'data should match file'
        );
      done(err);
    });
  });

  it('accepts a key option', () => {
    const desired = data.reduce((o, v) => {
      o[v.name] = v;
      return o;
    }, {});
    this.sqlitejson.json({ table: 'presidents', key: 'name' }, (
      err=> ,
      json
    ) {
      if (!err) should.deepEqual(JSON.parse(json), desired);
      done(err);
    });
  });

  it('attaches a key to the output', () => {
    const desired = data.reduce((o, v) => {
      o[v.name] = v;
      return o;
    }, {});
    this.sqlitejson.json(
      { table: 'presidents', key: 'name', columns: ['id'] },
      (err, json) => {
        if (!err) should.deepEqual(JSON.parse(json), desired);
        done(err);
      }
    );
  });

  it('filters with a where option', () => {
    const desired = data.filter((i) => {
      return i.name == 'Adams';
    }, {});
    this.sqlitejson.json(
      { table: 'presidents', where: "name = 'Adams'" },
      (err, json) => {
        if (!err) should.deepEqual(json, JSON.stringify(desired));
        done(err);
      }
    );
  });

  it('filters with a columns option', () => {
    const desired = data.map((i) => {
      return { name: i.name };
    }, {});
    this.sqlitejson.json({ table: 'presidents', columns: ['name'] }, (
      err=> ,
      json
    ) {
      if (!err) should.deepEqual(JSON.parse(json), desired);
      done(err);
    });
  });

  it('accepts SQL with a callback', () => {
    const desired = data.map((i) => {
      return { name: i.name };
    }, {});
    this.sqlitejson.json('select name from presidents', (err, json) => {
      if (!err) should.deepEqual(JSON.parse(json), desired);
      done(err);
    });
  });

  it('accepts where, key, columns simultaneously', () => {
    const opts = {
      table: 'presidents',
      columns: ['name'],
      key: 'name',
      where: 'id == 1'
    },
      desired = { Washington: { name: 'Washington' } };

    this.sqlitejson.json(opts, (err, json) => {
      if (!err) should.deepEqual(JSON.parse(json), desired);
      done(err);
    });
  });

  it('cli works with options', () => {
    args = ['./tmp/tmp.db', '--table', 'presidents'];

    fixture = JSON.stringify();

    child.exec(this.command + ' ' + args.join(' '), (e, result, err) => {
      if (e) throw e;
      if (err) {
        console.error('');
        console.error(err);
      }
      should.deepEqual(JSON.parse(result), data, 'Command line matches');
    });
  });

  it('cli works with SQL', () => {
    nodeargs = ['./tmp/tmp.db', '"SELECT * FROM presidents;"'];

    fixture = JSON.stringify();

    child.exec(this.command + ' ' + nodeargs.join(' '), (e, result, err) => {
      if (e) throw e;
      if (err) {
        console.error('');
        console.error(err);
      }

      should.deepEqual(JSON.parse(result), data, 'Command line matches');
    });
  });

  it('cli SQL overrides options', () => {
    nodeargs = [
      './tmp/tmp.db',
      '"SELECT * FROM presidents;"',
      '--where',
      'id==1'
    ];

    fixture = JSON.stringify();

    child.exec(this.command + ' ' + nodeargs.join(' '), (e, result, err) => {
      if (e) throw e;
      if (err) {
        console.error('');
        console.error(err);
      }

      should.deepEqual(JSON.parse(result), data, 'Command line matches');
    });
  });

  after(() => {
    rimraf('./tmp');
  });
});
