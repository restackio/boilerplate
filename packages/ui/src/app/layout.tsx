// This is a minimal layout file to satisfy Next.js lint requirements
// This UI package is a component library, not a standalone app
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
