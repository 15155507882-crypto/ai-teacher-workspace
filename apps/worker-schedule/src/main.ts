import { TermSwitchJob } from './jobs/term-switch.job';

async function bootstrap() {
  console.log('[Worker-Schedule] Scheduled tasks worker started');

  setInterval(
    () => {
      try {
        TermSwitchJob.check();
      } catch (error) {
        console.error('[Worker-Schedule] Term switch check failed:', error);
      }
    },
    60 * 60 * 1000
  );

  console.log('[Worker-Schedule] Registered jobs: term-switch-check (hourly)');

  TermSwitchJob.check();
}

bootstrap().catch(console.error);
