/**
 * EditorToolbar — formatting controls for the document editor.
 *
 * The workspace editor is a `contentEditable` region rather than a Tiptap
 * instance, so these buttons drive it with `document.execCommand`.
 *
 * Honest note: execCommand is a legacy API. It is still supported everywhere
 * and works correctly with contentEditable, so it is safe here — but the
 * cleaner long-term move is to migrate this editor onto Tiptap (the dependency
 * and a fully-built toolbar already exist in WorkspaceDraftEditor.jsx and are
 * simply not wired into this route).
 */
import React, { useCallback, useState } from 'react';

type Props = {
  targetRef: React.RefObject<HTMLElement | null>;
  onChanged?: () => void;
};

type Btn = {
  label: React.ReactNode;
  title: string;
  command: string;
  value?: string;
};

const GROUPS: Btn[][] = [
  [
    { label: '↶', title: 'Undo', command: 'undo' },
    { label: '↷', title: 'Redo', command: 'redo' },
  ],
  [
    { label: <strong>B</strong>, title: 'Bold', command: 'bold' },
    { label: <em>I</em>, title: 'Italic', command: 'italic' },
    { label: <span style={{ textDecoration: 'underline' }}>U</span>, title: 'Underline', command: 'underline' },
    { label: <span style={{ textDecoration: 'line-through' }}>S</span>, title: 'Strikethrough', command: 'strikeThrough' },
  ],
  [
    { label: 'H1', title: 'Heading 1', command: 'formatBlock', value: 'H1' },
    { label: 'H2', title: 'Heading 2', command: 'formatBlock', value: 'H2' },
    { label: 'H3', title: 'Heading 3', command: 'formatBlock', value: 'H3' },
    { label: '¶', title: 'Normal text', command: 'formatBlock', value: 'P' },
  ],
  [
    { label: '• List', title: 'Bullet list', command: 'insertUnorderedList' },
    { label: '1. List', title: 'Numbered list', command: 'insertOrderedList' },
    { label: '❝', title: 'Quote', command: 'formatBlock', value: 'BLOCKQUOTE' },
  ],
  [
    { label: 'Clear', title: 'Clear formatting', command: 'removeFormat' },
  ],
];

export default function EditorToolbar({ targetRef, onChanged }: Props) {
  const [active, setActive] = useState<Record<string, boolean>>({});

  const apply = useCallback(
    (btn: Btn) => {
      const el = targetRef.current;
      if (!el) return;

      el.focus();
      try {
        document.execCommand(btn.command, false, btn.value);
      } catch {
        return;
      }

      // execCommand does not reliably emit an input event, and the editor's
      // autosave/state sync listens for one — so fire it ourselves.
      el.dispatchEvent(new Event('input', { bubbles: true }));
      onChanged?.();

      // Reflect the new formatting state on the buttons.
      const next: Record<string, boolean> = {};
      ['bold', 'italic', 'underline', 'strikeThrough'].forEach((cmd) => {
        try {
          next[cmd] = document.queryCommandState(cmd);
        } catch {
          next[cmd] = false;
        }
      });
      setActive(next);
    },
    [onChanged, targetRef],
  );

  return (
    <div
      role="toolbar"
      aria-label="Document formatting"
      className="mb-2 flex flex-wrap items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-2 py-1.5"
      // Keep the caret/selection in the document when a button is pressed.
      onMouseDown={(event) => event.preventDefault()}
    >
      {GROUPS.map((group, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {groupIndex > 0 && <span className="mx-1 h-5 w-px bg-[#E2E8F0]" aria-hidden />}
          {group.map((btn) => (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              aria-label={btn.title}
              onClick={() => apply(btn)}
              className={`min-w-[32px] rounded-md px-2 py-1 text-[12px] text-[#334155] transition hover:bg-[#F1F5F9] hover:text-[#003A8C] ${
                active[btn.command] ? 'bg-[#003A8C]/10 font-bold text-[#003A8C]' : ''
              }`}
            >
              {btn.label}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
