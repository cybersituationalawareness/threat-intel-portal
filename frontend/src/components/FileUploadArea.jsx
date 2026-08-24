import React from 'react';

const FileUploadArea = ({
  dragActive,
  handleDrag,
  handleDrop,
  handleFileChange,
  attachments,
  removeAttachment,
  idSuffix = ''
}) => {
  return (
    <>
      <div 
        className={`drag-drop-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      >
        <p>Drag and drop files here or click to select</p>
        <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} id={`file-upload${idSuffix}`} />
        <label htmlFor={`file-upload${idSuffix}`} className="submit-btn" style={{ cursor: 'pointer', display: 'inline-block', marginTop: '10px' }}>Browse Files</label>
      </div>
      {attachments.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          {attachments.map((file, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: 'var(--bg-glass)', margin: '5px 0' }}>
              <span>{file.name}</span>
              <button type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', color: 'var(--alert-color)', cursor: 'pointer' }}>✖</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default FileUploadArea;
