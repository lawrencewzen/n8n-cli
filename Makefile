VPS        := dmit-new
SKILLS_DIR := /opt/alice/data/skills

# Install / update on VPS via install.sh from GitHub
install:
	ssh $(VPS) "curl -fsSL https://raw.githubusercontent.com/lawrencewzen/n8n-cli/main/install.sh | bash -s -- --skills-dir $(SKILLS_DIR)"

# Update only the CLI binary (fast path)
update-cli:
	ssh $(VPS) "curl -fsSL https://raw.githubusercontent.com/lawrencewzen/n8n-cli/main/bin/n8n-cli.mjs -o /opt/n8n-cli/n8n-cli.mjs"
	@echo "✓ CLI updated"

# Update only the skill markdown
update-skill:
	ssh $(VPS) "mkdir -p /opt/n8n-cli/skills/n8n && curl -fsSL https://raw.githubusercontent.com/lawrencewzen/n8n-cli/main/skills/n8n/SKILL.md -o /opt/n8n-cli/skills/n8n/SKILL.md"
	@echo "✓ skill updated"

test:
	ssh $(VPS) "n8n-cli health && n8n-cli list-workflows"

.PHONY: install update-cli update-skill test
