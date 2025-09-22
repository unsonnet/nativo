'use client';

import { Dropzone } from './components/Dropzone';
import { PreviewCanvas } from './components/PreviewCanvas';
import { ThumbnailList } from './components/ThumbnailList';
import { Toolbar } from './components/Toolbar';
import { useImageWorkspaceController } from './hooks/useImageWorkspaceController';

import './styles/workspace.css';

export function ImageWorkspace() {
  const {
    library,
    activeTool,
    setActiveTool,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUp,
    handleWheel,
    previewRef,
    imageRef,
    tintOverlayRef,
    lassoPreview,
    isMaskToolActive,
    isViewportDefault,
    resetViewport,
    isViewportPanning,
    imageTransform,
  } = useImageWorkspaceController();

  const canvasClass = library.isDragging
    ? 'report-create__canvas report-create__canvas--dragging'
    : 'report-create__canvas';

  const hasImages = library.images.length > 0 && library.selectedImage;

  return (
    <section
      className={canvasClass}
      onDragEnter={library.handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={library.handleDragLeave}
      onDrop={library.handleDrop}
    >
      <input
        ref={library.fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        onChange={library.handleFileInputChange}
      />

      {!hasImages ? (
        <Dropzone
          isDragging={library.isDragging}
          onChooseClick={library.handleChooseClick}
          onDragEnter={library.handleDragEnter}
          onDragLeave={library.handleDragLeave}
          onDrop={library.handleDrop}
        />
      ) : (
        <div className="report-create__workspace">
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onUndo={() => undefined}
            canUndo={false}
            onResetViewport={resetViewport}
            canResetViewport={!isViewportDefault}
          />

          <PreviewCanvas
            previewRef={previewRef}
            imageRef={imageRef}
            tintOverlayRef={tintOverlayRef}
            selectedImage={library.selectedImage!}
            imageTransform={imageTransform}
            isViewportPanning={isViewportPanning}
            isMaskToolActive={isMaskToolActive}
            lassoPreview={lassoPreview}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            onWheel={handleWheel}
          />

          <ThumbnailList
            images={library.images}
            selectedId={library.selectedId}
            onSelect={library.setSelectedId}
            onRemove={library.removeImage}
            onAdd={library.handleChooseClick}
          />
        </div>
      )}
    </section>
  );
}
