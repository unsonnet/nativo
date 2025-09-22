export type WorkspaceImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

export type WorkspaceTool = 'none' | 'pan' | 'scale' | 'rotate' | 'erase' | 'restore';
