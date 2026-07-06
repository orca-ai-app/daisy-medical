import { EDGE_FUNCTION_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { CourseCard, SubmitPayload } from './types';

export type SubmitResult = { ok: true } | { ok: false; message: string };

export type CourseLookupResult =
  | { ok: true; courses: CourseCard[] }
  | { ok: false; message: string };

const API_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
} as const;

export async function submitDeclaration(payload: SubmitPayload): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, message: 'Network error — please check your connection and try again.' };
  }

  if (response.status === 201) {
    return { ok: true };
  }

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

/**
 * Resolve courses by booking token (exact match) or instructor number (today's classes).
 */
export async function lookupCourses(
  by: { booking_token: string } | { instructor_number: string },
): Promise<CourseLookupResult> {
  const url = `${SUPABASE_URL}/functions/v1/get-public-courses`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(by),
    });
  } catch {
    return { ok: false, message: 'Network error — could not look up your class.' };
  }

  if (!response.ok) {
    return { ok: false, message: `Could not load class information (${response.status}).` };
  }

  try {
    const body = (await response.json()) as { courses: CourseCard[] };
    return { ok: true, courses: body.courses ?? [] };
  } catch {
    return { ok: false, message: 'Unexpected response from course lookup.' };
  }
}
