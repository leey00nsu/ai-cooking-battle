export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-white/60">로딩 중...</p>
      </div>
    </div>
  );
}
