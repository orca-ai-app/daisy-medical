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
  const [territoryPostcode, setTerritoryPostcode] = useState<string>(() =>
    readQueryParam('postcode'),
  );
  const [courseState, setCourseState] = useState<CourseResolutionState>({ status: 'idle' });

  // On mount, attempt course resolution from query params.
  useEffect(() => {
    const courseToken = readQueryParam('course');
    const instructor = readQueryParam('instructor');

    if (courseToken) {
      setCourseState({ status: 'loading' });
      lookupCourses({ booking_token: courseToken }).then((result) => {
        if (result.ok && result.courses.length > 0) {
          setCourseState({ status: 'locked', course: result.courses[0] });
        } else {
          // Token not found — fall back to generic flow
          setCourseState({ status: 'none' });
        }
      });
    } else if (instructor) {
      setCourseState({ status: 'loading' });
      lookupCourses({ instructor_number: instructor }).then((result) => {
        if (!result.ok || result.courses.length === 0) {
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
  }, []); // run once on mount

  function handleCourseSelected(course: CourseCard) {
    setCourseState({ status: 'locked', course });
  }

  const lockedCourse = courseState.status === 'locked' ? courseState.course : undefined;

  return (
    <div className="min-h-screen bg-[#F5F9FB] font-sans">
      {step === 'intro' && (
        <IntroPage
          instructorNumber={instructorNumber}
          territoryPostcode={territoryPostcode}
          onInstructorChange={setInstructorNumber}
          onPostcodeChange={setTerritoryPostcode}
          courseState={courseState}
          onCourseSelected={handleCourseSelected}
          onStart={() => setStep('declaration')}
        />
      )}
      {step === 'declaration' && (
        <DeclarationPage
          instructorNumber={instructorNumber}
          territoryPostcode={territoryPostcode}
          courseToken={lockedCourse?.booking_token}
          lockedCourse={lockedCourse}
          onSuccess={() => setStep('success')}
          onBack={() => setStep('intro')}
        />
      )}
      {step === 'success' && <SuccessPage />}
    </div>
  );
}
