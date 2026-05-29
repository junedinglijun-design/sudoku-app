#!/usr/bin/env bash
# 首次推送前请先登录 GitHub：gh auth login
set -e
cd "$(dirname "$0")/.."

if ! gh auth status &>/dev/null; then
  echo "请先运行: gh auth login"
  exit 1
fi

if git remote get-url origin &>/dev/null; then
  git push -u origin main
else
  gh repo create sudoku-app --public --source=. --remote=origin --push
fi

echo "完成。仓库地址: $(gh repo view --json url -q .url)"
