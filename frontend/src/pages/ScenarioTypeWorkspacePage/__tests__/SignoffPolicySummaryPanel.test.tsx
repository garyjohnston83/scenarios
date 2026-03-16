import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SignoffPolicySummaryPanel } from '../SignoffPolicySummaryPanel';
import type { SignoffPolicyDefinitionDetail } from '../../../services/signoffPolicyDefinitionAdminApi';

// Helper to render with Fluent provider
const renderPanel = (props: {
  definitionJson: string;
  selectedDefinition?: SignoffPolicyDefinitionDetail | null;
}) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      <SignoffPolicySummaryPanel
        definitionJson={props.definitionJson}
        selectedDefinition={props.selectedDefinition ?? null}
      />
    </FluentProvider>
  );
};

const VALID_DEFINITION = JSON.stringify(
  {
    schema_version: '1.0',
    policy_key: 'frtb_sa_signoff',
    scenario_type: 'FRTB_SA',
    display_name: 'FRTB SA Signoff Policy',
    description: 'Policy for FRTB SA sign-offs',
    resolution_strategy: 'STRICTEST_WINS',
    rules: [
      {
        rule_key: 'high_impact_rule',
        name: 'High Impact Rule',
        priority: 1,
        is_enabled: true,
        condition: {
          type: 'GROUP',
          operator: 'AND',
          children: [
            {
              type: 'FACT',
              factType: 'scenario.desk',
              operator: 'EQUALS',
              value: 'FX_OPTIONS',
            },
          ],
        },
        effect: {
          requiredApproverCount: 2,
          approvalMode: 'SEQUENTIAL',
          approvers: [
            { type: 'FIXED_ROLE', roleKey: 'SENIOR_RISK_MANAGER' },
            { type: 'DYNAMIC_ROLE', roleKey: 'HEAD_OF_DESK' },
          ],
        },
      },
      {
        rule_key: 'standard_rule',
        name: 'Standard Rule',
        priority: 2,
        is_enabled: false,
        condition: {
          type: 'GROUP',
          operator: 'OR',
          children: [],
        },
        effect: {
          requiredApproverCount: 1,
          approvalMode: 'UNORDERED',
          approvers: [{ type: 'FIXED_ROLE', roleKey: 'RISK_CONTROLLER' }],
        },
      },
    ],
  },
  null,
  2
);

const INVALID_DEFINITION_MISSING_FIELDS = JSON.stringify({
  schema_version: '2.0',
  // Missing policy_key, display_name, rules
});

describe('SignoffPolicySummaryPanel (Task Group 11)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays policy header (display_name, description, schema_version) from current editor state', async () => {
    renderPanel({ definitionJson: VALID_DEFINITION });

    // Advance past the debounce timer (300ms)
    act(() => {
      jest.advanceTimersByTime(350);
    });

    // Policy header should display
    await waitFor(() => {
      expect(screen.getByTestId('sp-summary-policy-header')).toBeInTheDocument();
    });

    // Display name
    expect(screen.getByText('FRTB SA Signoff Policy')).toBeInTheDocument();

    // Description
    const descriptionEl = screen.getByTestId('sp-summary-description');
    expect(descriptionEl).toHaveTextContent('Policy for FRTB SA sign-offs');

    // Schema version
    const schemaVersionEl = screen.getByTestId('sp-summary-schema-version');
    expect(schemaVersionEl).toHaveTextContent('Schema: 1.0');

    // Policy key
    const policyKeyEl = screen.getByTestId('sp-summary-policy-key');
    expect(policyKeyEl).toHaveTextContent('Key: frtb_sa_signoff');

    // Resolution strategy
    const strategyEl = screen.getByTestId('sp-summary-resolution-strategy');
    expect(strategyEl).toHaveTextContent('Strategy: STRICTEST_WINS');
  });

  it('shows green "Valid" when JSON is well-formed and red "Invalid" with collapsible error list when JSON has issues', async () => {
    // Test valid state first
    const { unmount } = renderPanel({ definitionJson: VALID_DEFINITION });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sp-summary-validation-valid')).toBeInTheDocument();
    });

    expect(screen.getByText('Valid')).toBeInTheDocument();

    unmount();

    // Test invalid state
    renderPanel({ definitionJson: INVALID_DEFINITION_MISSING_FIELDS });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sp-summary-validation-invalid')).toBeInTheDocument();
    });

    // Should show "Invalid" with error count
    expect(screen.getByTestId('sp-summary-validation-invalid')).toHaveTextContent(/Invalid/);

    // Error list should initially be collapsed
    expect(screen.queryByTestId('sp-summary-error-list')).not.toBeInTheDocument();

    // Click to expand error list
    fireEvent.click(screen.getByTestId('sp-summary-validation-invalid'));

    // Error list should now be visible with specific errors
    const errorList = screen.getByTestId('sp-summary-error-list');
    expect(errorList).toBeInTheDocument();

    // Check for specific validation errors
    expect(errorList).toHaveTextContent('schema_version must be "1.0"');
    expect(errorList).toHaveTextContent('Missing required field: policy_key');
    expect(errorList).toHaveTextContent('Missing required field: display_name');
    expect(errorList).toHaveTextContent('Missing required field: rules');
  });

  it('renders rule summaries as a scrollable list with condition and effect text per rule', async () => {
    renderPanel({ definitionJson: VALID_DEFINITION });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sp-summary-rules')).toBeInTheDocument();
    });

    // Should show 2 rules
    expect(screen.getByText('Rules (2)')).toBeInTheDocument();

    // First rule summary card
    const ruleSummary0 = screen.getByTestId('sp-rule-summary-0');
    expect(ruleSummary0).toBeInTheDocument();
    expect(ruleSummary0).toHaveTextContent('High Impact Rule');

    // First rule should have "Enabled" badge
    const badge0 = screen.getByTestId('sp-rule-badge-0');
    expect(badge0).toHaveTextContent('Enabled');

    // First rule condition summary
    const conditionSummary0 = screen.getByTestId('sp-rule-condition-summary-0');
    expect(conditionSummary0).toHaveTextContent('ALL of');
    expect(conditionSummary0).toHaveTextContent('scenario.desk EQUALS FX_OPTIONS');

    // First rule effect summary
    const effectSummary0 = screen.getByTestId('sp-rule-effect-summary-0');
    expect(effectSummary0).toHaveTextContent('Require 2 approval(s) (SEQUENTIAL)');
    expect(effectSummary0).toHaveTextContent('SENIOR_RISK_MANAGER');
    expect(effectSummary0).toHaveTextContent('HEAD_OF_DESK');

    // Second rule summary card
    const ruleSummary1 = screen.getByTestId('sp-rule-summary-1');
    expect(ruleSummary1).toBeInTheDocument();
    expect(ruleSummary1).toHaveTextContent('Standard Rule');

    // Second rule should have "Disabled" badge
    const badge1 = screen.getByTestId('sp-rule-badge-1');
    expect(badge1).toHaveTextContent('Disabled');
  });

  it('updates live as the definitionJson prop changes without manual refresh', async () => {
    const { rerender } = render(
      <FluentProvider theme={webLightTheme}>
        <SignoffPolicySummaryPanel
          definitionJson={VALID_DEFINITION}
          selectedDefinition={null}
        />
      </FluentProvider>
    );

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('FRTB SA Signoff Policy')).toBeInTheDocument();
    });

    expect(screen.getByText('Rules (2)')).toBeInTheDocument();

    // Now change the definition JSON to have a different display name and 1 rule
    const updatedDef = JSON.stringify(
      {
        schema_version: '1.0',
        policy_key: 'updated_policy',
        scenario_type: 'FRTB_SA',
        display_name: 'Updated Policy Name',
        description: 'Updated description',
        resolution_strategy: 'FIRST_MATCH',
        rules: [
          {
            rule_key: 'only_rule',
            name: 'The Only Rule',
            priority: 1,
            is_enabled: true,
            condition: {
              type: 'GROUP',
              operator: 'AND',
              children: [],
            },
            effect: {
              requiredApproverCount: 3,
              approvalMode: 'UNORDERED',
              approvers: [],
            },
          },
        ],
      },
      null,
      2
    );

    // Re-render with updated props (simulates live editing in center panel)
    rerender(
      <FluentProvider theme={webLightTheme}>
        <SignoffPolicySummaryPanel
          definitionJson={updatedDef}
          selectedDefinition={null}
        />
      </FluentProvider>
    );

    act(() => {
      jest.advanceTimersByTime(350);
    });

    // The panel should update with new data
    await waitFor(() => {
      expect(screen.getByText('Updated Policy Name')).toBeInTheDocument();
    });

    expect(screen.getByText('Rules (1)')).toBeInTheDocument();
    expect(screen.getByText('The Only Rule')).toBeInTheDocument();

    // The old data should no longer appear
    expect(screen.queryByText('FRTB SA Signoff Policy')).not.toBeInTheDocument();
    expect(screen.queryByText('High Impact Rule')).not.toBeInTheDocument();
  });
});
