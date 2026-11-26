export type GuardResult<TData = void> =
  | { allowed: false; message?: string }
  | ([TData] extends [void] ? { allowed: true; data?: undefined } : { allowed: true; data: TData });
