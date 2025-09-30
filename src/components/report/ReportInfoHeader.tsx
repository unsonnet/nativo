"use client";

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
      // Absolute dimensions: length x width x thickness with units
      const lengthStr = length?.val ? `${length.val}"` : '?';
      const widthStr = width?.val ? `${width.val}"` : '?';
      const thicknessStr = thickness?.val ? `${thickness.val}mm` : '?';
      
      return `${lengthStr} x ${widthStr} x ${thicknessStr}`;
    } else {
      // Relative dimensions: length : width x thickness
      const lengthStr = length?.val ? `${length.val}` : '?';
      const widthStr = width?.val ? `${width.val}` : '?';
      const thicknessStr = thickness?.val ? `${thickness.val}mm` : '?';
      
      return `${lengthStr} : ${widthStr} x ${thicknessStr}`;
    }
  };

  // Helper to get all available categories in preferred order
  const getAvailableCategories = () => {
    const categories = [];
    
    // Always include type and material first if available
    if (reference.category.type) {
      categories.push({ label: "Type", value: reference.category.type });
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
        {/* Dimensions - first position */}
        <div className="report-info-header__section">
          <label className="report-info-header__label">Dimensions</label>
          <div className="report-info-header__value">
            {formatDimensions()}
          </div>
        </div>

        {/* All Available Categories */}
        {availableCategories.map((category, index) => (
          <div key={index} className="report-info-header__section">
            <label className="report-info-header__label">{category.label}</label>
            <div className="report-info-header__value">{category.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}