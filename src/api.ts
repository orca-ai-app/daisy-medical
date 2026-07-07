import { EDGE_FUNCTION_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { logger } from './logger';
import type { CourseCard, FailureKind, SubmitPayload } from './types';

export type SubmitResult =
  | { ok: true; reference?: string }
  | { ok: false; kind: FailureKind; message: string };

export type CourseLookupResult =
  | { ok: true; courses: CourseCard[] }
  | { ok: false; kind: FailureKind; message: string };

const API_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
} as const;

/** Append the server's request id so parents can quote it to support. */
function withRef(message: string, requestId?: string): string {
  return requestId ? `${message} (ref ${requestId})` : message;
}

export async function submitDeclaration(payload: SubmitPayload): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.warn('Network failure submitting declaration', { error: String(err) });
    return {
      ok: false,
      kind: 'network',
      message: 'Network error — please check your connection and try again.',
    };
  }

  if (response.ok) {
    let reference: string | undefined;
    try {
      const body = (await response.json()) as { reference?: string };
      if (typeof body.reference === 'string') reference = body.reference;
    } catch {
      /* older deployments return an empty 201 body — still a success */
    }
    return { ok: true, reference };
  }

  let errorMessage = `Unexpected error (${response.status}).`;
  let requestId: string | undefined;
  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
      request_id?: string;
    };
    if (body.error) errorMessage = body.error;
    else if (body.message) errorMessage = body.message;
    if (body.request_id) requestId = body.request_id;
  } catch {}

  if (response.status === 404) {
    errorMessage = 'Instructor not found. Please check the instructor number and try again.';
  } else if (response.status === 400) {
    errorMessage = errorMessage || 'Invalid submission. Please check your details and try again.';
  }

  logger.error(
    `submit-medical-declaration failed (${response.status}): ${errorMessage}`,
    undefined,
    requestId,
  );
  return { ok: false, kind: 'server', message: withRef(errorMessage, requestId) };
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
  } catch (err) {
    logger.warn('Network failure looking up courses', { error: String(err) });
    return {
      ok: false,
      kind: 'network',
      message: "We couldn't connect. Check your internet connection and try again.",
    };
  }

  if (!response.ok) {
    let message = `Something went wrong looking up your class (${response.status}).`;
    let requestId: string | undefined;
    try {
      const body = (await response.json()) as { error?: string; request_id?: string };
      if (body.error) message = body.error;
      if (body.request_id) requestId = body.request_id;
    } catch {}
    logger.error(`get-public-courses failed (${response.status}): ${message}`, undefined, requestId);
    return { ok: false, kind: 'server', message: withRef(message, requestId) };
  }

  try {
    const body = (await response.json()) as { courses: CourseCard[] };
    return { ok: true, courses: body.courses ?? [] };
  } catch {
    logger.error('get-public-courses returned a malformed response');
    return { ok: false, kind: 'server', message: 'Unexpected response from course lookup.' };
  }
}
