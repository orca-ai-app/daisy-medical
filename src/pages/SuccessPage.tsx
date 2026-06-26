export function SuccessPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#67A671]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-bold text-[#1A4359]">Declaration submitted</h1>
      <p className="mt-4 text-[#2D5570]">
        Thank you. Your health declaration has been received by your instructor.
      </p>
      <p className="mt-3 text-sm text-[#5A7A8F]">
        You can now put your phone away and enjoy your first aid course.
      </p>
      <div className="mt-8 rounded-lg bg-[#EDF5FA] px-5 py-4 text-sm text-[#2D5570]">
        If you need to update your declaration or have any concerns, please speak directly to
        your instructor before the course begins.
      </div>
    </main>
  );
}
