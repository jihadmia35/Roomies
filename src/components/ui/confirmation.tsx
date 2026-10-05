'use client';
import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Modal, Button } from './index';
type Ask = (message: string) => Promise<boolean>;
const ConfirmationContext = createContext<Ask | null>(null);
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<((answer: boolean) => void) | null>(null);
  const ask = useCallback<Ask>(
    (message) =>
      new Promise((resolve) => {
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setMessage(message);
      }),
    [],
  );
  const finish = (answer: boolean) => {
    resolveRef.current?.(answer);
    resolveRef.current = null;
    setMessage(null);
  };
  return (
    <ConfirmationContext.Provider value={ask}>
      {children}
      {message && (
        <Modal title="কাজটি নিশ্চিত করুন" onClose={() => finish(false)}>
          <div className="modal-body">
            <div className="confirmation-message">
              <ShieldCheck size={24} />
              <p>{message}</p>
            </div>
            <div className="modal-footer">
              <Button autoFocus variant="secondary" onClick={() => finish(false)}>
                বাতিল
              </Button>
              <Button onClick={() => finish(true)}>হ্যাঁ, নিশ্চিত করুন</Button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmationContext.Provider>
  );
}
export function useConfirm() {
  const ask = useContext(ConfirmationContext);
  if (!ask) throw new Error('ConfirmationProvider is required');
  return ask;
}
