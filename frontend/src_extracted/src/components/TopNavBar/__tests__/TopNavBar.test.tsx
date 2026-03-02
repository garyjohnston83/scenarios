import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { TopNavBar } from '../TopNavBar';

const renderWithFluent = (ui: React.ReactElement) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      {ui}
    </FluentProvider>
  );
};

describe('TopNavBar', () => {
  it('renders without crashing', () => {
    renderWithFluent(<TopNavBar />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('renders the application title "Scenarios"', () => {
    renderWithFluent(<TopNavBar />);
    expect(screen.getByText('Scenarios')).toBeInTheDocument();
  });

  it('renders a logo placeholder element', () => {
    renderWithFluent(<TopNavBar />);
    const logo = screen.getByTestId('logo-placeholder');
    expect(logo).toBeInTheDocument();
  });
});
