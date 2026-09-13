/**
 * 방문자 사진을 올리기 전에 브라우저에서 줄여 JPEG로 다시 만듭니다.
 *
 * **왜 클라에서도 하나**: 서버 업로드 상한이 스프링 기본 1MB이고 그 설정은 바꾸지 않기로 했습니다
 * (기준문서 §6 기술 메모 「방문자 사진」). 폰 원본은 대개 그보다 커서 그대로 보내면 413이 납니다.
 * canvas로 다시 그리면 EXIF(촬영 좌표 포함)도 따라가지 않습니다.
 *
 * **이건 보조 수단입니다.** API를 직접 부르면 이 과정을 건너뛸 수 있으므로 위치정보 제거와
 * 회전 적용은 서버가 항상 다시 합니다. 여기서 빠뜨려도 서버가 지키고, 서버가 빠뜨리면 여기로는 못 막습니다.
 *
 * **브라우저 전용 API(createImageBitmap · canvas · object URL)는 이 파일 하나에 가둡니다.**
 * 앱으로 낼 때 바꿀 자리가 여기 하나여야 합니다(기준문서 §0 「앱에서 다시 만들어야 하는 방식으로 짓지 않는다」).
 */

/** 긴 변 목표(px). 이보다 작은 사진은 키우지 않습니다. */
export const MAX_LONG_EDGE = 1600

/** 처음 시도하는 JPEG 품질과, 1MB를 넘을 때 한 단계씩 내려갈 폭·바닥. */
export const JPEG_QUALITY = 0.8
export const JPEG_QUALITY_STEP = 0.1
export const MIN_JPEG_QUALITY = 0.4

/** 결과가 이보다 **작아야** 보냅니다 — 서버 multipart 기본 상한 1MB. */
export const TARGET_MAX_BYTES = 1024 * 1024

/** reason: 'UNREADABLE'(디코드·인코딩 실패) | 'TOO_LARGE'(가장 낮은 품질에서도 1MB 이상) */
export class UploadImageError extends Error {
  constructor(reason) {
    super(reason)
    this.name = 'UploadImageError'
    this.reason = reason
  }
}

/** 긴 변을 MAX_LONG_EDGE에 맞춰 비율대로 줄입니다. 이미 작으면 그대로. */
export function targetSize(width, height) {
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * EXIF 방향을 **명시적으로** 픽셀에 적용해 디코드합니다. canvas로 다시 그리면 방향 태그가
 * 사라지므로, 여기서 적용하지 않은 채 지우면 서버도 되돌릴 수 없어 사진이 누운 채 저장됩니다.
 */
async function decodeInBrowser(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() }
}

/** 목표 크기 캔버스에 흰 바탕을 깔고 그립니다 — 투명 PNG가 JPEG에서 검게 나오지 않게. */
function encodeInBrowser(source, width, height, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * @param file   사용자가 고른 파일
 * @param deps   테스트용 주입 자리 — { decode(file), encode(source, w, h, quality) }
 * @returns      TARGET_MAX_BYTES 미만의 JPEG Blob
 * @throws       UploadImageError
 */
export async function resizeForUpload(file, { decode = decodeInBrowser, encode = encodeInBrowser } = {}) {
  let image
  try {
    image = await decode(file)
  } catch {
    // Chrome이 HEIC를 못 여는 경우 등 — 무엇이 문제인지보다 "이 사진은 못 올린다"가 사용자에게 필요한 답입니다.
    throw new UploadImageError('UNREADABLE')
  }

  try {
    const { width, height } = targetSize(image.width, image.height)
    // 0.1씩 빼면 부동소수 오차(0.7000000000000001)가 쌓이므로 백분율 정수로 셉니다.
    const step = Math.round(JPEG_QUALITY_STEP * 100)
    for (let percent = Math.round(JPEG_QUALITY * 100); percent >= Math.round(MIN_JPEG_QUALITY * 100); percent -= step) {
      const blob = await encode(image.source, width, height, percent / 100)
      if (!blob) throw new UploadImageError('UNREADABLE')
      if (blob.size < TARGET_MAX_BYTES) return blob
    }
    throw new UploadImageError('TOO_LARGE')
  } finally {
    image.close?.()
  }
}

/** 시트 미리보기용 주소. 다 쓰면 releasePreviewUrl로 돌려줘야 메모리가 풀립니다. */
export function makePreviewUrl(blob) {
  return URL.createObjectURL(blob)
}

export function releasePreviewUrl(url) {
  URL.revokeObjectURL(url)
}
