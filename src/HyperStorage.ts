import type { Hyper, NotOkResult } from 'hyper-connect'
import type { MigrationParams, UmzugStorage } from 'umzug'

import type { HyperStorageArgs, HyperStorageDoc } from './types'

export class FromHyperError extends Error {
  constructor ({ msg }: { msg?: string }, _default = 'An Error Occurred') {
    super(msg || _default)
  }
}

export class HyperStorage implements UmzugStorage {
  private readonly hyper: Hyper

  private readonly docId: string
  private readonly docType: string
  private readonly docTypeField: string
  private readonly createdField: string
  private readonly updatedField: string

  constructor (args: HyperStorageArgs) {
    // This is covered, but c8 isn't catching it *shrugs*
    /* c8 ignore start */
    if (!args.hyper) {
      throw new Error('hyper is a required option and must be an instance of hyper-connect')
    }
    /* c8 ignore stop */

    args.doc = args.doc ?? {}
    const { hyper, doc: { id, type, typeField, createdField, updatedField } = {} } = args

    // hyper connect instance
    this.hyper = hyper

    this.docType = type ?? '__scripts'
    this.docId = id ?? 'hyper-scripts-meta'
    this.docTypeField = typeField ?? 'type'
    this.updatedField = updatedField ?? 'updatedAt'
    this.createdField = createdField ?? 'createdAt'
  }

  /**
   * Logs migration to be considered as executed.
   */
  async logMigration ({ name }: MigrationParams<unknown>) {
    try {
      const doc = await this._findOrCreateMigrationDoc()
      doc.migrations = [...doc.migrations, name]
      await this._updateMigrationDoc(doc)
    } catch (err) {
      throw new Error(`Could not log migration ${name}: ${(err as Error).message}`)
    }
  }

  /**
   * Unlogs migration (makes it to be considered as pending).
   */
  async unlogMigration ({ name }: MigrationParams<unknown>) {
    try {
      const doc = await this._findOrCreateMigrationDoc()
      // remove migration from array of executed migrations
      const idx = doc.migrations.indexOf(name)
      doc.migrations = [...doc.migrations]
      doc.migrations.splice(idx, 1)
      await this._updateMigrationDoc(doc)
    } catch (err) {
      throw new Error(`Could not unlog migration ${name}: ${(err as Error).message}`)
    }
  }

  /**
   * Gets list of executed migrations.
   */
  async executed () {
    const doc = await this._findOrCreateMigrationDoc()
    return doc.migrations
  }

  private async _findOrCreateMigrationDoc (): Promise<HyperStorageDoc> {
    const res = await this.hyper.data.get(this.docId)

    let doc: HyperStorageDoc | undefined
    // check for strict equality since could be actual doc or { ok: false, ... }
    if (res.ok === false) {
      if (res.status !== 404) {
        throw new FromHyperError(res, 'Could not retrieve migration doc')
      }
      doc = undefined
    } else {
      doc = res as HyperStorageDoc
    }

    // Found
    if (doc) {
      return doc
    }

    // #### Create Migration Doc ####
    const newDoc: HyperStorageDoc = {
      _id: this.docId,
      [this.docTypeField]: this.docType,
      migrations: [],
      [this.createdField]: new Date(),
      [this.updatedField]: new Date()
    }

    let newDocRes = await this.hyper.data.add(newDoc)

    if (!newDocRes.ok) {
      newDocRes = newDocRes as NotOkResult
      if (newDocRes.status && newDocRes.status >= 400) {
        throw new FromHyperError(res, 'Could not create migration doc')
      }
    }

    return newDoc
  }

  private async _updateMigrationDoc (doc: HyperStorageDoc): Promise<HyperStorageDoc> {
    const update = {
      ...doc,
      [this.updatedField]: new Date()
    }
    const res = await this.hyper.data.update(doc._id, update)

    if (!res.ok) {
      throw new FromHyperError(res, 'Could not update migration doc')
    }

    return update
  }
}
