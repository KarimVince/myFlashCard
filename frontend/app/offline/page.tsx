export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-6">📶</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">You&apos;re offline</h1>
      <p className="text-gray-500 max-w-sm">
        No internet connection. Pages you visited before are still available — go back or try again when you&apos;re online.
      </p>
    </div>
  );
}
