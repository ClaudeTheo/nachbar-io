// Auth-Layout — kein Nav, zentrierter Inhalt
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-warmwhite px-4">
      <div className="w-full max-w-md">{children}</div>
      <span className="fixed bottom-2 left-2 text-[10px] text-gray-500">
        V
        {(process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0")
          .split(".")
          .slice(0, 2)
          .join(".")}
      </span>
    </main>
  );
}
