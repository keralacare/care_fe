declare module "@/Integrations/Sentry" {
  export function initSentry(): void;
  export function captureException(error: any): void;
}

declare module "@/Integrations/Plausible" {
  export default function Plausible(): JSX.Element | null;
  export function triggerGoal(goal: string, props: object): void;
}
