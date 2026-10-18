# Deploying BamDoodle to Scaleway

One Serverless Container in Amsterdam (`nl-ams`) runs the game: the Rust server with the web app and word lists
inside (`Dockerfile`). Exactly one instance, always on, because rooms live in memory
([decision 0002](../docs/decisions/0002-in-memory-state.md), [0003](../docs/decisions/0003-hosting.md)).

| Piece | Where |
| --- | --- |
| Registry namespace, container namespace, container, custom domain | `infra/scaleway/*.tf` (Terraform, run by hand) |
| Build, push, redeploy, smoke test | `.github/workflows/release.yml` (on a `v*` tag, or by hand) |
| Image build and a short game against it on every change | the `image` job in `.github/workflows/ci.yml` |
| WebSocket smoke and soak test | `scripts/ws-soak.mjs` |

Cost: the container at 140 mvCPU / 256 MB, always on, is about €5 a month before Scaleway's free tier (which is
shared with AmputatorBot), plus cents for the registry.

## Running your own copy

The steps below set up bamdoodle.io, and work for a fork with a few names changed. Give it its own name and logo
([brand/README.md](../brand/README.md)), then:

- `app_name` and `project_name` in `infra/scaleway/variables.tf` (or `terraform.tfvars`): registry namespaces are
  unique per region, so `bamdoodle` is taken.
- `REGISTRY` in `.github/workflows/release.yml`, and the image path in the commands below
  (`rg.nl-ams.scw.cloud/<your app_name>/...`).
- Your own repository in the `gh secret set --repo ...` commands, and your own domain and DNS provider in step 10.

## One-time setup

This is done for bamdoodle.io; it's here for a rebuild or for running your own copy. Everything below touches
accounts or money, so it's yours to run. Run from the repository root unless it says
otherwise.

### 1. Tools

Homebrew no longer ships Terraform itself (licence change), so install it from HashiCorp's own tap:

```bash
brew tap hashicorp/tap
```

```bash
brew install hashicorp/tap/terraform
```

[OpenTofu](https://opentofu.org) (`brew install opentofu`, then `tofu` instead of `terraform`) is the open-source fork and
works with the same files. `scw` is already installed. Docker Desktop must be running.

### 2. A Scaleway project

```bash
scw account project create name=bamdoodle description="BamDoodle party game"
```

Your existing `scw` profile (from `scw init`) can stay: Terraform looks the project up by name.

### 3. Terraform, first pass: the registry

The container needs an image before it can exist, so create the registry first:

```bash
cd infra/scaleway && terraform init
```

```bash
cd infra/scaleway && terraform apply -target=scaleway_registry_namespace.main -target=scaleway_container_namespace.main
```

### 4. Push the first image

```bash
scw registry login region=nl-ams
```

```bash
docker buildx build --platform=linux/amd64 -t rg.nl-ams.scw.cloud/bamdoodle/bamdoodle:bootstrap --push .
```

On Apple Silicon this emulates `linux/amd64` and takes a while (10 to 20 minutes the first time).

### 5. Terraform, second pass: the container

```bash
cd infra/scaleway && terraform apply
```

Then check it's alive and play a short game against it:

```bash
curl -fsS "https://$(terraform -chdir=infra/scaleway output -raw container_endpoint)/api/health"
```

```bash
node scripts/ws-soak.mjs --url "wss://$(terraform -chdir=infra/scaleway output -raw container_endpoint)/ws" --rooms 1 --minutes 0
```

### 6. The WebSocket soak test (decision 0003)

Twenty rooms with 3 players and a host screen each (80 sockets, the documented per-instance ceiling), plus 3 rooms
that go silent, held open for 55 minutes:

```bash
node scripts/ws-soak.mjs --url "wss://$(terraform -chdir=infra/scaleway output -raw container_endpoint)/ws" --rooms 20 --screens 1 --idle 3 --minutes 55
```

Expect `0 failures`. A run past 60 minutes should show every socket closing at about 60 minutes: that's the
container's request timeout, and the web client reconnects and keeps its seat. If the 55-minute run drops sockets or
refuses connections, the fallback in decision 0003 (a small Instance) is the next step: tell Claude what the
output says.

### 7. A deploy key for GitHub Actions

A separate key that can only manage containers and the registry in this project:

```bash
scw iam application create name=bamdoodle-ci description="BamDoodle release workflow"
```

```bash
scw iam policy create name=bamdoodle-ci application-id=<application id> rules.0.project-ids.0=<bamdoodle project id> rules.0.permission-set-names.0=ContainersFullAccess rules.0.permission-set-names.1=ContainerRegistryFullAccess
```

```bash
scw iam api-key create application-id=<application id> default-project-id=<bamdoodle project id> description="GitHub Actions"
```

Find the project id with `scw account project list name=bamdoodle`. If a permission set name is refused, pick the
container and registry "full access" sets in the console instead.

### 8. GitHub secrets

```bash
gh secret set SCW_ACCESS_KEY --repo jvdburgh/BamDoodle
```

```bash
gh secret set SCW_SECRET_KEY --repo jvdburgh/BamDoodle
```

```bash
gh secret set SCW_DEFAULT_PROJECT_ID --repo jvdburgh/BamDoodle
```

```bash
gh secret set SCW_DEFAULT_ORGANIZATION_ID --repo jvdburgh/BamDoodle
```

```bash
gh secret set SCW_CONTAINER_ID --repo jvdburgh/BamDoodle --body "$(terraform -chdir=infra/scaleway output -raw container_id)"
```

Each `gh secret set` without `--body` asks for the value, so it never lands in your shell history. The release
workflow uses a GitHub environment called `production`; GitHub creates it on the first run, and you can add a
required reviewer to it under Settings > Environments if you want to approve each deploy.

### 9. Release

Every release is a `v*` tag on `main` (the first live one was `v0.1.1`; `v0.1.0` never deployed):

```bash
git switch main && git pull && git tag -a v0.1.2 -m "BamDoodle v0.1.2" && git push origin v0.1.2
```

```bash
gh run watch --repo jvdburgh/BamDoodle
```

The workflow builds the image, points the container at it, waits until it's ready and plays a short game against it.
A deploy restarts the container, so running games end: release when nobody's playing.

### 10. The domain

The game lives at plain `bamdoodle.io` (no www). The domain is at Namecheap: in Domain List > bamdoodle.io > Manage >
Advanced DNS, remove the parking records (the `@` URL redirect or A record, and the `www` CNAME to
parkingpage.namecheap.com) and add, with TTL 5 min:

| Type | Host | Value |
| --- | --- | --- |
| ALIAS Record | `@` | the output of `terraform -chdir=infra/scaleway output -raw container_endpoint` |

Check with `dig +short bamdoodle.io` until it resolves to Scaleway instead of the parking page, then bind it (Scaleway
issues the certificate):

```bash
cd infra/scaleway && terraform apply -var 'custom_hostnames=["bamdoodle.io"]'
```

Put `custom_hostnames = ["bamdoodle.io"]` in `infra/scaleway/terraform.tfvars` (gitignored) so later applies keep it.
To add www later, add a `www` CNAME to the same value and `"www.bamdoodle.io"` to the list. To move DNS to an EU
provider too, Scaleway Domains & DNS can host the zone (about €5 a month).

## Later

- Infra changes: edit `infra/scaleway/*.tf`, then `terraform apply` from `infra/scaleway`.
- State: `infra/scaleway/terraform.tfstate` is local and gitignored. It holds no secrets here, but losing it means
  importing the resources again, so back it up after each apply (e.g. in Bitwarden, like AmputatorBot's).
- Rollback: point the container back at an older image, which is still in the registry:

  ```bash
  scw container container update "$(terraform -chdir=infra/scaleway output -raw container_id | cut -d/ -f2)" \
    region=nl-ams image=rg.nl-ams.scw.cloud/bamdoodle/bamdoodle:v0.1.1
  ```

  The CLI wants the container's uuid without Terraform's `nl-ams/` prefix, and the region spelled out (a profile's
  default region may be another one). Don't use "Run workflow" with an old tag in its input for this: that builds
  the current `main` and pushes it under the old tag.
