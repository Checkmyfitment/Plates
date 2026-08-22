export default function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden card-elevated">
      <div className="skeleton h-24 w-full" style={{ borderRadius: 0 }} />
      <div className="p-2.5 flex flex-col gap-1.5">
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-1/3 mt-1" />
      </div>
    </div>
  )
}
