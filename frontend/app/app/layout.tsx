export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden">
      {children}
    </div>
  );
}
