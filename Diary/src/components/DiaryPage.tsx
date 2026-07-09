import React, { useState, useEffect, useRef } from 'react'
import WeekBar from './WeekBar'
import DiaryEditor from './DiaryEditor'
import DiaryPreview from './DiaryPreview'
import { getEntry, saveEntry, deleteEntry, exportSingle, exportMonth } from '../utils/db'
import { formatDate, downloadAsFile } from '../utils/export'

interface DiaryPageProps {
  date: string
  onBack: () => void
  onSelectDate: (date: string) => void
}

export default function DiaryPage({ date, onBack, onSelectDate }: DiaryPageProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const lastSavedAt = useRef(Date.now())
  const pendingAction = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const entry = await getEntry(date)
        if (cancelled) return
        if (entry) {
          setTitle(entry.title)
          setContent(entry.content)
        } else {
          setTitle('')
          setContent('')
        }
        setDirty(false)
        lastSavedAt.current = Date.now()
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [date])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveEntry(date, title, content)
      setDirty(false)
      lastSavedAt.current = Date.now()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setDirty(true)
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    setDirty(true)
  }

  const tryLeave = (action: () => void) => {
    if (!dirty) {
      action()
      return
    }
    pendingAction.current = action
    setShowModal(true)
  }

  const handleConfirmSaveAndLeave = async () => {
    await handleSave()
    setShowModal(false)
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }

  const handleConfirmDiscard = () => {
    setShowModal(false)
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }

  const handleCancelLeave = () => {
    setShowModal(false)
    pendingAction.current = null
  }

  const handleBack = () => {
    tryLeave(onBack)
  }

  const handleSelectDate = (d: string) => {
    tryLeave(() => onSelectDate(d))
  }

  const handleExportSingle = async () => {
    try {
      const md = await exportSingle(date)
      downloadAsFile(md, `日记_${date}.md`)
    } catch {
      // ignore
    }
  }

  const handleExportMonth = async () => {
    try {
      const [y, m] = date.split('-')
      const md = await exportMonth(Number(y), Number(m))
      downloadAsFile(md, `日记_${y}年${m}月.md`)
    } catch {
      // ignore
    }
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false)
    try {
      await deleteEntry(date)
      onBack()
    } catch {
      // ignore
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
  }

  if (loading) {
    return <div className="diary-page-loading">加载中...</div>
  }

  return (
    <div className="diary-page">
      <div className="diary-page-header">
        <div className="diary-page-top">
          <button className="nav-btn back-btn" onClick={handleBack}>
            ← 返回
          </button>
          <span className="diary-date-label">{formatDate(date)}</span>
          <div className="diary-page-actions">
            {saving ? (
              <span className="saving-indicator">保存中...</span>
            ) : (
              <button className={`nav-btn save-btn ${dirty ? 'dirty' : ''}`} onClick={handleSave}>
                {dirty ? '保存 *' : '保存'}
              </button>
            )}
            <button className="nav-btn" onClick={handleExportSingle}>
              导出单篇
            </button>
            <button className="nav-btn" onClick={handleExportMonth}>
              导出月
            </button>
            <button className="nav-btn delete-btn" onClick={handleDelete}>
              删除
            </button>
          </div>
        </div>
        <input
          className="diary-title-input"
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="日记标题..."
        />
        <WeekBar selectedDate={date} onSelectDate={handleSelectDate} />
      </div>
      <div className="diary-page-body">
        <DiaryEditor content={content} onChange={handleContentChange} />
        <div className="diary-divider" />
        <DiaryPreview content={content} />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCancelLeave}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">未保存的更改</h3>
            <p className="modal-message">
              您有未保存的内容，是否保存后再离开？
            </p>
            <div className="modal-actions">
              <button className="nav-btn modal-btn-primary" onClick={handleConfirmSaveAndLeave}>
                保存并离开
              </button>
              <button className="nav-btn" onClick={handleConfirmDiscard}>
                不保存
              </button>
              <button className="nav-btn" onClick={handleCancelLeave}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">确认删除</h3>
            <p className="modal-message">
              确定要永久删除这篇日记吗？此操作不可撤销。
            </p>
            <div className="modal-actions">
              <button className="nav-btn delete-btn" onClick={handleConfirmDelete}>
                确定删除
              </button>
              <button className="nav-btn" onClick={handleCancelDelete}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
