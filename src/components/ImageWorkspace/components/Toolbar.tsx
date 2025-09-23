'use client';

import {
  Brush,
  Eraser,
  Home,
  Move3d,
  Rotate3d,
  Undo2,
  Hand,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkspaceTool } from '../types';

type ToolConfig = { id: WorkspaceTool; icon: LucideIcon; label: string; description: string };

const DESCRIPTIONS: Record<WorkspaceTool, string> = {
  hand: 'Pan/zoom image',
  translate: 'Move/scale selection rectangle',
  rotate: 'Rotate selection rectangle',
  erase: 'Mask (hide) parts of image',
  restore: 'Restore masked parts',
  none: 'Select a tool',
};

const TOOLS_GRID: ToolConfig[] = [
  { id: 'translate', icon: Move3d, label: 'Translate', description: DESCRIPTIONS.translate },
  { id: 'rotate', icon: Rotate3d, label: 'Rotate', description: DESCRIPTIONS.rotate },
];
const TOOLS_MASK: ToolConfig[] = [
  { id: 'erase', icon: Eraser, label: 'Erase', description: DESCRIPTIONS.erase },
  { id: 'restore', icon: Brush, label: 'Restore', description: DESCRIPTIONS.restore },
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

const ToolbarButton = ({
  icon: Icon,
  active,
  disabled,
  onClick,
  title,
}: {
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) => (
  <button
    type="button"
    className={`toolbar__button${active ? ' toolbar__button--active' : ''}${disabled ? ' toolbar__button--disabled' : ''}`}
    onClick={onClick}
    title={title}
    disabled={disabled}
  >
    <Icon className="toolbar__icon" strokeWidth={1.9} />
  </button>
);

/**
 * Toolbar with hand, grid, mask, undo, and viewport reset controls.
 */
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
    if (tool === activeTool) {
      onToolChange(tool === 'hand' ? 'hand' : 'hand');
      return;
    }
    onToolChange(tool);
  };

  return (
    <header className="toolbar">
      {/* Hand tool */}
      <div className="toolbar__group">
        <ToolbarButton
          icon={Hand}
          active={modifierActive || activeTool === 'hand'}
          onClick={() => handleChange('hand')}
          title={DESCRIPTIONS.hand}
        />
      </div>

      {/* Grid tools */}
      <div className="toolbar__group">
        <span className="toolbar__group-label">Grid:</span>
        {TOOLS_GRID.map(({ id, icon, description }) => (
          <ToolbarButton
            key={id}
            icon={icon}
            active={tempActiveTool ? tempActiveTool === id : !modifierActive && activeTool === id}
            disabled={!gridEnabled}
            onClick={() => gridEnabled && handleChange(id)}
            title={description}
          />
        ))}
        <ToolbarButton
          icon={selectionVisible ? Eye : EyeOff}
          disabled={!gridEnabled}
          onClick={() => gridEnabled && onToggleSelectionVisible?.(!selectionVisible)}
          title={selectionVisible ? 'Hide selection rectangle' : 'Show selection rectangle'}
        />
      </div>

      <span className="toolbar__divider" />

      {/* Mask tools */}
      <div className="toolbar__group">
        <span className="toolbar__group-label">Mask:</span>
        {TOOLS_MASK.map(({ id, icon, description }) => (
          <ToolbarButton
            key={id}
            icon={icon}
            active={tempActiveTool ? tempActiveTool === id : !modifierActive && activeTool === id}
            onClick={() => handleChange(id)}
            title={description}
          />
        ))}
        <ToolbarButton
          icon={maskVisible ? Eye : EyeOff}
          onClick={() => onToggleMaskVisible?.(!maskVisible)}
          title={maskVisible ? 'Hide mask overlay' : 'Show mask overlay'}
        />
      </div>

      <span className="toolbar__divider" />

      {/* Undo + Reset */}
      <div className="toolbar__group">
        <ToolbarButton icon={Undo2} disabled={!canUndo} onClick={onUndo} title="Undo" />
        <ToolbarButton icon={Home} disabled={!canResetViewport} onClick={onResetViewport} title="Reset viewport" />
      </div>

      <div className="toolbar__status">{DESCRIPTIONS[activeTool]}</div>
    </header>
  );
}
