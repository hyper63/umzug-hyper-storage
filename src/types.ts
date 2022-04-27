import type { Hyper } from 'hyper-connect'

export interface HyperStorageDocArgs {
  id?: string
  type?: string
  typeField?: string
  createdField?: string
  updatedField?: string
}

export interface HyperStorageArgs {
  hyper: Hyper
  doc?: HyperStorageDocArgs
}

export interface HyperStorageDoc {
  _id: string
  migrations: string[]
}
