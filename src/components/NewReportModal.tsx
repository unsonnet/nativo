'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

type NewReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const FLOORING_OPTIONS = [
  { value: 'None', materials: [] as string[] },
  { value: 'Tile', materials: ['Ceramic', 'Porcelain', 'Stone', 'Mosaic'] },
  { value: 'Wood', materials: ['Oak', 'Maple', 'Walnut', 'Bamboo'] },
  { value: 'Vinyl', materials: ['Luxury Vinyl', 'Sheet Vinyl', 'Rigid Core'] },
  { value: 'Laminate', materials: ['High Gloss', 'Textured', 'Water Resistant'] },
  { value: 'Carpet', materials: ['Nylon', 'Polyester', 'Wool'] },
];

const INITIAL_FORM_STATE = {
  reportName: '',
  flooringType: 'None',
  material: 'None',
  length: '',
  width: '',
  thickness: '',
};

const INITIAL_TOUCHED_STATE = {
  reportName: false,
};

export function NewReportModal({ isOpen, onClose }: NewReportModalProps) {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [touched, setTouched] = useState(INITIAL_TOUCHED_STATE);
  const [reportNameFocused, setReportNameFocused] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reportNameRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setForm(() => ({ ...INITIAL_FORM_STATE }));
    setTouched(() => ({ ...INITIAL_TOUCHED_STATE }));
    setReportNameFocused(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    reportNameRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

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

  if (!isOpen) {
    return null;
  }

  const handleFlooringChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      flooringType: value,
      material: 'None',
    }));
  };

  const handleMaterialChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      material: value,
    }));
  };

  const handleNumericChange = (field: 'length' | 'width' | 'thickness', value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.reportName.trim() === '') {
      setTouched((prev) => ({ ...prev, reportName: true }));
      setReportNameFocused(false);
      return;
    }

    handleClose();
  };

  const handleCancel = () => {
    handleClose();
  };

  const handleReportNameFocus = () => {
    setReportNameFocused(true);
  };

  const handleReportNameBlur = () => {
    setReportNameFocused(false);
    setTouched((prev) => ({ ...prev, reportName: true }));
  };

  const isSubmitDisabled = form.reportName.trim() === '';
  const isReportNameMissing =
    touched.reportName && !reportNameFocused && form.reportName.trim() === '';
  const reportNameErrorId = isReportNameMissing ? 'report-name-error' : undefined;

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-report-title"
      ref={dialogRef}
    >
      <div className="modal__overlay" />
      <form onSubmit={handleSubmit} className="modal__panel">
        <header className="modal__header">
          <h2 id="new-report-title" className="modal__title">
            New Report
          </h2>
        </header>

        <div className="form-field">
          <label htmlFor="report-name" className="form-field__label">
            Report Name <span className="form-field__required">*</span>
          </label>
          <input
            id="report-name"
            ref={reportNameRef}
            value={form.reportName}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                reportName: event.target.value,
              }))
            }
            placeholder="Enter report name"
            onFocus={handleReportNameFocus}
            onBlur={handleReportNameBlur}
            aria-invalid={isReportNameMissing}
            aria-describedby={reportNameErrorId}
            className={`form-control${isReportNameMissing ? ' form-control--error' : ''}`}
          />
          {isReportNameMissing && (
            <p className="form-field__hint" id="report-name-error" role="alert">
              Please enter a report name.
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="flooring-type" className="form-field__label">
            Flooring Type
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

        {materialOptions.length > 0 && form.flooringType !== 'None' && (
          <div className="form-field">
            <label htmlFor="flooring-material" className="form-field__label">
              Material
            </label>
            <select
              id="flooring-material"
              value={form.material}
              onChange={(event) => handleMaterialChange(event.target.value)}
              className="form-control select-control"
            >
              <option value="None">None</option>
              {materialOptions.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
          </div>
        )}

        <section className="form-section">
          <p className="form-section__title">Dimensions</p>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="length" className="form-field__label form-field__label--secondary">
                Length (inches)
              </label>
              <input
                id="length"
                type="number"
                min="0"
                value={form.length}
                onChange={(event) => handleNumericChange('length', event.target.value)}
                className="form-control"
              />
            </div>
            <div className="form-field">
              <label htmlFor="width" className="form-field__label form-field__label--secondary">
                Width (inches)
              </label>
              <input
                id="width"
                type="number"
                min="0"
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
                type="number"
                min="0"
                value={form.thickness}
                onChange={(event) => handleNumericChange('thickness', event.target.value)}
                className="form-control"
              />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="button button--secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={isSubmitDisabled}
          >
            Add Images
          </button>
        </div>
      </form>
    </div>
  );
}
