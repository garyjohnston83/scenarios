import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AnalysisTabs } from '../AnalysisTabs';
import type { TabDefinition } from '../AnalysisTabs';

const renderComponent = (props: {
  tabs: TabDefinition[];
  selectedTab: string;
  onTabSelect: (tabId: string) => void;
}) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AnalysisTabs {...props} />
    </FluentProvider>
  );
};

describe('AnalysisTabs', () => {
  // Task 7.4: Tests for dynamic tab rendering

  it('renders a single "Direct Changes" tab', () => {
    const onTabSelect = jest.fn();
    renderComponent({
      tabs: [{ id: 'direct-changes', label: 'Direct Changes' }],
      selectedTab: 'direct-changes',
      onTabSelect,
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveTextContent('Direct Changes');
  });

  it('renders multiple tabs (direct changes + 2 impact report tabs)', () => {
    const onTabSelect = jest.fn();
    renderComponent({
      tabs: [
        { id: 'direct-changes', label: 'Direct Changes' },
        { id: 'impact-run-abc', label: 'RUN-2026-0219-001' },
        { id: 'impact-run-def', label: 'RUN-2026-0219-002' },
      ],
      selectedTab: 'direct-changes',
      onTabSelect,
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Direct Changes');
    expect(tabs[1]).toHaveTextContent('RUN-2026-0219-001');
    expect(tabs[2]).toHaveTextContent('RUN-2026-0219-002');
  });

  it('renders with only impact report tabs (no direct changes)', () => {
    const onTabSelect = jest.fn();
    renderComponent({
      tabs: [
        { id: 'impact-run-abc', label: 'RUN-2026-0219-001' },
        { id: 'impact-run-def', label: 'RUN-2026-0219-002' },
      ],
      selectedTab: 'impact-run-abc',
      onTabSelect,
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('RUN-2026-0219-001');
    expect(tabs[1]).toHaveTextContent('RUN-2026-0219-002');
  });

  it('fires tab selection callback with the correct tab ID', async () => {
    const user = userEvent.setup();
    const onTabSelect = jest.fn();

    renderComponent({
      tabs: [
        { id: 'direct-changes', label: 'Direct Changes' },
        { id: 'impact-run-abc', label: 'RUN-2026-0219-001' },
      ],
      selectedTab: 'direct-changes',
      onTabSelect,
    });

    // Click on the impact report tab
    const tabs = screen.getAllByRole('tab');
    const impactTab = tabs.find((tab) =>
      tab.textContent?.includes('RUN-2026-0219-001')
    );
    expect(impactTab).toBeDefined();
    await user.click(impactTab!);

    expect(onTabSelect).toHaveBeenCalledWith('impact-run-abc');
  });

  it('fires onTabSelect with direct-changes when clicking Direct Changes tab', async () => {
    const user = userEvent.setup();
    const onTabSelect = jest.fn();

    renderComponent({
      tabs: [
        { id: 'direct-changes', label: 'Direct Changes' },
        { id: 'impact-run-abc', label: 'RUN-2026-0219-001' },
      ],
      selectedTab: 'impact-run-abc',
      onTabSelect,
    });

    const tabs = screen.getAllByRole('tab');
    const directTab = tabs.find((tab) =>
      tab.textContent?.includes('Direct Changes')
    );
    expect(directTab).toBeDefined();
    await user.click(directTab!);

    expect(onTabSelect).toHaveBeenCalledWith('direct-changes');
  });

  it('renders no disabled or placeholder tabs', () => {
    const onTabSelect = jest.fn();
    renderComponent({
      tabs: [
        { id: 'direct-changes', label: 'Direct Changes' },
        { id: 'impact-run-abc', label: 'RUN-2026-0219-001' },
      ],
      selectedTab: 'direct-changes',
      onTabSelect,
    });

    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      expect(tab).not.toBeDisabled();
    });
  });

  it('reflects the selectedTab prop as the active tab', () => {
    const onTabSelect = jest.fn();
    renderComponent({
      tabs: [
        { id: 'direct-changes', label: 'Direct Changes' },
        { id: 'impact-run-abc', label: 'RUN-2026-0219-001' },
      ],
      selectedTab: 'impact-run-abc',
      onTabSelect,
    });

    const tabs = screen.getAllByRole('tab');
    const impactTab = tabs.find((tab) =>
      tab.textContent?.includes('RUN-2026-0219-001')
    );
    expect(impactTab).toHaveAttribute('aria-selected', 'true');

    const directTab = tabs.find((tab) =>
      tab.textContent?.includes('Direct Changes')
    );
    expect(directTab).toHaveAttribute('aria-selected', 'false');
  });

  it('tab labels match the provided TabDefinition labels', () => {
    const onTabSelect = jest.fn();
    const customTabs: TabDefinition[] = [
      { id: 'direct-changes', label: 'Direct Changes' },
      { id: 'impact-custom-id', label: 'Custom Run Name' },
    ];

    renderComponent({
      tabs: customTabs,
      selectedTab: 'direct-changes',
      onTabSelect,
    });

    // Fluent UI Tab renders duplicate text spans, so use getAllByText
    const matches = screen.getAllByText('Custom Run Name');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
