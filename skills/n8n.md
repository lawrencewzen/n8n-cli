---
name: n8n
description: 通过 n8n-cli 操作本地 n8n 实例，管理 workflow 和触发自动化任务
---

# n8n Skill

n8n 运行在 VPS 本地，通过 `n8n-cli` 命令操作。直接用 `bash` 工具调用。

## 可用命令

### 查看 workflow

```bash
n8n-cli list-workflows
# 输出: <id>  ✓/○  <名称>
# ✓ = 已激活，○ = 未激活
```

```bash
n8n-cli get-workflow <id>
# 输出完整 workflow JSON
```

### 触发 webhook workflow

```bash
# 默认 POST，无 body
n8n-cli trigger <webhook-path>

# 带 body
n8n-cli trigger <webhook-path> --body '{"key":"value"}'

# GET 请求
n8n-cli trigger <webhook-path> --method GET

# 测试模式（workflow 在编辑器中打开时用）
n8n-cli trigger <webhook-path> --test
```

`webhook-path` 是 n8n Webhook 节点里配置的 Path 字段，不含斜杠前缀。

### 查看执行记录

```bash
# 最近 10 条
n8n-cli executions

# 按 workflow 过滤
n8n-cli executions --workflow <id>

# 只看失败的
n8n-cli executions --status error

# 指定数量
n8n-cli executions --limit 20
```

### 执行 workflow（API 方式，无需 webhook）

```bash
# 直接触发，可传入数据
n8n-cli execute <id> --body '{"key":"value"}'
```

### 管理 workflow 状态

```bash
n8n-cli activate <id>
n8n-cli deactivate <id>
n8n-cli delete-workflow <id>
```

### 创建 / 更新 workflow

```bash
# 从 JSON 文件创建
n8n-cli create-workflow --file /path/to/workflow.json

# 从 JSON 字符串创建
n8n-cli create-workflow --body '{...}'

# 更新
n8n-cli update-workflow <id> --file /path/to/workflow.json
```

### 查看 / 管理执行记录

```bash
# 获取单条执行详情（含输出数据）
n8n-cli get-execution <execution-id>

# 停止正在运行的执行
n8n-cli stop-execution <execution-id>

# 删除执行记录
n8n-cli delete-execution <execution-id>
```

### 检查状态

```bash
n8n-cli health
```

## 典型工作流

**触发自动化任务（webhook 方式）：**
1. `n8n-cli list-workflows` 找到 webhook path
2. `n8n-cli trigger <path> --body '{...}'`
3. 确认结果：`n8n-cli executions --limit 1`

**触发自动化任务（API 方式，不需要 webhook 节点）：**
1. `n8n-cli list-workflows` 找到 workflow id
2. `n8n-cli execute <id> --body '{...}'`
3. 查看详情：`n8n-cli get-execution <execution-id>`

**查某个任务的最近执行情况：**
1. `n8n-cli list-workflows` 找 id
2. `n8n-cli executions --workflow <id> --limit 5`
3. 需要详情：`n8n-cli get-execution <execution-id>`

**启停定时任务：**
1. `n8n-cli list-workflows` 找 id
2. `n8n-cli activate <id>` 或 `n8n-cli deactivate <id>`

## 注意事项

- `trigger` 只对已激活（✓）的 workflow 有效，测试时加 `--test`
- `execute` 直接通过 API 运行，不需要 webhook 节点，也不需要 workflow 处于激活状态
- 执行列表默认不含输出数据，需要详情用 `get-execution <id>`
- n8n 运行在 `http://localhost:5678`，只能从 VPS 本地访问
