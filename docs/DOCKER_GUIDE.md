# Docker Usage Guide

This guide explains how to use Docker in a practical way:
- first-time setup on your machine
- first run for an existing project
- daily/regular runs
- starting a new project with Docker
- recurring maintenance tasks

Copy tip for VS Code Markdown Preview:
- Hover any code block and click the built-in copy icon.
- To get one copy icon per command, each command in this guide is in its own code block where possible.

## 1. First-Time Setup (One-Time on Your Machine)

1. Install Docker (Docker Engine or Docker Desktop, depending on your OS).
2. Verify installation:

```bash
docker --version                    # show Docker CLI version
```

```bash
docker compose version              # show Docker Compose v2 version
```

3. On Linux, allow running Docker without `sudo`:

```bash
sudo usermod -aG docker $USER
```

```bash
newgrp docker
```

4. Run a quick test:

```bash
docker run hello-world              # run a test container to verify Docker works
```

## 2. First Run of an Existing Project

1. Open the project folder.
2. Prepare environment variables if needed (for example, create/update `.env`).
3. Build and start services:

```bash
docker compose up --build -d
```

4. Check running services:

```bash
docker compose ps
```

```bash
docker compose logs -f
```

5. Open the app on the configured port (for example `3000`, based on your compose file).

Notes:
- Use `--build` for the first run or after dependency/Dockerfile changes.
- Use `-d` to run containers in the background.

## 3. Regular Daily Usage (Next Runs)

Start:

```bash
docker compose up -d                # start services in background mode
```

Stop without deleting containers:

```bash
docker compose stop
```

Start again after stop:

```bash
docker compose start
```

Stop and remove containers/network:

```bash
docker compose down
```

Restart a single service:

```bash
docker compose restart app
```

View logs for a service:

```bash
docker compose logs -f app
```

## 3.1 Command Groups (Complete)

Use this grouped list as your primary reference.

### A) Version and Setup Checks

```bash
docker --version
```

```bash
docker compose version
```

```bash
docker run hello-world
```

### B) Build and Run

```bash
docker compose up -d
```

```bash
docker compose up --build -d        # rebuild images if needed, then start in background
```

```bash
docker compose build                # build service images from Dockerfile
```

```bash
docker compose build --no-cache     # rebuild images from scratch without cached layers
```

### C) Stop and Restart (No Deletion vs Deletion)

```bash
docker compose stop                 # stop containers without deleting them
```

```bash
docker compose start                # start previously stopped containers
```

```bash
docker compose restart              # restart all services
```

```bash
docker compose restart app          # restart only the app service
```

```bash
docker compose down                 # stop and remove containers and default network
```

```bash
docker compose down -v              # same as down, plus remove named/anonymous volumes
```

### D) Status, Logs, and Debugging

```bash
docker compose ps                   # list compose services and current status
```

```bash
docker compose logs -f              # follow logs for all services
```

```bash
docker compose logs -f app          # follow logs for the app service only
```

```bash
docker compose logs --tail=200 app  # show the latest 200 log lines for app
```

```bash
docker compose top                  # show running processes inside compose services
```

```bash
docker compose exec app sh          # open a shell inside the app container
```

```bash
docker inspect <container_name>     # show detailed low-level container metadata
```

```bash
docker stats                        # show live CPU/memory/network usage by containers
```

### E) Images, Containers, Volumes

```bash
docker image ls                     # list local Docker images
```

```bash
docker container ls -a              # list all containers (running + stopped)
```

```bash
docker volume ls                    # list Docker volumes
```

```bash
docker image prune -f               # remove dangling (untagged) images
```

### F) Cleanup and Disk Usage

```bash
docker system df                    # show Docker disk usage summary
```

```bash
docker system prune -f              # remove unused containers/networks/cache (safe baseline)
```

```bash
docker system prune -a --volumes -f # deep cleanup: unused images + volumes + cache
```

### G) Pull, Registry, and Tagging

```bash
docker compose pull                 # pull newer images for services from registry
```

```bash
docker pull node:20-alpine          # pull a specific base image tag from Docker Hub
```

```bash
docker tag my-image:latest myrepo/my-image:1.0.0  # add a new tag before push
```

```bash
docker push myrepo/my-image:1.0.0   # push the tagged image to your registry
```

### H) Optional Security and Backup

```bash
docker scout quickview              # run a quick image security overview (if available)
```

```bash
docker run --rm -v my_db_data:/data -v "$PWD":/backup alpine tar czf /backup/db-backup.tgz -C /data .  # create a tar backup of a Docker volume
```

## 4. Starting a New Project with Docker

1. Create a `Dockerfile`.
2. Create a `docker-compose.yml`.
3. Create a `.dockerignore` (important for faster builds and smaller contexts).
4. Build and run:

```bash
docker compose up --build
```

5. For background mode afterward:

```bash
docker compose up -d
```

Suggested `.dockerignore` (example):

```text
node_modules
.git
dist
build
.next
npm-debug.log
.env
```

## 5. Recurring Maintenance Tasks

1. Pull latest images and restart:

```bash
docker compose pull
```

```bash
docker compose up -d
```

2. Clean unused Docker resources (safe baseline):

```bash
docker system prune -f
```

3. Deep cleanup including unused volumes (use carefully):

```bash
docker system prune -a --volumes -f
```

4. Check disk usage:

```bash
docker system df
```

5. Backup important persistent data (especially database volumes).

6. If caching/build issues appear, rebuild from scratch:

```bash
docker compose down
```

```bash
docker compose build --no-cache
```

```bash
docker compose up -d
```

## 6. Useful Command Cheat Sheet

This section is now consolidated in **3.1 Command Groups (Complete)** above.

## 7. Common Issues and Quick Fixes

### Port Already in Use
- Change the host port mapping in `docker-compose.yml`, or stop the conflicting process/container.

### Code Changes Not Reflected
- Ensure proper bind mounts in development mode, or rebuild the image.

### Container Exits Immediately
- Inspect logs:

```bash
docker compose logs --tail=200 app
```

## 8. Core Concepts You Must Know

### Image vs Container (Most Important)

- **Image**: a read-only blueprint (template) that contains your app code, runtime, and dependencies.
- **Container**: a running (or stopped) instance created from an image.

Think of it this way:
- Image = class definition
- Container = object instance

Practical meaning:
- You build an image once.
- You can run many containers from the same image.
- Deleting a container does not delete the image.

Useful commands:

```bash
docker image ls
```

```bash
docker container ls -a
```

```bash
docker run --name myapp -p 3000:3000 my-image:latest
```

### Registry

- A registry stores images (Docker Hub, GHCR, private registries).
- `docker pull` downloads an image.
- `docker push` uploads an image.

```bash
docker pull node:20-alpine
```

```bash
docker tag my-image:latest myrepo/my-image:1.0.0
```

```bash
docker push myrepo/my-image:1.0.0
```

### Volumes vs Bind Mounts

- **Volume**: Docker-managed persistent storage (recommended for DB data).
- **Bind mount**: maps a host folder to container path (great for development/live code edits).

When to use which:
- Use volumes for databases and persistent service data.
- Use bind mounts for local source code in dev mode.

### Networks

- Containers communicate through Docker networks.
- In Compose, services talk using service names (for example, `db`, `redis`).
- You usually do not need host IPs between compose services.

## 9. Dockerfile Fundamentals

### Common Instructions

- `FROM`: base image
- `WORKDIR`: working directory
- `COPY`: copy files
- `RUN`: execute build-time commands
- `ENV`: environment variables
- `EXPOSE`: document service port
- `CMD` / `ENTRYPOINT`: startup command

### Build Cache and Layers

Dockerfile lines become layers. Reusing layers speeds up builds.

Best practice for Node projects:
1. Copy lock/package files first.
2. Install dependencies.
3. Copy app source.

This avoids reinstalling dependencies for every source code change.

### Multi-Stage Builds

Use build stage + runtime stage to produce smaller, safer images.

Benefits:
- reduced image size
- fewer attack surfaces
- faster deploy/pull

## 10. Docker Compose Essentials

### Why Compose

Compose manages multiple services in one file (app, db, cache, worker).

### Typical Compose Fields

- `services`
- `build` or `image`
- `ports`
- `environment`
- `volumes`
- `depends_on`
- `networks`

### Profiles (Optional)

Use profiles to run optional services only when needed.

```bash
docker compose --profile dev up -d
```

### Environment Variables

- Put secrets and configuration in `.env`.
- Do not hardcode credentials in Dockerfile/compose.
- Keep `.env.example` for onboarding.

## 11. Development vs Production Mindset

### Development

- Bind mounts for source code.
- Verbose logs.
- Fast feedback and hot reload.

### Production

- Immutable image builds.
- No source bind mounts.
- Minimal image, strict env vars, restart policies.
- Prefer tagged versions (for example `app:1.3.2`) over `latest`.

## 12. Security Basics

1. Use minimal base images (`alpine`/distroless when possible).
2. Do not run as root inside container.
3. Never commit `.env` secrets to git.
4. Pin versions for base images and dependencies.
5. Scan images periodically:

```bash
docker scout quickview
```

If `docker scout` is unavailable, use an alternative scanner such as Trivy.

## 13. Data Safety and Backups

- Containers are ephemeral.
- Volumes persist data.
- Always back up DB volumes before destructive cleanup.

Example volume backup pattern:

```bash
docker run --rm -v my_db_data:/data -v "$PWD":/backup alpine tar czf /backup/db-backup.tgz -C /data .
```

## 14. Observability and Debugging

Useful commands:

```bash
docker compose ps
```

```bash
docker compose logs -f --tail=200
```

```bash
docker compose top
```

```bash
docker compose exec app sh
```

```bash
docker inspect <container_name>
```

```bash
docker stats
```

Debug flow:
1. Check service status (`ps`).
2. Read logs (`logs`).
3. Enter container (`exec`) and verify env/files/processes.
4. Inspect networking and port mappings.
5. Rebuild without cache if needed.

## 15. Practical Weekly/Monthly Routine

### Weekly

1. `docker compose ps` and review unhealthy/restarting services.
2. `docker system df` and monitor disk growth.
3. Rotate/review logs if they are large.

### Monthly

1. `docker compose pull` for base image updates.
2. Rebuild and restart services.
3. Perform controlled cleanup (`docker system prune -f`).
4. Verify restore from backup at least once.

## 16. Onboarding Checklist for Any New Docker Project

1. Confirm required software versions (Docker, Compose).
2. Copy `.env.example` to `.env` and fill values.
3. Run `docker compose up --build -d`.
4. Verify health with `docker compose ps`.
5. Open app and smoke test main flows.
6. Learn stop/reset commands for local recovery.

## 17. Quick Decision Guide

- Need persistence? -> volume.
- Need local live code edits? -> bind mount.
- Need repeatable deployment? -> image tags + compose + env management.
- Need faster/smaller deploys? -> multi-stage Dockerfile.
- Need multiple services? -> docker compose.

