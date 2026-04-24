export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse p-4 sm:p-8">
      <div className="mb-8 h-8 w-48 rounded bg-[#282828]" />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-[3/4] w-full rounded-xl bg-[#282828]" />
            <div className="h-4 w-3/4 rounded bg-[#282828]" />
            <div className="h-3 w-1/2 rounded bg-[#282828]" />
          </div>
        ))}
      </div>
    </div>
  );
}
