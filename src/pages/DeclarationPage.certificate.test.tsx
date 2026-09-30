import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeclarationPage } from './DeclarationPage';

function renderPage() {
  return render(
    <DeclarationPage
      instructorNumber="OMG1"
      territoryPostcode="SW1"
      onSuccess={() => {}}
      onBack={() => {}}
    />,
  );
}

describe('DeclarationPage certificate tick', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('is unticked by default and explains how the email is used', () => {
    renderPage();
    const tick = screen.getByRole('checkbox', { name: 'Email me about my certificate' });
    expect(tick).not.toBeChecked();
    expect(tick).toHaveAccessibleDescription(
      /only to send certificate information for this class.*shared with your trainer/i,
    );
  });

  it('makes the email field required once ticked', async () => {
    const user = userEvent.setup();
    renderPage();
    const email = screen.getByPlaceholderText('your@email.com');
    expect(email).not.toBeRequired();
    expect(screen.getByText('(optional)')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Email me about my certificate' }));

    expect(email).toBeRequired();
    expect(screen.queryByText('(optional)')).not.toBeInTheDocument();
    expect(screen.getByText('Please add your email above so we can send it.')).toBeInTheDocument();

    await user.type(email, 'jane@example.com');
    expect(
      screen.queryByText('Please add your email above so we can send it.'),
    ).not.toBeInTheDocument();
  });

  it('does not tick the marketing opt-in', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('checkbox', { name: 'Email me about my certificate' }));
    expect(
      screen.getByRole('checkbox', { name: /receive emails with useful content/ }),
    ).not.toBeChecked();
  });
});
