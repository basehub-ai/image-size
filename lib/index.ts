import Queue from 'queue'
import type { imageType } from './types/index'
import { typeHandlers } from './types/index'
import { detector } from './detector'
import type { ISizeCalculationResult } from './types/interface'

// This queue is for async `fs` operations, to avoid reaching file-descriptor limits
const queue = new Queue({ concurrency: 100, autostart: true })

type Options = {
  disabledFS: boolean
  disabledTypes: imageType[]
}

const globalOptions: Options = {
  disabledFS: false,
  disabledTypes: [],
}

/**
 * Return size information based on an Uint8Array
 *
 * @param {Uint8Array} input
 * @param {String} filepath
 * @returns {Object}
 */
function lookup(input: Uint8Array, filepath?: string): ISizeCalculationResult {
  // detect the file type.. don't rely on the extension
  const type = detector(input)

  if (typeof type !== 'undefined') {
    if (globalOptions.disabledTypes.indexOf(type) > -1) {
      throw new TypeError('disabled file type: ' + type)
    }

    // find an appropriate handler for this file type
    if (type in typeHandlers) {
      const size = typeHandlers[type].calculate(input, filepath)
      if (size !== undefined) {
        size.type = size.type ?? type
        return size
      }
    }
  }

  // throw up, if we don't understand the file
  throw new TypeError(
    'unsupported file type: ' + type + ' (file: ' + filepath + ')'
  )
}

// eslint-disable-next-line @typescript-eslint/no-use-before-define
module.exports = exports = imageSize // backwards compatibility

export default imageSize
export function imageSize(input: Uint8Array): ISizeCalculationResult

/**
 * @param {Uint8Array} input - Uint8Array or relative/absolute path of the image file
 */
export function imageSize(
  input: Uint8Array
): ISizeCalculationResult | void {
  // Handle Uint8Array input
  if (input instanceof Uint8Array) {
    return lookup(input)
  }

  throw new TypeError('invalid invocation. input should be a Uint8Array')
}

export const disableTypes = (types: imageType[]): void => {
  globalOptions.disabledTypes = types
}
export const setConcurrency = (c: number): void => {
  queue.concurrency = c
}
export const types = Object.keys(typeHandlers)
