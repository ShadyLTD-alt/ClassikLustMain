declare module 'proper-lockfile' {
  interface LockOptions {
    lockfilePath?: string;
    retries?: number | { retries?: number; minTimeout?: number; maxTimeout?: number };
    minTimeout?: number;
    maxTimeout?: number;
    realpath?: boolean;
    fs?: any;
    onCompromised?: (err: Error) => void;
  }

  interface UnlockOptions {
    fs?: any;
    realpath?: boolean;
  }

  export function lock(file: string, options?: LockOptions): Promise<() => Promise<void>>;
  export function unlock(file: string, options?: UnlockOptions): Promise<void>;
  export function check(file: string, options?: LockOptions): Promise<boolean>;
  export function lockSync(file: string, options?: LockOptions): () => void;
  export function unlockSync(file: string, options?: UnlockOptions): void;
  export function checkSync(file: string, options?: LockOptions): boolean;
}