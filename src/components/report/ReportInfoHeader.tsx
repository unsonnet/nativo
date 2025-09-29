"use client";

import { Edit, BarChart3 } from "lucide-react";
import type { Report, Product } from "@/types/report";

interface ReportInfoHeaderProps {
  report: Report<Product>;
}

export function ReportInfoHeader({ report }: ReportInfoHeaderProps) {
  const { reference } = report;
  const format = reference.formats[0]; // Use first format for display
  
  const formatDimensions = () => {
    if (!format) return "Unknown";
    
    const { length, width } = format;
    if (length?.unit === 'none' || width?.unit === 'none') {
      return "Variable dimensions";
    }
    
    return `${length?.val || '?'} x ${width?.val || '?'} ${length?.unit || 'in'}`;
  };

  return (
    <div className="report-info-header">
      <div className="report-info-header__content">
        {/* Report Name */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Report Name</label>
          <h2 className="report-info-header__value">{report.title}</h2>
        </div>

        {/* Flooring Type */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Flooring Type</label>
          <div className="report-info-header__value">
            {reference.category.type || "Unknown"}
          </div>
        </div>

        {/* Material */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Material</label>
          <div className="report-info-header__value">
            {reference.category.material || "Unknown"}
          </div>
        </div>

        {/* Dimensions */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Dimensions</label>
          <div className="report-info-header__value">
            {formatDimensions()}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="report-info-header__actions">
        <button className="button button--secondary report-info-header__edit-btn">
          <Edit className="w-4 h-4" />
          Edit
        </button>
        
        <button className="button button--secondary report-info-header__analysis-btn">
          <BarChart3 className="w-4 h-4" />
          Computed Analysis
        </button>
      </div>
    </div>
  );
}