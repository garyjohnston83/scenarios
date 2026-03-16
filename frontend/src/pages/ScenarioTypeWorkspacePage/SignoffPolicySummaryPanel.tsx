import { useState, useEffect, useRef } from 'react';
import {
  MessageBar,
  MessageBarBody,
  Badge,
} from '@fluentui/react-components';
import {
  CheckmarkCircle24Regular,
  ErrorCircle24Regular,
  ChevronDown24Regular,
  ChevronRight24Regular,
} from '@fluentui/react-icons';
import type { SignoffPolicyDefinitionDetail, RuleSummary } from '../../services/signoffPolicyDefinitionAdminApi';
import {
  extractPolicyHeader,
  generateClientRuleSummaries,
  validateDefinition,
} from '../../utils/signoffPolicySummaryUtils';
import type {
  PolicyHeaderInfo,
  ClientRuleSummary,
  ValidationResult,
} from '../../utils/signoffPolicySummaryUtils';
import styles from './SignoffPolicySummaryPanel.module.scss';

interface SignoffPolicySummaryPanelProps {
  definitionJson: string;
  selectedDefinition: SignoffPolicyDefinitionDetail | null;
}

export const SignoffPolicySummaryPanel: React.FC<SignoffPolicySummaryPanelProps> = ({
  definitionJson,
  selectedDefinition,
}) => {
  const [policyHeader, setPolicyHeader] = useState<PolicyHeaderInfo | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [] });
  const [ruleSummaries, setRuleSummaries] = useState<ClientRuleSummary[]>([]);
  const [parseError, setParseError] = useState<boolean>(false);
  const [errorsExpanded, setErrorsExpanded] = useState<boolean>(false);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced parsing of definitionJson (~300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!definitionJson || definitionJson.trim() === '') {
      setPolicyHeader(null);
      setValidation({ valid: true, errors: [] });
      setRuleSummaries([]);
      setParseError(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Extract header
      const header = extractPolicyHeader(definitionJson);
      if (header) {
        setPolicyHeader(header);
        setParseError(false);
      } else {
        setPolicyHeader(null);
        setParseError(true);
      }

      // Validate
      const result = validateDefinition(definitionJson);
      setValidation(result);

      // Generate summaries
      const clientSummaries = generateClientRuleSummaries(definitionJson);
      setRuleSummaries(clientSummaries);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [definitionJson]);

  // Determine which rule summaries to display:
  // - If the definitionJson matches the saved definition, use backend-generated summaries
  // - Otherwise, use client-side generated summaries
  const displaySummaries = useRuleSummariesForDisplay(
    ruleSummaries,
    selectedDefinition,
    definitionJson
  );

  // --- Empty state ---
  if (!definitionJson || definitionJson.trim() === '') {
    return (
      <div className={styles.container} data-testid="sp-summary-panel">
        <div className={styles.header}>
          <span className={styles.headerTitle}>Policy Summary</span>
        </div>
        <div className={styles.helperText}>
          Sign-off policy definitions control who must approve a scenario before it can be finalized.
        </div>
        <div className={styles.emptyState} data-testid="sp-summary-empty">
          Select a definition to view its summary.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="sp-summary-panel">
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Policy Summary</span>
      </div>

      {/* Helper text */}
      <div className={styles.helperText}>
        Sign-off policy definitions control who must approve a scenario before it can be finalized.
      </div>

      {/* Parse error */}
      {parseError && (
        <MessageBar intent="error" data-testid="sp-summary-parse-error">
          <MessageBarBody>
            Unable to parse definition JSON.
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Policy header section */}
      {policyHeader && (
        <div className={styles.policyHeaderSection} data-testid="sp-summary-policy-header">
          <div className={styles.policyHeaderTitle}>
            {policyHeader.displayName || '(no display name)'}
          </div>
          {policyHeader.description && (
            <div className={styles.policyDescription} data-testid="sp-summary-description">
              {policyHeader.description}
            </div>
          )}
          <div className={styles.policyMetaRow}>
            {policyHeader.schemaVersion && (
              <span className={styles.policyMetaItem} data-testid="sp-summary-schema-version">
                Schema: {policyHeader.schemaVersion}
              </span>
            )}
            {policyHeader.policyKey && (
              <span className={styles.policyMetaItem} data-testid="sp-summary-policy-key">
                Key: {policyHeader.policyKey}
              </span>
            )}
            {policyHeader.resolutionStrategy && (
              <span className={styles.policyMetaItem} data-testid="sp-summary-resolution-strategy">
                Strategy: {policyHeader.resolutionStrategy}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Validation status */}
      <div className={styles.validationSection} data-testid="sp-summary-validation">
        {validation.valid ? (
          <div className={styles.validationValid} data-testid="sp-summary-validation-valid">
            <CheckmarkCircle24Regular className={styles.validIcon} />
            <span>Valid</span>
          </div>
        ) : (
          <div className={styles.validationInvalid}>
            <div
              className={styles.validationInvalidHeader}
              onClick={() => setErrorsExpanded(!errorsExpanded)}
              data-testid="sp-summary-validation-invalid"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setErrorsExpanded(!errorsExpanded);
                }
              }}
            >
              <ErrorCircle24Regular className={styles.invalidIcon} />
              <span>Invalid ({validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''})</span>
              {errorsExpanded ? (
                <ChevronDown24Regular className={styles.expandIcon} />
              ) : (
                <ChevronRight24Regular className={styles.expandIcon} />
              )}
            </div>
            {errorsExpanded && (
              <ul className={styles.errorList} data-testid="sp-summary-error-list">
                {validation.errors.map((error, idx) => (
                  <li key={idx} className={styles.errorItem}>
                    {error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Rule summaries list */}
      <div className={styles.ruleSummariesSection} data-testid="sp-summary-rules">
        <div className={styles.ruleSummariesHeader}>
          Rules ({displaySummaries.length})
        </div>

        {displaySummaries.length === 0 ? (
          <div className={styles.noRules} data-testid="sp-summary-no-rules">
            No rules found in the definition.
          </div>
        ) : (
          <div className={styles.ruleSummariesList}>
            {displaySummaries.map((summary, idx) => (
              <div
                key={`${summary.ruleKey}-${idx}`}
                className={styles.ruleSummaryCard}
                data-testid={`sp-rule-summary-${idx}`}
              >
                <div className={styles.ruleSummaryHeader}>
                  <span className={styles.ruleName}>{summary.ruleName}</span>
                  <Badge
                    appearance="filled"
                    color={summary.isEnabled ? 'success' : 'informative'}
                    size="small"
                    data-testid={`sp-rule-badge-${idx}`}
                  >
                    {summary.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className={styles.ruleSummaryBody}>
                  <div className={styles.summaryLabel}>Conditions:</div>
                  <div
                    className={styles.summaryText}
                    data-testid={`sp-rule-condition-summary-${idx}`}
                  >
                    {summary.conditionSummary}
                  </div>
                  <div className={styles.summaryLabel}>Effect:</div>
                  <div
                    className={styles.summaryText}
                    data-testid={`sp-rule-effect-summary-${idx}`}
                  >
                    {summary.effectSummary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Determines which summaries to display:
 * - If the current JSON matches the saved definition's JSON, use backend-generated summaries
 *   (they are richer / more polished)
 * - Otherwise, use client-side generated summaries for live preview
 */
function useRuleSummariesForDisplay(
  clientSummaries: ClientRuleSummary[],
  selectedDefinition: SignoffPolicyDefinitionDetail | null,
  currentJson: string,
): ClientRuleSummary[] {
  // Check if the JSON matches the saved definition
  if (
    selectedDefinition?.definition &&
    selectedDefinition.ruleSummaries &&
    selectedDefinition.ruleSummaries.length > 0
  ) {
    // Simple check: if JSON content matches, use backend summaries
    try {
      const currentParsed = JSON.parse(currentJson);
      const savedParsed = JSON.parse(selectedDefinition.definition);
      if (JSON.stringify(currentParsed) === JSON.stringify(savedParsed)) {
        // Use backend summaries, augmenting with isEnabled from parsed rules
        return mapBackendSummaries(selectedDefinition.ruleSummaries, currentJson);
      }
    } catch {
      // If comparison fails, fall through to client summaries
    }
  }

  return clientSummaries;
}

function mapBackendSummaries(
  backendSummaries: RuleSummary[],
  jsonString: string,
): ClientRuleSummary[] {
  // Try to extract isEnabled from the JSON
  const rulesMap: Record<string, boolean> = {};
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed.rules)) {
      parsed.rules.forEach((r: { rule_key?: string; is_enabled?: boolean }) => {
        if (r.rule_key) {
          rulesMap[r.rule_key] = r.is_enabled !== false;
        }
      });
    }
  } catch {
    // ignore
  }

  return backendSummaries.map((bs) => ({
    ruleKey: bs.ruleKey,
    ruleName: bs.ruleName,
    isEnabled: rulesMap[bs.ruleKey] !== undefined ? rulesMap[bs.ruleKey] : true,
    conditionSummary: bs.conditionSummary,
    effectSummary: bs.effectSummary,
  }));
}

export default SignoffPolicySummaryPanel;
