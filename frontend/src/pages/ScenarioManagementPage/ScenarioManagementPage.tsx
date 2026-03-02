import { Outlet, useMatch } from 'react-router-dom';
import { TopNavBar } from '../../components/TopNavBar';
import { SplitPaneLayout } from '../../components/SplitPaneLayout';
import { ScenarioListPane } from '../../components/ScenarioListPane';
import { ScenarioDetailPane } from '../../components/ScenarioDetailPane';
import styles from './ScenarioManagementPage.module.scss';

export const ScenarioManagementPage: React.FC = () => {
  const isAnalysisRoute = useMatch('/scenarios/:id/analysis');

  return (
    <div className={styles.pageContainer} data-testid="scenario-management-page">
      <TopNavBar />
      <div className={styles.navSpacer} />
      <div className={styles.contentArea}>
        <SplitPaneLayout
          lhs={(onCollapse) => <ScenarioListPane onCollapse={onCollapse} />}
          rhs={isAnalysisRoute ? <Outlet /> : <ScenarioDetailPane />}
        />
      </div>
      {/* In governance mode, Outlet renders null for child routes; keeps React Router context active for useParams() */}
      {!isAnalysisRoute && <Outlet />}
    </div>
  );
};

export default ScenarioManagementPage;
