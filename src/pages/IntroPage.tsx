interface Props {
  instructorNumber: string;
  territoryPostcode: string;
  onInstructorChange: (v: string) => void;
  onPostcodeChange: (v: string) => void;
  onStart: () => void;
}

export function IntroPage({
  instructorNumber,
  territoryPostcode,
  onInstructorChange,
  onPostcodeChange,
  onStart,
}: Props) {
  const canStart = instructorNumber.trim().length > 0;

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
        <div>
          <label
            htmlFor="instructor-number"
            className="mb-1.5 block text-sm font-medium text-[#1A4359]"
          >
            Instructor number
          </label>
          <input
            id="instructor-number"
            type="text"
            value={instructorNumber}
            onChange={(e) => onInstructorChange(e.target.value.toUpperCase())}
            placeholder="e.g. JEN1"
            autoCapitalize="characters"
            className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-[#1A4359] placeholder-[#5A7A8F] focus:border-[#006FAC] focus:outline-none focus:ring-2 focus:ring-[#D4E8F5]"
          />
          <p className="mt-1 text-xs text-[#5A7A8F]">
            Your instructor's number — shown on the QR code sheet.
          </p>
        </div>

        <div>
          <label
            htmlFor="postcode"
            className="mb-1.5 block text-sm font-medium text-[#1A4359]"
          >
            Area postcode prefix
            <span className="ml-1 font-normal text-[#5A7A8F]">(optional)</span>
          </label>
          <input
            id="postcode"
            type="text"
            value={territoryPostcode}
            onChange={(e) => onPostcodeChange(e.target.value.toUpperCase())}
            placeholder="e.g. SW1"
            autoCapitalize="characters"
            className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-[#1A4359] placeholder-[#5A7A8F] focus:border-[#006FAC] focus:outline-none focus:ring-2 focus:ring-[#D4E8F5]"
          />
        </div>
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
