#!/usr/bin/env zx

/* global $ */
import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { Umzug } from 'umzug'
import { connect } from 'hyper-connect'

import { HyperStorage } from '../dist/index.js'

await $`curl https://hyperland.s3.amazonaws.com/hyper -o ./hyper-nano && chmod +x ./hyper-nano`
// database isn't clearing for some reason on purge, so will just destroy the whole folder for now
await $`npx rimraf __hyper__`
const hyper = $`./hyper-nano --experimental --data --purge`

// eslint-disable-next-line
await new Promise(async resolve => {
  for await (const chunk of hyper.stdout) {
    if (chunk.includes('hyper service listening on port')) setTimeout(resolve, 2000)
  }
})

test.after(async () => {
  hyper.kill('SIGINT')
})

test('should run the migration', async () => {
  const hyper = connect('http://localhost:6363/test')
  const migration = {
    name: '00-test-migration',
    async up () {
      await hyper.data.add({
        _id: 'abcd-1234',
        type: 'integration-test'
      })
    },
    async down () {
      await hyper.data.remove('abcd-1234')
    }
  }

  console.log('running test')
  const umzug = new Umzug({
    migrations: [
      migration
    ],
    storage: new HyperStorage({ hyper: connect('http://localhost:6363/test') })
  })

  await umzug.up()

  const { docs } = await hyper.data.list()

  assert.equal(docs.length, 2)

  const [doc, meta] = docs

  assert.equal(doc._id, 'abcd-1234')
  assert.equal(meta._id, 'hyper-scripts-meta')
})

test.run()
