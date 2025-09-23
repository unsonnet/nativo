'use client';

import type { LucideIcon } from 'lucide-react';
import { Brush, Eraser, Home, Move, RotateCcw, Undo2, ZoomIn, Hand, Eye, EyeOff } from 'lucide-react';

import type { WorkspaceTool } from '../types';

type ToolConfig = {
  id: Exclude<WorkspaceTool, 'none'>;
  icon: LucideIcon;
  label: string;
  description: string;
};

const TOOL_DESCRIPTIONS: Record<WorkspaceTool, string> = {
  hand: 'Move and scale the image — click+drag to pan/translate, scroll to zoom',
  translate: 'Move and scale the selection rectangle',
  rotate: 'Rotate the selection rectangle',
  erase: 'Lasso to mask (hide) parts of the image',
  restore: 'Lasso to restore (show) masked parts of the image',
  none: 'Select a tool to begin',
};

const GRID_TOOLS: ToolConfig[] = [
  { id: 'translate', icon: Move, label: 'Translate', description: 'Move and scale the selection rectangle' },
  { id: 'rotate', icon: RotateCcw, label: 'Rotate', description: 'Rotate the selection rectangle' },
];

const HAND_TOOL: ToolConfig = { id: 'hand', icon: Hand, label: 'Hand', description: 'Move and scale the image' };

const MASK_TOOLS: ToolConfig[] = [
  { id: 'erase', icon: Eraser, label: 'Erase', description: 'Mask (hide) parts of the image' },
  { id: 'restore', icon: Brush, label: 'Restore', description: 'Restore (show) masked parts of the image' },
];

type ToolbarProps = {
  activeTool: WorkspaceTool;
  onToolChange: (tool: WorkspaceTool) => void;
  onUndo: () => void;
  canUndo: boolean;
  onResetViewport: () => void;
  canResetViewport: boolean;
  modifierActive?: boolean;
  maskVisible?: boolean;
  onToggleMaskVisible?: (v: boolean) => void;
  tempActiveTool?: WorkspaceTool | null;
  gridEnabled?: boolean;
  selectionVisible?: boolean;
  onToggleSelectionVisible?: (v: boolean) => void;
};

export function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  canUndo,
  onResetViewport,
  canResetViewport,
  modifierActive = false,
  maskVisible = true,
  onToggleMaskVisible,
  tempActiveTool = null,
  gridEnabled = true,
  selectionVisible = true,
  onToggleSelectionVisible,
}: ToolbarProps) {
  const handleChange = (tool: WorkspaceTool) => {
    // If clicking the currently active hand tool, keep it selected (it's the default)
    if (tool === activeTool) {
      if (tool === 'hand') return;
      // deselecting a non-hand tool returns to hand
      onToolChange('hand');
      return;
    }
    onToolChange(tool);
  };

  return (
    <header className="toolbar">
      {/* Hand sits at the far left as the persistent default tool */}
      <div className="toolbar__group toolbar__group--hand">
        {(() => {
          const Icon = HAND_TOOL.icon;
          // consider modifierActive to temporarily highlight hand button
          const isActive = modifierActive ? true : activeTool === HAND_TOOL.id;
          return (
            <button
              key="hand"
              type="button"
              className={`toolbar__button${isActive ? ' toolbar__button--active' : ''}`}
              onClick={() => handleChange(HAND_TOOL.id)}
              title={HAND_TOOL.description}
            >
              <Icon className="toolbar__icon" strokeWidth={1.9} />
            </button>
          );
        })()}
      </div>

      <div className="toolbar__group">
        <span className="toolbar__group-label">Grid:</span>
        {GRID_TOOLS.map((tool) => {
          const Icon = tool.icon;
          // If there's a temporary override, only the temp tool should appear active
          const isActive = tempActiveTool
            ? tempActiveTool === tool.id
            : !modifierActive && activeTool === tool.id && activeTool !== 'hand';
          return (
            <button
              key={tool.id}
              type="button"
              className={`toolbar__button${isActive ? ' toolbar__button--active' : ''}${!gridEnabled ? ' toolbar__button--disabled' : ''}`}
              onClick={() => gridEnabled && handleChange(tool.id)}
              title={tool.description}
              disabled={!gridEnabled}
            >
              <Icon className="toolbar__icon" strokeWidth={1.9} />
            </button>
          );
        })}
        {/* Selection visibility toggle sits at the end of grid group */}
        {(() => {
          const Icon = selectionVisible ? Eye : EyeOff;
          const disabled = !gridEnabled;
          return (
            <button
              key="grid-visibility"
              type="button"
              className={`toolbar__button${disabled ? ' toolbar__button--disabled' : ''}`}
              onClick={() => !disabled && onToggleSelectionVisible && onToggleSelectionVisible(!selectionVisible)}
              title={selectionVisible ? 'Hide selection rectangle' : 'Show selection rectangle'}
              disabled={disabled}
            >
              <Icon className="toolbar__icon" strokeWidth={1.9} />
            </button>
          );
        })()}
      </div>

      <span className="toolbar__divider" aria-hidden />

      <div className="toolbar__group">
        <span className="toolbar__group-label">Mask:</span>
        {MASK_TOOLS.map((tool) => {
          const Icon = tool.icon;
          // When a temporary tool override exists, highlight that tool instead
          const isActive = tempActiveTool ? tempActiveTool === tool.id : !modifierActive && activeTool === tool.id;
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
        {/* Visibility toggle sits at the end of mask group */}
        {(() => {
          const Icon = maskVisible ? Eye : EyeOff;
          return (
            <button
              key="visibility"
              type="button"
              className={`toolbar__button`}
              onClick={() => onToggleMaskVisible && onToggleMaskVisible(!maskVisible)}
              title={maskVisible ? 'Hide erased areas (transparent)' : 'Show erased areas (striped)'}
            >
              <Icon className="toolbar__icon" strokeWidth={1.9} />
            </button>
          );
        })()}
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
