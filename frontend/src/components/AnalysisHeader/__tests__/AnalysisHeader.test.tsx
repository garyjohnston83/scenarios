import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AnalysisHeader } from '../AnalysisHeader';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderComponent = (props: {
  scenarioId: string;
  scenarioName: string | null;
  workflowState: string | null;
}) => {
  return render(
    <MemoryRouter>
      <AnalysisHeader {...props} />
    </MemoryRouter>
  );
};

describe('AnalysisHeader', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders the back link with text "Back to Governance"', () => {
    renderComponent({
      scenarioId: 'sc-1',
      scenarioName: 'Test Scenario',
      workflowState: 'DRAFT',
    });

    const backButton = screen.getByRole('button', {
      name: /back to governance/i,
    });
    expect(backButton).toBeInTheDocument();
  });

  it('clicking the back link navigates to /scenarios/${scenarioId}', async () => {
    const user = userEvent.setup();

    renderComponent({
      scenarioId: 'sc-42',
      scenarioName: 'My Scenario',
      workflowState: 'DRAFT',
    });

    const backButton = screen.getByRole('button', {
      name: /back to governance/i,
    });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scenarios/sc-42');
  });

  it('renders the scenario name correctly', () => {
    renderComponent({
      scenarioId: 'sc-1',
      scenarioName: 'Rate Shock Analysis',
      workflowState: 'DRAFT',
    });

    expect(screen.getByText('Rate Shock Analysis')).toBeInTheDocument();
  });

  it('renders the workflow state chip with the correct label', () => {
    renderComponent({
      scenarioId: 'sc-1',
      scenarioName: 'Test Scenario',
      workflowState: 'SIGNOFF_IN_PROGRESS',
    });

    expect(screen.getByText('Sign-off In Progress')).toBeInTheDocument();
  });

  it('renders gracefully with null scenarioName (shows placeholder)', () => {
    renderComponent({
      scenarioId: 'sc-1',
      scenarioName: null,
      workflowState: 'DRAFT',
    });

    expect(screen.getByText('Untitled Scenario')).toBeInTheDocument();
  });

  it('renders gracefully with null workflowState (no chip rendered)', () => {
    renderComponent({
      scenarioId: 'sc-1',
      scenarioName: 'Test Scenario',
      workflowState: null,
    });

    expect(screen.getByText('Test Scenario')).toBeInTheDocument();
    // The workflow state chip should not render when workflowState is null
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('renders gracefully with both null name and null state', () => {
    expect(() => {
      renderComponent({
        scenarioId: 'sc-1',
        scenarioName: null,
        workflowState: null,
      });
    }).not.toThrow();

    expect(screen.getByText('Untitled Scenario')).toBeInTheDocument();
  });
});
