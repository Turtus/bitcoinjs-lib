import { Network } from './networks'
import * as NETWORKS from './networks'
import * as types from './types'
const ecc = require('tiny-secp256k1')
const randomBytes = require('randombytes')
const typeforce = require('typeforce')
const wif = require('wif')

const isOptions = typeforce.maybe(typeforce.compile({
  compressed: types.maybe(types.Boolean),
  network: types.maybe(types.Network)
}))

interface ECPairOptions {
  compressed?: boolean
  network?: Network
  rng?(arg0: Buffer): Buffer
}

export interface ECPairInterface {
  compressed: boolean
  network: Network
  privateKey: Buffer | null
  publicKey: Buffer | null
  toWIF(): string
  sign(hash: Buffer): Buffer
  verify(hash: Buffer, signature: Buffer): Buffer
  getPublicKey?(): Buffer
}

class ECPair implements ECPairInterface {
  compressed: boolean
  network: Network
  private __d: Buffer | null
  private __Q: Buffer | null
  constructor (d: Buffer | null, Q: Buffer | null, options: ECPairOptions) {
    if (options === undefined) options = {}
    this.compressed = options.compressed === undefined ? true : options.compressed
    this.network = options.network || NETWORKS.bitcoin

    this.__d = d || null
    this.__Q = null
    if (Q) this.__Q = ecc.pointCompress(Q, this.compressed)
  }

  get privateKey (): Buffer | null {
    return this.__d
  }

  get publicKey (): Buffer | null {
    if (!this.__Q) this.__Q = ecc.pointFromScalar(this.__d, this.compressed)
    return this.__Q
  }

  toWIF (): string {
    if (!this.__d) throw new Error('Missing private key')
    return wif.encode(this.network.wif, this.__d, this.compressed)
  }

  sign (hash: Buffer): Buffer {
    if (!this.__d) throw new Error('Missing private key')
    return ecc.sign(hash, this.__d)
  }

  verify (hash: Buffer, signature: Buffer): Buffer {
    return ecc.verify(hash, this.publicKey, signature)
  }
}

function fromPrivateKey (buffer: Buffer, options?: ECPairOptions): ECPair {
  typeforce(types.Buffer256bit, buffer)
  if (!ecc.isPrivate(buffer)) throw new TypeError('Private key not in range [1, n)')
  typeforce(isOptions, options)

  return new ECPair(buffer, null, <ECPairOptions>options)
}

function fromPublicKey (buffer: Buffer, options?: ECPairOptions): ECPair {
  typeforce(ecc.isPoint, buffer)
  typeforce(isOptions, options)
  return new ECPair(null, buffer, <ECPairOptions>options)
}

function fromWIF (string: string, network: Network | Array<Network>): ECPair {
  const decoded = wif.decode(string)
  const version = decoded.version

  // list of networks?
  if (types.Array(network)) {
    network = <Network>(<Array<Network>>network).filter(function (x: Network) {
      return version === x.wif
    }).pop()

    if (!network) throw new Error('Unknown network version')

  // otherwise, assume a network object (or default to bitcoin)
  } else {
    network = network || NETWORKS.bitcoin

    if (version !== (<Network>network).wif) throw new Error('Invalid network version')
  }

  return fromPrivateKey(decoded.privateKey, {
    compressed: decoded.compressed,
    network: <Network>network
  })
}

function makeRandom (options?: ECPairOptions): ECPair {
  typeforce(isOptions, options)
  if (options === undefined) options = {}
  const rng = options.rng || randomBytes

  let d
  do {
    d = rng(32)
    typeforce(types.Buffer256bit, d)
  } while (!ecc.isPrivate(d))

  return fromPrivateKey(d, options)
}

export {
  makeRandom,
  fromPrivateKey,
  fromPublicKey,
  fromWIF
}