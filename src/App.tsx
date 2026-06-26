import { useState } from 'react';
import type { AppStep } from './types';
import { IntroPage } from './pages/IntroPage';
import { DeclarationPage } from './pages/DeclarationPage';
import { SuccessPage } from './pages/SuccessPage';

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

  return (
    <div className="min-h-screen bg-[#F5F9FB] font-sans">
      {step === 'intro' && (
        <IntroPage
          instructorNumber={instructorNumber}
          territoryPostcode={territoryPostcode}
          onInstructorChange={setInstructorNumber}
          onPostcodeChange={setTerritoryPostcode}
          onStart={() => setStep('declaration')}
        />
      )}
      {step === 'declaration' && (
        <DeclarationPage
          instructorNumber={instructorNumber}
          territoryPostcode={territoryPostcode}
          onSuccess={() => setStep('success')}
          onBack={() => setStep('intro')}
        />
      )}
      {step === 'success' && <SuccessPage />}
    </div>
  );
}
