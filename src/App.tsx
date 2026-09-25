import { useState, useEffect } from 'react';
import type { AppStep, CourseCard, CourseResolutionState } from './types';
import { IntroPage } from './pages/IntroPage';
import { DeclarationPage } from './pages/DeclarationPage';
import { SuccessPage } from './pages/SuccessPage';
import { lookupCourses } from './api';

function readQueryParam(name: string): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? '';
}

export default function App() {
  const [step, setStep] = useState<AppStep>('intro');
  const [instructorNumber, setInstructorNumber] = useState<string>(() =>
    readQueryParam('instructor'),
  );
  // Postcode for the no-course fallback path; pre-filled from legacy ?postcode= QR param.
  const [manualPostcode, setManualPostcode] = useState<string>(() => readQueryParam('postcode'));
  const [courseState, setCourseState] = useState<CourseResolutionState>({ status: 'idle' });
  // Short reference returned by submit-medical-declaration, shown on the success page.
  const [successReference, setSuccessReference] = useState<string | null>(null);

  // When a course is locked, derive territory_postcode from its venue; fall back to the
  // manually entered value when there is no locked course OR the course has no venue
  // postcode (private classes — venue_postcode is nullable).
  const lockedCourse = courseState.status === 'locked' ? courseState.course : undefined;
  const territoryPostcode = lockedCourse?.venue_postcode ?? manualPostcode;

  // Resolve the course from the `course` booking-token param, or the current
  // instructor number. Used on mount AND by the Retry button after a failure.
  function resolveCourse() {
    const courseToken = readQueryParam('course');
    const instructor = instructorNumber.trim() || readQueryParam('instructor');

    if (courseToken) {
      // Highest-priority: legacy `course` booking-token param.
      setCourseState({ status: 'loading' });
      void lookupCourses({ booking_token: courseToken }).then((result) => {
        if (!result.ok) {
          setCourseState({ status: 'error', kind: result.kind, message: result.message });
        } else if (result.courses.length > 0) {
          setCourseState({ status: 'locked', course: result.courses[0] });
        } else {
          setCourseState({ status: 'none' });
        }
      });
    } else if (instructor) {
      // New QR: instructor number only.
      setCourseState({ status: 'loading' });
      void lookupCourses({ instructor_number: instructor }).then((result) => {
        if (!result.ok) {
          setCourseState({ status: 'error', kind: result.kind, message: result.message });
        } else if (result.courses.length === 0) {
          setCourseState({ status: 'none' });
        } else if (result.courses.length === 1) {
          setCourseState({ status: 'locked', course: result.courses[0] });
        } else {
          setCourseState({ status: 'pick', courses: result.courses });
        }
      });
    } else {
      setCourseState({ status: 'none' });
    }
  }

  // On mount: attempt course resolution from query params.
  useEffect(() => {
    resolveCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  function handleCourseSelected(course: CourseCard) {
    setCourseState({ status: 'locked', course });
  }

  function handleResetCourse() {
    setCourseState({ status: 'none' });
    setInstructorNumber('');
    setManualPostcode('');
  }

  // Keep the phone's back gesture inside the app. Without a history entry per
  // step, Back left the page entirely and everything typed was lost (Julie,
  // 25 Sep 2026). The declaration stays mounted on the intro step, so going
  // back keeps the answers.
  useEffect(() => {
    const onPop = () => setStep((s) => (s === 'declaration' ? 'intro' : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function goToDeclaration() {
    window.history.pushState({ step: 'declaration' }, '');
    setStep('declaration');
  }

  function goBackToIntro() {
    if (window.history.state?.step === 'declaration') {
      window.history.back(); // popstate handler moves the step
    } else {
      setStep('intro');
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F9FB] font-sans">
      {step === 'intro' && (
        <IntroPage
          instructorNumber={instructorNumber}
          manualPostcode={manualPostcode}
          onInstructorChange={setInstructorNumber}
          onManualPostcodeChange={setManualPostcode}
          courseState={courseState}
          onCourseSelected={handleCourseSelected}
          onCourseReset={handleResetCourse}
          onCourseStateChange={setCourseState}
          onRetryLookup={resolveCourse}
          onStart={goToDeclaration}
        />
      )}
      {/* Kept mounted (CSS-hidden) on the intro step so entered answers and the
          submissionId survive intro ↔ declaration navigation within a session. */}
      {step !== 'success' && (
        <div className={step === 'declaration' ? undefined : 'hidden'}>
          <DeclarationPage
            instructorNumber={instructorNumber}
            territoryPostcode={territoryPostcode}
            courseToken={lockedCourse?.booking_token}
            lockedCourse={lockedCourse}
            onSuccess={(reference) => {
              setSuccessReference(reference ?? null);
              setStep('success');
            }}
            onBack={goBackToIntro}
          />
        </div>
      )}
      {step === 'success' && <SuccessPage reference={successReference} />}
    </div>
  );
}
