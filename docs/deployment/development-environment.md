# Development and verification environment

The project runtime is the Nuxt application under `nuxt-app/`. Use the Conda environment in the repository root to keep the Node, Python, and SQLite toolchain consistent across machines.

## Create the environment

```powershell
conda env create -f environment.yml
conda activate fany-site
```

If the environment already exists:

```powershell
conda env update -f environment.yml --prune
conda activate fany-site
```

## Install and verify the application

```powershell
Set-Location nuxt-app
npm install --global pnpm@10.12.1
pnpm install --frozen-lockfile
npx prisma generate
npx prisma validate
pnpm build
```

The application uses SQLite through Prisma. Set `DATABASE_URL` in a local `.env` file before running database-backed verification; never commit that file or production secrets.

For a single-instance deployment, the optional daily processor can be enabled with `CONTENT_PIPELINE_SCHEDULE_ENABLED=true` and optionally `CONTENT_PIPELINE_INTERVAL_MS=86400000`. In a multi-instance deployment, call the authenticated admin processing endpoint from one external scheduler instead, to avoid duplicate scheduled jobs.

The Conda environment provides the toolchain only. JavaScript dependencies remain managed by `nuxt-app/package.json` and the lockfile supplied by the repository.

The environment pins Node 22 because the current `@nuxt/content` dependency obtains a Windows prebuilt `better-sqlite3` binding for that ABI. If a future dependency update has no matching prebuilt binding, install Visual Studio Build Tools with the “Desktop development with C++” workload and run `pnpm rebuild better-sqlite3`.
