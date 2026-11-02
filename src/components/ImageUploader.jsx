import { useRef, useState } from 'react'
import Icon from './Icon'
import { Spinner } from './ui'
import { ACCEPT, uploadImage, removeImage, validateImage, isHeic } from '../lib/images'
import { useAuth } from '../state/auth'
import { cx } from '../lib/utils'

/**
 * Image picker with previews, HEIC conversion, validation, replace and delete.
 *  - single mode:  <ImageUploader value="https://..." onChange={(url) => ...} />
 *  - multiple:     <ImageUploader multiple max={6} value={[urls]} onChange={(urls) => ...} />
 */
export default function ImageUploader({
  value,
  onChange,
  multiple = false,
  max = 6,
  label = 'Add photo',
  shape = 'square',
  compact = false,
}) {
  const { user } = useAuth()
  const inputRef = useRef(null)
  const replaceRef = useRef(null)
  const [busy, setBusy] = useState([]) // [{id, name, heic}]
  const [errors, setErrors] = useState([])
  const [replaceIndex, setReplaceIndex] = useState(-1)

  const list = multiple ? value || [] : value ? [value] : []
  const canAdd = multiple ? list.length + busy.length < max : true

  const emit = (urls) => {
    if (multiple) onChange(urls)
    else onChange(urls[0] || '')
  }

  const handleFiles = async (fileList, replacing = -1) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    if (!user) {
      setErrors(['Please log in to upload images.'])
      return
    }
    const room = multiple && replacing < 0 ? max - list.length - busy.length : 1
    const chosen = files.slice(0, Math.max(0, room))
    const errs = []
    if (files.length > chosen.length && multiple && replacing < 0) {
      errs.push(`You can add up to ${max} photos.`)
    }
    const jobs = chosen.map((file) => ({ id: Math.random().toString(36).slice(2), file }))
    const valid = []
    for (const j of jobs) {
      const problem = validateImage(j.file)
      if (problem) errs.push(`${j.file.name}: ${problem}`)
      else valid.push(j)
    }
    setErrors(errs)
    if (!valid.length) return
    setBusy((b) => [...b, ...valid.map((j) => ({ id: j.id, name: j.file.name, heic: isHeic(j.file) }))])

    const results = []
    for (const j of valid) {
      try {
        results.push(await uploadImage(j.file, user.id))
      } catch (e) {
        errs.push(`${j.file.name}: ${e.message || 'Upload failed.'}`)
      } finally {
        setBusy((b) => b.filter((x) => x.id !== j.id))
      }
    }
    setErrors([...errs])
    if (!results.length) return

    if (replacing >= 0) {
      const old = list[replacing]
      const next = [...list]
      next[replacing] = results[0]
      emit(next)
      removeImage(old)
    } else if (multiple) {
      emit([...list, ...results].slice(0, max))
    } else {
      const old = list[0]
      emit([results[0]])
      if (old) removeImage(old)
    }
  }

  const remove = (i) => {
    const url = list[i]
    emit(list.filter((_, idx) => idx !== i))
    removeImage(url)
  }

  const onPick = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }
  const onReplace = (e) => {
    handleFiles(e.target.files, replaceIndex)
    e.target.value = ''
  }

  return (
    <div className={cx('uploader', compact && 'uploader-compact')}>
      <div className="uploader-grid">
        {list.map((url, i) => (
          <div key={url} className={cx('thumb', shape === 'wide' && 'thumb-wide')}>
            <img src={url} alt={`Upload ${i + 1}`} loading="lazy" />
            <div className="thumb-actions">
              <button
                type="button"
                className="btn btn-icon btn-glass"
                aria-label="Replace image"
                onClick={() => {
                  setReplaceIndex(i)
                  replaceRef.current?.click()
                }}
              >
                <Icon name="refresh" size={16} />
              </button>
              <button type="button" className="btn btn-icon btn-glass" aria-label="Delete image" onClick={() => remove(i)}>
                <Icon name="trash" size={16} />
              </button>
            </div>
            {multiple && i === 0 && <span className="thumb-cover">Cover</span>}
          </div>
        ))}

        {busy.map((b) => (
          <div key={b.id} className={cx('thumb thumb-busy', shape === 'wide' && 'thumb-wide')}>
            <Spinner />
            <small>{b.heic ? 'Converting HEIC...' : 'Uploading...'}</small>
          </div>
        ))}

        {canAdd && (multiple || list.length === 0) && busy.length === 0 && (
          <button type="button" className={cx('thumb thumb-add', shape === 'wide' && 'thumb-wide')} onClick={() => inputRef.current?.click()}>
            <Icon name="upload" size={22} />
            <span>{label}</span>
            <small>JPG, PNG, WEBP, HEIC</small>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept={ACCEPT} multiple={multiple} hidden onChange={onPick} />
      <input ref={replaceRef} type="file" accept={ACCEPT} hidden onChange={onReplace} />

      {errors.length > 0 && (
        <ul className="upload-errors" role="alert">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {!user && <p className="hint">Log in to upload images.</p>}
    </div>
  )
}
