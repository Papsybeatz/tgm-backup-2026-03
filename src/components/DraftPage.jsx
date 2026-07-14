import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useUser } from './UserContext';
import useAutosave from '../hooks/useAutosave';
import { tierAtLeast } from '../config/tiers';
import { apiUrl } from '../lib/apiUrl';

const DEFAULT_SECTIONS = ['Section 1', 'Section 2', 'Section 3'];
const FREE_SECTIONS = ['Draft'];
const STARTER_SECTIONS = [
  'Executive Summary',
  'Problem Statement',
  'Project Description',
  'Goals & Objectives',
  'Budget Narrative',
  'Evaluation Plan',
];

const SUPPORTING_DOCS = {
  required: [
    { id: 'irs_letter', label: 'IRS Determination Letter (501c3)' },
    { id: 'board_list', label: 'Board of Directors List' },
    { id: 'org_budget', label: 'Organizational Budget' },
    { id: 'project_budget', label: 'Project/Program Budget' },
    { id: 'financials', label: 'Financial Statements' },
    { id: 'uei', label: 'UEI Number / SAM.gov Registration' },
    { id: 'signed_forms', label: 'Signed Application Forms' },
    { id: 'narrative', label: 'Grant Narrative / Proposal' },
  ],
  conditional: [
    { id: 'logic_model', label: 'Logic Model' },
    { id: 'evaluation_plan_doc', label: 'Evaluation Plan (Attachment)' },
    { id: 'letters_support', label: 'Letters of Support' },
    { id: 'mou', label: 'MOUs / Partnership Agreements' },
    { id: 'past_performance', label: 'Past Performance' },
    { id: 'org_chart', label: 'Organizational Chart' },
    { id: 'audit', label: 'Audit (if applicable)' },
    { id: 'insurance', label: 'Insurance Certificates' },
    { id: 'staff_resumes', label: 'Key Staff Resumes' },
    { id: 'environmental', label: 'Environmental Impact Documents' },
  ],
  optional: [
    { id: 'needs_assessment', label: 'Community Needs Assessment' },
    { id: 'data_sheets', label: 'Data Sheets / Research Citations' },
    { id: 'annual_report', label: 'Annual Report' },
    { id: 'strategic_plan', label: 'Strategic Plan' },
    { id: 'media', label: 'Media Coverage / Press' },
    { id: 'testimonials', label: 'Testimonials' },
  ],
};

function decodeHtmlEntities(value = '') {
  if (!value) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function normalizeAiHtml(raw = '') {
  if (!raw) return '';

  let input = String(raw).trim();

  // Remove markdown code fences if the model wraps HTML in ```html blocks.
  input = input.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Decode escaped HTML (e.g., &lt;h2&gt;Title&lt;/h2&gt;).
  if (/&lt;\/?[a-z][\s\S]*&gt;/i.test(input)) {
    input = decodeHtmlEntities(input);
  }

  // If AI returned a full HTML document, render only the body contents.
  if (/<!doctype|<html|<head|<body/i.test(input)) {
    const parsed = new window.DOMParser().parseFromString(input, 'text/html');
    const bodyHtml = parsed?.body?.innerHTML?.trim();
    if (bodyHtml) input = bodyHtml;
  }

  // Remove elements that should not be injected into the editable surface.
  input = input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .trim();

  // If no HTML tags remain, present as readable paragraph text.
  if (!/<[a-z][\s\S]*>/i.test(input)) {
    return `<p>${input.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
  }

  return input;
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function createEmptySectionMap(sectionNames = []) {
  return sectionNames.reduce((acc, section) => {
    acc[section] = '';
    return acc;
  }, {});
}

function toggleDocReducer(prev, docId) {
  return {
    ...prev,
    [docId]: !prev[docId],
  };
}

function scoreSupportingDocs(supportingDocs) {
  const requiredMissing = SUPPORTING_DOCS.required.filter((doc) => !supportingDocs[doc.id]);
  const conditionalMissing = SUPPORTING_DOCS.conditional.filter((doc) => !supportingDocs[doc.id]);
  const optionalCount = SUPPORTING_DOCS.optional.filter((doc) => supportingDocs[doc.id]).length;
  return { requiredMissing, conditionalMissing, optionalCount };
}

function toSectionAnchorId(value = '') {
  const normalized = String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return normalized || 'section';
}

function resolveUniqueSectionTitle(existingSections = [], rawTitle = '') {
  const cleaned = String(rawTitle).trim();
  if (!cleaned) return '';
  const existingIds = new Set(existingSections.map((section) => toSectionAnchorId(section)));
  let nextTitle = cleaned;
  let suffix = 2;
  while (existingIds.has(toSectionAnchorId(nextTitle))) {
    nextTitle = `${cleaned} ${suffix}`;
    suffix += 1;
  }
  return nextTitle;
}

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSectionsFromHtml(html = '', sectionNames = []) {
  const normalized = normalizeAiHtml(html);
  const result = createEmptySectionMap(sectionNames);
  if (!normalized) return result;

  const doc = new window.DOMParser().parseFromString(normalized, 'text/html');
  const headings = Array.from(doc.body.querySelectorAll('h2'));
  if (headings.length) {
    sectionNames.forEach((section, index) => {
      const startHeading = headings[index];
      if (!startHeading) return;
      const endHeading = headings[index + 1] || null;
      let cursor = startHeading.nextSibling;
      let chunk = '';
      while (cursor && cursor !== endHeading) {
        if (cursor.nodeType === Node.ELEMENT_NODE) {
          chunk += cursor.outerHTML;
        } else if (cursor.nodeType === Node.TEXT_NODE) {
          const text = (cursor.textContent || '').trim();
          if (text) chunk += `<p>${text}</p>`;
        }
        cursor = cursor.nextSibling;
      }
      result[section] = chunk.trim();
    });
    return result;
  }

  sectionNames.forEach((section, index) => {
    const currentHeading = escapeRegex(section);
    const remaining = sectionNames.slice(index + 1).map((s) => escapeRegex(s)).join('|');
    const nextHeadingPattern = remaining ? `(?:${remaining})` : null;
    const regex = nextHeadingPattern
      ? new RegExp(`<h2[^>]*>\\s*${currentHeading}\\s*<\\/h2>([\\s\\S]*?)(?=<h2[^>]*>\\s*${nextHeadingPattern}\\s*<\\/h2>|$)`, 'i')
      : new RegExp(`<h2[^>]*>\\s*${currentHeading}\\s*<\\/h2>([\\s\\S]*)$`, 'i');
    const match = normalized.match(regex);
    if (match?.[1]) {
      result[section] = match[1].trim();
    }
  });

  return result;
}

function buildHtmlFromSections(sectionMap = {}, sectionNames = []) {
  const blocks = sectionNames.map((section) => {
    const body = (sectionMap[section] || '').trim();
    return `<h2 id="${toSectionAnchorId(section)}">${section}</h2>${body || '<p></p>'}`;
  });
  return blocks.join('\n\n').trim();
}

function createWorkspaceState(isStarterPlus, rawContent = '') {
  const sections = isStarterPlus ? STARTER_SECTIONS : FREE_SECTIONS;
  const emptyMap = createEmptySectionMap(sections);
  const historyMap = createEmptySectionMap(sections);
  const hasContent = Boolean(rawContent && rawContent.trim());

  if (!hasContent) {
    return {
      sections,
      activeSection: sections[0],
      sectionContentMap: emptyMap,
      sectionHistoryMap: historyMap,
      contentHtml: '',
    };
  }

  const normalized = normalizeAiHtml(rawContent);
  const parsed = parseSectionsFromHtml(rawContent, sections);
  const hasParsedSectionContent = sections.some((section) => stripHtml(parsed[section] || '').length > 0);
  const sectionContentMap = hasParsedSectionContent
    ? parsed
    : { ...emptyMap, [sections[0]]: normalized };

  return {
    sections,
    activeSection: sections[0],
    sectionContentMap,
    sectionHistoryMap: historyMap,
    contentHtml: hasParsedSectionContent ? buildHtmlFromSections(sectionContentMap, sections) : normalized,
  };
}

function mergeKnownSections(currentMap, nextMap, sections) {
  const merged = { ...currentMap };
  sections.forEach((section) => {
    if (nextMap[section] !== undefined) merged[section] = nextMap[section];
  });
  return merged;
}

function workspaceReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE_INITIAL': {
      return createWorkspaceState(action.payload.isStarterPlus, action.payload.content);
    }
    case 'SET_ACTIVE_SECTION': {
      if (!state.sections.includes(action.payload.section)) return state;
      return { ...state, activeSection: action.payload.section };
    }
    case 'ADD_SECTION': {
      const section = resolveUniqueSectionTitle(state.sections, action.payload.section);
      if (!section || state.sections.includes(section)) return state;
      const sections = [...state.sections, section];
      const sectionContentMap = { ...state.sectionContentMap, [section]: '' };
      const sectionHistoryMap = { ...state.sectionHistoryMap, [section]: '' };
      return {
        ...state,
        sections,
        activeSection: section,
        sectionContentMap,
        sectionHistoryMap,
        contentHtml: buildHtmlFromSections(sectionContentMap, sections),
      };
    }
    case 'SET_SECTION_BODY': {
      const { section, html, pushHistory = true } = action.payload;
      if (!state.sections.includes(section)) return state;
      const previous = state.sectionContentMap[section] || '';
      const sectionContentMap = { ...state.sectionContentMap, [section]: html };
      let sectionHistoryMap = state.sectionHistoryMap;
      if (pushHistory && previous !== html) {
        sectionHistoryMap = {
          ...state.sectionHistoryMap,
          [section]: state.sectionHistoryMap[section] ? `${state.sectionHistoryMap[section]}\u0000${previous}` : previous,
        };
      }
      return {
        ...state,
        sectionContentMap,
        sectionHistoryMap,
        contentHtml: buildHtmlFromSections(sectionContentMap, state.sections),
      };
    }
    case 'UNDO_SECTION': {
      const section = action.payload.section;
      if (!state.sections.includes(section)) return state;
      const stack = String(state.sectionHistoryMap[section] || '').split('\u0000').filter(Boolean);
      const previous = stack.pop();
      if (previous === undefined) return state;
      const sectionContentMap = { ...state.sectionContentMap, [section]: previous };
      return {
        ...state,
        sectionContentMap,
        sectionHistoryMap: { ...state.sectionHistoryMap, [section]: stack.join('\u0000') },
        contentHtml: buildHtmlFromSections(sectionContentMap, state.sections),
      };
    }
    case 'REPLACE_SECTION_MAP': {
      const sectionContentMap = { ...createEmptySectionMap(state.sections), ...action.payload.map };
      return {
        ...state,
        sectionContentMap,
        contentHtml: buildHtmlFromSections(sectionContentMap, state.sections),
      };
    }
    case 'APPLY_EXTERNAL_HTML': {
      const contentHtml = action.payload.html;
      const parsed = parseSectionsFromHtml(contentHtml, state.sections);
      const sectionContentMap = mergeKnownSections(state.sectionContentMap, parsed, state.sections);
      return { ...state, contentHtml, sectionContentMap };
    }
    case 'UPDATE_FROM_EDITOR': {
      const { html, pushHistory = true } = action.payload;
      const parsed = parseSectionsFromHtml(html, state.sections);
      const nextActiveBody = parsed[state.activeSection] || '';
      const currentBody = state.sectionContentMap[state.activeSection] || '';
      const headingCount = (String(html).match(/<h2[^>]*>/gi) || []).length;
      let sectionHistoryMap = state.sectionHistoryMap;
      if (pushHistory && currentBody && currentBody !== nextActiveBody) {
        sectionHistoryMap = {
          ...state.sectionHistoryMap,
          [state.activeSection]: state.sectionHistoryMap[state.activeSection]
            ? `${state.sectionHistoryMap[state.activeSection]}\u0000${currentBody}`
            : currentBody,
        };
      }
      const sectionContentMap = mergeKnownSections(state.sectionContentMap, parsed, state.sections);
      const shouldCanonicalize = headingCount < state.sections.length;
      const nextHtml = shouldCanonicalize ? buildHtmlFromSections(sectionContentMap, state.sections) : html;
      return {
        ...state,
        sectionContentMap,
        sectionHistoryMap,
        contentHtml: nextHtml,
      };
    }
    default:
      return state;
  }
}

export default function DraftPage({ draftId: draftIdProp = null, initialTitle = 'Untitled Draft', initialContent = '' } = {}) {
  const [ideaInput, setIdeaInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [title, setTitle] = useState(initialTitle || 'Untitled Draft');
  const [newSection, setNewSection] = useState('');
  const { user } = useUser() || {};
  const tier = user?.tier || 'free';
  const isStarterPlus = tierAtLeast(tier, 'starter');
  const [workspace, dispatchWorkspace] = useReducer(
    workspaceReducer,
    { isStarterPlus, content: initialContent },
    (seed) => createWorkspaceState(seed.isStarterPlus, seed.content)
  );
  const [activeAction, setActiveAction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const text = workspace.contentHtml;
  const sections = workspace.sections;
  const activeSection = workspace.activeSection;
  const sectionContentMap = workspace.sectionContentMap;
  const [status, setStatus] = useState('Draft');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [manualSaveNote, setManualSaveNote] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [scoreState, setScoreState] = useState({ score: null, label: 'Not scored yet' });
  const [fitState, setFitState] = useState({ loading: false, error: '', insights: null });
  const [supportingDocs, setSupportingDocs] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHydrated, setIsHydrated] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [aiActionCount, setAiActionCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const hasSavedDraft = !!draftIdProp;
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const syncEditorFromStateRef = useRef(false);
  const hydrationPendingRef = useRef(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const suppressHistoryPushRef = useRef(false);

  const { saving, saved, saveError, draftId, onBlur, saveNow } = useAutosave({
    content: text,
    title,
    draftId: draftIdProp,
    debounceMs: 1500,
    enabled: isHydrated && (isStarterPlus || !hasSavedDraft),
  });

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        const token = getToken();
        const res = await fetch(apiUrl('/api/drafts'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const userDrafts = data?.drafts || [];
          setDrafts(userDrafts);
          const current = userDrafts.find((d) => d.id === draftIdProp) || userDrafts[0];
          if (current) {
            setAiActionCount(current.aiActionCount || 0);
          }
        }
      } catch (e) {
        console.warn('[DraftPage] failed to fetch drafts', e);
      }
    };
    fetchDrafts();
  }, [draftIdProp]);

  const words = useMemo(() => {
    const trimmed = stripHtml(text).trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const characters = text.length;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  useEffect(() => {
    if (words === 0) {
      setStatus('Draft');
      return;
    }
    if (words < 200) {
      setStatus('In Progress');
      return;
    }
    setStatus('Ready');
  }, [words]);

  useEffect(() => {
    if (saved && !saving && text.trim()) {
      setLastSavedAt(new Date());
    }
  }, [saved, saving, text]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const resetHistory = (html) => {
    const seed = [html || ''];
    historyRef.current = seed;
    historyIndexRef.current = 0;
    setHistory(seed);
    setHistoryIndex(0);
  };

  const pushHistorySnapshot = (html) => {
    if (suppressHistoryPushRef.current) return;
    const current = historyRef.current;
    const index = historyIndexRef.current;
    const truncated = current.slice(0, index + 1);
    if (truncated[truncated.length - 1] === html) return;
    const next = [...truncated, html];
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
    setHistory(next);
    setHistoryIndex(next.length - 1);
  };

  const applyHistorySnapshot = (html, nextIndex) => {
    suppressHistoryPushRef.current = true;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    syncEditorFromStateRef.current = true;
    dispatchWorkspace({ type: 'APPLY_EXTERNAL_HTML', payload: { html } });
    window.setTimeout(() => {
      suppressHistoryPushRef.current = false;
    }, 0);
  };

  const goBack = () => {
    const index = historyIndexRef.current;
    if (index <= 0) return;
    const nextIndex = index - 1;
    const html = historyRef.current[nextIndex] || '';
    applyHistorySnapshot(html, nextIndex);
  };

  const goForward = () => {
    const index = historyIndexRef.current;
    const stack = historyRef.current;
    if (index >= stack.length - 1) return;
    const nextIndex = index + 1;
    const html = stack[nextIndex] || '';
    applyHistorySnapshot(html, nextIndex);
  };

  useEffect(() => {
    if (!editorRef.current) return;
    if (!syncEditorFromStateRef.current) return;
    if (editorRef.current.innerHTML !== text) {
      editorRef.current.innerHTML = text;
    }
    syncEditorFromStateRef.current = false;
    if (hydrationPendingRef.current) {
      hydrationPendingRef.current = false;
      setIsHydrated(true);
    }
  }, [text]);

  useEffect(() => {
    const nextWorkspace = createWorkspaceState(isStarterPlus, initialContent);
    const nextText = nextWorkspace.contentHtml;

    setIsHydrated(false);
    hydrationPendingRef.current = true;
    dispatchWorkspace({ type: 'HYDRATE_INITIAL', payload: { isStarterPlus, content: initialContent } });
    syncEditorFromStateRef.current = true;
    resetHistory(nextText);

    const hydrateTimer = window.setTimeout(() => {
      if (!hydrationPendingRef.current) return;
      if (editorRef.current && editorRef.current.innerHTML !== nextText) {
        editorRef.current.innerHTML = nextText;
      }
      syncEditorFromStateRef.current = false;
      hydrationPendingRef.current = false;
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrateTimer);
  }, [initialContent, isStarterPlus]);

  const canSave = text.trim().length > 0;
  const hasScorableContent = words > 0;
  const readinessScore = !hasScorableContent ? 0 : words >= 900 ? 9.2 : words >= 550 ? 8.4 : words >= 300 ? 7.4 : 6.3;
  const isFunderReady = hasScorableContent && readinessScore >= 8;
  const docsSummary = useMemo(() => scoreSupportingDocs(supportingDocs), [supportingDocs]);

  const statusClass = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[status];

  const addSection = () => {
    const cleaned = newSection.trim();
    if (!cleaned) return;
    const nextTitle = resolveUniqueSectionTitle(sections, cleaned);
    if (!nextTitle) return;
    syncEditorFromStateRef.current = true;
    const nextWorkspace = workspaceReducer(workspace, { type: 'ADD_SECTION', payload: { section: nextTitle } });
    pushHistorySnapshot(nextWorkspace.contentHtml);
    dispatchWorkspace({ type: 'ADD_SECTION', payload: { section: nextTitle } });
    setNewSection('');
  };

  const placeCaretAtStart = (element) => {
    if (!element) return;
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const scrollToSection = (section, focusEditor = false) => {
    if (!editorRef.current) return;
    const headings = Array.from(editorRef.current.querySelectorAll('h2'));
    const sectionIndex = sections.indexOf(section);
    const anchorId = toSectionAnchorId(section);
    const targetById = anchorId ? editorRef.current.querySelector(`#${CSS.escape(anchorId)}`) : null;
    const targetByIndex = sectionIndex >= 0 ? headings[sectionIndex] : null;
    const targetByText = headings.find((h) => (h.textContent || '').trim().toLowerCase() === section.toLowerCase());
    const target = targetById || targetByIndex || targetByText;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focusEditor) {
        const editableTarget = target.nextElementSibling || target;
        editorRef.current.focus();
        placeCaretAtStart(editableTarget);
      }
      window.setTimeout(() => {
        target.classList.add('tgm-heading-flash');
        window.setTimeout(() => target.classList.remove('tgm-heading-flash'), 900);
      }, 10);
    }
  };

  useEffect(() => {
    if (!isStarterPlus || !activeSection) return;
    if (!sections.includes(activeSection)) return;
    const timer = window.setTimeout(() => scrollToSection(activeSection, false), 60);
    return () => window.clearTimeout(timer);
  }, [activeSection, isStarterPlus, sections]);

  const handleSectionClick = (section) => {
    dispatchWorkspace({ type: 'SET_ACTIVE_SECTION', payload: { section } });
  };

  const undoSection = (section) => {
    syncEditorFromStateRef.current = true;
    dispatchWorkspace({ type: 'UNDO_SECTION', payload: { section } });
  };

  const handleToggleDoc = (docId) => {
    setSupportingDocs((prev) => toggleDocReducer(prev, docId));
  };

  const updateSectionAndEditor = (nextMap) => {
    syncEditorFromStateRef.current = true;
    dispatchWorkspace({ type: 'REPLACE_SECTION_MAP', payload: { map: nextMap } });
  };

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  const handleAIAction = async (label, action) => {
    setActiveAction(label);
    setAiError('');
    setAiLoading(true);

    try {
      const token = getToken();
      const fullDraftRewriteMode = action === 'rewrite' && isStarterPlus;
      const endpoint = fullDraftRewriteMode
        ? '/api/ai/draft'
        : action === 'generate_section'
          ? '/api/ai/draft'
          : '/api/ai/improve';

      const sectionScopedAction = action === 'generate_section';
      const currentSectionText = sectionContentMap[activeSection] || '';
      const baseContent = sectionScopedAction
        ? currentSectionText || selectedText || text || ''
        : selectedText || text || '';
      const plainContent = stripHtml(baseContent);
      const body = endpoint === '/api/ai/draft'
        ? {
            prompt: fullDraftRewriteMode
              ? `Write a full grant proposal with these exact sections and headings: ${sections.join(', ')}. Context: ${ideaInput.trim() || plainContent || title || 'Write a grant proposal'}`
              : action === 'generate_section'
                ? `Write only the ${activeSection} section for this grant proposal. Context: ${ideaInput.trim() || plainContent || title || 'Write a grant proposal section'}`
              : ideaInput.trim() || plainContent || title || 'Write a grant proposal',
            template: 'general',
          }
        : { content: baseContent || title || 'Improve this grant draft', instruction: action };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      if (!res.ok) {
        setAiError(data?.message || 'AI request failed. Please try again.');
        return;
      }

      if (output) {
        const normalizedOutput = normalizeAiHtml(output);
        if (fullDraftRewriteMode) {
          const parsed = parseSectionsFromHtml(normalizedOutput, sections);
          updateSectionAndEditor({ ...sectionContentMap, ...parsed });
        } else if (action === 'generate_section' || sectionScopedAction) {
          const sectionBody = stripHtml(normalizedOutput) ? normalizedOutput : `<p>${normalizedOutput}</p>`;
          const nextMap = { ...sectionContentMap, [activeSection]: sectionBody };
          updateSectionAndEditor(nextMap);
          window.setTimeout(() => scrollToSection(activeSection), 50);
        } else {
          syncEditorFromStateRef.current = true;
          dispatchWorkspace({ type: 'APPLY_EXTERNAL_HTML', payload: { html: normalizedOutput } });
        }
      } else {
        setAiError('No AI output returned. Please try again.');
      }
    } catch (error) {
      setAiError('AI request failed. Please check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const callRewriteBasic = async (action) => {
    if (!isStarterPlus && aiActionCount >= 3) {
      setShowUpgradeModal(true);
      return;
    }
    setAiLoading(true);
    setAiError('');
    setActiveAction(action);
    try {
      const token = getToken();
      const currentContent = sectionContentMap[activeSection] || text || '';
      const body = {
        action,
        content: currentContent,
        draftId: draftId || null,
      };
      const res = await fetch(apiUrl('/api/ai/rewrite-basic'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        if (data?.reason === 'ai_limit_reached') {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(data?.message || 'AI request failed');
      }
      const normalized = normalizeAiHtml(data?.output || '');
      if (action === 'brainstorm_basic') {
        setIdeaInput((normalized || '') + (ideaInput ? '\n\n' + ideaInput : ''));
      } else if (action === 'draft_letter') {
        const nextMap = { ...sectionContentMap, [activeSection]: normalized };
        updateSectionAndEditor(nextMap);
        window.setTimeout(() => scrollToSection(activeSection), 50);
      } else {
        const nextMap = { ...sectionContentMap, [activeSection]: normalized };
        updateSectionAndEditor(nextMap);
        window.setTimeout(() => scrollToSection(activeSection), 50);
      }
      if (data?.aiActionCount !== undefined) {
        setAiActionCount(data.aiActionCount);
      } else {
        setAiActionCount((c) => c + 1);
      }
    } catch (error) {
      setAiError(error?.message || 'AI request failed. Please try again.');
    } finally {
      setAiLoading(false);
      setActiveAction('');
    }
  };

  const savedAgo = useMemo(() => {
    if (!lastSavedAt) return 'Not yet';
    const diffMs = Math.max(0, nowTs - lastSavedAt.getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }, [lastSavedAt, nowTs]);

  const saveLabel = saving ? 'Saving...' : saved ? `Saved • ${savedAgo}` : 'Unsaved';
  const saveColor = saving ? 'text-amber-600' : saved ? 'text-emerald-600' : 'text-slate-500';
  const sectionIcons = ['📝', '📄', '📌', '🧭', '📊', '✅', '💡'];

  const handleManualSave = async () => {
    if (!isStarterPlus && hasSavedDraft) {
      setShowUpgradeModal(true);
      return;
    }
    if (!isHydrated) {
      setManualSaveNote('Draft is still loading...');
      window.setTimeout(() => setManualSaveNote(''), 1500);
      return;
    }
    setManualSaveNote('Saving...');
    const liveHtml = editorRef.current?.innerHTML ?? text;
    dispatchWorkspace({ type: 'UPDATE_FROM_EDITOR', payload: { html: liveHtml, pushHistory: false } });
    const ok = await saveNow({ title, content: liveHtml, force: true });
    if (!isStarterPlus && !ok && saveError?.includes('draft_limit_reached')) {
      setShowUpgradeModal(true);
      setManualSaveNote('');
      return;
    }
    setManualSaveNote(ok ? 'Saved just now' : 'Save failed');
    window.setTimeout(() => setManualSaveNote(''), 2500);
  };

  const handleScoreDraft = async () => {
    if (!isStarterPlus || !canSave) return;
    setAiError('');
    setAiLoading(true);
    setActiveAction('Score My Draft');
    try {
      const token = getToken();
      const res = await fetch(apiUrl('/api/score'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Scoring failed');
      }
      setScoreState({ score: data.score, label: data.label });
      setStatus(data.score >= 70 ? 'Ready' : 'In Progress');
    } catch (error) {
      setAiError(error?.message || 'Scoring failed. Please try again.');
    } finally {
      setAiLoading(false);
      setActiveAction('');
    }
  };

  const handleCheckFit = async () => {
    if (!isStarterPlus || !canSave) return;
    setFitState({ loading: true, error: '', insights: null });
    try {
      const token = getToken();
      const res = await fetch(apiUrl('/api/score'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Fit check failed');
      }
      const score = Number(data.score || 0);
      const insights = {
        alignment: score >= 85 ? 'High alignment' : score >= 70 ? 'Good alignment' : score >= 55 ? 'Partial alignment' : 'Low alignment',
        structure: `${data.sections || 0} sections detected`,
        evidence: `${data.numbers || 0} quantitative signals found`,
        readability: `${data.words || 0} words analyzed`,
      };
      setFitState({ loading: false, error: '', insights });
    } catch (error) {
      setFitState({ loading: false, error: error?.message || 'Fit check failed', insights: null });
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadDraftAsset = async (format) => {
    if (!draftId) return;
    const token = getToken();
    const res = await fetch(apiUrl(`/api/drafts/${draftId}/export.${format}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Download failed for ${format.toUpperCase()}`);
    }
    const blob = await res.blob();
    downloadBlob(blob, `${title || 'draft'}.${format}`);
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadDraftAsset('pdf');
    } catch (error) {
      setUploadError(error?.message || 'PDF download failed.');
    }
  };

  const handleDownloadDocx = async () => {
    try {
      await downloadDraftAsset('docx');
    } catch (error) {
      setUploadError(error?.message || 'DOCX download failed.');
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([stripHtml(text)], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${title || 'draft'}.txt`);
  };

  const insertImportedText = (filename, importedText) => {
    const safeText = String(importedText || '').trim();
    const fallback = `<p>Imported file: ${filename}</p><p>Document uploaded successfully. Text extraction preview is limited for this format, but the file is attached to your workspace.</p>`;
    const sectionBody = safeText
      ? `<p>${safeText.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
      : fallback;
    const nextMap = {
      ...sectionContentMap,
      [activeSection]: `${sectionContentMap[activeSection] || ''}${sectionBody}`,
    };
    updateSectionAndEditor(nextMap);
    window.setTimeout(() => scrollToSection(activeSection, true), 60);
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    setUploadStatus('Uploading...');
    setUploadError('');

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(apiUrl('/api/documents/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData?.success) {
        throw new Error(uploadData?.message || 'Upload failed');
      }

      const extracted = String(uploadData?.extractedText || '').trim() || (file.type.startsWith('text/') ? await file.text() : '');
      insertImportedText(file.name, extracted);
      setUploadStatus(`Uploaded: ${file.name}`);
    } catch (error) {
      setUploadError(error?.message || 'Upload failed. Please try again.');
      setUploadStatus('');
    }
  };

  const handleUploadDraft = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const key = `tgm-supporting-docs:${draftId || draftIdProp || 'new'}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setSupportingDocs({});
        return;
      }
      const parsed = JSON.parse(raw);
      setSupportingDocs(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setSupportingDocs({});
    }
  }, [draftId, draftIdProp]);

  useEffect(() => {
    const key = `tgm-supporting-docs:${draftId || draftIdProp || 'new'}`;
    try {
      localStorage.setItem(key, JSON.stringify(supportingDocs));
    } catch {
      // Ignore storage errors; drafts still save normally.
    }
  }, [supportingDocs, draftId, draftIdProp]);

  return (
    <WorkspaceLayout>
      <div className="min-h-screen w-full bg-gradient-to-br from-[#EEF2F7] via-[#F5F7FB] to-[#EDF2F8]">
        <div className="border-b border-slate-200/90 border-t-2 border-t-[#D4AF37]/70 bg-white/95 px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <a
                href="/dashboard"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-[#D4AF37] hover:text-[#0A0F1A]"
                aria-label="Back to dashboard"
              >
                ←
              </a>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={isStarterPlus ? onBlur : undefined}
                placeholder="Untitled Draft"
                className="min-w-[220px] max-w-[560px] flex-1 border-none bg-transparent text-base font-bold tracking-tight text-[#0A0F1A] outline-none md:text-lg"
              />
              <span className="rounded-full border border-[#003A8C]/20 bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#003A8C]">
                TGM Workspace - {isStarterPlus ? 'Starter' : 'Free'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
              {isStarterPlus && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide md:text-xs ${statusClass}`}>{status}</span>}
              {isStarterPlus && <span className={`font-semibold ${saveColor}`}>{saveLabel}</span>}
              {isStarterPlus && (
                <span className="text-slate-500 tabular-nums">
                  Last saved: {lastSavedAt ? `${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${savedAgo}` : 'Not yet'}
                </span>
              )}
              {!isStarterPlus && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Free Preview - Save Locked
                </span>
              )}
              {isStarterPlus && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={!draftId}
                  className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download PDF
                </button>
              )}
              {isStarterPlus && (
                <button
                  onClick={handleDownloadDocx}
                  disabled={!draftId}
                  className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download DOCX
                </button>
              )}
              {isStarterPlus && (
                <button
                  onClick={handleDownloadTxt}
                  className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5"
                >
                  Download TXT
                </button>
              )}
              {isStarterPlus && (
                <button
                  onClick={handleUploadDraft}
                  title="Google Drive Picker requires OAuth setup and can be enabled on request."
                  className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5"
                >
                  Upload Draft (PDF, DOCX, DOC, TXT)
                </button>
              )}
              {!isStarterPlus && hasSavedDraft && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={!draftId}
                  className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export to PDF
                </button>
              )}
              {!isStarterPlus && !hasSavedDraft && (
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                  title="Save your draft first to export"
                >
                  Export to PDF
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={handleFileSelected}
              />
              {isStarterPlus ? (
                <>
                  <button
                    type="button"
                    onClick={handleManualSave}
                    disabled={saving}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      !saving
                        ? 'bg-[#0A0F1A] text-[#D4AF37] hover:opacity-90'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={historyIndex <= 0}
                    title="Go back"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={goForward}
                    disabled={historyIndex >= history.length - 1}
                    title="Go forward"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Forward →
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={hasSavedDraft ? () => setShowUpgradeModal(true) : handleManualSave}
                  disabled={!hasSavedDraft && saving}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    hasSavedDraft
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : !saving
                        ? 'bg-[#0A0F1A] text-[#D4AF37] hover:opacity-90'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                  title={hasSavedDraft ? 'Upgrade to save more' : ''}
                >
                  {hasSavedDraft ? 'Save Draft (Starter+)' : 'Save Draft'}
                </button>
              )}
              {isStarterPlus && (
                <button
                  onClick={handleScoreDraft}
                  disabled={!canSave || aiLoading}
                  className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading && activeAction === 'Score My Draft' ? 'Scoring...' : 'Score My Draft'}
                </button>
              )}
              {isStarterPlus && (
                <button
                  onClick={handleCheckFit}
                  disabled={!canSave || fitState.loading}
                  className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fitState.loading ? 'Checking Fit...' : 'Check Fit'}
                </button>
              )}
            </div>
            {isStarterPlus && saveError && (
              <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</p>
            )}
            {manualSaveNote && !saveError && (
              <p className="w-full rounded-lg border border-[#003A8C]/20 bg-[#EFF6FF] px-3 py-2 text-xs text-[#003A8C]">{manualSaveNote}</p>
            )}
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-6 md:px-6 lg:grid-cols-[230px_1fr]">
          {isStarterPlus && (
            <aside className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:order-1">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Sections</div>
              <div className="mb-3 rounded-lg border border-[#003A8C]/20 bg-[#EFF6FF] px-2.5 py-1.5 text-[11px] font-semibold text-[#003A8C]">
                Starter: Full Proposal Generated Automatically
              </div>
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <button
                    key={section}
                    onClick={() => handleSectionClick(section)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activeSection === section
                        ? 'bg-[#003A8C]/10 font-semibold text-[#003A8C] border-l-4 border-l-[#003A8C] border-y border-r border-[#003A8C]/20'
                        : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="mr-2">{sectionIcons[index % sectionIcons.length]}</span>
                    {section}
                    {sectionContentMap[section] && (
                      <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Filled</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                <button onClick={() => scrollToSection(activeSection, true)} className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37]">
                  Edit Section
                </button>
                <button onClick={() => undoSection(activeSection)} className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37]">
                  UNDO
                </button>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <input
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSection();
                  }}
                  placeholder="Add Section"
                  className="mb-2.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]"
                />
                <button onClick={addSection} className="btn btn-secondary w-full !px-3 !py-2.5 !text-sm !font-semibold">
                  Add Section
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Supporting Documents</p>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600">Required</p>
                  {SUPPORTING_DOCS.required.map((doc) => (
                    <label key={doc.id} className="flex items-center gap-2 text-[11px] text-slate-700">
                      <input type="checkbox" checked={Boolean(supportingDocs[doc.id])} onChange={() => handleToggleDoc(doc.id)} />
                      <span>{doc.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600">Conditional</p>
                  {SUPPORTING_DOCS.conditional.slice(0, 5).map((doc) => (
                    <label key={doc.id} className="flex items-center gap-2 text-[11px] text-slate-700">
                      <input type="checkbox" checked={Boolean(supportingDocs[doc.id])} onChange={() => handleToggleDoc(doc.id)} />
                      <span>{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>
          )}
          {!isStarterPlus && (
            <aside className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:order-1">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Sections</div>
              <div className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section}
                    onClick={() => handleSectionClick(section)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activeSection === section
                        ? 'bg-slate-100 font-semibold text-slate-900 border-l-4 border-l-slate-900 border-y border-r border-slate-200'
                        : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Rewrite (Basic)</p>
                <button
                  onClick={() => callRewriteBasic('rewrite')}
                  disabled={aiLoading || (!isStarterPlus && aiActionCount >= 3)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading && activeAction === 'rewrite' ? 'Rewriting...' : 'Rewrite'}
                </button>
                <button
                  onClick={() => callRewriteBasic('rewrite_clarity')}
                  disabled={aiLoading || (!isStarterPlus && aiActionCount >= 3)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading && activeAction === 'rewrite_clarity' ? 'Rewriting...' : 'Rewrite for Clarity'}
                </button>
                <button
                  onClick={() => callRewriteBasic('rewrite_impact')}
                  disabled={aiLoading || (!isStarterPlus && aiActionCount >= 3)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading && activeAction === 'rewrite_impact' ? 'Rewriting...' : 'Rewrite for Impact'}
                </button>
                <button
                  onClick={() => callRewriteBasic('brainstorm_basic')}
                  disabled={aiLoading || (!isStarterPlus && aiActionCount >= 3)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading && activeAction === 'brainstorm_basic' ? 'Brainstorming...' : 'Basic Brainstorming'}
                </button>
              </div>

              <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                <button
                  onClick={handleDownloadPdf}
                  disabled={!hasSavedDraft}
                  className="w-full rounded-md border border-[#003A8C]/30 bg-white px-2.5 py-2 text-left text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {hasSavedDraft ? 'Export to PDF' : 'Save your draft first to export'}
                </button>
              </div>

              <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                <p className="font-semibold text-amber-800">Upgrade to Starter+</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-700">
                  <li>Unlimited saved drafts</li>
                  <li>Full AI drafting tools</li>
                  <li>Scoring and Funder Fit</li>
                  <li>Regenerate and Improve sections</li>
                </ul>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="mt-3 w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                >
                  Upgrade Now
                </button>
              </div>
            </aside>
          )}

          <section className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/50 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {activeSection}
              </div>
              <div className="p-6">
                {isStarterPlus && (
                  <div className="mb-4 rounded-xl border border-[#003A8C]/15 bg-[#F8FBFF] p-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#003A8C]">Idea Input</p>
                    <textarea
                      value={ideaInput}
                      onChange={(e) => setIdeaInput(e.target.value)}
                      placeholder="Describe the grant, funder, or outcome you want Steve to shape into a proposal..."
                      className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAIAction('Use Idea', 'rewrite')}
                        disabled={aiLoading || !isStarterPlus}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                          isStarterPlus
                            ? 'bg-[#003A8C] text-white hover:opacity-90 disabled:opacity-60'
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isStarterPlus ? 'Use Idea' : 'Use Idea (Starter+)'}
                      </button>
                      <button type="button" onClick={() => setIdeaInput('')} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-[#D4AF37]">Clear</button>
                    </div>
                  </div>
                )}

                {!isStarterPlus && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">Upgrade to Starter+ to unlock drafting tools</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-700">
                      <li>Save drafts and export to PDF/DOCX</li>
                      <li>AI tools: Regenerate, Improve, and Rewrite sections</li>
                      <li>Scoring, Funder Fit, and Readiness Checklist</li>
                      <li>Full proposal structure with version history</li>
                    </ul>
                  </div>
                )}

                <h3 className="mb-3 text-base font-semibold text-[#0A0F1A]">{activeSection}</h3>
                {!isStarterPlus && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => callRewriteBasic('rewrite')}
                      disabled={aiLoading || aiActionCount >= 3}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading && activeAction === 'rewrite' ? 'Rewriting...' : 'Rewrite'}
                    </button>
                    <button
                      type="button"
                      onClick={() => callRewriteBasic('rewrite_clarity')}
                      disabled={aiLoading || aiActionCount >= 3}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading && activeAction === 'rewrite_clarity' ? 'Rewriting...' : 'Rewrite for Clarity'}
                    </button>
                    <button
                      type="button"
                      onClick={() => callRewriteBasic('rewrite_impact')}
                      disabled={aiLoading || aiActionCount >= 3}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading && activeAction === 'rewrite_impact' ? 'Rewriting...' : 'Rewrite for Impact'}
                    </button>
                    <button
                      type="button"
                      onClick={() => callRewriteBasic('brainstorm_basic')}
                      disabled={aiLoading || aiActionCount >= 3}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading && activeAction === 'brainstorm_basic' ? 'Brainstorming...' : 'Basic Brainstorming'}
                    </button>
                    <button
                      type="button"
                      onClick={() => callRewriteBasic('draft_letter')}
                      disabled={aiLoading || aiActionCount >= 3}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading && activeAction === 'draft_letter' ? 'Drafting...' : 'Draft Letter'}
                    </button>
                  </div>
                )}
                {isStarterPlus && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAIAction('Regenerate Section', 'generate_section')}
                      disabled={aiLoading || !isStarterPlus}
                      className="rounded-full border border-[#003A8C]/30 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#003A8C] transition hover:bg-[#003A8C]/5 disabled:opacity-60"
                    >
                      {aiLoading && activeAction === 'Regenerate Section' ? 'Regenerating...' : 'Regenerate Section'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAIAction('Improve Section', 'rewrite')}
                      disabled={aiLoading || !isStarterPlus}
                      className="rounded-full border border-[#003A8C]/30 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#003A8C] transition hover:bg-[#003A8C]/5 disabled:opacity-60"
                    >
                      {aiLoading && activeAction === 'Improve Section' ? 'Improving...' : 'Improve Section'}
                    </button>
                  </div>
                )}
                {isStarterPlus && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Draft Metadata</p>
                    <span className="rounded-full border border-[#003A8C]/20 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#003A8C]">Starter - Full Drafting Unlocked</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input disabled value="Draft Type: Proposal" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" />
                    <input disabled value={`Word Count: ${words}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" />
                    <input disabled value={`Last saved: ${lastSavedAt ? `${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${savedAgo})` : 'Not yet'}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" />
                    <input disabled value={`Status: ${status}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" />
                  </div>
                  </div>
                )}
                <style>{`
                  .tgm-html-editor {
                    min-height: 58vh;
                    width: 100%;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.75rem;
                    background: #fff;
                    padding: 20px;
                    font-size: 15px;
                    line-height: 1.6;
                    color: #1e293b;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
                    outline: none;
                    overflow: auto;
                    white-space: pre-wrap;
                    word-break: break-word;
                  }
                  .tgm-html-editor:focus {
                    border-color: #d4af37;
                  }
                  .tgm-html-editor:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                  }
                  .tgm-html-editor h1, .tgm-html-editor h2, .tgm-html-editor h3 {
                    color: #0a0f1a;
                    margin: 0.8rem 0 0.4rem;
                  }
                  .tgm-html-editor h2 {
                    scroll-margin-top: 90px;
                  }
                  .tgm-html-editor h2.tgm-heading-flash {
                    background: #fff6db;
                    border-radius: 6px;
                    transition: background 0.5s ease;
                  }
                  .tgm-html-editor p { margin: 0 0 0.75rem; }
                  .tgm-html-editor ul, .tgm-html-editor ol {
                    margin: 0 0 0.9rem;
                    padding-left: 1.2rem;
                  }
                `}</style>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Write your grant proposal here..."
                  className="tgm-html-editor"
                  onInput={(e) => {
                    const next = e.currentTarget.innerHTML;
                    const headingCount = (String(next).match(/<h2[^>]*>/gi) || []).length;
                    if (headingCount < sections.length) {
                      // If structure drifts (missing section headings), force a reducer-driven resync.
                      syncEditorFromStateRef.current = true;
                    }
                    pushHistorySnapshot(next);
                    dispatchWorkspace({ type: 'UPDATE_FROM_EDITOR', payload: { html: next, pushHistory: true } });
                  }}
                  onMouseUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                  onKeyUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                />
              </div>
              {isStarterPlus ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/75 px-6 py-2.5 text-xs font-medium text-slate-500">
                  <span>{words} words</span>
                  <span>{readingTime} min read</span>
                  <span>{characters} characters</span>
                </div>
              ) : (
                <div className="border-t border-slate-100 bg-slate-50/75 px-6 py-2.5 text-xs font-semibold text-slate-600">
                  Free preview mode. Upgrade to Starter+ to save, score, export, and use AI drafting tools.
                </div>
              )}
            </div>
            {aiError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>
            )}
            {uploadStatus && (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{uploadStatus}</p>
            )}
            {uploadError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{uploadError}</p>
            )}
            {isStarterPlus && fitState.error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{fitState.error}</p>
            )}
            {isStarterPlus && fitState.insights && (
              <div className="mt-3 rounded-xl border border-[#003A8C]/20 bg-[#EFF6FF] p-3 text-xs text-[#0A0F1A]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#003A8C]">Funder Fit Insights</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-[#003A8C]/15 bg-white px-2.5 py-2"><span className="font-semibold">Alignment:</span> {fitState.insights.alignment}</div>
                  <div className="rounded-lg border border-[#003A8C]/15 bg-white px-2.5 py-2"><span className="font-semibold">Structure:</span> {fitState.insights.structure}</div>
                  <div className="rounded-lg border border-[#003A8C]/15 bg-white px-2.5 py-2"><span className="font-semibold">Evidence:</span> {fitState.insights.evidence}</div>
                  <div className="rounded-lg border border-[#003A8C]/15 bg-white px-2.5 py-2"><span className="font-semibold">Readability:</span> {fitState.insights.readability}</div>
                </div>
              </div>
            )}
            {isStarterPlus && (
              <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                  <span className="font-semibold text-slate-700">Grant Fit Score</span>
                  <span className="font-semibold text-[#003A8C]">{scoreState.score !== null ? `${scoreState.label} (${scoreState.score}/100)` : 'Ready to Analyze'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                  <span className="font-semibold text-slate-700">Missing Components</span>
                  <span className="font-semibold text-[#003A8C]">{docsSummary.requiredMissing.length > 0 ? `${docsSummary.requiredMissing.length} required docs` : (words < 200 ? 'Too short' : 'Ready to Check')}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                  <span className="font-semibold text-slate-700">Compliance Check</span>
                  <span className={`font-semibold ${docsSummary.requiredMissing.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{docsSummary.requiredMissing.length > 0 ? 'Needs Required Docs' : 'Enabled'}</span>
                </div>
                <div className={`flex items-center justify-between rounded-lg border px-2.5 py-2 ${isFunderReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <span className="font-semibold text-slate-700">Funder Ready</span>
                  <span className={`font-semibold ${isFunderReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {!hasScorableContent ? 'Not Ready (0.0/10)' : isFunderReady ? `Yes (${readinessScore.toFixed(1)}/10)` : `Almost (${readinessScore.toFixed(1)}/10)`}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold text-[#0A0F1A]">Upgrade to Starter+</h2>
            <p className="mb-4 text-sm text-slate-600">
              {!hasSavedDraft
                ? 'You\'ve reached your free limit. Upgrade to save your draft and unlock full drafting tools.'
                : 'You\'ve reached your free limit — upgrade to save more drafts and unlock full drafting tools.'}
            </p>
            <ul className="mb-6 space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Unlimited saved drafts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Full AI drafting tools
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Scoring and Funder Fit
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Regenerate and Improve sections
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Export to PDF and DOCX
              </li>
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-[#D4AF37]"
              >
                Maybe Later
              </button>
              <button
                onClick={() => { setShowUpgradeModal(false); window.location.href = '/pricing'; }}
                className="flex-1 rounded-lg bg-[#0A0F1A] px-4 py-2.5 text-xs font-bold text-[#D4AF37] transition hover:opacity-90"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
