import type React from 'react';
import { useEffect, useRef } from 'react';
import type { CourseCard, CourseResolutionState } from '../types';
import { lookupCourses } from '../api';

interface Props {
  instructorNumber: string;
  manualPostcode: string;
  onInstructorChange: (v: string) => void;
  onManualPostcodeChange: (v: string) => void;
  courseState: CourseResolutionState;
  onCourseSelected: (course: CourseCard) => void;
  onCourseReset: () => void;
  onCourseStateChange: (state: CourseResolutionState) => void;
  onRetryLookup: () => void;
  onStart: () => void;
}

/** Format HH:MM from a time string that may be HH:MM:SS or HH:MM. */
function formatStartTime(time: string): string {
  return time.slice(0, 5);
}

/** Confirmation banner shown once a course is identified. */
function CourseConfirmationBanner({
  course,
  onReset,
}: {
  course: CourseCard;
  onReset: () => void;
}) {
  const trainerLabel = course.franchisee_name ?? 'your instructor';
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 rounded-xl border border-[#006FAC] bg-[#EDF5FA] px-5 py-4 shadow-[0_2px_12px_rgba(0,111,172,0.10)]"
    >
      <p className="text-base font-semibold text-[#1A4359]">
        You&apos;re at{' '}
        <span className="text-[#006FAC]">{trainerLabel}</span>&apos;s class:{' '}
        <span className="font-bold">{course.template_name}</span>
        {' — '}
        today, {formatStartTime(course.start_time)}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 text-xs text-[#5A7A8F] underline underline-offset-2 hover:text-[#006FAC]"
      >
        Not right? Change number
      </button>
    </div>
  );
}

/** One-tap picker when several courses are found for the same instructor. */
function CoursePicker({
  courses,
  onSelect,
}: {
  courses: CourseCard[];
  onSelect: (course: CourseCard) => void;
}) {
  return (
    <div className="mb-6 rounded-lg bg-white p-5 shadow-[0_2px_8px_rgba(0,60,100,0.06)]">
      <h2 className="mb-3 font-display text-base font-bold text-[#1A4359]">
        Which class are you at?
      </h2>
      <div className="space-y-2">
        {courses.map((course) => (
          <button
            key={course.id}
            type="button"
            onClick={() => onSelect(course)}
            className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-left transition-colors hover:border-[#006FAC] hover:bg-[#EDF5FA]"
          >
            <span className="block text-sm font-semibold text-[#1A4359]">
              {course.template_name}
            </span>
            <span className="block text-xs text-[#5A7A8F]">
              {formatStartTime(course.start_time)}
              {course.venue_name ? ` — ${course.venue_name}` : ''}
              {!course.venue_name && course.venue_postcode ? ` — ${course.venue_postcode}` : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function IntroPage({
  instructorNumber,
  manualPostcode,
  onInstructorChange,
  onManualPostcodeChange,
  courseState,
  onCourseSelected,
  onCourseReset,
  onCourseStateChange,
  onRetryLookup,
  onStart,
}: Props) {
  const courseResolved = courseState.status === 'locked';
  const showPicker = courseState.status === 'pick';
  const courseNone = courseState.status === 'none';
  const courseFailed = courseState.status === 'error';

  // Show the "no class found" message only when: lookup is done, number was entered, and nothing resolved.
  const showNoneMessage = courseNone && instructorNumber.trim().length > 0;

  // A locked private class may have no venue postcode — the attendee supplies one manually.
  const lockedCourseNeedsPostcode = courseResolved && !courseState.course.venue_postcode;

  // Postcode is required in the no-course fallback path, and for a locked course
  // without a venue postcode.
  const postcodeRequired = !courseResolved || lockedCourseNeedsPostcode;

  // A failed lookup falls back to the same manual-postcode path as "no course
  // found" — parents shouldn't be stranded because the lookup service is down.
  const courseFallback = courseNone || courseFailed;

  // A resolved course can proceed without an instructor number (the server derives
  // the franchisee from the course token); otherwise both the instructor number and
  // a postcode are required — a submit without either would be rejected server-side.
  const canStart =
    courseState.status === 'loading' || showPicker
      ? false
      : courseResolved
        ? !lockedCourseNeedsPostcode || manualPostcode.trim().length > 0
        : courseFallback &&
          instructorNumber.trim().length > 0 &&
          manualPostcode.trim().length > 0;

  async function runLookup(number: string) {
    const trimmed = number.trim();
    if (!trimmed) return;
    onCourseStateChange({ status: 'loading' });
    const result = await lookupCourses({ instructor_number: trimmed });
    if (!result.ok) {
      onCourseStateChange({ status: 'error', kind: result.kind, message: result.message });
      return;
    }
    if (result.courses.length === 0) {
      onCourseStateChange({ status: 'none' });
    } else if (result.courses.length === 1) {
      onCourseStateChange({ status: 'locked', course: result.courses[0] });
    } else {
      onCourseStateChange({ status: 'pick', courses: result.courses });
    }
  }

  // Look the class up as soon as the number looks complete (franchisee numbers
  // are four digits), after a short pause. The old trigger was the field losing
  // focus, which on a phone is exactly the moment the user taps into the
  // postcode box: the class resolved and the postcode box vanished from under
  // their thumb (Julie, 25 Sep 2026).
  const lookupTimer = useRef<number | null>(null);
  useEffect(() => {
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    const trimmed = instructorNumber.trim();
    if (!/^\d{4}$/.test(trimmed)) return;
    if (courseState.status === 'locked' || courseState.status === 'loading') return;
    lookupTimer.current = window.setTimeout(() => {
      void runLookup(trimmed);
    }, 400);
    return () => {
      if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    };
    // Only the typed number should retrigger; courseState is read, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructorNumber]);

  function handleInstructorBlur() {
    // Fallback for numbers that are not four digits (legacy short codes): look
    // up on leaving the field. Four-digit numbers have already resolved above.
    const trimmed = instructorNumber.trim();
    if (trimmed && !/^\d{4}$/.test(trimmed) && courseState.status !== 'locked') {
      void runLookup(trimmed);
    }
  }

  function handleInstructorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void runLookup(instructorNumber);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#006FAC]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12h6M12 9v6" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-[#1A4359]">Health Declaration</h1>
        <p className="mt-2 text-[#5A7A8F]">Daisy First Aid</p>
      </header>

      {/* Course resolution: loading */}
      {courseState.status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center gap-3 rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-sm text-[#5A7A8F]"
        >
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#D4E1E9] border-t-[#006FAC]"
          />
          Looking up your class&hellip;
        </div>
      )}

      {/* Course resolution failed (network or server) — distinct from "no class today" */}
      {courseFailed && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[#DF542F] bg-[#FDF3F0] px-4 py-3"
        >
          <p className="text-sm text-[#1A4359]">
            {courseState.kind === 'network'
              ? "We couldn't connect to look up your class. Check your internet connection and try again."
              : courseState.message}
          </p>
          <button
            type="button"
            onClick={onRetryLookup}
            className="mt-3 min-h-11 rounded-lg border-2 border-[#006FAC] px-4 py-2 text-sm font-semibold text-[#006FAC] hover:bg-[#EDF5FA]"
          >
            Try again
          </button>
        </div>
      )}

      {/* Course resolved: confirmation banner */}
      {courseResolved && (
        <CourseConfirmationBanner
          course={(courseState as { status: 'locked'; course: CourseCard }).course}
          onReset={onCourseReset}
        />
      )}

      {/* Multiple courses: one-tap picker */}
      {showPicker && (
        <CoursePicker
          courses={(courseState as { status: 'pick'; courses: CourseCard[] }).courses}
          onSelect={onCourseSelected}
        />
      )}

      {/* Intro text */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-[0_2px_8px_rgba(0,60,100,0.06)]">
        <p className="text-[#2D5570]">
          Before your first aid course begins, your instructor needs a brief health declaration.
          This helps them keep everyone safe and provide any reasonable adjustments needed.
        </p>
        <p className="mt-3 text-sm text-[#5A7A8F]">
          This form takes about one minute to complete. Your information is stored securely and
          used only to support the safe running of your course.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {/* Instructor number — hero field; hidden once course is confirmed */}
        {!courseResolved && (
          <div>
            <label
              htmlFor="instructor-number"
              className="mb-1.5 block text-sm font-medium text-[#1A4359]"
            >
              Your instructor&apos;s number
              <span className="ml-1 text-[#DF542F]">*</span>
            </label>
            <input
              id="instructor-number"
              type="text"
              value={instructorNumber}
              onChange={(e) => onInstructorChange(e.target.value.toUpperCase())}
              onBlur={handleInstructorBlur}
              onKeyDown={handleInstructorKeyDown}
              placeholder="e.g. 42"
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-lg text-[#1A4359] placeholder-[#5A7A8F] focus:border-[#006FAC] focus:outline-none focus:ring-2 focus:ring-[#D4E8F5]"
            />
            <p className="mt-1 text-xs text-[#5A7A8F]">
              Ask your trainer for their instructor number — e.g. 42
            </p>

            {/* No-class-found inline message */}
            {showNoneMessage && (
              <p role="status" aria-live="polite" className="mt-2 text-sm text-[#5A7A8F]">
                We couldn&apos;t find a class for that number today — please check with your
                trainer.
              </p>
            )}
          </div>
        )}

        {/* Postcode — shown when no course resolved (generic fallback), or when the
            locked course has no venue postcode (private classes) */}
        {postcodeRequired && (
          <div>
            <label
              htmlFor="postcode"
              className="mb-1.5 block text-sm font-medium text-[#1A4359]"
            >
              Postcode area
              <span className="ml-1 text-[#DF542F]">*</span>
            </label>
            <input
              id="postcode"
              type="text"
              value={manualPostcode}
              onChange={(e) => onManualPostcodeChange(e.target.value.toUpperCase())}
              placeholder="e.g. SW1"
              autoCapitalize="characters"
              className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-[#1A4359] placeholder-[#5A7A8F] focus:border-[#006FAC] focus:outline-none focus:ring-2 focus:ring-[#D4E8F5]"
            />
            <p className="mt-1 text-xs text-[#5A7A8F]">
              The postcode area where your class is happening — ask your trainer.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onStart}
        disabled={!canStart}
        className="mt-8 w-full rounded-lg bg-[#006FAC] px-6 py-4 text-lg font-semibold text-white shadow-[0_6px_20px_rgba(0,60,100,0.10)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
      >
        Start health declaration
      </button>
    </main>
  );
}
