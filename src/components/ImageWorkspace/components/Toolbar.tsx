'use client';

import type { LucideIcon } from 'lucide-react';
import { Brush, Eraser, Home, Move, RotateCcw, Undo2, ZoomIn } from 'lucide-react';

import type { WorkspaceTool } from '../types';

type ToolConfig = {
  id: Exclude<WorkspaceTool, 'none'>;
  icon: LucideIcon;
  label: string;
  description: string;
};

const TOOL_DESCRIPTIONS: Record<WorkspaceTool, string> = {
  pan: 'Click and drag to move the grid position',
  scale: 'Click and drag to resize the grid • Scroll to fine-tune',
  rotate: 'Drag the sphere control to rotate grid in 3D space',
  erase: 'Draw around areas to hide • Multiple selections allowed',
  restore: 'Draw around masked areas to reveal them',
  none: 'Select a tool to begin aligning the grid',
};

const GRID_TOOLS: ToolConfig[] = [
  { id: 'pan', icon: Move, label: 'Pan', description: 'Move the grid position in 2D' },
  { id: 'scale', icon: ZoomIn, label: 'Scale', description: 'Resize the grid scale' },
  { id: 'rotate', icon: RotateCcw, label: 'Rotate', description: 'Rotate grid in 3D space with sphere control' },
];

const MASK_TOOLS: ToolConfig[] = [
  { id: 'erase', icon: Eraser, label: 'Erase', description: 'Lasso tool to mask areas (hide parts of image)' },
  { id: 'restore', icon: Brush, label: 'Restore', description: 'Lasso tool to remove masking (show parts of image)' },
];

type ToolbarProps = {
  activeTool: WorkspaceTool;
  onToolChange: (tool: WorkspaceTool) => void;
  onUndo: () => void;
  canUndo: boolean;
  onResetViewport: () => void;
  canResetViewport: boolean;
};

export function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  canUndo,
  onResetViewport,
  canResetViewport,
}: ToolbarProps) {
  const handleChange = (tool: WorkspaceTool) => {
    onToolChange(tool === activeTool ? 'none' : tool);
  };

  return (
    <header className="toolbar">
      <div className="toolbar__group">
        <span className="toolbar__group-label">Grid:</span>
        {GRID_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`toolbar__button${isActive ? ' toolbar__button--active' : ''}`}
              onClick={() => handleChange(tool.id)}
              title={tool.description}
            >
              <Icon className="toolbar__icon" strokeWidth={1.9} />
            </button>
          );
        })}
      </div>

      <span className="toolbar__divider" aria-hidden />

      <div className="toolbar__group">
        <span className="toolbar__group-label">Mask:</span>
        {MASK_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`toolbar__button${isActive ? ' toolbar__button--active' : ''}`}
              onClick={() => handleChange(tool.id)}
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
        <button
          type="button"
          className="toolbar__button"
          onClick={onResetViewport}
          disabled={!canResetViewport}
          title="Reset viewport"
        >
          <Home className="toolbar__icon" strokeWidth={1.9} />
        </button>
      </div>

      <div className="toolbar__status" role="status">
        {TOOL_DESCRIPTIONS[activeTool]}
      </div>
    </header>
  );
}
