import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const EXT_COLORS = {
  pdf:  { bg: '#FEE2E2', color: '#DC2626', label: 'PDF' },
  doc:  { bg: '#DBEAFE', color: '#1D4ED8', label: 'DOC' },
  docx: { bg: '#DBEAFE', color: '#1D4ED8', label: 'DOC' },
  png:  { bg: '#DCFCE7', color: '#16A34A', label: 'IMG' },
  jpg:  { bg: '#DCFCE7', color: '#16A34A', label: 'IMG' },
  jpeg: { bg: '#DCFCE7', color: '#16A34A', label: 'IMG' },
  xlsx: { bg: '#D1FAE5', color: '#065F46', label: 'XLS' },
  csv:  { bg: '#D1FAE5', color: '#065F46', label: 'CSV' },
};

function getExt(name = '') {
  return name.split('.').pop().toLowerCase();
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentViewer() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  const token = localStorage.getItem('token');

  const fetchDocs = () => {
    setLoading(true);
    fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.success) setDocs(data.files || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');
      setUploadMsg(`✓ "${data.file.name}" uploaded successfully`);
      fetchDocs();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '28px 32px', color: '#fff',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', color: 'var(--tgm-gold-light)',
            fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12,
          }}>← Back</button>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>Documents</h2>
          <p style={{ color: 'var(--tgm-gold-light)', fontSize: 14, margin: 0 }}>Uploads & attachments</p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          background: 'var(--tgm-surface)',
          borderRadius: 'var(--tgm-radius-lg)',
          border: '1px solid var(--tgm-border)',
          boxShadow: 'var(--tgm-shadow-md)',
          overflow: 'hidden',
        }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: '1px solid var(--tgm-border)',
            background: 'var(--tgm-bg)',
          }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tgm-navy)' }}>
              All Documents {!loading && `(${docs.length})`}
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {uploading && <span style={{ fontSize: 13, color: 'var(--tgm-muted)' }}>Uploading…</span>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv"
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--tgm-radius-md)',
                  background: 'var(--tgm-gold)', border: 'none',
                  color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? .7 : 1,
                  boxShadow: 'var(--tgm-shadow-sm)',
                }}
              >+ Upload</button>
            </div>
          </div>

          {/* Status messages */}
          {uploadMsg && (
            <div style={{
              padding: '10px 24px', background: 'rgba(34,197,94,.08)',
              borderBottom: '1px solid rgba(34,197,94,.2)',
              color: 'var(--tgm-success)', fontSize: 13, fontWeight: 500,
            }}>{uploadMsg}</div>
          )}
          {uploadError && (
            <div style={{
              padding: '10px 24px', background: 'rgba(239,68,68,.08)',
              borderBottom: '1px solid rgba(239,68,68,.2)',
              color: 'var(--tgm-error)', fontSize: 13,
            }}>{uploadError}</div>
          )}

          {/* File list */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tgm-muted)', fontSize: 14 }}>
              Loading documents…
            </div>
          ) : docs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
              <p style={{ color: 'var(--tgm-muted)', fontSize: 14 }}>No documents yet — click Upload to add your first file.</p>
            </div>
          ) : (
            <div>
              {docs.map((doc, i) => {
                const ext = getExt(doc.name);
                const badge = EXT_COLORS[ext] || { bg: '#F1F5F9', color: '#475569', label: ext.toUpperCase() };
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 24px',
                    borderBottom: i < docs.length - 1 ? '1px solid var(--tgm-border)' : 'none',
                    transition: 'background .15s',
                  }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--tgm-bg)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{
                        background: badge.bg, color: badge.color,
                        fontSize: 10, fontWeight: 800, padding: '3px 8px',
                        borderRadius: 6, letterSpacing: '.3px', flexShrink: 0,
                      }}>{badge.label}</span>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--tgm-navy)' }}>{doc.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tgm-muted)' }}>
                          {formatSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <button style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--tgm-blue)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                    }}
                      onMouseOver={e => e.currentTarget.style.color = 'var(--tgm-gold)'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--tgm-blue)'}
                    >View →</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Accepted formats note */}
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--tgm-muted)' }}>
          Accepted: PDF, DOC, DOCX, PNG, JPG, XLSX, CSV · Max 10 MB per file
        </p>
      </div>
    </div>
  );
}
