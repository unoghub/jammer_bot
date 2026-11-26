import type { CommandContext } from "../commands/CommandContext.ts";
import type { GuardResult } from "./GuardResult.ts";

export interface Guard<TData = void> {
  check(context: CommandContext): Promise<GuardResult<TData>>;
}

export type AnyGuard = {
  check(
    context: CommandContext,
  ):
    | { allowed: false; message?: string }
    | { allowed: true; data?: unknown }
    | Promise<{ allowed: false; message?: string } | { allowed: true; data?: unknown }>;
};

export type GuardClass<G extends AnyGuard = AnyGuard> = abstract new (...args: any[]) => G;
export type GuardData<G extends AnyGuard> =
  Extract<Awaited<ReturnType<G["check"]>>, { allowed: true }> extends { data: infer D }
    ? D
    : undefined;
