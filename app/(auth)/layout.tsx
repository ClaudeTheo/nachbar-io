// Auth-Layout — kein Nav, zentrierter Inhalt
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-warmwhite px-4">
      <div className="w-full max-w-md">{children}</div>
      <span className="absolute bottom-2 left-3 text-[10px] text-muted-foreground/50">
        V{process.env.NEXT_PUBLIC_APP_VERSION?.split('.').slice(0, 2).join('.')}
      </span>
    </div>
  );
}
