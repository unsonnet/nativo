'use client';

import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

type FlooringOption = {
  value: string;
  materials: string[];
};

type NewReportFormProps = {
  onSubmit?: (data: NewReportFormState) => void;
};

type NewReportFormState = {
  reportName: string;
  flooringType: string;
  material: string;
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
  length: '',
  width: '',
  thickness: '',
  units: 'absolute',
};

const INITIAL_TOUCHED_STATE = {
  reportName: false,
};

export function NewReportForm({ onSubmit }: NewReportFormProps) {
  const [form, setForm] = useState<NewReportFormState>(INITIAL_FORM_STATE);
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
      setIsReportNameFocused(false);
      return;
    }

    onSubmit?.(form);
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

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <section className="form-section">
        <label htmlFor="report-name" className="form-section__title">
          Report Name <span className="form-field__required">*</span>
        </label>
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
      </section>

      <section className="form-section">
        <label htmlFor="flooring-type" className="form-section__title">
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
      </section>

      {materialOptions.length > 0 && form.flooringType !== 'Any' && (
        <section className="form-section">
          <label htmlFor="flooring-material" className="form-section__title">
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
        </section>
      )}

      <section className="form-section">
        <p className="form-section__title">Dimensions</p>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="length" className="form-field__label form-field__label--secondary">
              Length{form.units === 'absolute' ? ' (inches)' : ''}
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
              Width{form.units === 'absolute' ? ' (inches)' : ''}
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
      </section>

    </form>
  );
}

export type { NewReportFormState };
