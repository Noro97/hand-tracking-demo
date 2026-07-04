import type { FC } from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay: FC<{ message?: string }> = ({ message = 'Starting camera…' }) => (
  <div className="absolute inset-0 flex items-center justify-center bg-page z-50">
    <div className="flex flex-col items-center">
      <Loader2 className="w-12 h-12 text-accent-blue animate-spin mb-4" />
      <p className="text-text-primary text-lg font-medium">{message}</p>
    </div>
  </div>
);

export default LoadingOverlay;
