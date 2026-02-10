---
date: 2026-02-10
time: "09:48"
type: session
domain: opensource
status: completed
tags:
  - cortana-session
  - implementation
summary: "Set up Docker development environment for OpenClaw fork with multi-stage builds"
project: "openclaw-docker"
model: claude-opus-4-6
duration_minutes: 90
isc_satisfied: 5
isc_total: 6
---

# OpenClaw Docker Setup

## Context

OpenClaw is an open-source reimplementation of the classic Captain Claw game engine. The upstream project uses CMake with platform-specific dependencies (SDL2, libxml2, zlib) that make local development setup painful — especially on macOS where some Linux-specific audio libraries aren't available. This session created a Docker-based development environment to standardize builds across platforms.

## What Was Built

### Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Build environment with all dependencies
FROM ubuntu:22.04 AS builder
RUN apt-get update && apt-get install -y \
    cmake g++ libsdl2-dev libsdl2-image-dev \
    libsdl2-mixer-dev libsdl2-ttf-dev \
    libxml2-dev zlib1g-dev

# Stage 2: Runtime with minimal footprint
FROM ubuntu:22.04 AS runtime
COPY --from=builder /usr/local/bin/openclaw /usr/local/bin/
```

### docker-compose.yml

- **build** service: Compiles from source with CMake
- **run** service: Launches the game with X11 forwarding (Linux) or XQuartz (macOS)
- **test** service: Runs the unit test suite in isolated container

### Helper Scripts

- `scripts/docker-build.sh` — One-command build with cache management
- `scripts/docker-run.sh` — Platform-aware launch (detects X11 vs XQuartz)

## Challenges Encountered

1. **SDL2 audio on macOS containers** — PulseAudio doesn't exist in Docker on macOS. Workaround: pipe audio through network socket with `PULSE_SERVER=host.docker.internal`.
2. **X11 forwarding on Apple Silicon** — XQuartz needs explicit `xhost +localhost` and `DISPLAY=host.docker.internal:0`. Added detection to `docker-run.sh`.
3. **CMake find_package failures** — Several SDL2 CMake modules had hardcoded paths. Fixed by setting `CMAKE_PREFIX_PATH` in the Dockerfile.

## Action Items

- [ ] Submit Dockerfile upstream as PR to openclaw/openclaw
- [ ] Add GitHub Actions CI workflow using the Docker build
- [ ] Test X11 forwarding on Linux (currently only verified on macOS)

## Related Notes

- [[2026-02-10_0827_hook-pipeline-refactoring]] — Same day, different project — context switching between vault infra and OSS contributions
