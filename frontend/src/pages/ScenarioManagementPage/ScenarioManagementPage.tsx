import { Outlet } from 'react-router-dom';
import { TopNavBar } from '../../components/TopNavBar';
import { SplitPaneLayout } from '../../components/SplitPaneLayout';
import { ScenarioListPane } from '../../components/ScenarioListPane';
import { ScenarioDetailPane } from '../../components/ScenarioDetailPane';
import styles from './ScenarioManagementPage.module.scss';

export const ScenarioManagementPage: React.FC = () => {
  return (
    <div className={styles.pageContainer} data-testid="scenario-management-page">
      <TopNavBar />
      <div className={styles.navSpacer} />
      <div className={styles.contentArea}>
        <SplitPaneLayout
          lhs={<ScenarioListPane />}
          rhs={<ScenarioDetailPane />}
        />
      </div>
      {/* Outlet renders null for child routes; keeps React Router context active for useParams() */}
      <Outlet />
    </div>
  );
};

export default ScenarioManagementPage;
