const fs = require('fs');
const child = require('child_process');
const sqlite = require('sqlite3');
const { sync: rimraf } = require('rimraf');
const { sync: mkdirp } = require('mkdirp');
const SJ = require('../');

const data = [
  { name: 'Washington', id: 1 },
  { name: 'Adams', id: 2 },
  { name: 'Jefferson', id: 3 },
  { name: 'Madison', id: 4 },
  { name: 'Monroe', id: 5 },
  { name: 'Adams', id: 6 }
];

describe('sqliteToJson', function spec() {
  beforeAll(() => {
    rimraf('./tmp');
    mkdirp('./tmp');

    const db = new sqlite.Database('./tmp/tmp.db');
    this.sqlitejson = SJ(db);

    db.serialize(e => {
      db.run('CREATE TABLE presidents (name TEXT, id INT)');
      const stmt = db.prepare('INSERT INTO presidents VALUES (?, ?)');

      data.forEach(row => {
        stmt.run(row.name, row.id);
      });

      stmt.finalize();
    });

    desired = data.reduce((o, v) => {
      o[v.name] = v;
      return o;
    }, {});

    this.command = 'node ./bin/sqlite-json.js';
  });

  it('accepts a filename', () => {
    const sj = SJ('tmp/foo.db');
    expect(sj).toBeInstanceOf(SJ);
  });

  it('calls back with all tables in the specified database', () => {
    this.sqlitejson.tables((e, result) => {
      expect(result).toHaveLength(1);
      expect(result).be.containDeep(['presidents']);
    });
  });

  it('exports a table to JSON', () => {
    this.sqlitejson.json({ table: 'presidents' }, (err, json) => {
      if (!err) expect(JSON.parse(json)).deepEqual(data);
      done(err);
    });
  });

  it('saves a table in a database to a file', () => {
    const dest = 'tmp/bar';

    this.sqlitejson.save({ table: 'presidents' }, dest, (err, data) => {
      if (!err)
        expect(JSON.parse(data)).deepEqual(JSON.parse(fs.readFileSync(dest)));
      done(err);
    });
  });

  it('accepts a key option', () => {
    const desired = data.reduce((o, v) => {
      o[v.name] = v;
      return o;
    }, {});

    this.sqlitejson.json({ table: 'presidents', key: 'name' }, (err, json) => {
      if (!err) expect(JSON.parse(json)).deepEqual(desired);
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
        if (!err) expect(JSON.parse(json)).deepEqual(desired);
        done(err);
      }
    );
  });

  it('filters with a where option', () => {
    const desired = data.filter(i =>  i.name === 'Adams', {});

    this.sqlitejson.json(
      { table: 'presidents', where: "name = 'Adams'" },
      (err, json) => {
        if (!err) expect(json).deepEqual(JSON.stringify(desired));
        done(err);
      }
    );
  });

  it('filters with a columns option', () => {
    const desired = data.map(i => ({ name: i.name }), {});

    this.sqlitejson.json({ table: 'presidents', columns: ['name'] }, (err, json) => {
      if (!err) expect(JSON.parse(json)).deepEqual(desired);
      done(err);
    });
  });

  it('accepts SQL with a callback', () => {
    const desired = data.map(i => ({ name: i.name }), {});

    this.sqlitejson.json('select name from presidents', (err, json) => {
      if (!err) expect(JSON.parse(json)).deepEqual(desired);
      done(err);
    });
  });

  it('accepts where, key, columns simultaneously', () => {
    const opts = {
      table: 'presidents',
      columns: ['name'],
      key: 'name',
      where: 'id == 1'
    };
    const desired = { Washington: { name: 'Washington' } };

    this.sqlitejson.json(opts, (err, json) => {
      if (!err) expect(JSON.parse(json)).deepEqual(desired);
      done(err);
    });
  });

  it('cli works with options', () => {
    const args = ['./tmp/tmp.db', '--table', 'presidents'];
    const fixture = JSON.stringify();

    child.exec(this.command + ' ' + args.join(' '), (e, result, err) => {
      if (e) throw e;
      if (err) {
        console.error('');
        console.error(err);
      }
      expect(JSON.parse(result)).deepEqual(data);
    });
  });

  it('cli works with SQL', () => {
    const nodeargs = ['./tmp/tmp.db', '"SELECT * FROM presidents;"'];
    const fixture = JSON.stringify();

    child.exec(this.command + ' ' + nodeargs.join(' '), (e, result, err) => {
      if (e) throw e;
      if (err) {
        console.error('');
        console.error(err);
      }

      expect(JSON.parse(result)).deepEqual(data);
    });
  });

  it('cli SQL overrides options', () => {
    const nodeargs = [
      './tmp/tmp.db',
      '"SELECT * FROM presidents;"',
      '--where',
      'id==1'
    ];

    const fixture = JSON.stringify();

    child.exec(this.command + ' ' + nodeargs.join(' '), (e, result, err) => {
      if (e) throw e;
      if (err) {
        console.error('');
        console.error(err);
      }

      expect(JSON.parse(result)).deepEqual(data);
    });
  });

  afterAll(() => {
    rimraf('./tmp');
  });
});
