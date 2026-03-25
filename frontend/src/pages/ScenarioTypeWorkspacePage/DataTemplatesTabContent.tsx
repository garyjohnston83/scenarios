import { useState, useEffect, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  Label,
} from '@fluentui/react-components';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchTemplatesRequest,
  uploadTemplateRequest,
  activateTemplateRequest,
  deactivateTemplateRequest,
} from '../../store/dataTemplateSlice';
import type { DataTemplateDto } from '../../services/dataTemplateApi';
import { downloadDataTemplate } from '../../services/dataTemplateApi';
import { formatDate } from '../../utils/formatDate';
import styles from './DataTemplatesTabContent.module.scss';

interface DataTemplatesTabContentProps {
  scenarioTypeCode: string;
}

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function formatContentType(contentType: string): string {
  switch (contentType) {
    case 'text/csv':
      return 'CSV';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'XLSX';
    case 'application/vnd.ms-excel':
      return 'XLS';
    default:
      return contentType;
  }
}

export const DataTemplatesTabContent: React.FC<DataTemplatesTabContentProps> = ({
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const templates = useAppSelector((state) => state.dataTemplate.templates);
  const loading = useAppSelector((state) => state.dataTemplate.loading);
  const uploading = useAppSelector((state) => state.dataTemplate.uploading);
  const reduxError = useAppSelector((state) => state.dataTemplate.error);

  const [localError, setLocalError] = useState<string | null>(null);
  const [deactivatingTemplate, setDeactivatingTemplate] = useState<DataTemplateDto | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const error = localError || reduxError;

  useEffect(() => {
    dispatch(fetchTemplatesRequest(scenarioTypeCode));
  }, [dispatch, scenarioTypeCode]);

  const handleUploadClick = () => {
    setLocalError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Reset file input to allow re-uploading same file
    event.target.value = '';

    // Validate extension
    const filename = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext));
    if (!hasValidExtension) {
      setLocalError('Invalid file type. Only CSV, XLSX, and XLS files are accepted.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setLocalError('File exceeds maximum size of 5 MB');
      return;
    }

    setLocalError(null);
    // Default the name to the filename without extension
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setUploadName(nameWithoutExt);
    setUploadFile(file);
    setUploadDialogOpen(true);
  };

  const handleUploadConfirm = () => {
    if (uploadFile && uploadName.trim()) {
      dispatch(uploadTemplateRequest({ scenarioTypeCode, name: uploadName.trim(), file: uploadFile }));
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadName('');
    }
  };

  const handleUploadDialogClose = () => {
    setUploadDialogOpen(false);
    setUploadFile(null);
    setUploadName('');
  };

  const handleDownload = async (template: DataTemplateDto) => {
    try {
      const response = await downloadDataTemplate(scenarioTypeCode, template.id);
      const disposition = response.headers['content-disposition'];
      const filename =
        disposition?.match(/filename="?(.+?)"?$/)?.[1] || template.originalFilename;
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setLocalError('Failed to download template');
    }
  };

  const handleActivate = (template: DataTemplateDto) => {
    dispatch(activateTemplateRequest({ scenarioTypeCode, id: template.id }));
  };

  const handleDeactivateClick = (template: DataTemplateDto) => {
    setDeactivatingTemplate(template);
  };

  const handleDeactivateConfirm = () => {
    if (deactivatingTemplate) {
      dispatch(
        deactivateTemplateRequest({ scenarioTypeCode, id: deactivatingTemplate.id })
      );
      setDeactivatingTemplate(null);
    }
  };

  return (
    <div data-testid="data-templates-tab-content">
      {/* Runtime Editable Badge */}
      <div className={styles.badgeContainer}>
        <span className={`${styles.badge} ${styles.badgeRuntime}`}>Runtime Editable</span>
      </div>

      <div className={styles.description}>
        Manage downloadable CSV/XLSX templates used for scenario data submission.
      </div>

      {/* Error display */}
      {error && <span className={styles.errorText}>{error}</span>}

      {/* Toolbar with upload button */}
      <div className={styles.toolbar}>
        <Button appearance="primary" onClick={handleUploadClick} disabled={uploading}>
          Upload Template
        </Button>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {uploading && <span className={styles.uploadingText}>Uploading...</span>}
      </div>

      {/* Loading state */}
      {loading && <span className={styles.emptyState}>Loading...</span>}

      {/* Empty state */}
      {!loading && templates.length === 0 && (
        <span className={styles.emptyState}>
          No templates configured. Upload a CSV or XLSX file to get started.
        </span>
      )}

      {/* Template list table */}
      {templates.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table} data-testid="templates-table">
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Version</th>
                <th className={styles.tableHeaderCell}>Name</th>
                <th className={styles.tableHeaderCell}>Filename</th>
                <th className={styles.tableHeaderCell}>Format</th>
                <th className={styles.tableHeaderCell}>Status</th>
                <th className={styles.tableHeaderCell}>Uploaded At</th>
                <th className={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className={`${styles.tableRow}${template.isActive ? ` ${styles.activeRow}` : ''}`}
                  data-testid={`template-row-${template.id}`}
                >
                  <td className={styles.tableCell}>{template.version}</td>
                  <td className={styles.tableCell}>{template.name}</td>
                  <td className={styles.tableCell}>{template.originalFilename}</td>
                  <td className={styles.tableCell}>{formatContentType(template.contentType)}</td>
                  <td className={styles.tableCell}>
                    {template.isActive ? (
                      <span className={`${styles.statusBadge} ${styles.statusActive}`}>Active</span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.statusInactive}`}>Inactive</span>
                    )}
                  </td>
                  <td className={styles.tableCell}>{formatDate(template.createdAt)}</td>
                  <td className={styles.tableCell}>
                    <div className={styles.actionsCell}>
                      <Button
                        appearance="subtle"
                        size="small"
                        onClick={() => handleDownload(template)}
                      >
                        Download
                      </Button>
                      {template.isActive ? (
                        <Button
                          appearance="subtle"
                          size="small"
                          onClick={() => handleDeactivateClick(template)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          appearance="subtle"
                          size="small"
                          onClick={() => handleActivate(template)}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Name Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            handleUploadDialogClose();
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <Label>File: </Label>
                  <span>{uploadFile?.name}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Label htmlFor="template-name-input" required>Template Name</Label>
                  <Input
                    id="template-name-input"
                    value={uploadName}
                    onChange={(_e, data) => setUploadName(data.value)}
                    placeholder="Enter a name for this template"

                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleUploadConfirm}
                disabled={!uploadName.trim()}
              >
                Upload
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deactivatingTemplate !== null}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            setDeactivatingTemplate(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Deactivate Template</DialogTitle>
            <DialogContent>
              Are you sure you want to deactivate version {deactivatingTemplate?.version} (
              {deactivatingTemplate?.originalFilename})? This scenario type will have no active
              template.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleDeactivateConfirm}>
                Deactivate
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default DataTemplatesTabContent;
