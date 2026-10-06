import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeclarationPage } from './DeclarationPage';
import type { SubmitPayload } from '../types';

const submitMock = vi.fn<(p: SubmitPayload) => Promise<{ ok: true; reference: string }>>(() =>
  Promise.resolve({ ok: true, reference: 'ABC12345' }),
);
vi.mock('../api', () => ({ submitDeclaration: (p: SubmitPayload) => submitMock(p) }));

const FUTURE_CLASSES =
  "I'm happy to hear from my trainer about future classes and to be asked for a review.";
const EMAIL_LINE =
  'Your trainer will use this to send your certificate and anything from the class.';

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

/** Fill every required field so the form can be submitted. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Your full name'), 'Jane Smith');
  await user.click(screen.getAllByRole('button', { name: 'No' })[0]);
  await user.click(screen.getByRole('checkbox', { name: 'Not applicable' }));
  await user.click(screen.getByRole('checkbox', { name: /cannot be held responsible/ }));
  await user.click(screen.getByRole('button', { name: 'Not applicable' }));
  await user.click(screen.getByRole('checkbox', { name: /I consent to Daisy First Aid storing/ }));
}

describe('DeclarationPage attendee emails (B7, platform migration 067)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    submitMock.mockClear();
  });

  it('explains how the trainer uses the email, right on the email box', () => {
    renderPage();
    const email = screen.getByPlaceholderText('your@email.com');
    expect(email).toHaveAccessibleDescription(EMAIL_LINE);
    expect(email).not.toBeRequired();
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('retires the separate certificate tick', () => {
    renderPage();
    expect(
      screen.queryByRole('checkbox', { name: /Email me about my certificate/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Email me about my certificate/)).not.toBeInTheDocument();
  });

  it('has an optional, unticked future-classes box', () => {
    renderPage();
    expect(screen.getByRole('checkbox', { name: FUTURE_CLASSES })).not.toBeChecked();
  });

  it('keeps the Daisy useful-content tick as it is', () => {
    renderPage();
    expect(
      screen.getByRole('checkbox', {
        name: "I'd like to receive emails with useful content to help and remind me.",
      }),
    ).not.toBeChecked();
  });

  it('makes the email required once the future-classes box is ticked', async () => {
    const user = userEvent.setup();
    renderPage();
    const email = screen.getByPlaceholderText('your@email.com');
    await user.click(screen.getByRole('checkbox', { name: FUTURE_CLASSES }));

    expect(email).toBeRequired();
    expect(screen.queryByText('(optional)')).not.toBeInTheDocument();
    expect(
      screen.getByText('Please add your email above so your trainer can contact you.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /receive emails with useful content/ }),
    ).not.toBeChecked();

    await user.type(email, 'jane@example.com');
    expect(
      screen.queryByText('Please add your email above so your trainer can contact you.'),
    ).not.toBeInTheDocument();
  });

  it('tells the attendee in the consent box who sees their email', () => {
    renderPage();
    expect(
      screen.getByText(
        /If you give your email address, it \(never your health answers\) is shared with your trainer/,
      ),
    ).toBeInTheDocument();
  });

  it('submits form version 2 with the email and the future-classes choice', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillRequired(user);
    await user.type(screen.getByPlaceholderText('your@email.com'), 'jane@example.com');
    await user.click(screen.getByRole('checkbox', { name: FUTURE_CLASSES }));
    await user.click(screen.getByRole('button', { name: 'Submit declaration' }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock.mock.calls[0][0]).toMatchObject({
      form_version: 2,
      attendee_email: 'jane@example.com',
      trainer_contact_opt_in: true,
      certificate_opt_in: true,
      email_opt_in: false,
    });
  });

  it('submits form version 2 with nothing shared when no email is given', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Submit declaration' }));

    const payload = submitMock.mock.calls[0][0];
    expect(payload.form_version).toBe(2);
    expect(payload.attendee_email).toBeUndefined();
    expect(payload.trainer_contact_opt_in).toBe(false);
    expect(payload.certificate_opt_in).toBe(false);
  });
});
