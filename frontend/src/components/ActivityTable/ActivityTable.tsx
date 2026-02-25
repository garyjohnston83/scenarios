import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import { ChatRegular, PersonRegular, SettingsRegular, ArrowDownloadRegular } from '@fluentui/react-icons';
import { formatDate } from '../../utils/formatDate';
import { ExportActivityDialog } from '../ExportActivityDialog';
import styles from './ActivityTable.module.scss';

export interface ActivityRowData {
  id: string;
  bucketType: 'MESSAGE' | 'USER' | 'SYSTEM';
  occurredAt: string;
  authorDisplayName: string;
  details: string;
  statusTransition: string | null;
}

interface ActivityTableProps {
  rows: ActivityRowData[];
}

const ICON_CONFIG: Record<
  ActivityRowData['bucketType'],
  { Icon: React.FC<React.SVGAttributes<SVGElement>>; className: string; title: string }
> = {
  MESSAGE: { Icon: ChatRegular, className: styles.iconMessage, title: 'Message' },
  USER: { Icon: PersonRegular, className: styles.iconUser, title: 'User Event' },
  SYSTEM: { Icon: SettingsRegular, className: styles.iconSystem, title: 'System Event' },
};

export const ActivityTable: React.FC<ActivityTableProps> = ({ rows }) => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeadingRow}>
        <span className={styles.sectionHeading}>Activity</span>
        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowDownloadRegular />}
          onClick={() => setExportDialogOpen(true)}
        >
          Export Activity
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className={styles.emptyState}>No activity recorded</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.typeColumn}>Type</th>
                <th className={styles.dateColumn}>Date/Time</th>
                <th className={styles.authorColumn}>Author</th>
                <th className={styles.detailsColumn}>Details</th>
                <th className={styles.statusColumn}>Status Transition</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { Icon, className: iconClass, title } = ICON_CONFIG[row.bucketType];
                return (
                  <tr key={row.id}>
                    <td className={styles.typeColumn} title={title}>
                      <Icon className={iconClass} />
                    </td>
                    <td className={styles.dateColumn}>
                      {formatDate(row.occurredAt)}
                    </td>
                    <td className={styles.authorColumn}>
                      {row.authorDisplayName}
                    </td>
                    <td className={styles.detailsColumn}>{row.details}</td>
                    <td className={styles.statusColumn}>
                      {row.statusTransition ?? ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ExportActivityDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
    </div>
  );
};

export default ActivityTable;
