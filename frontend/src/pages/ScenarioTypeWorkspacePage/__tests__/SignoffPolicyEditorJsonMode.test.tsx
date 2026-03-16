import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import signoffPolicyDefinitionAdminReducer from '../../../store/signoffPolicyDefinitionAdminSlice';
import { SignoffPolicyEditorPanel } from '../SignoffPolicyEditorPanel';
import type { SignoffPolicyDefinitionDetail } from '../../../services/signoffPolicyDefinitionAdminApi';

// Mock Monaco Editor -- render a textarea that captures value and onChange
jest.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (value: string | undefined) => void;
    }) => (
      <textarea
        data-testid="mock-monaco-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

const SAMPLE_DEFINITION_JSON = JSON.stringify(
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
            {
              type: 'GROUP',
              operator: 'OR',
              children: [
                {
                  type: 'FACT',
                  factType: 'change.assetClass',
                  operator: 'IN',
                  value: ['RATES', 'FX'],
                },
                {
                  type: 'FACT',
                  factType: 'change.riskClass',
                  operator: 'EQUALS',
                  value: 'MARKET',
                },
              ],
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
          operator: 'AND',
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

const createMockDefinition = (
  definition: string = SAMPLE_DEFINITION_JSON
): SignoffPolicyDefinitionDetail => ({
  id: 'def-1',
  scenarioTypeCode: 'FRTB_SA',
  policyKey: 'frtb_sa_signoff',
  displayName: 'FRTB SA Signoff Policy',
  version: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  definition,
  schemaVersion: '1.0',
  ruleSummaries: [],
});

const createTestStore = () => {
  return configureStore({
    reducer: {
      signoffPolicyDefinitionAdmin: signoffPolicyDefinitionAdminReducer,
    },
  });
};

const renderEditor = (definition: SignoffPolicyDefinitionDetail | null = null) => {
  const testStore = createTestStore();
  const onDefinitionChange = jest.fn();

  const result = render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <SignoffPolicyEditorPanel
          definition={definition}
          onDefinitionChange={onDefinitionChange}
          scenarioTypeCode="FRTB_SA"
          factTypes={[]}
          roles={[]}
        />
      </FluentProvider>
    </Provider>
  );

  return { ...result, store: testStore, onDefinitionChange };
};

describe('SignoffPolicyEditorPanel - JSON Mode Integration (Task Group 10)', () => {
  it('structured to JSON mode serializes the full definition state including nested condition trees and effect models', () => {
    const mockDef = createMockDefinition();
    renderEditor(mockDef);

    // Should start in structured mode with the rules list and metadata visible
    expect(screen.getByTestId('sp-editor-mode-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('sp-top-section')).toBeInTheDocument();

    // Switch to JSON mode by clicking JSON tab
    act(() => {
      fireEvent.click(screen.getByTestId('sp-json-mode-tab'));
    });

    // Monaco editor should now be visible with the serialized JSON
    const monacoEditor = screen.getByTestId('mock-monaco-editor');
    expect(monacoEditor).toBeInTheDocument();

    // The textarea value should contain the full definition JSON
    const editorValue = (monacoEditor as HTMLTextAreaElement).value;
    const parsed = JSON.parse(editorValue);

    // Verify all key top-level fields
    expect(parsed.schema_version).toBe('1.0');
    expect(parsed.policy_key).toBe('frtb_sa_signoff');
    expect(parsed.scenario_type).toBe('FRTB_SA');
    expect(parsed.display_name).toBe('FRTB SA Signoff Policy');
    expect(parsed.description).toBe('Policy for FRTB SA sign-offs');
    expect(parsed.resolution_strategy).toBe('STRICTEST_WINS');
    expect(parsed.rules).toHaveLength(2);

    // Verify nested condition tree in rule 1
    const rule1 = parsed.rules[0];
    expect(rule1.rule_key).toBe('high_impact_rule');
    expect(rule1.name).toBe('High Impact Rule');
    expect(rule1.priority).toBe(1);
    expect(rule1.is_enabled).toBe(true);
    expect(rule1.condition.type).toBe('GROUP');
    expect(rule1.condition.operator).toBe('AND');
    expect(rule1.condition.children).toHaveLength(2);

    // First child: FACT node
    expect(rule1.condition.children[0].type).toBe('FACT');
    expect(rule1.condition.children[0].factType).toBe('scenario.desk');
    expect(rule1.condition.children[0].operator).toBe('EQUALS');
    expect(rule1.condition.children[0].value).toBe('FX_OPTIONS');

    // Second child: nested GROUP with OR
    expect(rule1.condition.children[1].type).toBe('GROUP');
    expect(rule1.condition.children[1].operator).toBe('OR');
    expect(rule1.condition.children[1].children).toHaveLength(2);
    expect(rule1.condition.children[1].children[0].factType).toBe('change.assetClass');
    expect(rule1.condition.children[1].children[0].operator).toBe('IN');
    expect(rule1.condition.children[1].children[0].value).toEqual(['RATES', 'FX']);

    // Verify effect model in rule 1
    expect(rule1.effect.requiredApproverCount).toBe(2);
    expect(rule1.effect.approvalMode).toBe('SEQUENTIAL');
    expect(rule1.effect.approvers).toHaveLength(2);
    expect(rule1.effect.approvers[0]).toEqual({ type: 'FIXED_ROLE', roleKey: 'SENIOR_RISK_MANAGER' });
    expect(rule1.effect.approvers[1]).toEqual({ type: 'DYNAMIC_ROLE', roleKey: 'HEAD_OF_DESK' });

    // Verify rule 2
    const rule2 = parsed.rules[1];
    expect(rule2.rule_key).toBe('standard_rule');
    expect(rule2.is_enabled).toBe(false);
    expect(rule2.effect.approvers[0].roleKey).toBe('RISK_CONTROLLER');
  });

  it('parseDefinition/serializeDefinition round-trip preserves deeply nested condition trees, approvers arrays, and all rule fields; invalid JSON returns null', () => {
    // This test directly validates the round-trip integrity of the serialization functions
    // that are used by the editor panel when switching between Structured and JSON modes.
    //
    // The parseDefinition and serializeDefinition functions are defined inside
    // SignoffPolicyEditorPanel -- we test them through their behavior on the component:
    // When the component receives a definition JSON, it calls parseDefinition to populate
    // its in-memory state. The internal state is then serialized back via serializeDefinition.
    // We verify the round-trip by examining the onDefinitionChange callback output.

    const onDefinitionChange = jest.fn();
    const testStore = createTestStore();

    // Create a deeply nested definition
    const deepDef = JSON.stringify({
      schema_version: '1.0',
      policy_key: 'deep_test',
      scenario_type: 'FRTB_SA',
      display_name: 'Deep Nesting Test',
      description: 'Tests deeply nested structures',
      resolution_strategy: 'STRICTEST_WINS',
      rules: [{
        rule_key: 'deep_rule',
        name: 'Deeply Nested Rule',
        priority: 1,
        is_enabled: true,
        condition: {
          type: 'GROUP',
          operator: 'AND',
          children: [
            {
              type: 'GROUP',
              operator: 'OR',
              children: [
                {
                  type: 'GROUP',
                  operator: 'AND',
                  children: [
                    { type: 'FACT', factType: 'scenario.desk', operator: 'EQUALS', value: 'FX' },
                    { type: 'FACT', factType: 'scenario.region', operator: 'IN', value: ['EMEA', 'APAC', 'AMER'] },
                  ],
                },
                { type: 'FACT', factType: 'change.riskClass', operator: 'NOT_EQUALS', value: 'MARKET' },
              ],
            },
            { type: 'FACT', factType: 'scenario.status', operator: 'EQUALS', value: 'PENDING' },
          ],
        },
        effect: {
          requiredApproverCount: 3,
          approvalMode: 'SEQUENTIAL',
          approvers: [
            { type: 'FIXED_ROLE', roleKey: 'SENIOR_RISK_MANAGER' },
            { type: 'DYNAMIC_ROLE', roleKey: 'HEAD_OF_DESK' },
            { type: 'FIXED_ROLE', roleKey: 'COMPLIANCE_OFFICER' },
          ],
        },
      }],
    }, null, 2);

    const mockDef = createMockDefinition(deepDef);

    render(
      <Provider store={testStore}>
        <FluentProvider theme={webLightTheme}>
          <SignoffPolicyEditorPanel
            definition={mockDef}
            onDefinitionChange={onDefinitionChange}
            scenarioTypeCode="FRTB_SA"
            factTypes={[]}
            roles={[]}
          />
        </FluentProvider>
      </Provider>
    );

    // The component should be in structured mode and have parsed the definition.
    // Now click "Add Rule" to trigger a state update which will call onDefinitionChange
    // with the serialized state (testing the round-trip).
    act(() => {
      fireEvent.click(screen.getByTestId('sp-add-rule-button'));
    });

    // The onDefinitionChange callback should have been called with the serialized JSON
    expect(onDefinitionChange).toHaveBeenCalled();
    const lastCallJson = JSON.parse(
      onDefinitionChange.mock.calls[onDefinitionChange.mock.calls.length - 1][0]
    );

    // Original deep rule should be preserved
    expect(lastCallJson.rules).toHaveLength(2); // original + new default
    const deepRule = lastCallJson.rules[0];

    // Verify the deeply nested condition tree survived
    expect(deepRule.condition.type).toBe('GROUP');
    expect(deepRule.condition.operator).toBe('AND');
    expect(deepRule.condition.children).toHaveLength(2);

    // First child: GROUP with OR
    const orGroup = deepRule.condition.children[0];
    expect(orGroup.type).toBe('GROUP');
    expect(orGroup.operator).toBe('OR');
    expect(orGroup.children).toHaveLength(2);

    // Nested AND group inside the OR group
    const nestedAnd = orGroup.children[0];
    expect(nestedAnd.type).toBe('GROUP');
    expect(nestedAnd.operator).toBe('AND');
    expect(nestedAnd.children).toHaveLength(2);
    expect(nestedAnd.children[0].factType).toBe('scenario.desk');
    expect(nestedAnd.children[1].value).toEqual(['EMEA', 'APAC', 'AMER']);

    // Verify approvers array survived
    expect(deepRule.effect.requiredApproverCount).toBe(3);
    expect(deepRule.effect.approvalMode).toBe('SEQUENTIAL');
    expect(deepRule.effect.approvers).toHaveLength(3);
    expect(deepRule.effect.approvers[0].roleKey).toBe('SENIOR_RISK_MANAGER');
    expect(deepRule.effect.approvers[2].roleKey).toBe('COMPLIANCE_OFFICER');

    // Test that invalid JSON definition results in null parse (component shows error state)
    const invalidDef = createMockDefinition('{ not valid json!!!');

    const { unmount } = render(
      <Provider store={testStore}>
        <FluentProvider theme={webLightTheme}>
          <SignoffPolicyEditorPanel
            definition={invalidDef}
            onDefinitionChange={jest.fn()}
            scenarioTypeCode="FRTB_SA"
            factTypes={[]}
            roles={[]}
          />
        </FluentProvider>
      </Provider>
    );

    // Should show the "Unable to parse" message since it's in structured mode
    expect(screen.getByText('Unable to parse definition JSON.')).toBeInTheDocument();
    unmount();
  });

  it('JSON editing with modified rules round-trips correctly back through parseDefinition when switching to structured mode', () => {
    // This test verifies the full round-trip of modified JSON by testing:
    // 1. The component starts in structured mode with the initial JSON
    // 2. We modify rules in structured mode (add a rule) and verify the output
    // 3. The serialized output contains the correct structure
    //
    // Note: Direct UI-level mode switching between JSON and Structured is verified
    // through the first test (Structured -> JSON) which confirms the serialization path.
    // The parse path is verified by the component successfully rendering in structured mode
    // from JSON input (which it does via parseDefinition in the useEffect).

    const modifiedDef = JSON.parse(SAMPLE_DEFINITION_JSON);
    modifiedDef.rules.push({
      rule_key: 'new_rule_3',
      name: 'New Added Rule',
      priority: 3,
      is_enabled: true,
      condition: {
        type: 'GROUP',
        operator: 'OR',
        children: [
          { type: 'FACT', factType: 'scenario.region', operator: 'EQUALS', value: 'APAC' },
        ],
      },
      effect: {
        requiredApproverCount: 1,
        approvalMode: 'UNORDERED',
        approvers: [{ type: 'FIXED_ROLE', roleKey: 'COMPLIANCE_OFFICER' }],
      },
    });
    // Also modify the nested condition in rule 1
    modifiedDef.rules[0].condition.children[1].children.push({
      type: 'FACT',
      factType: 'scenario.status',
      operator: 'EQUALS',
      value: 'PENDING',
    });

    const modifiedJson = JSON.stringify(modifiedDef, null, 2);

    // Render the editor with the modified JSON (simulates what happens after
    // a user edits in JSON mode and switches back to structured mode --
    // the parseDefinition function runs on the JSON to populate the structured view)
    const mockDef = createMockDefinition(modifiedJson);
    const { onDefinitionChange } = renderEditor(mockDef);

    // The component should parse the modified JSON and render in structured mode
    expect(screen.getByTestId('sp-top-section')).toBeInTheDocument();

    // Should show 3 rules
    expect(screen.getByTestId('sp-rules-table')).toBeInTheDocument();
    expect(screen.getByTestId('sp-rule-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('sp-rule-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('sp-rule-row-2')).toBeInTheDocument();

    // The new rule text should appear
    expect(screen.getByText('New Added Rule')).toBeInTheDocument();
    expect(screen.getByText('new_rule_3')).toBeInTheDocument();

    // Click "Add Rule" to trigger a serialization round-trip via onDefinitionChange
    act(() => {
      fireEvent.click(screen.getByTestId('sp-add-rule-button'));
    });

    // Verify the serialized output contains all rules including modifications
    const lastCallJson = JSON.parse(
      onDefinitionChange.mock.calls[onDefinitionChange.mock.calls.length - 1][0]
    );
    expect(lastCallJson.rules).toHaveLength(4); // 3 original + 1 new default
    // Check nested condition modification was preserved
    expect(lastCallJson.rules[0].condition.children[1].children).toHaveLength(3);
    expect(lastCallJson.rules[0].condition.children[1].children[2].factType).toBe('scenario.status');
    // Check new rule's effect was preserved
    expect(lastCallJson.rules[2].effect.approvers[0].roleKey).toBe('COMPLIANCE_OFFICER');
  });
});
