import { Camera } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        {/* Simple Camera Icon */}
        <div className="inline-block">
          <div className="w-12 h-12 bg-black/5 text-black/80 flex items-center justify-center rounded-xl">
            <Camera className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Minimal loading dots */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce [animation-delay:0ms]"></div>
          <div className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce [animation-delay:150ms]"></div>
          <div className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce [animation-delay:300ms]"></div>
        </div>
      </div>
    </div>
  );
}
