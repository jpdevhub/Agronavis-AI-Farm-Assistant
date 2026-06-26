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
import { runLocalONNXInference } from '../utils/onnxInference'
import { addOfflineCropScan } from '../lib/offlineStorage'

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
  const [scanSource, setScanSource] = useState<'on-device' | 'server' | null>(null)

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

    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      setError('File size too large. Maximum size is 10MB.')
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
    setScanSource(null)

    let diagnosis: DiagnosisResult
    let source: 'on-device' | 'server' = 'server'

    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        // Attempt online server-side scan
        diagnosis = await diagnoseImage(
          selectedFile,
          selectedFarmId || undefined
        )
        source = 'server'
      } else {
        throw new Error('Device is offline. Running local scanner.')
      }
    } catch (err: any) {
      console.log('Online scan failed or device is offline. Falling back to local ONNX inference:', err)
      try {
        const localResult = await runLocalONNXInference(selectedFile)
        diagnosis = {
          predicted_disease_name: localResult.predicted_disease_name,
          confidence_score: localResult.confidence_score,
          is_healthy: localResult.is_healthy,
          crop_type: localResult.crop_type,
          symptoms: localResult.symptoms,
          recommended_action: localResult.recommended_action
        }
        source = 'on-device'

        // Save scan result to IndexedDB local history if a farm is selected
        if (selectedFarmId) {
          const offlineScan = {
            id: Math.random().toString(36).substring(2, 11) + Date.now().toString(),
            farm_id: selectedFarmId,
            detected_disease: diagnosis.predicted_disease_name,
            confidence_score: diagnosis.confidence_score,
            recommendation: diagnosis.recommended_action.join(' | '),
            scan_date: new Date().toISOString()
          }
          await addOfflineCropScan(offlineScan)
        }
      } catch (localErr: any) {
        setError(localErr.message || 'Scan failed. Local ONNX model couldn\'t be loaded or executed.')
        setLoading(false)
        return
      }
    }

    setResult(diagnosis)
    setScanSource(source)
    if (selectedFarmId) setSaved(true)

    // Refresh history after scan
    await loadHistory(selectedFarmId || undefined)
    setLoading(false)
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
          <div className={styles.uploadCard} data-hc-target="true">

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
                id="cropscan-upload-zone"
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
            <div className={styles.resultCard} data-hc-target="true">
              {/* Header */}
              <div className={`${styles.resultHeader} ${resultHeaderClass}`}>
                <div className={styles.resultIcon}>
                  {result.is_healthy ? <IconCheckCircle /> : <IconAlertTriangle />}
                </div>
                <div className={styles.resultMeta}>
                  <div className={styles.resultName}>{result.predicted_disease_name}</div>
                  <div className={styles.resultCrop}>
                    {result.crop_type ? `Crop: ${result.crop_type}` : 'Crop: Unknown'}
                    {scanSource && (
                      <span style={{ marginLeft: 8, opacity: 0.85 }}>
                        &middot; {scanSource === 'on-device' ? '⚡ On-Device' : '☁️ Server'}
                      </span>
                    )}
                  </div>
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
              {/* WhatsApp Share */}
              {!result.is_healthy && (
                <div style={{ padding: '8px 16px' }}>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `🌿 AgroNavis Crop Scan Result\n\nDisease: ${result.predicted_disease_name}\nCrop: ${result.crop_type || 'Unknown'}\nConfidence: ${result.confidence_score.toFixed(1)}%\n\nPlease consult an agricultural expert for treatment advice.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#25D366',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    Share on WhatsApp
                  </a>
                </div>
              )}

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
          <div className={styles.historyCard} data-hc-target="true">
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


