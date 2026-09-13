import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LoginSheet from './LoginSheet'
import ScreenPortal from './ScreenPortal'
import VisitorPhotoUploadSheet from './VisitorPhotoUploadSheet'
import VisitorPhotoViewer from './VisitorPhotoViewer'
import { t } from '../i18n'
import { api, beginKakaoLogin, beginKakaoLoginTo } from '../lib/api'
import { clearSession, getToken } from '../lib/session'
import { useDragScroll } from '../lib/useDragScroll'
import styles from './VisitorPhotos.module.css'

/**
 * 방문자 사진 — Figma 02-2 `446:1160`의 `484:212`(섹션) · `268:499`(뷰어) · `268:518`(올리기 시트).
 *
 * **TourAPI 사진과 섞지 않습니다.** 위 hero 캐러셀은 `spot.photos`(TourAPI, 출처표시)이고
 * 여기는 올린 사람의 사진입니다. 호출(`api.getVisitorPhotos`)도 상태도 따로 둡니다.
 *
 * 화면 상태 — 0장과 실패를 반드시 가릅니다(절대규칙 3, 「운행 없음 ≠ 시각 미상」과 같은 구조).
 *   불러오는 중   제목 + 안내
 *   실패         제목 + 실패 문구 + 다시 시도. 빈 상태 문구를 쓰지 않습니다
 *   0장          제목 + 올리기 타일 + 빈 사진 칸 3개 — 02-2 스팟 상세 그림 그대로입니다(사용자 결정, 02-1 빈 상태 카드 `268:531`은 쓰지 않음).
 *                「더보기」는 열 사진이 없어 숨깁니다. 처음엔 17곳 전부 이 화면입니다
 *   N장          제목 + 「더보기」 + 올리기 타일 + 사진 타일
 *
 * 보기 — 타일을 누르면 **바로 그 사진의 뷰어**, 「더보기」는 뷰어를 1장부터 엽니다(02-2 `485:213`).
 * 02-1의 캡션 카드(`268:478`)는 02-2에서 지웠습니다 — 캡션은 뷰어에서 읽습니다.
 * 뷰어의 작성자 줄은 날짜만 적습니다 — 서버가 작성자를 내려주지 않아(표기 규칙 미정) 아바타·「여행자 A」를 그리지 않습니다.
 * 「신고」는 그리지 않고, 내 사진일 때만 뷰어 캡션 아래 「삭제」를 둡니다(본인 삭제만).
 *
 * 올리기 — 두 자리에서 열립니다.
 *   `/spots/:id`(uploadInUrl)  누르면 주소에 `?upload=1`을 붙입니다. 카카오 로그인은 페이지를 옮기므로
 *                              돌아올 주소에 그 뜻을 실어 두면 복귀 뒤 시트가 다시 열립니다
 *   지도 스팟 시트(full)        주소를 바꾸지 않고 그 자리에서 엽니다. 비로그인이면 돌아올 곳을
 *                              `/spots/{id}?upload=1`로 맡깁니다 — 지도로는 돌아오지 않습니다(기준문서 §6)
 * 토큰이 있어도 **시트를 열기 전에 `/api/me`로 세션을 확인합니다.** 재배포마다 토큰이 무효가 되는데
 * (SESSION_SECRET 미주입), 확인 없이 열면 사진·캡션을 다 넣은 뒤 401로 입력을 잃습니다.
 *
 * 뷰어·올리기 시트·로그인 시트는 `ScreenPortal`로 화면 프레임에 그립니다 — 지도 시트 안에 두면 갇힙니다.
 */

/** 내 사진 「삭제」 — 뷰어 캡션 아래. 바로 지우지 않고 그 자리에서 한 번 더 묻습니다(오버레이 없이). */
function DeleteAction({ confirming, busy, onAsk, onConfirm, onCancel }) {
  return (
    <div className={styles.deleteDark}>
      {confirming ? (
        <div className={styles.confirm}>
          <span className={styles.question}>{t('visitorPhotos.deleteConfirm')}</span>
          <button type="button" className={styles.action} onClick={onConfirm} disabled={busy}>
            {t('visitorPhotos.delete')}
          </button>
          <button type="button" className={styles.action} onClick={onCancel} disabled={busy}>
            {t('visitorPhotos.deleteCancel')}
          </button>
        </div>
      ) : (
        <button type="button" className={styles.action} onClick={onAsk}>
          {t('visitorPhotos.delete')}
        </button>
      )}
    </div>
  )
}

/**
 * @param poiId        서버 poi_id
 * @param spotName     올리기 시트 제목에 들어갈 이름(shortName) — 「바람의언덕에서 찍은 사진」
 * @param uploadInUrl  `/spots/:id` 화면이면 참. 지도 시트에서는 주지 않습니다
 */
export default function VisitorPhotos({ poiId, spotName, uploadInUrl = false }) {
  const headingId = useId()
  const stripRef = useRef(null)
  const dragHandlers = useDragScroll(stripRef)

  const [list, setList] = useState({ status: 'loading', photos: [] })
  const [viewerIndex, setViewerIndex] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // 섹션 아래 한 줄 — 'uploaded' | 'deleteFailed'
  const [notice, setNotice] = useState(null)

  /* 상태는 콜백에서만 바꿉니다 — 이펙트 본문에서 곧바로 setState 하면
     react-hooks/set-state-in-effect 에 걸립니다(MyPlansPage 와 같은 방식). */
  const load = useCallback(
    () =>
      api
        .getVisitorPhotos(poiId)
        .then((res) => setList({ status: 'ready', photos: res.photos ?? [] }))
        .catch(() => setList({ status: 'error', photos: [] })),
    [poiId],
  )

  useEffect(() => {
    load()
  }, [load])

  const retry = () => {
    setList({ status: 'loading', photos: [] })
    load()
  }

  /* ── 올리기 진입 ─────────────────────────────────────────────────────── */
  const [searchParams, setSearchParams] = useSearchParams()
  const [inlineRequested, setInlineRequested] = useState(false)
  // 'idle'(아직 안 물어봄) | 'ok'(세션 유효) | 'expired'(401 — 세션을 지웠음)
  const [sessionCheck, setSessionCheck] = useState('idle')
  const requested = uploadInUrl ? searchParams.get('upload') === '1' : inlineRequested
  const hasToken = Boolean(getToken())

  useEffect(() => {
    if (!requested || !hasToken || sessionCheck !== 'idle') return
    let cancelled = false
    api
      .me()
      .then(() => {
        if (!cancelled) setSessionCheck('ok')
      })
      .catch((error) => {
        if (cancelled) return
        if (error.status === 401 || error.status === 403) {
          clearSession()
          setSessionCheck('expired')
          return
        }
        // 서버 장애·타임아웃은 세션 문제가 아닙니다. 시트를 열고, 올리기에서 실패를 말합니다 —
        // 시트는 페이지를 옮기지 않으므로 그때는 입력이 남습니다.
        setSessionCheck('ok')
      })
    return () => {
      cancelled = true
    }
  }, [requested, hasToken, sessionCheck])

  // 로그인 시트 → 세션 확인 중(아무것도 안 띄움) → 올리기 시트
  const phase = !requested ? null : !hasToken ? 'login' : sessionCheck === 'ok' ? 'sheet' : null

  const setUploadParam = (on) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (on) next.set('upload', '1')
        else next.delete('upload')
        return next
      },
      { replace: true },
    )

  const requestUpload = () => {
    setNotice(null)
    if (uploadInUrl) setUploadParam(true)
    else setInlineRequested(true)
  }

  const cancelUpload = () => {
    setSessionCheck('idle')
    if (uploadInUrl) setUploadParam(false)
    else setInlineRequested(false)
  }

  const login = () =>
    uploadInUrl ? beginKakaoLogin() : beginKakaoLoginTo(`/spots/${poiId}?upload=1`)

  const onUploaded = () => {
    cancelUpload()
    setNotice('uploaded')
    load()
  }

  // 올리는 중 401 — 세션을 지우면 hasToken이 거짓이 되어 같은 자리에 로그인 시트가 뜹니다.
  const onSessionExpired = () => {
    clearSession()
    setSessionCheck('expired')
  }

  /* ── 보기 · 삭제 ─────────────────────────────────────────────────────── */
  const photos = list.photos
  const viewing = viewerIndex != null ? (photos[viewerIndex] ?? null) : null

  const showInViewer = (index) => {
    setViewerIndex(index)
    setConfirmingId(null)
  }

  const closeViewer = () => {
    setViewerIndex(null)
    setConfirmingId(null)
  }

  const confirmDelete = (photoId) => {
    setDeleting(true)
    api
      .deleteVisitorPhoto(photoId)
      .then(() => setViewerIndex(null))
      .catch((error) => {
        // 404는 이미 없다는 뜻이라 목록만 새로 받습니다. 그 밖의 실패는 알립니다 —
        // 뷰어를 닫아야 섹션의 실패 문구가 보입니다.
        setViewerIndex(null)
        if (error.status === 404) return
        if (error.status === 401) clearSession()
        setNotice('deleteFailed')
      })
      .then(load)
      .finally(() => {
        setDeleting(false)
        setConfirmingId(null)
      })
  }

  const deleteAction = (photo) =>
    photo.isMine && (
      <DeleteAction
        confirming={confirmingId === photo.photoId}
        busy={deleting}
        onAsk={() => {
          setConfirmingId(photo.photoId)
          setNotice(null)
        }}
        onConfirm={() => confirmDelete(photo.photoId)}
        onCancel={() => setConfirmingId(null)}
      />
    )

  return (
    <section
      className={styles.section}
      aria-labelledby={headingId}
      data-api="GET /api/pois/{id}/visitor-photos"
    >
      <div className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          {t('visitorPhotos.title')}
        </h2>
        {photos.length > 0 && (
          <button
            type="button"
            className={styles.link}
            aria-label={t('visitorPhotos.moreAria')}
            onClick={() => showInViewer(0)}
          >
            {t('visitorPhotos.more')}
          </button>
        )}
      </div>

      {list.status === 'loading' ? (
        <p className={styles.pending}>{t('visitorPhotos.loading')}</p>
      ) : list.status === 'error' ? (
        <div className={styles.card}>
          <p className={styles.cardText}>{t('visitorPhotos.loadFailed')}</p>
          <button type="button" className={styles.link} onClick={retry}>
            {t('visitorPhotos.retry')}
          </button>
        </div>
      ) : (
        <div ref={stripRef} className={styles.strip} {...dragHandlers}>
          <button type="button" className={styles.uploadTile} onClick={requestUpload}>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
            <span className={styles.uploadLabel}>{t('visitorPhotos.uploadTile')}</span>
          </button>

          {photos.length === 0
            ? /* 0장 — 사진 칸 자리(484:220~224) 셋. 누를 사진이 없어 버튼이 아닙니다. */
              [0, 1, 2].map((slot) => (
                <div key={slot} className={`${styles.tile} ${styles.slot}`} aria-hidden="true">
                  {t('visitorPhotos.slot')}
                </div>
              ))
            : photos.map((photo, index) => (
                <button
                  key={photo.photoId}
                  type="button"
                  className={styles.tile}
                  aria-label={t('visitorPhotos.tileAria', { n: index + 1 })}
                  onClick={() => showInViewer(index)}
                >
                  <img
                    className={styles.tileImg}
                    src={photo.imageUrl}
                    alt=""
                    draggable="false"
                    loading="lazy"
                  />
                </button>
              ))}
        </div>
      )}

      {notice && (
        <p className={styles.notice} role="status">
          {t(`visitorPhotos.${notice}`)}
        </p>
      )}

      {viewing && (
        <ScreenPortal>
          <VisitorPhotoViewer
            photo={viewing}
            index={viewerIndex}
            total={photos.length}
            onPrev={() => showInViewer(viewerIndex - 1)}
            onNext={() => showInViewer(viewerIndex + 1)}
            onClose={closeViewer}
            actions={deleteAction(viewing)}
          />
        </ScreenPortal>
      )}

      {phase === 'login' && (
        <ScreenPortal>
          <LoginSheet
            open
            onClose={cancelUpload}
            onLogin={login}
            title={t('visitorPhotos.loginTitle')}
          />
        </ScreenPortal>
      )}

      {phase === 'sheet' && (
        <ScreenPortal>
          <VisitorPhotoUploadSheet
            poiId={poiId}
            spotName={spotName}
            onClose={cancelUpload}
            onUploaded={onUploaded}
            onSessionExpired={onSessionExpired}
          />
        </ScreenPortal>
      )}
    </section>
  )
}
