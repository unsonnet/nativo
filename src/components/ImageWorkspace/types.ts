export type WorkspaceImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

export type WorkspaceTool = 'none' | 'hand' | 'translate' | 'rotate' | 'erase' | 'restore';
