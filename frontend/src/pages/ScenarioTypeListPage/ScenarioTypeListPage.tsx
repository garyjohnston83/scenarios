import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchScenarioTypesRequest } from '../../store/scenarioTypeAdminSlice';
import styles from './ScenarioTypeListPage.module.scss';

export const ScenarioTypeListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const scenarioTypes = useAppSelector((state) => state.scenarioTypeAdmin.scenarioTypes);
  const loading = useAppSelector((state) => state.scenarioTypeAdmin.loading);
  const error = useAppSelector((state) => state.scenarioTypeAdmin.error);

  useEffect(() => {
    dispatch(fetchScenarioTypesRequest());
  }, [dispatch]);

  return (
    <div className={styles.pageContainer} data-testid="scenario-type-list-page">
      <span className={styles.pageTitle}>Scenario Types</span>

      {error && <span className={styles.errorText}>{error}</span>}

      {loading && <span className={styles.loadingText}>Loading...</span>}

      <div className={styles.tableContainer}>
        <table className={styles.table} data-testid="scenario-types-table">
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Name</th>
              <th className={styles.tableHeaderCell}>Code</th>
              <th className={styles.tableHeaderCell}>Icon</th>
              <th className={styles.tableHeaderCell}>Enabled</th>
              <th className={styles.tableHeaderCell}>Sort Order</th>
            </tr>
          </thead>
          <tbody>
            {scenarioTypes.map((scenarioType) => (
              <tr
                key={scenarioType.code}
                className={`${styles.tableRow} ${styles.clickableRow}`}
                data-testid={`scenario-type-row-${scenarioType.code}`}
                onClick={() => navigate(`/admin/scenario-types/${scenarioType.code}`)}
              >
                <td className={styles.tableCell}>{scenarioType.name}</td>
                <td className={styles.tableCell}>{scenarioType.code}</td>
                <td className={styles.tableCell}>{scenarioType.icon}</td>
                <td className={styles.tableCell}>{scenarioType.isEnabled ? 'Yes' : 'No'}</td>
                <td className={styles.tableCell}>{scenarioType.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScenarioTypeListPage;
