# Dev Readiness Record

## Status

Approved and reusable as of 2026-03-22.

## Scope

This record captures the current local development setup for the `my-make` repository on a Windows host.
It documents the approved dev workflow, the current platform coverage, and the main operational checks.

## Approved Outcomes

- `npm run dev` is the primary local entry point.
- `npm run dev` now starts Metro, the Go server, Android, and Windows when the host can support them.
- On this Windows machine, Android and Windows are runnable together with Metro and the Go server.
- iOS and macOS remain out of scope on this host.
- Port cleanup helpers exist for `8080` and `8081`.
- The client health-check screen can verify local, Docker, and cloud endpoints.

## Current Dev Flow

1. Sync runtime config with `npm run sync:runtime-config:dev`.
2. Run the dev target checks.
3. Start the supported targets.

Relevant scripts:

- `package.json`
- `scripts/generate-runtime-config.js`
- `scripts/dev-platform-check.js`
- `scripts/run-platform-target.js`
- `scripts/start-supported-dev.js`

## Runtime Configuration

Client runtime config is generated from the current environment and `.env` files.
The active client-side values are:

- `CLIENT_RENDER_BASE_URL`
- `CLIENT_HEALTH_PATH`
- `CLIENT_LOCAL_PORT`
- `CLIENT_DOCKER_PORT`

`DEV_HOST_IP` is optional. When it is not set, the runtime config generator detects the host IP automatically.

## Server Requirements

The Go server requires these environment variables for Oracle-backed health checks:

- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECTION_STRING`

Operationally useful but not strictly required for the server to start:

- `PORT`
- `APP_ENV`
- `GO_ENV`
- `SERVER_LOG_LEVEL`
- `PEPPER`

## Health Check Behavior

- Local health checks try `localhost` and `127.0.0.1` first on Windows.
- Android health checks still support the emulator loopback path.
- Cloud health checks use the configured Render base URL plus `/health`.
- Health check requests use a timeout so the UI does not hang indefinitely.

Relevant files:

- `client/src/shared/lib/healthCheck.ts`
- `client/src/screens/dev/HealthCheckScreen.tsx`
- `client/src/domains/members/MembersHomeScreen.tsx`

## Port Management

Use these scripts to clear stale dev listeners:

- `npm run port:8080:kill`
- `npm run port:8081:kill`
- `npm run ports:dev:kill`

These are meant for local cleanup before rerunning `npm run dev`.

## Verification Summary

Validated locally on this Windows host:

- `node ./scripts/start-supported-dev.js --dry-run`
- `node ./scripts/dev-platform-check.js`
- `npm run dev`
- `http://127.0.0.1:8080/health`
- `http://127.0.0.1:8081/status`

Observed result:

- Metro runs successfully.
- The Go server responds successfully on `/health`.
- Android launches successfully on the available emulator.
- Windows launches successfully on the local host.

## Known Limitations

- iOS still requires a macOS host and Xcode.
- macOS client support is not configured in this repository.
- Windows readiness depends on the local Visual Studio and RNW toolchain being installed correctly on the host.

## Remaining TODOs

- Keep the dev target checks aligned with actual RNW behavior.
- Keep `README.md` aligned with the current `dev` flow and port usage.
- Update the record if the supported platform set changes.

## Next Recommended Batch

- If the platform set changes, update the dev target scripts and this record together.
- If the health-check UX changes, update the shared health-check helper and the test page together.

## Review Checkpoints

- Confirm `npm run dev` still starts only the supported targets on this host.
- Confirm `8080` and `8081` cleanup scripts still work after any process orchestration change.
- Confirm the Windows health-check behavior stays stable when the server endpoint list changes.
