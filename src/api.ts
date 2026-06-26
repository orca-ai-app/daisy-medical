import { EDGE_FUNCTION_URL, SUPABASE_ANON_KEY } from './config';
import type { SubmitPayload } from './types';

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string };

export async function submitDeclaration(payload: SubmitPayload): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, message: 'Network error — please check your connection and try again.' };
  }

  if (response.status === 201) {
    return { ok: true };
  }

  // Try to parse a JSON error message from the Edge Function
  let errorMessage = `Unexpected error (${response.status}).`;
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    if (body.error) errorMessage = body.error;
    else if (body.message) errorMessage = body.message;
  } catch {}

  if (response.status === 404) {
    errorMessage = 'Instructor not found. Please check the instructor number and try again.';
  } else if (response.status === 400) {
    errorMessage = errorMessage || 'Invalid submission. Please check your details and try again.';
  }

  return { ok: false, message: errorMessage };
}
