import {
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent,
} from '@fluentui/react-components';
import styles from './AnalysisTabs.module.scss';

export interface TabDefinition {
  id: string;
  label: string;
}

interface AnalysisTabsProps {
  tabs: TabDefinition[];
  selectedTab: string;
  onTabSelect: (tabId: string) => void;
}

export const AnalysisTabs: React.FC<AnalysisTabsProps> = ({
  tabs,
  selectedTab,
  onTabSelect,
}) => {
  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    const value = data.value as string;
    onTabSelect(value);
  };

  return (
    <div className={styles.tabsContainer}>
      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
        {tabs.map((tab) => (
          <Tab key={tab.id} value={tab.id}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
    </div>
  );
};

export default AnalysisTabs;
