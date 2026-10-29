import { constants } from 'node:fs'
import { open } from 'node:fs/promises'

/** Validate and read the same descriptor; reject links and cap even a growing file. */
export async function readOperatorInput(path: string): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const info = await file.stat()
    if (!info.isFile() || info.nlink !== 1 || info.size > 4096 || (info.mode & 0o077) !== 0 ||
        (process.getuid && info.uid !== process.getuid())) {
      throw new Error('Operator input must be an owned private regular file, at most 4KiB')
    }
    const buffer = Buffer.alloc(4097)
    let size = 0
    while (size < buffer.length) {
      const result = await file.read(buffer, size, buffer.length - size, null)
      if (!result.bytesRead) break
      size += result.bytesRead
    }
    if (size > 4096) throw new Error('Operator input exceeds 4KiB')
    return buffer.subarray(0, size).toString('utf8')
  } finally {
    await file.close()
  }
}
