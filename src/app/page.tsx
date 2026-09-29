import { InfiniteCanvas } from '@/components/Canvas/InfiniteCanvas';

export default function Home() {
  return (
    <main className="relative w-full h-full h-[100dvh] overflow-hidden bg-white">
      <InfiniteCanvas />
    </main>
  );
}
