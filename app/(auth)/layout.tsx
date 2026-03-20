// Auth-Layout — kein Nav, zentrierter Inhalt
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-warmwhite px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
