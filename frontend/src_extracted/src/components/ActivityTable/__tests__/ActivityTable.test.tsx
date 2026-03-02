import { render, screen } from '@testing-library/react';
import { ActivityTable } from '../ActivityTable';
import type { ActivityRowData } from '../ActivityTable';

/* ------------------------------------------------------------------ */
/* Mock @fluentui/react-icons so we can assert which icon is rendered */
/* ------------------------------------------------------------------ */
jest.mock('@fluentui/react-icons', () => ({
  ChatRegular: () => <span data-testid="icon-chat">ChatRegular</span>,
  PersonRegular: () => <span data-testid="icon-person">PersonRegular</span>,
  SettingsRegular: () => (
    <span data-testid="icon-settings">SettingsRegular</span>
  ),
}));

/* ------------------------------------------------------------------ */
/* Mock formatDate to return a predictable value for assertions        */
/* ------------------------------------------------------------------ */
jest.mock('../../../utils/formatDate', () => ({
  formatDate: (d: string) => `FORMATTED:${d}`,
}));

const sampleRows: ActivityRowData[] = [
  {
    id: 'row-1',
    bucketType: 'MESSAGE',
    occurredAt: '2026-02-19T10:00:00',
    authorDisplayName: 'Alice',
    details: 'Hello, this is a message',
    statusTransition: null,
  },
  {
    id: 'row-2',
    bucketType: 'USER',
    occurredAt: '2026-02-19T11:00:00',
    authorDisplayName: 'Bob',
    details: 'Sign-off started',
    statusTransition: 'Draft -> Sign-off In Progress',
  },
  {
    id: 'row-3',
    bucketType: 'SYSTEM',
    occurredAt: '2026-02-19T12:00:00',
    authorDisplayName: 'System',
    details: 'Impact assessment completed',
    statusTransition: 'Sign-off In Progress -> Impact Available',
  },
];

describe('ActivityTable', () => {
  it('renders a <table> with 5 column headers: Type, Date/Time, Author, Details, Status Transition', () => {
    render(<ActivityTable rows={sampleRows} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(5);
    expect(headers[0]).toHaveTextContent('Type');
    expect(headers[1]).toHaveTextContent('Date/Time');
    expect(headers[2]).toHaveTextContent('Author');
    expect(headers[3]).toHaveTextContent('Details');
    expect(headers[4]).toHaveTextContent('Status Transition');
  });

  it('renders correct Fluent UI icon for each bucketType: ChatRegular for MESSAGE, PersonRegular for USER, SettingsRegular for SYSTEM', () => {
    render(<ActivityTable rows={sampleRows} />);

    const tbody = screen.getByRole('table').querySelector('tbody');
    expect(tbody).not.toBeNull();
    const dataRows = tbody!.querySelectorAll('tr');

    // Row 1 (MESSAGE) should render ChatRegular
    expect(dataRows[0].querySelector('[data-testid="icon-chat"]')).not.toBeNull();

    // Row 2 (USER) should render PersonRegular
    expect(dataRows[1].querySelector('[data-testid="icon-person"]')).not.toBeNull();

    // Row 3 (SYSTEM) should render SettingsRegular
    expect(dataRows[2].querySelector('[data-testid="icon-settings"]')).not.toBeNull();
  });

  it('renders rows in order with correct data in each cell', () => {
    render(<ActivityTable rows={sampleRows} />);

    const tbody = screen.getByRole('table').querySelector('tbody');
    expect(tbody).not.toBeNull();
    const dataRows = tbody!.querySelectorAll('tr');
    expect(dataRows).toHaveLength(3);

    // Row 1: MESSAGE, formatted date, Alice, message text, empty status
    const cells1 = dataRows[0].querySelectorAll('td');
    expect(cells1[1]).toHaveTextContent('FORMATTED:2026-02-19T10:00:00');
    expect(cells1[2]).toHaveTextContent('Alice');
    expect(cells1[3]).toHaveTextContent('Hello, this is a message');
    expect(cells1[4]).toHaveTextContent('');

    // Row 2: USER, formatted date, Bob, sign-off text, transition
    const cells2 = dataRows[1].querySelectorAll('td');
    expect(cells2[1]).toHaveTextContent('FORMATTED:2026-02-19T11:00:00');
    expect(cells2[2]).toHaveTextContent('Bob');
    expect(cells2[3]).toHaveTextContent('Sign-off started');
    expect(cells2[4]).toHaveTextContent('Draft -> Sign-off In Progress');

    // Row 3: SYSTEM, formatted date, System, impact text, transition
    const cells3 = dataRows[2].querySelectorAll('td');
    expect(cells3[1]).toHaveTextContent('FORMATTED:2026-02-19T12:00:00');
    expect(cells3[2]).toHaveTextContent('System');
    expect(cells3[3]).toHaveTextContent('Impact assessment completed');
    expect(cells3[4]).toHaveTextContent(
      'Sign-off In Progress -> Impact Available'
    );
  });

  it('when statusTransition is null, the Status Transition cell is empty', () => {
    const rowsWithNullTransition: ActivityRowData[] = [
      {
        id: 'null-transition',
        bucketType: 'MESSAGE',
        occurredAt: '2026-02-19T10:00:00',
        authorDisplayName: 'Alice',
        details: 'A message without transition',
        statusTransition: null,
      },
    ];

    render(<ActivityTable rows={rowsWithNullTransition} />);

    const tbody = screen.getByRole('table').querySelector('tbody');
    const cells = tbody!.querySelectorAll('tr')[0].querySelectorAll('td');
    // The Status Transition cell (index 4) should be empty
    expect(cells[4].textContent).toBe('');
  });

  it('renders empty state message "No activity recorded" when rows is empty', () => {
    render(<ActivityTable rows={[]} />);

    expect(screen.getByText('No activity recorded')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('table container has max-height: 300px and overflow-y: auto', () => {
    // With identity-obj-proxy, CSS module class names are returned as-is.
    // We verify the class name is applied, which maps to the CSS rules.
    render(<ActivityTable rows={sampleRows} />);

    const table = screen.getByRole('table');
    const container = table.parentElement;
    expect(container).not.toBeNull();
    // identity-obj-proxy returns the class key as the className string
    expect(container!.className).toBe('tableContainer');
  });
});
