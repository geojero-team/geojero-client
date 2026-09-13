import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_LONG_EDGE,
  TARGET_MAX_BYTES,
  UploadImageError,
  resizeForUpload,
  targetSize,
} from './resizeForUpload'

const MB = 1024 * 1024

function blobOf(bytes) {
  return new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })
}

function fakeDecode(width, height) {
  const close = vi.fn()
  return { decode: vi.fn(async () => ({ width, height, source: 'bitmap', close })), close }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('targetSize — 긴 변 기준 축소, 확대하지 않음', () => {
  it('상수는 결정값 그대로', () => {
    expect(MAX_LONG_EDGE).toBe(1600)
    expect(TARGET_MAX_BYTES).toBe(MB)
  })

  it.each([
    [4032, 3024, 1600, 1200],
    [3024, 4032, 1200, 1600],
    [3000, 2000, 1600, 1067],
    [1000, 800, 1000, 800],
    [1600, 900, 1600, 900],
  ])('%i×%i → %i×%i', (w, h, ew, eh) => {
    expect(targetSize(w, h)).toEqual({ width: ew, height: eh })
  })
})

describe('resizeForUpload', () => {
  it('목표 크기 캔버스에 품질 0.8로 한 번 인코딩하고 비트맵을 닫는다', async () => {
    const { decode, close } = fakeDecode(4032, 3024)
    const small = blobOf(200 * 1024)
    const encode = vi.fn(async () => small)
    const file = new File(['x'], 'a.jpg')

    const result = await resizeForUpload(file, { decode, encode })

    expect(result).toBe(small)
    expect(decode).toHaveBeenCalledWith(file)
    expect(encode).toHaveBeenCalledTimes(1)
    expect(encode).toHaveBeenCalledWith('bitmap', 1600, 1200, 0.8)
    expect(close).toHaveBeenCalled()
  })

  it('작은 사진도 다시 인코딩한다(위치정보를 지우려면 원본을 그대로 보내면 안 된다)', async () => {
    const { decode } = fakeDecode(800, 600)
    const encode = vi.fn(async () => blobOf(10))

    await resizeForUpload(new File(['x'], 'a.jpg'), { decode, encode })

    expect(encode).toHaveBeenCalledWith('bitmap', 800, 600, 0.8)
  })

  it('1MB 이상이면 품질을 단계적으로 낮춰 1MB 미만이 되는 첫 결과를 쓴다', async () => {
    const { decode } = fakeDecode(4032, 3024)
    const sizes = { 0.8: 1.3 * MB, 0.7: MB, 0.6: 0.9 * MB }
    const encode = vi.fn(async (source, w, h, quality) => blobOf(Math.round(sizes[quality])))

    const result = await resizeForUpload(new File(['x'], 'a.jpg'), { decode, encode })

    expect(encode.mock.calls.map((call) => call[3])).toEqual([0.8, 0.7, 0.6])
    expect(result.size).toBe(Math.round(0.9 * MB))
  })

  it('가장 낮은 품질에서도 1MB 이상이면 너무 큰 사진 오류', async () => {
    const { decode, close } = fakeDecode(4032, 3024)
    const encode = vi.fn(async () => blobOf(MB))

    const error = await resizeForUpload(new File(['x'], 'a.jpg'), { decode, encode }).catch((e) => e)

    expect(error).toBeInstanceOf(UploadImageError)
    expect(error.reason).toBe('TOO_LARGE')
    expect(encode.mock.calls.map((call) => call[3])).toEqual([0.8, 0.7, 0.6, 0.5, 0.4])
    expect(close).toHaveBeenCalled()
  })

  it('디코드에 실패하면 올릴 수 없는 사진 오류', async () => {
    const decode = vi.fn(async () => {
      throw new DOMException('The source image could not be decoded.', 'InvalidStateError')
    })
    const encode = vi.fn()

    const error = await resizeForUpload(new File(['x'], 'a.heic'), { decode, encode }).catch((e) => e)

    expect(error).toBeInstanceOf(UploadImageError)
    expect(error.reason).toBe('UNREADABLE')
    expect(encode).not.toHaveBeenCalled()
  })

  it('인코딩 결과가 없으면(toBlob null) 올릴 수 없는 사진 오류', async () => {
    const { decode } = fakeDecode(800, 600)
    const encode = vi.fn(async () => null)

    const error = await resizeForUpload(new File(['x'], 'a.jpg'), { decode, encode }).catch((e) => e)

    expect(error).toBeInstanceOf(UploadImageError)
    expect(error.reason).toBe('UNREADABLE')
  })

  it('브라우저 디코드는 EXIF 방향을 픽셀에 적용하도록 옵션을 명시한다', async () => {
    const bitmap = { width: 10, height: 5, close: vi.fn() }
    const createImageBitmap = vi.fn(async () => bitmap)
    vi.stubGlobal('createImageBitmap', createImageBitmap)
    const encode = vi.fn(async () => blobOf(10))
    const file = new File(['x'], 'a.jpg')

    await resizeForUpload(file, { encode })

    expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' })
    expect(encode).toHaveBeenCalledWith(bitmap, 10, 5, 0.8)
    expect(bitmap.close).toHaveBeenCalled()
  })
})
