import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ExternalRedirectView } from '../ExternalRedirectView';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderComponent = (props: {
  url: string | null | undefined;
  scenarioId: string;
}) => {
  return render(
    <MemoryRouter>
      <FluentProvider theme={webLightTheme}>
        <ExternalRedirectView {...props} />
      </FluentProvider>
    </MemoryRouter>
  );
};

describe('ExternalRedirectView', () => {
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockNavigate.mockReset();
    windowOpenSpy = jest.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    jest.useRealTimers();
    windowOpenSpy.mockRestore();
  });

  it('renders "Redirecting to external system..." message initially', () => {
    renderComponent({
      url: 'https://external.example.com/changes',
      scenarioId: 'sc-1',
    });

    expect(
      screen.getByText('Redirecting to external system...')
    ).toBeInTheDocument();
  });

  it('calls window.open after the delay with correct arguments', () => {
    renderComponent({
      url: 'https://external.example.com/changes',
      scenarioId: 'sc-1',
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://external.example.com/changes',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('navigates to /scenarios/${scenarioId} after opening the external URL', () => {
    renderComponent({
      url: 'https://external.example.com/changes',
      scenarioId: 'sc-42',
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/scenarios/sc-42', {
      replace: true,
    });
  });

  it('shows error message and does NOT call window.open when URL is null', () => {
    renderComponent({
      url: null,
      scenarioId: 'sc-1',
    });

    expect(
      screen.getByText('External URL is not available')
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('shows error message and does NOT call window.open when URL is undefined', () => {
    renderComponent({
      url: undefined,
      scenarioId: 'sc-1',
    });

    expect(
      screen.getByText('External URL is not available')
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('shows popup blocker fallback when window.open returns null', () => {
    windowOpenSpy.mockReturnValue(null);

    renderComponent({
      url: 'https://external.example.com/changes',
      scenarioId: 'sc-1',
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should show the popup blocked message
    expect(
      screen.getByText(
        'Your browser blocked the popup. Click below to open the external system:'
      )
    ).toBeInTheDocument();

    // Should show the manual link
    expect(screen.getByText('Open External System')).toBeInTheDocument();

    // Should NOT navigate away since popup was blocked
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('cleans up the timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = renderComponent({
      url: 'https://external.example.com/changes',
      scenarioId: 'sc-1',
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
