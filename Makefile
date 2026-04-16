VPS := dmit-new
REMOTE_BIN := /opt/alice/tools/n8n-cli.mjs
SYMLINK := /usr/local/bin/n8n-cli
SKILL_DIR := /opt/alice/data/skills

deploy:
	ssh $(VPS) "mkdir -p /opt/alice/tools $(SKILL_DIR)"
	scp bin/n8n-cli.mjs $(VPS):$(REMOTE_BIN)
	ssh $(VPS) "chmod +x $(REMOTE_BIN) && ln -sf $(REMOTE_BIN) $(SYMLINK)"
	scp skills/n8n.md $(VPS):$(SKILL_DIR)/n8n.md
	@echo "✓ deployed n8n-cli + skill"

deploy-cli:
	ssh $(VPS) "mkdir -p /opt/alice/tools"
	scp bin/n8n-cli.mjs $(VPS):$(REMOTE_BIN)
	ssh $(VPS) "chmod +x $(REMOTE_BIN) && ln -sf $(REMOTE_BIN) $(SYMLINK)"
	@echo "✓ deployed n8n-cli"

deploy-skill:
	ssh $(VPS) "mkdir -p $(SKILL_DIR)"
	scp skills/n8n.md $(VPS):$(SKILL_DIR)/n8n.md
	@echo "✓ deployed skill"

test:
	n8n-cli health
	n8n-cli list-workflows

.PHONY: deploy deploy-cli deploy-skill test
