import { test } from 'uvu'
import * as assert from 'uvu/assert'
import sinon from 'sinon'
import type { Hyper } from 'hyper-connect'
import type { MigrationParams } from 'umzug'

import { FromHyperError, HyperStorage } from './HyperStorage'

const migrationParams = { name: 'foo' } as MigrationParams<any>

const hyper = {
  data: {
    add: async () => ({ ok: true }),
    get: async () => ({
      ok: true,
      doc: {
        _id: 'hyper-scripts-meta',
        migrations: ['bar']
      }
    }),
    update: async () => ({ ok: true })
  }
} as unknown as Hyper

const hyperStorage = new HyperStorage({ hyper })

test('FromHyperErr - should use the msg', () => {
  assert.equal(new FromHyperError({ msg: 'foo' }).message, 'foo')
})

test('FromHyperErr - should use the default message', () => {
  assert.equal(new FromHyperError({}, 'bar').message, 'bar')
})

test('should require hyper', () => {
  // @ts-ignore
  assert.throws(() => new HyperStorage(), 'hyper is a required option and must be an instance of hyper-connect')
})

test('should support both get and legacy get from hyper', async () => {
  try {
    await hyperStorage.logMigration(migrationParams)
  } catch (err) {
    assert.unreachable(err.message)
  }

  const legacyGetStub = sinon.stub(hyper.data, 'get')
    // @ts-ignore
    .callsFake(async () => ({
      _id: 'hyper-scripts-meta',
      migrations: ['bar']
    }))

  try {
    await hyperStorage.logMigration(migrationParams)
    legacyGetStub.restore()
  } catch (err) {
    assert.unreachable(err.message)
  }
})

test('logMigration - should log the migration', async () => {
  try {
    await hyperStorage.logMigration(migrationParams)
  } catch (err) {
    assert.unreachable(err.message)
  }
})

test('logMigration - should create the migration doc', async () => {
  const getStub = sinon.stub(hyper.data, 'get')
    .callsFake(async () => ({ ok: false, status: 404 }))

  const addStub = sinon.stub(hyper.data, 'add')
    .callsFake(async doc => {
      assert.equal(doc._id, 'hyper-scripts-meta')
      assert.equal(doc.type, '__scripts')
      assert.instance(doc.migrations, Array)
      assert.instance(doc.createdAt, Date)
      assert.instance(doc.updatedAt, Date)

      return { ok: true, id: 'hyper-scripts-meta' }
    })

  try {
    await hyperStorage.logMigration(migrationParams)
    getStub.restore()
    addStub.restore()
  } catch (err) {
    assert.unreachable(err.message)
  }
})

test('logMigration - should append to the migrations array', async () => {
  const updateStub = sinon.stub(hyper.data, 'update')
    .callsFake(async (_id, doc) => {
      assert.equal(doc.migrations.length, 2)
      assert.equal(doc.migrations[1], 'foo')
      return { ok: true, id: 'hyper-scripts-meta' }
    })

  try {
    await hyperStorage.logMigration(migrationParams)
    updateStub.restore()
  } catch (err) {
    assert.unreachable(err.message)
  }
})

test('unlogMigration - should remove from the migrations array', async () => {
  const updateStub = sinon.stub(hyper.data, 'update')
    .callsFake(async (_id, doc) => {
      assert.equal(doc.migrations.length, 0)
      return { ok: true, id: 'hyper-scripts-meta' }
    })

  try {
    await hyperStorage.unlogMigration({ name: 'bar' } as MigrationParams<unknown>)
    updateStub.restore()
  } catch (err) {
    assert.unreachable(err.message)
  }
})

test('executed - should return the migrations array', async () => {
  try {
    const migrations = await hyperStorage.executed()
    assert.instance(migrations, Array)
    assert.equal(migrations[0], 'bar')
  } catch (err) {
    assert.unreachable(err.message)
  }
})

test('* - should bubble if failed to fetch doc', async () => {
  const getStub = sinon.stub(hyper.data, 'get')
    .callsFake(async () => ({ ok: false, status: 409, msg: 'foobar' }))
  try {
    await hyperStorage.logMigration(migrationParams)
    assert.unreachable("should've thrown")
  } catch (err) {
    getStub.restore()
    assert.instance(err, Error)
    assert.match(err.message, 'Could not log migration foo: foobar')
  }
})

test('* - should bubble if failed to create doc', async () => {
  const getStub = sinon.stub(hyper.data, 'get')
    .callsFake(async () => ({ ok: false, status: 404 }))
  const addStub = sinon.stub(hyper.data, 'add')
    .callsFake(async () => ({ ok: false, status: 409 }))
  try {
    await hyperStorage.unlogMigration(migrationParams)
    assert.unreachable("should've thrown")
  } catch (err) {
    getStub.restore()
    addStub.restore()
    assert.instance(err, Error)
    assert.match(err.message, 'Could not unlog migration foo: Could not create migration doc')
  }
})

test('* - should bubble if failed to update doc', async () => {
  const updateStub = sinon.stub(hyper.data, 'update')
    .callsFake(async () => ({ ok: false, status: 409 }))

  try {
    await hyperStorage.logMigration(migrationParams)
    assert.unreachable("should've thrown")
  } catch (err) {
    updateStub.restore()
    assert.instance(err, Error)
    assert.match(err.message, 'Could not log migration foo: Could not update migration doc')
  }
})

test.run()
