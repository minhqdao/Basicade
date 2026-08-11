# Repository agent guidance

## Process lifecycle

- Do not launch detached or background development servers, and do not use
  `npm exec vite` as an ad hoc server.
- Use the existing npm scripts in a managed terminal session. Keep the session
  identifier and stop the session before finishing the task or after an
  interrupted test.
- Use Playwright's configured `webServer` for browser tests instead of starting
  a separate Vite server.
- Give ad hoc interpreter runs complete input or execute them through a bounded
  child process. An interpreter waiting for input must not be left running.
- After development-server or browser-test work, check for Basicade-owned Node,
  Vite, and Playwright processes and terminate only processes started by the
  current task.
