/**
 * SteveIntakeForm — the itemized intake screen
 * ----------------------------------------------------------------------------
 * Replaces the conversational intake. One screen of short fields, then
 * "Write my grant": the order ticket is built deterministically and handed to
 * the SAME assembler the conversation fed, so a completed form produces a full
 * letter with no conversational LLM calls at all.
 *
 * Why a form: the conversation cost 12–15 model calls per grant, and it could
 * still mis-file a fact ("I already said it's a school"). Type is a dropdown
 * here; the rest map one-to-one onto the order ticket.
 */
import React, { useMemo } from 'react';
import {
  DELIVERABLE_OPTIONS,
  INTAKE_FIELDS,
  missingRequiredFields,
  visibleFields,
  type IntakeField,
} from './intakeFields';

type SteveIntakeFormProps = {
  form: Record<string, string>;
  onField: (id: string, value: string) => void;
  onSubmit: () => void;
  onNextClient: () => void;
  loading: boolean;
  error?: string | null;
  hasDraft: boolean;
  disabled?: boolean;
};

const WIDE: IntakeField['type'][] = ['textarea'];

function controlClasses(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-white px-3 py-2 text-sm text-[#0A0F1A] outline-none transition',
    'placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#D4AF37]/25',
    hasError ? 'border-[#FCA5A5] focus:border-[#DC2626]' : 'border-[#E2E8F0] focus:border-[#D4AF37]',
  ].join(' ');
}

export default function SteveIntakeForm({
  form,
  onField,
  onSubmit,
  onNextClient,
  loading,
  error,
  hasDraft,
  disabled = false,
}: SteveIntakeFormProps) {
  const fields = useMemo(() => visibleFields(form), [form]);
  const groups = useMemo(() => Array.from(new Set(fields.map((field) => field.group))), [fields]);
  const missing = useMemo(() => missingRequiredFields(form), [form]);
  const canSubmit = missing.length === 0 && !loading && !disabled;

  const renderField = (field: IntakeField) => {
    const value = form[field.id] ?? '';
    const isMissing = field.required && !String(value).trim();
    const id = `intake-${field.id}`;

    return (
      <label
        key={field.id}
        htmlFor={id}
        className={WIDE.includes(field.type) || field.type === 'select' && field.id === 'deliverable' ? 'sm:col-span-2' : ''}
      >
        <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-[#0A0F1A]">
          {field.label}
          {field.required ? <span className="text-[#DC2626]">*</span> : <span className="text-[11px] font-normal text-[#94A3B8]">optional</span>}
        </span>

        {field.type === 'textarea' ? (
          <textarea
            id={id}
            value={value}
            onChange={(event) => onField(field.id, event.target.value)}
            placeholder={field.placeholder}
            rows={3}
            disabled={disabled}
            className={`${controlClasses(isMissing)} resize-y leading-6`}
          />
        ) : field.type === 'select' ? (
          <select
            id={id}
            value={value}
            onChange={(event) => onField(field.id, event.target.value)}
            disabled={disabled}
            className={controlClasses(isMissing)}
          >
            <option value="">Choose…</option>
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type={field.type}
            value={value}
            onChange={(event) => onField(field.id, event.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            min={field.type === 'number' ? 0 : undefined}
            className={controlClasses(isMissing)}
          />
        )}
      </label>
    );
  };

  return (
    <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4" style={{ maxHeight: 520 }}>
          <div className="rounded-xl bg-[#F7F9FB] px-3 py-2 text-[12px] leading-5 text-[#475569]">
            Fill this in once and Steve writes the grant. Type is a dropdown, so there is nothing to
            re-explain — start to finish is a single writing pass.
          </div>

          {groups.map((group) => (
            <section key={group}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#B8960C]">{group}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.filter((field) => field.group === group).map(renderField)}
              </div>
            </section>
          ))}

          {error && (
            <p className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12px] font-semibold text-[#B91C1C]">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-[#E2E8F0] px-4 py-3">
          {missing.length > 0 && (
            <p className="mb-2 text-[11px] font-semibold text-[#92400E]">
              Still needed: {missing.join(', ')}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-[#0A0F1A] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Writing your grant…' : hasDraft ? 'Rewrite my grant' : 'Write my grant'}
            </button>
            <button
              type="button"
              onClick={onNextClient}
              disabled={loading}
              className="rounded-xl border border-[#CBD5E1] px-4 py-2.5 text-sm font-bold text-[#0A0F1A] transition hover:border-[#D4AF37] disabled:opacity-50"
            >
              Next client
            </button>
            <span className="text-[11px] text-[#64748B]">
              {hasDraft ? 'Edit, download or email the draft on the right.' : 'Download, edit or email once it is written.'}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
