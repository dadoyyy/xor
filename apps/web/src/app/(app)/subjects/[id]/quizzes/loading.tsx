export default function TabQuizzesLoading() {
  return (
    <div className="space-y-4 animate-pulse py-2">
      <div className="flex justify-between items-center h-10">
        <div className="h-6 w-32 rounded-lg bg-[#F7F5FF]" />
        <div className="h-9 w-28 rounded-[10px] bg-[#F7F5FF]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-28 rounded-[20px] bg-[#F7F5FF]" />
        <div className="h-28 rounded-[20px] bg-[#F7F5FF]" />
      </div>
    </div>
  );
}

