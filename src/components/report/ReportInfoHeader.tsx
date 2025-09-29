"use client";

import { Edit } from "lucide-react";
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

  // Helper to get all available categories
  const getAvailableCategories = () => {
    const categories = [];
    
    // Always include type and material first if available
    if (reference.category.type) {
      categories.push({ label: "Flooring Type", value: reference.category.type });
    }
    if (reference.category.material) {
      categories.push({ label: "Material", value: reference.category.material });
    }
    
    // Add other categories if they exist
    if (reference.category.look) {
      categories.push({ label: "Look", value: reference.category.look });
    }
    if (reference.category.texture) {
      categories.push({ label: "Texture", value: reference.category.texture });
    }
    if (reference.category.finish) {
      categories.push({ label: "Finish", value: reference.category.finish });
    }
    if (reference.category.edge) {
      categories.push({ label: "Edge", value: reference.category.edge });
    }
    
    return categories;
  };

  const availableCategories = getAvailableCategories();

  return (
    <div className="report-info-header">
      <div className="report-info-header__content">
        {/* Report Name */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Report Name</label>
          <h2 className="report-info-header__value">{report.title}</h2>
        </div>

        {/* All Available Categories */}
        {availableCategories.map((category, index) => (
          <div key={index} className="report-info-header__section">
            <label className="report-info-header__label">{category.label}</label>
            <div className="report-info-header__value">{category.value}</div>
          </div>
        ))}

        {/* Dimensions */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Dimensions</label>
          <div className="report-info-header__value">
            {formatDimensions()}
          </div>
        </div>
      </div>

      {/* Edit Action */}
      <div className="report-info-header__actions">
        <button className="report-info-header__edit-btn">
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>
    </div>
  );
}