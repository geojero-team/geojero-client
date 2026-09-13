import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import { t } from '../i18n'
import { api } from '../lib/api'
import {
  UploadImageError,
  makePreviewUrl,
  releasePreviewUrl,
  resizeForUpload,
} from '../lib/resizeForUpload'
import styles from './VisitorPhotoUploadSheet.module.css'

/**
 * 내 사진 올리기 시트 — Figma 02-1 v2 `268:518`.
 *
 * 한 번에 **한 장**, 캡션은 선택이고 **200자까지**입니다(기준문서 §6). 「+」는 사진 바꾸기입니다.
 * 호출부가 세션을 확인한 뒤에만 이 시트를 엽니다.
 *
 * 사진을 고르는 순간 줄여 둡니다(resizeForUpload) — 못 여는 사진이면 캡션을 쓰기 전에 알려야 합니다.
 * 올리기에 실패해도 **시트·사진·캡션을 그대로 둡니다.** 401만 예외로 호출부가 로그인 시트로 바꿉니다
 * (카카오 로그인은 페이지를 옮기므로 입력을 지킬 방법이 없습니다).
 *
 * Figma에는 활성 상태 하나만 그려져 있어 사진 없음(비활성)·올리는 중·실패 모습은 여기서 정했습니다.
 */

/** 캡션 최대 길이. maxLength는 UTF-16 단위로 세서 서버(코드포인트)보다 엄격합니다 — 넘쳐 보낼 일이 없습니다. */
const CAPTION_MAX_LENGTH = 200

/** 상태코드로 먼저 가르고, 400은 code가 있으면 캡션 초과만 따로 말합니다. */
function uploadErrorKey(error) {
  if (error.status === 413) return 'errTooLarge'
  if (error.status === 415) return 'errUnreadable'
  if (error.status === 400) return error.code === 'CAPTION_TOO_LONG' ? 'errCaption' : 'errUnreadable'
  return 'errNetwork'
}

export default function VisitorPhotoUploadSheet({
  poiId,
  spotName,
  onClose,
  onUploaded,
  onSessionExpired,
}) {
  // { blob, url } — 줄인 JPEG와 그 미리보기 주소
  const [picked, setPicked] = useState(null)
  const [preparing, setPreparing] = useState(false)
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // 고를 때마다 늘립니다. 줄이기가 늦게 끝난 앞 사진은 번호가 달라 버립니다 —
  // 앞 사진이 이기면 미리보기가 되돌아가고, 버린 사진이 올라갑니다.
  const pickSeq = useRef(0)

  // 사진을 바꾸거나 시트를 닫으면 앞 미리보기 주소를 돌려줍니다.
  useEffect(() => {
    if (!picked) return undefined
    return () => releasePreviewUrl(picked.url)
  }, [picked])

  const onPick = (event) => {
    const file = event.target.files?.[0]
    // 같은 파일을 다시 골라도 change가 오게 비웁니다.
    event.target.value = ''
    if (!file) return
    const seq = ++pickSeq.current
    const latest = () => seq === pickSeq.current
    setError(null)
    setPreparing(true)
    resizeForUpload(file)
      .then((blob) => {
        if (latest()) setPicked({ blob, url: makePreviewUrl(blob) })
      })
      .catch((reason) => {
        if (!latest()) return
        setError(
          reason instanceof UploadImageError && reason.reason === 'TOO_LARGE'
            ? 'errTooLarge'
            : 'errUnreadable',
        )
      })
      .finally(() => {
        if (latest()) setPreparing(false)
      })
  }

  const submit = () => {
    setSubmitting(true)
    setError(null)
    api.uploadVisitorPhoto(poiId, picked.blob, caption).then(onUploaded, (failure) => {
      if (failure.status === 401) {
        onSessionExpired()
        return
      }
      setError(uploadErrorKey(failure))
      setSubmitting(false)
    })
  }

  // 올리는 중에는 닫지 않습니다 — 닫아도 요청은 가고, 결과를 알릴 자리가 없어집니다.
  const close = () => {
    if (!submitting) onClose()
  }

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={close}
        aria-label={t('common.close')}
      />

      <section className={styles.sheet} role="dialog" aria-label={t('visitorPhotoUpload.sheetAria')}>
        <div className={styles.handleRow}>
          <span className={styles.handle} aria-hidden="true" />
        </div>

        <h2 className={styles.title}>{t('visitorPhotoUpload.title', { name: spotName })}</h2>

        {/* picker(268:522) — 선택한 사진(268:523) + 「+」(268:525). 사진이 없으면 「+」만 둡니다. */}
        <div className={styles.picker}>
          {picked && (
            <img className={styles.preview} src={picked.url} alt={t('visitorPhotoUpload.preview')} />
          )}
          <label className={styles.pickTile}>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
            {/* 파일 입력을 타일 위에 투명하게 덮습니다 — 눌러서 열리고 키보드로도 닿습니다. */}
            <input
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={onPick}
              disabled={submitting}
              aria-label={t(picked ? 'visitorPhotoUpload.change' : 'visitorPhotoUpload.pick')}
            />
          </label>
        </div>

        {/* caption-field(268:527) — 350×72, 두 줄 높이 */}
        <textarea
          className={styles.caption}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder={t('visitorPhotoUpload.captionPlaceholder')}
          maxLength={CAPTION_MAX_LENGTH}
          rows={2}
          disabled={submitting}
        />

        <p className={styles.notice}>{t('visitorPhotoUpload.notice')}</p>

        {error && (
          <p className={styles.error} role="alert">
            {t(`visitorPhotoUpload.${error}`, { max: CAPTION_MAX_LENGTH })}
          </p>
        )}

        <Button
          onClick={submit}
          disabled={!picked || preparing || submitting}
          data-api="POST /api/pois/{id}/visitor-photos"
        >
          {t(submitting ? 'visitorPhotoUpload.submitting' : 'visitorPhotoUpload.submit')}
        </Button>
      </section>
    </>
  )
}
