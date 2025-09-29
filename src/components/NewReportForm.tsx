'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { FormEvent } from 'react';

type FlooringOption = {
  value: string;
  materials: string[];
};

type NewReportFormProps = {
  // onSubmit now receives the form state plus an `author` string (user id)
  onSubmit?: (data: NewReportFormState & { author: string }) => void;
  onDimensionsChange?: (enabled: boolean) => void;
  onDimensionsValues?: (vals: { length: number | null; width: number | null; thickness: number | null }) => void;
  imageCount?: number;
};

type NewReportFormState = {
  reportName: string;
  flooringType: string;
  material: string;
  look: string;
  texture: string;
  finish: string;
  edge: string;
  length: string;
  width: string;
  thickness: string;
  units: 'relative' | 'absolute';
};

const FLOORING_OPTIONS: FlooringOption[] = [
  { value: 'Any', materials: [] },
  { value: 'Tile', materials: ['Ceramic', 'Porcelain', 'Stone', 'Mosaic'] },
  { value: 'Wood', materials: ['Oak', 'Maple', 'Walnut', 'Bamboo'] },
  { value: 'Vinyl', materials: ['Luxury Vinyl', 'Sheet Vinyl', 'Rigid Core'] },
  { value: 'Laminate', materials: ['High Gloss', 'Textured', 'Water Resistant'] },
  { value: 'Carpet', materials: ['Nylon', 'Polyester', 'Wool'] },
];

const INITIAL_FORM_STATE: NewReportFormState = {
  reportName: '',
  flooringType: 'Any',
  material: 'Any',
  look: 'Any',
  texture: 'Any',
  finish: 'Any',
  edge: 'Any',
  length: '',
  width: '',
  thickness: '',
  units: 'absolute',
};

const INITIAL_TOUCHED_STATE = {
  reportName: false,
};

export function NewReportForm({ onSubmit, onDimensionsChange, onDimensionsValues, imageCount = 0 }: NewReportFormProps) {
  const [form, setForm] = useState<NewReportFormState>(INITIAL_FORM_STATE);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    reportName: false,
    category: false,
    dimensions: false,
    attributes: false,
  });
  const { user } = useAuth();
  const [touched, setTouched] = useState(INITIAL_TOUCHED_STATE);
  const [isReportNameFocused, setIsReportNameFocused] = useState(false);
  const reportNameRef = useRef<HTMLInputElement>(null);

  const selectedFlooring = useMemo(
    () => FLOORING_OPTIONS.find((option) => option.value === form.flooringType),
    [form.flooringType]
  );

  const materialOptions = useMemo(() => {
    if (!selectedFlooring || selectedFlooring.materials.length === 0) {
      return [] as string[];
    }

    return selectedFlooring.materials;
  }, [selectedFlooring]);

  const handleFlooringChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      flooringType: value,
      material: 'Any',
    }));
  };

  const handleMaterialChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      material: value,
    }));
  };

  const NUMERIC_RE = /^\d*(?:\.\d*)?$/;

  const handleNumericChange = (field: 'length' | 'width' | 'thickness', value: string) => {
    // allow empty string
    if (value === '') {
      setForm((prev) => ({ ...prev, [field]: '' }));
      return;
    }

    // reject negative sign or multiple decimals; allow digits and single optional decimal
    if (!NUMERIC_RE.test(value)) return;

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Notify parent about whether both length and width are present — run in effect to avoid
  // calling parent's setState during render of this component.
  useEffect(() => {
    try {
      onDimensionsChange?.(form.length !== '' && form.width !== '');
      const lengthVal = form.length === '' ? null : Number.parseFloat(form.length);
      const widthVal = form.width === '' ? null : Number.parseFloat(form.width);
      const thicknessVal = form.thickness === '' ? null : Number.parseFloat(form.thickness);
      onDimensionsValues?.({ length: lengthVal, width: widthVal, thickness: thicknessVal });
    } catch {
      // ignore
    }
  }, [form.length, form.width, form.thickness, onDimensionsChange, onDimensionsValues]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.reportName.trim() === '') {
      setTouched((prev) => ({ ...prev, reportName: true }));
      setIsReportNameFocused(false);
      return;
    }

    if ((imageCount ?? 0) === 0) {
      setErrorMessage('Please add at least one image before creating a report.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // attach author from current auth state if available
      const author = user?.id ?? 'guest';
      onSubmit?.({ ...form, author });
    } catch {
      setErrorMessage('Failed to create report. Please try again.');
    } finally {
      // leave loading state briefly to show spinner; real API should control this
      setTimeout(() => setIsSubmitting(false), 600);
    }
  };

  const handleReportNameFocus = () => {
    setIsReportNameFocused(true);
  };

  const handleReportNameBlur = () => {
    setIsReportNameFocused(false);
    setTouched((prev) => ({ ...prev, reportName: true }));
  };

  const isReportNameMissing =
    touched.reportName && !isReportNameFocused && form.reportName.trim() === '';
  const reportNameErrorId = isReportNameMissing ? 'report-name-error' : undefined;

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine whether submit button should be enabled: needs report name and at least one image
  const canSubmit = form.reportName.trim() !== '' && (imageCount ?? 0) > 0;

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="report-form__body">
      <section className={`form-section ${collapsed.reportName ? 'form-section--collapsed' : ''}`}>
        <div className="form-section__header">
          <button
            type="button"
            className="form-section__title"
            aria-expanded={!collapsed.reportName}
            aria-controls="report-name-content"
            onClick={() => toggleSection('reportName')}
          >
            <span className="form-section__title-text">Report Name <span className="form-field__required">*</span></span>
            <span className={`form-section__chev ${collapsed.reportName ? 'is-collapsed' : ''}`} aria-hidden />
          </button>
        </div>
        <div id="report-name-content" className="form-section__content">
          <input
            id="report-name"
            ref={reportNameRef}
            value={form.reportName}
            onChange={(event) => {
              const value = event.target.value;
              setForm((prev) => ({
                ...prev,
                reportName: value,
              }));
              setTouched((prev) => ({ ...prev, reportName: false }));
            }}
            placeholder="Enter report name"
            onFocus={handleReportNameFocus}
            onBlur={handleReportNameBlur}
            aria-invalid={isReportNameMissing}
            aria-describedby={reportNameErrorId}
            className={`form-control${isReportNameMissing ? ' form-control--error' : ''}`}
          />
          {isReportNameMissing && (
            <p className="form-field__hint" id={reportNameErrorId} role="alert">
              Please enter a report name.
            </p>
          )}
        </div>
      </section>

  

      <section className={`form-section ${collapsed.category ? 'form-section--collapsed' : ''}`}>
        <div className="form-section__header">
          <button
            type="button"
            className="form-section__title"
            aria-expanded={!collapsed.category}
            aria-controls="category-content"
            onClick={() => toggleSection('category')}
          >
            Category
            <span className={`form-section__chev ${collapsed.category ? 'is-collapsed' : ''}`} aria-hidden />
          </button>
        </div>
        <div id="category-content" className="form-section__content">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="flooring-type" className="form-field__label form-field__label--secondary">
                Type
              </label>
              <select
                id="flooring-type"
                value={form.flooringType}
                onChange={(event) => handleFlooringChange(event.target.value)}
                className="form-control select-control"
              >
                {FLOORING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="flooring-material" className="form-field__label form-field__label--secondary">
                Material
              </label>
              <select
                id="flooring-material"
                value={form.material}
                onChange={(event) => handleMaterialChange(event.target.value)}
                className="form-control select-control"
              >
                <option value="Any">Any</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className={`form-section ${collapsed.dimensions ? 'form-section--collapsed' : ''}`}>
        <div className="form-section__header">
          <button
            type="button"
            className="form-section__title"
            aria-expanded={!collapsed.dimensions}
            aria-controls="dimensions-content"
            onClick={() => toggleSection('dimensions')}
          >
            Dimensions
            <span className={`form-section__chev ${collapsed.dimensions ? 'is-collapsed' : ''}`} aria-hidden />
          </button>
        </div>
        <div id="dimensions-content" className="form-section__content">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="length" className="form-field__label form-field__label--secondary">
              Length{form.units === 'absolute' ? ' (inches)' : ''}
            </label>
            <input
              id="length"
              type="text"
              inputMode="decimal"
              pattern="^\d*(?:\.\d*)?$"
              value={form.length}
              onChange={(event) => handleNumericChange('length', event.target.value)}
              className="form-control"
            />
          </div>
          <div className="form-field">
            <label htmlFor="width" className="form-field__label form-field__label--secondary">
              Width{form.units === 'absolute' ? ' (inches)' : ''}
            </label>
            <input
              id="width"
              type="text"
              inputMode="decimal"
              pattern="^\d*(?:\.\d*)?$"
              value={form.width}
              onChange={(event) => handleNumericChange('width', event.target.value)}
              className="form-control"
            />
          </div>
          <div className="form-field form-grid__full">
            <label htmlFor="thickness" className="form-field__label form-field__label--secondary">
              Thickness (mm)
            </label>
            <input
              id="thickness"
              type="text"
              inputMode="decimal"
              pattern="^\d*(?:\.\d*)?$"
              value={form.thickness}
              onChange={(event) => handleNumericChange('thickness', event.target.value)}
              className="form-control"
            />
          </div>
          <div
            className="form-field form-field--inline form-grid__full"
            role="radiogroup"
            aria-labelledby="units-label"
          >
            <span
              id="units-label"
              className="form-field__label form-field__label--secondary"
            >
              Units
            </span>
            <div className="form-radio-group">
              <label className="form-radio">
                <input
                  type="radio"
                  name="units"
                  value="absolute"
                  checked={form.units === 'absolute'}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      units: 'absolute',
                    }))
                  }
                />
                <span>Absolute</span>
              </label>
              <label className="form-radio">
                <input
                  type="radio"
                  name="units"
                  value="relative"
                  checked={form.units === 'relative'}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      units: 'relative',
                    }))
                  }
                />
                <span>Relative</span>
              </label>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Attributes section: grouped like Dimensions with secondary labels */}
      <section className={`form-section ${collapsed.attributes ? 'form-section--collapsed' : ''}`}>
        <div className="form-section__header">
          <button
            type="button"
            className="form-section__title"
            aria-expanded={!collapsed.attributes}
            aria-controls="attributes-content"
            onClick={() => toggleSection('attributes')}
          >
            Attributes
            <span className={`form-section__chev ${collapsed.attributes ? 'is-collapsed' : ''}`} aria-hidden />
          </button>
        </div>
        <div id="attributes-content" className="form-section__content">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="look" className="form-field__label form-field__label--secondary">
              Look
            </label>
            <select
              id="look"
              value={form.look}
              onChange={(e) => setForm((prev) => ({ ...prev, look: e.target.value }))}
              className="form-control select-control"
            >
              <option value="Any">Any</option>
              <option value="Modern">Modern</option>
              <option value="Rustic">Rustic</option>
              <option value="Industrial">Industrial</option>
              <option value="Traditional">Traditional</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="texture" className="form-field__label form-field__label--secondary">
              Texture
            </label>
            <select
              id="texture"
              value={form.texture}
              onChange={(e) => setForm((prev) => ({ ...prev, texture: e.target.value }))}
              className="form-control select-control"
            >
              <option value="Any">Any</option>
              <option value="Smooth">Smooth</option>
              <option value="Hand-scraped">Hand-scraped</option>
              <option value="Wire-brushed">Wire-brushed</option>
              <option value="Textured">Textured</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="finish" className="form-field__label form-field__label--secondary">
              Finish
            </label>
            <select
              id="finish"
              value={form.finish}
              onChange={(e) => setForm((prev) => ({ ...prev, finish: e.target.value }))}
              className="form-control select-control"
            >
              <option value="Any">Any</option>
              <option value="Matte">Matte</option>
              <option value="Satin">Satin</option>
              <option value="Gloss">Gloss</option>
              <option value="UV">UV</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="edge" className="form-field__label form-field__label--secondary">
              Edge
            </label>
            <select
              id="edge"
              value={form.edge}
              onChange={(e) => setForm((prev) => ({ ...prev, edge: e.target.value }))}
              className="form-control select-control"
            >
              <option value="Any">Any</option>
              <option value="Square">Square</option>
              <option value="Beveled">Beveled</option>
              <option value="Micro-bevel">Micro-bevel</option>
              <option value="Eased">Eased</option>
            </select>
          </div>
        </div>
        </div>
      </section>

      {/* keep error area and submit inside the scrollable body so they scroll with the form */}
      {errorMessage && (
        <div className="form-field__hint" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="report-form__footer">
        <button
          type="submit"
          className="report-create__submit"
          disabled={!canSubmit || isSubmitting}
          aria-disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <svg className="button-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="#ffffff33" strokeWidth="4" />
              <path d="M22 12A10 10 0 0 1 12 22" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            </svg>
          ) : (
            'Create Report'
          )}
        </button>
      </div>

      </div>
    </form>
  );
}

export type { NewReportFormState };
