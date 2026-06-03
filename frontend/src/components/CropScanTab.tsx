/**
 * CropScan AI Tab
 * ==============
 * Inspired by FreshScan AI design, built with AgroNavis design system.
 * Uses CSS modules (CropScan.module.css) — same tokens as Dashboard.
 *
 * Flow:
 *   1. User selects farm (optional — saves scan if selected)
 *   2. Drag-drop or click-to-upload a leaf image
 *   3. Click "Scan" → Python FastAPI ResNet18 inference
 *   4. Result card shows disease name, confidence, symptoms, treatment
 *   5. History panel shows past scans
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import styles from '../styles/CropScan.module.css'
import {
  diagnoseImage,
  getScanHistory,
  type DiagnosisResult,
  type CropScan,
} from '../utils/cropScanApi'
import { farmApi } from '../utils/farmApi'

// ── Icons (inline SVG) ────────────────────────────────────────────────────────

const IconMicroscope = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18h8"/>
    <path d="M3 22h18"/>
    <path d="M14 22a7 7 0 1 0 0-14h-1"/>
    <path d="M9 14h2"/>
    <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/>
    <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
  </svg>
)

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const IconAlertTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const IconHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14"/>
    <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

interface Farm {
  id: string
  name: string
}

const CropScanTab: React.FC = () => {
  // Farms
  const [farms, setFarms] = useState<Farm[]>([])
  const [selectedFarmId, setSelectedFarmId] = useState<string>('')

  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Inference state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // History
  const [history, setHistory] = useState<CropScan[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Load farms on mount
  useEffect(() => {
    farmApi.getFarms().then((data: Farm[]) => {
      setFarms(data || [])
    }).catch(console.error)

    // Load all scan history
    loadHistory()
  }, [])

  const loadHistory = useCallback(async (farmId?: string) => {
    setHistoryLoading(true)
    try {
      const scans = await getScanHistory(farmId)
      setHistory(scans)
    } catch {
      // silently fail — history is non-critical
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // When farm changes, reload history for that farm
  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fid = e.target.value
    setSelectedFarmId(fid)
    loadHistory(fid || undefined)
    // Reset scan result when changing farm
    setResult(null)
    setSaved(false)
    setError(null)
  }

  // Handle file selection
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a PNG, JPG, or WEBP image.')
      return
    }
    setSelectedFile(file)
    setResult(null)
    setError(null)
    setSaved(false)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const clearImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
    setSaved(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Run diagnosis
  const handleScan = async () => {
    if (!selectedFile) return
    setLoading(true)
    setError(null)
    setResult(null)
    setSaved(false)
    try {
      const diagnosis = await diagnoseImage(
        selectedFile,
        selectedFarmId || undefined
      )
      setResult(diagnosis)
      if (selectedFarmId) setSaved(true)
      // Refresh history after scan
      await loadHistory(selectedFarmId || undefined)
    } catch (err: any) {
      setError(err.message || 'Scan failed. Make sure the Python backend is running.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confidence colour ────────────────────────────────────────────────────
  const confidenceClass = result?.is_healthy
    ? styles.confidenceFillHealthy
    : styles.confidenceFillDisease

  // ── Result header class ──────────────────────────────────────────────────
  const resultHeaderClass = result
    ? result.predicted_disease_name === 'No Crop Found'
      ? styles.resultHeaderNoCrop
      : result.is_healthy
        ? styles.resultHeaderHealthy
        : styles.resultHeaderDisease
    : ''

  // ── Severity badge text ──────────────────────────────────────────────────
  const severityBadge = result?.is_healthy
    ? '✓ Healthy'
    : result
      ? '⚠ Disease Detected'
      : ''

  return (
    <div>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>CropScan AI — Plant Disease Detection</h2>
        <p className={styles.pageSubtitle}>
          Upload a close-up photo of a plant leaf. Our ResNet18 model identifies diseases across 87 crop-disease classes.
        </p>
      </div>

      <div className={styles.scanPage}>
        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className={styles.scanLeft}>

          {/* Farm selector */}
          <div className={styles.farmSelector}>
            <div className={styles.selectorLabel}>Select Farm (optional — saves scan to history)</div>
            <select
              className={styles.selectorSelect}
              value={selectedFarmId}
              onChange={handleFarmChange}
            >
              <option value="">— General scan (no farm) —</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </div>

          {/* Upload card */}
          <div className={styles.uploadCard}>

            {/* Preview or drop zone */}
            {previewUrl ? (
              <>
                <div className={styles.previewWrap}>
                  <img src={previewUrl} alt="Preview" className={styles.previewImg} />
                  <button className={styles.previewClear} onClick={clearImage} title="Remove image">✕</button>
                </div>
                <button
                  className={styles.scanBtn}
                  onClick={handleScan}
                  disabled={loading}
                  id="cropscan-scan-btn"
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner} />
                      Analysing…
                    </>
                  ) : (
                    <>
                      <IconMicroscope />
                      Scan for Diseases
                    </>
                  )}
                </button>
              </>
            ) : (
              <div
                className={`${styles.uploadZone} ${dragging ? styles.uploadZoneDragging : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                  id="cropscan-file-input"
                />
                <div className={styles.uploadIcon}>
                  <IconUpload />
                </div>
                <div className={styles.uploadTitle}>
                  {dragging ? 'Drop your image here' : 'Drag & drop or click to upload'}
                </div>
                <div className={styles.uploadSub}>
                  PNG, JPG, WEBP — clear close-up of a leaf or crop
                </div>
              </div>
            )}

            {/* Error */}
            {error && <div className={styles.errorBanner} style={{ marginTop: 12 }}>{error}</div>}

            {/* Saved confirmation */}
            {saved && (
              <div className={styles.savedBadge} style={{ marginTop: 12 }}>
                <IconCheckCircle />
                Scan saved to farm history
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <div className={styles.scanRight}>

          {/* Result card */}
          {result ? (
            <div className={styles.resultCard}>
              {/* Header */}
              <div className={`${styles.resultHeader} ${resultHeaderClass}`}>
                <div className={styles.resultIcon}>
                  {result.is_healthy ? <IconCheckCircle /> : <IconAlertTriangle />}
                </div>
                <div className={styles.resultMeta}>
                  <div className={styles.resultName}>{result.predicted_disease_name}</div>
                  {result.crop_type && (
                    <div className={styles.resultCrop}>Crop: {result.crop_type}</div>
                  )}
                </div>
                <div className={styles.resultBadge}>{severityBadge}</div>
              </div>

              {/* Confidence */}
              <div className={styles.confidenceSection}>
                <div className={styles.confidenceLabel}>
                  <span>Confidence Score</span>
                  <span className={styles.confidenceVal}>{result.confidence_score.toFixed(1)}%</span>
                </div>
                <div className={styles.confidenceBar}>
                  <div
                    className={`${styles.confidenceFill} ${confidenceClass}`}
                    style={{ width: `${result.confidence_score}%` }}
                  />
                </div>
              </div>

              {/* Body */}
              <div className={styles.resultBody}>
                {result.symptoms.length > 0 && (
                  <div className={styles.detailSection}>
                    <div className={styles.detailTitle}>Observed Symptoms</div>
                    <div className={styles.detailList}>
                      {result.symptoms.map((s, i) => (
                        <div key={i} className={styles.detailItem}>
                          <span className={`${styles.detailDot} ${styles.dotSymptom}`} />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.recommended_action.length > 0 && (
                  <div className={styles.detailSection}>
                    <div className={styles.detailTitle}>Recommended Actions</div>
                    <div className={styles.detailList}>
                      {result.recommended_action.map((a, i) => (
                        <div key={i} className={styles.detailItem}>
                          <span className={`${styles.detailDot} ${styles.dotTreatment}`} />
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyResult}>
              <div className={styles.emptyResultIcon}>
                <IconMicroscope />
              </div>
              <div className={styles.emptyResultTitle}>No scan yet</div>
              <div className={styles.emptyResultSub}>
                Upload a leaf image and click &quot;Scan for Diseases&quot; to get an AI diagnosis.
              </div>
            </div>
          )}

          {/* Scan history */}
          <div className={styles.historyCard}>
            <div className={styles.historyTitle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconHistory />
                Scan History
              </span>
              <span className={styles.historyCount}>{history.length}</span>
            </div>

            {historyLoading ? (
              <div className={styles.historyEmpty}>Loading history…</div>
            ) : history.length === 0 ? (
              <div className={styles.historyEmpty}>
                {selectedFarmId ? 'No scans for this farm yet.' : 'No scans yet — run your first scan above.'}
              </div>
            ) : (
              <div className={styles.historyList}>
                {history.slice(0, 10).map((scan) => (
                  <div key={scan.id} className={styles.historyItem}>
                    <span
                      className={`${styles.historyDot} ${
                        scan.detected_disease.toLowerCase().includes('healthy')
                          ? styles.historyDotHealthy
                          : styles.historyDotDisease
                      }`}
                    />
                    <div className={styles.historyInfo}>
                      <div className={styles.historyDisease}>{scan.detected_disease}</div>
                      <div className={styles.historyFarm}>
                        {scan.farms?.name ?? 'General'} &middot;{' '}
                        {new Date(scan.scan_date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className={styles.historyConf}>
                      {scan.confidence_score?.toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CropScanTab
