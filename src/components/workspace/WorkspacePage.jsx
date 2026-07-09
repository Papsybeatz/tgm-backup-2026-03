import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkspaceLayout from './WorkspaceLayout';
import EditorCard from './EditorCard';
import { useUser } from '../UserContext';

const STARTER_SECTIONS = [
  'Executive Summary',
  'Problem Statement',
  'Project Description',
  'Goals & Objectives',
  'Budget Narrative',
  'Evaluation Plan',
];

const TIER_ORDER = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];

function normalizeAiHtml(raw = '') {
  if (!raw) return '';
  let input = String(raw).trim();
  input = input.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (/<!doctype|<html|<head|<body/i.test(input) && typeof window !== 'undefined') {
    const parsed = new window.DOMParser().parseFromString(input, 'text/html');
    const bodyHtml = parsed?.body?.innerHTML?.trim();
    if (bodyHtml) input = bodyHtml;
  }
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .trim();
}

function createEmptySectionMap(sectionNames = []) {
  return sectionNames.reduce((acc, section) => {
    acc[section] = '';
    return acc;
  }, {});
}

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSectionsFromHtml(html = '', sectionNames = []) {
  const normalized = normalizeAiHtml(html);
  const result = createEmptySectionMap(sectionNames);
  if (!normalized) return result;

  sectionNames.forEach((section, index) => {
    const currentHeading = escapeRegex(section);
    const remaining = sectionNames.slice(index + 1).map((s) => escapeRegex(s)).join('|');
    const nextHeadingPattern = remaining ? `(?:${remaining})` : null;
    const regex = nextHeadingPattern
      ? new RegExp(`<h2[^>]*>\\s*${currentHeading}\\s*<\\/h2>([\\s\\S]*?)(?=<h2[^>]*>\\s*${nextHeadingPattern}\\s*<\\/h2>|$)`, 'i')
      : new RegExp(`<h2[^>]*>\\s*${currentHeading}\\s*<\\/h2>([\\s\\S]*)$`, 'i');
    const match = normalized.match(regex);
    if (match?.[1]) result[section] = match[1].trim();
  });

  return result;
}

function buildHtmlFromSections(sectionMap = {}, sectionNames = []) {
  return sectionNames
    .map((section) => `<h2>${section}</h2>${(sectionMap[section] || '').trim() || '<p></p>'}`)
    .join('\n\n')
    .trim();
}

function getToken() {
  return localStorage.getItem('token') || '';
}

export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser() || {};

  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [loadError, setLoadError] = useState('');
  const tier = user?.tier || 'free';
  const isStarterPlus = TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf('starter');

  // Load existing draft by ID
  useEffect(() => {
    if (!id) return; // no ID = new blank editor, nothing to load
    setLoadError('');
    fetch(`/api/drafts/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => {
        const d = data.draft || data;
        if (d?.id) {
          setDraft(d);
          setTitle(d.title || '');
          // Only pre-fill if there's actual content
          if (d.content && d.content.trim() && d.content !== '<p></p>') {
            setAiOutput(d.content);
          }
        } else {
          setLoadError('Draft not found. It may have been deleted.');
        }
      })
      .catch(() => setLoadError('Could not load draft. Check your connection.'));
  }, [id]);

  // Auto-save title when it changes
  useEffect(() => {
    if (!id || !draft) return;
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/drafts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ title }),
        });
      } catch (e) { /* silent */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, id, draft]);

  const handleWordCount = useCallback((words, mins) => {
    setWordCount(words);
    setReadingTime(mins);
  }, []);

  const handleContentChange = useCallback((html) => {
    setEditorContent(html);
    setSaved(false);
    clearTimeout(window._tgmSaveTimer);
    window._tgmSaveTimer = setTimeout(async () => {
      if (!id) return;
      try {
        await fetch(`/api/drafts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ content: html, title }),
        });
        setSaved(true);
      } catch (e) { setSaved(false); }
    }, 2000);
  }, [id, title]);

  const handleAIAction = useCallback(async (action) => {
    setAiLoading(true);
    try {
      const fullDraftRewriteMode = action === 'rewrite' && isStarterPlus;
      const endpoint = fullDraftRewriteMode
        ? '/api/ai/draft'
        : action === 'generate' || action === 'generate_section'
          ? '/api/ai/draft'
          : '/api/ai/improve';

      const body = action === 'generate'
        ? { prompt: title || 'Write a grant proposal', template: 'general' }
        : endpoint === '/api/ai/draft'
          ? {
              prompt: fullDraftRewriteMode
                ? `Write a full grant proposal with these exact sections and headings: ${STARTER_SECTIONS.join(', ')}. Context: ${editorContent || title || 'Write a grant proposal'}`
                : action === 'generate_section'
                  ? `Write one detailed section for this proposal. Context: ${editorContent || title || 'Write a grant proposal section'}`
                  : editorContent || title || 'Write a grant proposal',
              template: 'general',
            }
          : { content: editorContent, instruction: action };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const output =
        data?.rewritten ||
        data?.improved ||
        data?.clarity ||
        data?.draft ||
        data?.output ||
        data?.text ||
        data?.result ||
        data?.content ||
        '';
      if (output) {
        if (fullDraftRewriteMode) {
          const parsed = parseSectionsFromHtml(output, STARTER_SECTIONS);
          const compiled = buildHtmlFromSections(parsed, STARTER_SECTIONS);
          setAiOutput(compiled || normalizeAiHtml(output));
        } else {
          setAiOutput(normalizeAiHtml(output));
        }
      }
    } catch (e) {
      console.error('AI action failed', e);
    } finally {
      setAiLoading(false);
    }
  }, [title, editorContent, isStarterPlus]);

  const handleUploadImported = useCallback(({ name, text }) => {
    const safeText = String(text || '').trim();
    const body = safeText
      ? `<h2>Imported Document</h2><p>${safeText.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
      : `<h2>Imported Document</h2><p>Imported file: ${name}. Upload complete. Text extraction preview is limited for this format.</p>`;
    const merged = `${editorContent || ''}\n\n${body}`.trim();
    setAiOutput(merged);
  }, [editorContent]);

  // Error state
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--tgm-error)', fontSize: 16 }}>{loadError}</p>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      title={title}
      setTitle={setTitle}
      saved={saved}
      wordCount={wordCount}
      readingTime={readingTime}
      onAIAction={handleAIAction}
      aiLoading={aiLoading}
      onUploadImported={handleUploadImported}
    >
      <EditorCard
        onContentChange={handleContentChange}
        onWordCount={handleWordCount}
        aiOutput={aiOutput}
        draftId={id}
        initialTitle={title}
      />
    </WorkspaceLayout>
  );
}
