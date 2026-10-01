/**
 * Steve intake form — field definitions
 * ----------------------------------------------------------------------------
 * One declarative list drives the whole itemized intake screen, and the same
 * list computes the order-ticket preview as the applicant types. The field ids
 * are the transport contract for POST /api/assistant/order; the server maps
 * them onto the canonical order ticket (backend/agents/steve/formOrder.js).
 *
 * A dropdown for "type" is the point of the exercise: the conversational intake
 * had to guess whether "a school" was the applicant type, the org name, or the
 * project story, and got it wrong often enough that applicants had to repeat
 * themselves. A form cannot make that mistake.
 */
export type IntakeFieldType = 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'select';

export type IntakeOption = { value: string; label: string };

export type IntakeField = {
  /** Field id — the key sent to the API. */
  id: string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  group: string;
  placeholder?: string;
  options?: IntakeOption;
  help?: string;
  /** Only render this field when another field equals a value (e.g. "other"). */
  showWhen?: { field: string; equals: string };
};

export const ORG_TYPE_OPTIONS: IntakeOption[] = [
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'church', label: 'Church' },
  { value: 'school', label: 'School' },
  { value: 'community group', label: 'Community group' },
  { value: 'other', label: 'Other' },
];

export const DELIVERABLE_OPTIONS: IntakeOption[] = [
  { value: 'letter', label: 'One-page grant letter' },
  { value: 'full_proposal', label: 'Full proposal' },
];

export const INTAKE_FIELDS: IntakeField[] = [
  // ── Who you are ──
  { id: 'orgName', group: 'Who you are', label: 'Organization name', type: 'text', required: true, placeholder: 'Hope Community Center' },
  {
    id: 'orgType',
    group: 'Who you are',
    label: 'Organization type',
    type: 'select',
    required: true,
    options: ORG_TYPE_OPTIONS,
  },
  {
    id: 'otherType',
    group: 'Who you are',
    label: 'Describe the type',
    type: 'text',
    required: false,
    placeholder: 'Fiscal sponsor',
    showWhen: { field: 'orgType', equals: 'other' },
  },
  { id: 'address', group: 'Who you are', label: 'Mailing address', type: 'text', required: true, placeholder: '123 Main St, City, ST 00000' },
  { id: 'phone', group: 'Who you are', label: 'Phone', type: 'tel', required: false, placeholder: '(555) 555-5555' },
  { id: 'contactName', group: 'Who you are', label: 'Contact name', type: 'text', required: true, placeholder: 'Jane Doe, Director' },
  { id: 'contactEmail', group: 'Who you are', label: 'Contact email', type: 'email', required: true, placeholder: 'jane@example.org' },

  // ── The project ──
  { id: 'projectTitle', group: 'The project', label: 'Project title', type: 'text', required: false, placeholder: 'After-School Meals Program' },
  { id: 'need', group: 'The project', label: 'The need', type: 'textarea', required: true, placeholder: 'What problem are you solving, and why does it matter right now?' },
  { id: 'servesWho', group: 'The project', label: 'Who it serves', type: 'text', required: true, placeholder: 'Orphaned children aged 4–15' },
  { id: 'peopleServed', group: 'The project', label: 'How many people', type: 'number', required: false, placeholder: '30' },
  { id: 'serviceArea', group: 'The project', label: 'Service area', type: 'text', required: true, placeholder: 'Roanoke, Virginia' },

  // ── The ask ──
  { id: 'amount', group: 'The ask', label: 'Amount requested (USD)', type: 'number', required: true, placeholder: '75000' },
  { id: 'moneyDoes', group: 'The ask', label: 'What the money does', type: 'textarea', required: true, placeholder: 'Fund school fees, meals, and a supervised dormitory.' },
  { id: 'outcomes', group: 'The ask', label: 'Measurable outcomes', type: 'textarea', required: true, placeholder: 'Serve 30 children with 95% school enrollment and full daily meal coverage.' },
  { id: 'funderName', group: 'The ask', label: 'Funder (optional)', type: 'text', required: false, placeholder: 'The Community Foundation' },
  { id: 'deadline', group: 'The ask', label: 'Deadline (optional)', type: 'text', required: false, placeholder: 'March 15' },

  // ── Deliverable ──
  { id: 'deliverable', group: 'Deliverable', label: 'What to write', type: 'select', required: true, options: DELIVERABLE_OPTIONS },
];

/** Blank form, with the deliverable defaulting to the one-page letter. */
export const EMPTY_INTAKE: Record<string, string> = INTAKE_FIELDS.reduce<Record<string, string>>(
  (acc, field) => {
    acc[field.id] = field.id === 'deliverable' ? 'letter' : '';
    return acc;
  },
  {},
);

/** Fields currently visible, honouring showWhen. */
export function visibleFields(form: Record<string, string>): IntakeField[] {
  return INTAKE_FIELDS.filter(
    (field) => !field.showWhen || form[field.showWhen.field] === field.showWhen.equals,
  );
}

export type FormProgressLine = { key: string; label: string; required: boolean; filled: boolean };
export type FormProgress = {
  lines: FormProgressLine[];
  requiredTotal: number;
  requiredFilled: number;
  percent: number;
  complete: boolean;
};

/**
 * The order-ticket preview, computed locally so the ticket fills as the
 * applicant types instead of waiting for a server round trip.
 */
export function buildFormProgress(form: Record<string, string>): FormProgress {
  // The deliverable toggle is a mode selector with a sensible default, not data
  // the applicant supplies. Counting it would report a non-zero ticket on an
  // otherwise empty form, which reads as a lie.
  const fields = visibleFields(form).filter((field) => field.id !== 'deliverable');
  const lines = fields.map((field) => ({
    key: field.id,
    label: field.label,
    required: field.required,
    filled: String(form[field.id] || '').trim().length > 0,
  }));
  const required = lines.filter((line) => line.required);
  const requiredFilled = required.filter((line) => line.filled).length;
  return {
    lines,
    requiredTotal: required.length,
    requiredFilled,
    percent: required.length === 0 ? 0 : Math.round((requiredFilled / required.length) * 100),
    complete: required.length > 0 && requiredFilled === required.length,
  };
}

/** Labels of required fields that are still blank — used to gate the button. */
export function missingRequiredFields(form: Record<string, string>): string[] {
  return visibleFields(form)
    .filter((field) => field.required && !String(form[field.id] || '').trim())
    .map((field) => field.label);
}
