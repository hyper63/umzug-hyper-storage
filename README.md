<h1 align="center">⚡️ umzug-hyper-storage ⚡️</h1>
<p align="center">
  umzug-hyper-storage is a zero-dependency <a href="https://github.com/sequelize/umzug#storages">Storage Adapter</a> for <a href="https://github.com/sequelize/umzug">Umzug</a>
  that uses a <a href="https://hyper.io/product#data">Hyper Data Service</a> to track migrations
</p>
<p align="center">
  <a href="https://standardjs.com">
    <img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://badges.frapsoft.com/typescript/code/typescript.svg?v=101" alt="TypeScript" />
  </a>
  <a href="https://github.com/hyper63/umzug-hyper-storage/actions/workflows/test.yml">
    <img src="https://github.com/hyper63/umzug-hyper-storage/actions/workflows/test.yml/badge.svg" alt="Test" />
  </a>
  <a href="https://github.com/hyper63/umzug-hyper-storage/actions/workflows/test.yml">
    <img src="https://img.shields.io/badge/coverage-100%25-green" alt="Coverage" />
  </a>
</p>

---

## Table of Contents

- [Install](#install)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [License](#license)

---

## Install

```sh
npm install umzug-hyper-storage
```

## Getting Started

umzug-hyper-storage is a zero-dependency Storage Adapter for
<a href="https://github.com/sequelize/umzug">Umzug</a> that uses a
<a href="https://hyper.io/product#data">Hyper Data Service</a> to track
migrations.

It works great as a tool to track and run migrations of your data stored in a
Hyper Data Service. It's also a great generalized script runner, not just for
running migrations.

To instantiate, provide an instance of
[`hyper-connect`](https://github.com/hyper63/hyper/tree/main/packages/connect)
that connects to your data service you would like to use to track your scripts.

```ts
import { Umzug } from 'umzug'
import { HyperStorage } from 'umzug-storage-adapter'
import { connect } from 'hyper-connect'

const hyper = connect(process.env.HYPER)

const umzug = new Umzug({
  storage: new HyperStorage({ hyper }),
  // optionally pass a hyper-connect instance to each of your scripts
  context: {
    hyper
  }
  ...
})

await umzug.up() // run migrations
```

This will create a document in your Hyper Data Service in the follow shape:

```js
{
  _id: 'hyper-scripts-meta',
  type: '__scripts',
  migrations: [
    // array of scripts that have been ran
  ],
  createdAt: '2022-04-27T20:30:40.688Z',
  updatedAt: '2022-04-27T20:30:40.688Z'
}
```

As scripts are ran, their names are appended to the `migrations` array in this
document. If scripts are rolled back, their names are removed from the
`migrations` array, following normal `Umzug` rules.

This is how `Umzug` will track which scripts to run, rollback, or have been
previously executed.

## Documentation

See [Umzug Docs](https://github.com/sequelize/umzug) for Umzug usage.

A [`hyper-connect`](https://github.com/hyper63/hyper/tree/main/packages/connect)
instance connecting to your Hyper Data Service is required upon instantiation.

You may also pass a `doc` argument which dictates the shape of the document
added to hyper data service:

```ts
interface HyperStorageDocArgs {
  // the _id of the meta document. Defaults to 'hyper-scripts-meta'
  id?: string;
  // the type of the meta document. Defaults to '__scripts'
  type?: string;
  /**
   * the field on the meta document to use to store the document type
   * ie. 'docType'. Defaults to 'type'
   */
  typeField?: string;
  /**
   * the field on the meta document to store the time
   * the meta document was created. Defaults to 'createdAt'
   */
  createdField?: string;
  /**
   * the field on the meta document to store the time
   * the meta document was last updated. Defaults to 'updatedAt'
   *
   * This field is updated each time migrations are ran or rolled back
   */
  updatedField?: string;
}
```

### Example using `doc`

```ts
import { Umzug } from 'umzug'
import { HyperStorage } from 'umzug-storage-adapter'
import { connect } from 'hyper-connect'

const hyper = connect(process.env.HYPER)

const umzug = new Umzug({
  storage: new HyperStorage({
    hyper,
    doc: {
      type: 'umzug-scripts',
      createdField: 'created_at',
      updatedField: 'updated_at'
    }
  }),
  ...
})
```

### Passing `hyper-connect` to your `Umzug` scripts

Chances are you are running scripts against a Hyper Data Service or
[Hyper Cloud Application Services](https://docs.hyper.io/applications). You can
use [Umzug context](https://github.com/sequelize/umzug#minimal-example) to pass
an instance of `hyper-connect` to each script ran.

By using `context` to _inject_ `hyper-connect`, this will make your scripts
easier to unit test.

```ts
import { Umzug } from 'umzug'
import { HyperStorage } from 'umzug-storage-adapter'
import { connect } from 'hyper-connect'

const hyper = connect(process.env.HYPER)

const umzug = new Umzug({
  storage: new HyperStorage({ hyper }),
  context: { hyper }
  ...
})

// then in your script:
const migration = {
  name: '01-awesome-migration',
  async up ({ context: { hyper }}) {
    ... // use hyper-connect to perform migration
  },
  async down ({ context: { hyper }}) {
    ... // use hyper-connect to perform rollback
  }
}
```

---

## License

Apache 2.0
