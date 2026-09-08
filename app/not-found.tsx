export default function NotFound() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-300">
      <div className="text-center">
        <h2 className="text-xl font-bold font-mono text-cyan-500 mb-2">404 - Not Found</h2>
        <p className="text-sm">Could not find requested resource</p>
      </div>
    </div>
  )
}
