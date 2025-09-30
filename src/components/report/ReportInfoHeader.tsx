"use client";

import { Info } from "lucide-react";
import type { Report, Product } from "@/types/report";

interface ReportInfoHeaderProps {
  report: Report<Product>;
}

export function ReportInfoHeader({ report }: ReportInfoHeaderProps) {
  const { reference } = report;
  const format = reference.formats[0]; // Use first format for display
  
  const formatDimensions = () => {
    if (!format) return "Unknown";
    
    const { length, width, thickness } = format;
    
    // Check if dimensions are absolute (have actual units) or relative (unit is 'none')
    const isAbsolute = length?.unit !== 'none' && width?.unit !== 'none';
    
    if (isAbsolute) {
      // Absolute dimensions: length x width [x thickness if set] with units
      const lengthStr = length?.val ? `${length.val}"` : 'unset';
      const widthStr = width?.val ? `${width.val}"` : 'unset';
      const thicknessStr = thickness?.val ? `${thickness.val}mm` : null;
      
      if (thicknessStr) {
        return `${lengthStr} x ${widthStr} x ${thicknessStr}`;
      } else {
        return `${lengthStr} x ${widthStr}`;
      }
    } else {
      // Relative dimensions: length : width [x thickness if set]
      const lengthStr = length?.val ? `${length.val}` : 'unset';
      const widthStr = width?.val ? `${width.val}` : 'unset';
      const thicknessStr = thickness?.val ? `${thickness.val}mm` : null;
      
      if (thicknessStr) {
        return `${lengthStr} : ${widthStr} x ${thicknessStr}`;
      } else {
        return `${lengthStr} : ${widthStr}`;
      }
    }
  };

  // Helper to get all categories in preferred order, including unset ones
  const getAllCategories = () => {
    return [
      { label: "Type", value: reference.category.type },
      { label: "Material", value: reference.category.material },
      { label: "Look", value: reference.category.look },
      { label: "Texture", value: reference.category.texture },
      { label: "Finish", value: reference.category.finish },
      { label: "Edge", value: reference.category.edge }
    ];
  };

  const allCategories = getAllCategories();

  return (
    <div className="report-info-header">
      <div className="report-info-header__content">
        {/* Header Title */}
        <div className="report-info-header__section report-info-header__section--title">
          <div className="report-info-header__title-custom">
            <Info className="w-4 h-4" />
            Reference Info
          </div>
        </div>

        {/* Dimensions - first position */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Dimensions</label>
          <div className="report-info-header__value">
            {formatDimensions()}
          </div>
        </div>

        {/* All Categories - show even if unset */}
        {allCategories.map((category, index) => (
          <div key={index} className="report-info-header__section">
            <label className="report-info-header__label">{category.label}</label>
            <div className={`report-info-header__value ${!category.value ? 'report-info-header__value--unset' : ''}`}>
              {category.value || 'unset'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}