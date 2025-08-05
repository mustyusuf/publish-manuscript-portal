import { ReactNode } from 'react';
import useIdleTimeout from '@/hooks/useIdleTimeout';

interface IdleTimeoutWrapperProps {
  children: ReactNode;
}

const IdleTimeoutWrapper = ({ children }: IdleTimeoutWrapperProps) => {
  useIdleTimeout();
  return <>{children}</>;
};

export default IdleTimeoutWrapper;