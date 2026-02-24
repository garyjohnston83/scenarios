import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SplitPaneLayout } from '../SplitPaneLayout';

const renderWithFluent = (ui: React.ReactElement) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      {ui}
    </FluentProvider>
  );
};

describe('SplitPaneLayout', () => {
  it('renders two panels and a resize handle without crashing', () => {
    renderWithFluent(
      <SplitPaneLayout
        lhs={<div>Left Content</div>}
        rhs={<div>Right Content</div>}
      />
    );
    const resizeHandle = screen.getByTestId('resize-handle');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('renders LHS and RHS child content within the respective panels', () => {
    renderWithFluent(
      <SplitPaneLayout
        lhs={<div>Left Pane Content</div>}
        rhs={<div>Right Pane Content</div>}
      />
    );
    expect(screen.getByText('Left Pane Content')).toBeInTheDocument();
    expect(screen.getByText('Right Pane Content')).toBeInTheDocument();
  });
});
