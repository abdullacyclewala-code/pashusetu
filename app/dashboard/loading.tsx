export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4 pt-1">
      <div>
        <div className="skel h-3 w-28" />
        <div className="skel mt-3 h-7 w-56" />
        <div className="skel mt-3 h-3.5 w-72 max-w-full" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 max-[740px]:grid-cols-1">
        <div className="skel h-24" />
        <div className="skel h-24" />
        <div className="skel h-24" />
      </div>
      <div className="skel h-64" />
    </div>
  );
}
