import type { FC } from 'react';
import { Monitor } from 'lucide-react';

/** Blocks the whole viewport below the `md` breakpoint — the camera demos need desktop screen size and a webcam. */
const MobileBlocker: FC = () => (
  <div className="fixed inset-0 z-[100] bg-page flex flex-col items-center justify-center p-8 text-center md:hidden">
    <Monitor className="w-16 h-16 text-accent-red mb-6 animate-pulse" />
    <h2 className="text-2xl font-bold text-text-primary mb-4">Desktop View Required</h2>
    <p className="text-text-muted max-w-md text-lg leading-relaxed">
      This experience requires a larger screen and webcam.
    </p>
  </div>
);

export default MobileBlocker;
