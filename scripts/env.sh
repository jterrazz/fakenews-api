#! /bin/bash

# Always point to the project-local SQLite DB using an absolute path
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DATABASE_URL="file:${ROOT_DIR}/database/main.sqlite"