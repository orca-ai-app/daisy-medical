import type React from 'react';
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
  onStart,
}: Props) {
  const courseResolved = courseState.status === 'locked';
  const showPicker = courseState.status === 'pick';
  const courseNone = courseState.status === 'none';

  // Show the "no class found" message only when: lookup is done, number was entered, and nothing resolved.
  const showNoneMessage = courseNone && instructorNumber.trim().length > 0;

  // Postcode is required in the no-course path if the user has entered an instructor number.
  const postcodeRequired = !courseResolved && instructorNumber.trim().length > 0;

  const canStart =
    courseState.status === 'loading' || showPicker
      ? false
      : courseResolved ||
        (courseNone &&
          instructorNumber.trim().length > 0 &&
          manualPostcode.trim().length > 0) ||
        // Edge case: no instructor entered but legacy postcode param present.
        (courseNone &&
          instructorNumber.trim().length === 0 &&
          manualPostcode.trim().length > 0);

  async function runLookup(number: string) {
    const trimmed = number.trim();
    if (!trimmed) return;
    onCourseStateChange({ status: 'loading' });
    const result = await lookupCourses({ instructor_number: trimmed });
    if (!result.ok) {
      onCourseStateChange({ status: 'none' });
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

  function handleInstructorBlur() {
    // Trigger lookup when the user leaves the field and the course hasn't been resolved yet.
    if (instructorNumber.trim() && courseState.status !== 'locked') {
      void runLookup(instructorNumber);
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
        <div className="mb-6 rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-sm text-[#5A7A8F]">
          Looking up your class&hellip;
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
          This form takes about two minutes to complete. Your information is stored securely and
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
              Your trainer will tell you this — e.g. 42
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

        {/* Postcode — shown only when no course resolved (generic fallback) */}
        {!courseResolved && (
          <div>
            <label
              htmlFor="postcode"
              className="mb-1.5 block text-sm font-medium text-[#1A4359]"
            >
              Postcode area
              {postcodeRequired && <span className="ml-1 text-[#DF542F]">*</span>}
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
