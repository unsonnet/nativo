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

export function NewReportModal({ isOpen, onClose }: NewReportModalProps) {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reportNameRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
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
    handleClose();
  };

  const handleCancel = () => {
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-report-title"
      ref={dialogRef}
    >
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        onClick={handleCancel}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg space-y-5 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
      >
        <div className="space-y-2 text-center">
          <h2 id="new-report-title" className="text-xl font-semibold text-white">
            New Report
          </h2>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="report-name" className="text-sm font-medium text-slate-200">
            Report Name <span className="text-red-400">*</span>
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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="flooring-type" className="text-sm font-medium text-slate-200">
            Flooring Type
          </label>
          <div className="relative">
            <select
              id="flooring-type"
              value={form.flooringType}
              onChange={(event) => handleFlooringChange(event.target.value)}
              className="w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {FLOORING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="text-slate-900">
                  {option.value}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-300">
              ▾
            </span>
          </div>
        </div>

        {materialOptions.length > 0 && form.flooringType !== 'None' && (
          <div className="space-y-1.5">
            <label htmlFor="flooring-material" className="text-sm font-medium text-slate-200">
              Material
            </label>
            <div className="relative">
              <select
                id="flooring-material"
                value={form.material}
                onChange={(event) => handleMaterialChange(event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="None" className="text-slate-900">
                  None
                </option>
                {materialOptions.map((material) => (
                  <option key={material} value={material} className="text-slate-900">
                    {material}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-300">
                ▾
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <p className="text-sm font-medium text-slate-200">Dimensions</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="length" className="text-xs font-medium text-slate-300">
                Length (inches)
              </label>
              <input
                id="length"
                type="number"
                min="0"
                value={form.length}
                onChange={(event) => handleNumericChange('length', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="width" className="text-xs font-medium text-slate-300">
                Width (inches)
              </label>
              <input
                id="width"
                type="number"
                min="0"
                value={form.width}
                onChange={(event) => handleNumericChange('width', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="thickness" className="text-xs font-medium text-slate-300">
                Thickness (mm)
              </label>
              <input
                id="thickness"
                type="number"
                min="0"
                value={form.thickness}
                onChange={(event) => handleNumericChange('thickness', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={handleCancel}
            className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/10 px-4 py-2.5 text-base font-medium text-slate-200 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 sm:flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full cursor-pointer rounded-lg bg-white px-4 py-2.5 text-base font-semibold text-slate-950 transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 sm:flex-1"
          >
            Create Report
          </button>
        </div>
      </form>
    </div>
  );
}
