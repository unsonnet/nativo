'use client';

import type { LucideIcon } from 'lucide-react';
import { Hand, Move3D, Scissors, Undo2, ZoomIn } from 'lucide-react';

const TOOL_DESCRIPTIONS: Record<string, string> = {
  zoom: 'Click and drag to zoom • Scroll to zoom in/out',
  pan: 'Click and drag to move the image',
  perspective: 'Drag corners for perspective • Center for rotation',
  erase: 'Draw around areas to mask • Multiple selections allowed',
  none: 'Select a tool to begin editing',
};

type ToolConfig = {
  id: 'zoom' | 'pan' | 'perspective' | 'erase';
  icon: LucideIcon;
  label: string;
  description: string;
};

const transformTools: ToolConfig[] = [
  { id: 'zoom', icon: ZoomIn, label: 'Zoom', description: 'Zoom in/out on the image' },
  { id: 'pan', icon: Hand, label: 'Pan', description: 'Move the image around' },
  { id: 'perspective', icon: Move3D, label: 'Perspective', description: 'Adjust perspective and rotation' },
];

const editingTools: ToolConfig[] = [
  { id: 'erase', icon: Scissors, label: 'Crop', description: 'Lasso tool to mask unwanted areas' },
];

type ImageToolbarProps = {
  activeTool: 'none' | 'zoom' | 'pan' | 'perspective' | 'erase';
  onToolChange: (tool: 'none' | 'zoom' | 'pan' | 'perspective' | 'erase') => void;
  onUndo: () => void;
  canUndo: boolean;
};

export function ImageToolbar({ activeTool, onToolChange, onUndo, canUndo }: ImageToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar__group">
        <span className="toolbar__group-label">Transform:</span>
        {transformTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`toolbar__button${isActive ? ' toolbar__button--active' : ''}`}
              onClick={() => onToolChange(tool.id as ImageToolbarProps['activeTool'])}
              title={tool.description}
            >
              <Icon className="toolbar__icon" strokeWidth={1.9} />
            </button>
          );
        })}
      </div>

      <span className="toolbar__divider" aria-hidden />

      <div className="toolbar__group">
        <span className="toolbar__group-label">Edit:</span>
        {editingTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`toolbar__button${isActive ? ' toolbar__button--active' : ''}`}
              onClick={() => onToolChange(tool.id as ImageToolbarProps['activeTool'])}
              title={tool.description}
            >
              <Icon className="toolbar__icon" strokeWidth={1.9} />
            </button>
          );
        })}
      </div>

      <span className="toolbar__divider" aria-hidden />

      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last action"
        >
          <Undo2 className="toolbar__icon" strokeWidth={1.9} />
        </button>
      </div>

      <div className="toolbar__status" role="status">
        {TOOL_DESCRIPTIONS[activeTool]}
      </div>
    </header>
  );
}
