import { useNavigate } from 'react-router-dom';
import { Text } from '@fluentui/react-components';
import { getWorkflowStateLabel } from '../../utils/labelMappings';
import styles from './AnalysisHeader.module.scss';

interface AnalysisHeaderProps {
  scenarioId: string;
  scenarioName: string | null;
  workflowState: string | null;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
  scenarioId,
  scenarioName,
  workflowState,
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(`/scenarios/${scenarioId}`);
  };

  return (
    <div className={styles.header}>
      <button
        className={styles.backLink}
        onClick={handleBackClick}
        type="button"
      >
        &larr; Back to Governance
      </button>

      <Text
        className={styles.scenarioName}
        size={500}
        weight="semibold"
      >
        {scenarioName ?? 'Untitled Scenario'}
      </Text>

      {workflowState && (
        <span className={styles.workflowChip}>
          {getWorkflowStateLabel(workflowState)}
        </span>
      )}
    </div>
  );
};

export default AnalysisHeader;
