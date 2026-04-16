---
name: n8n
description: 通过 n8n-cli 操作本地 n8n 实例，管理 workflow、触发自动化任务，以及通过对话帮助用户设计和创建 n8n workflow JSON（包含节点配置模板和最佳实践）
---

# n8n Skill

n8n 运行在 VPS 本地（`http://localhost:5678`），通过 `n8n-cli` 命令操作。直接用 `bash` 工具调用。

---

## 一、CLI 命令

### 查看 workflow

```bash
n8n-cli list-workflows
# 输出: <id>  ✓/○  <名称>
# ✓ = 已激活，○ = 未激活

n8n-cli get-workflow <id>
# 输出完整 workflow JSON
```

### 触发 webhook workflow

```bash
n8n-cli trigger <webhook-path>                        # POST，无 body
n8n-cli trigger <webhook-path> --body '{"key":"val"}' # 带 body
n8n-cli trigger <webhook-path> --method GET           # GET 请求
n8n-cli trigger <webhook-path> --test                 # 测试模式（编辑器中打开时用）
```

`webhook-path` 是 Webhook 节点里 Path 字段的值，不含斜杠前缀。

### 执行 workflow（API 方式，无需 webhook）

```bash
n8n-cli execute <id> --body '{"key":"value"}'
```

### 查看执行记录

```bash
n8n-cli executions                          # 最近 10 条
n8n-cli executions --workflow <id>          # 按 workflow 过滤
n8n-cli executions --status error           # 只看失败的
n8n-cli executions --limit 20              # 指定数量

n8n-cli get-execution <execution-id>        # 详情（含输出数据）
n8n-cli stop-execution <execution-id>       # 停止运行中的执行
n8n-cli delete-execution <execution-id>     # 删除记录
```

### 管理 workflow

```bash
n8n-cli activate <id>
n8n-cli deactivate <id>
n8n-cli delete-workflow <id>

n8n-cli create-workflow --file /path/to/workflow.json
n8n-cli create-workflow --body '{...}'
n8n-cli update-workflow <id> --file /path/to/workflow.json

n8n-cli health   # 检查 n8n 状态
```

### 注意事项

- `trigger` 只对已激活（✓）的 workflow 有效，测试时加 `--test`
- `execute` 直接通过 API 运行，不需要 webhook 节点，workflow 无需激活
- 执行列表默认不含输出数据，需要详情用 `get-execution <id>`
- 定时任务 workflow 必须在 n8n UI 手动激活（API/CLI 的 activate 命令无法激活无触发节点的 workflow）

---

## 二、Workflow JSON 结构

创建 workflow 时需要提供完整 JSON，结构如下：

```json
{
  "name": "My Workflow",
  "active": false,
  "nodes": [
    {
      "id": "node-1",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [100, 300],
      "parameters": { ... }
    },
    {
      "id": "node-2",
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [300, 300],
      "parameters": { ... }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "timezone": "Asia/Shanghai"
  }
}
```

**关键规则**：
- `id` 用随机字符串（如 `"a1b2c3d4"`）
- `position` 按流向从左到右排列，间距 200px，y 轴对齐在 300
- `connections` 的 key 是源节点 `name`，不是 `id`
- `typeVersion` 按节点类型指定（见下方模板）

---

## 三、Pattern 选择指南

| 场景 | 选择 | 示例 |
|---|---|---|
| 接收外部 HTTP 请求 | **Webhook 处理** | 表单提交、Stripe 支付、GitHub webhook |
| 定时自动执行 | **定时任务** | 每日报告、数据同步、定期检查 |
| 调用外部 API | **HTTP API 集成** | 拉取数据、调用第三方服务 |
| 读写数据库 | **数据库操作** | ETL、数据同步 |
| 对话式 AI | **AI Agent** | 聊天机器人、带工具的 AI |
| 处理大数据集 | **批量处理** | 分批 API 调用、大量记录处理 |

**通用结构**：
```
Webhook 处理:  Webhook → 验证 → 转换 → 动作 → 响应
定时任务:      Schedule → 拉取 → 处理 → 推送 → 日志
HTTP API:      触发器 → HTTP Request → 转换 → 动作 → 错误处理
```

---

## 四、节点配置模板

### HTTP Request（`n8n-nodes-base.httpRequest`，typeVersion: 4）

```javascript
// GET 请求
{
  "method": "GET",
  "url": "https://api.example.com/users",
  "authentication": "none"
}

// GET 带查询参数
{
  "method": "GET",
  "url": "https://api.example.com/users",
  "authentication": "none",
  "sendQuery": true,
  "queryParameters": {
    "parameters": [
      { "name": "limit", "value": "100" },
      { "name": "offset", "value": "={{$json.offset}}" }
    ]
  }
}

// POST JSON（必须 sendBody: true）
{
  "method": "POST",
  "url": "https://api.example.com/users",
  "authentication": "none",
  "sendBody": true,
  "body": {
    "contentType": "json",
    "content": {
      "name": "={{$json.name}}",
      "email": "={{$json.email}}"
    }
  }
}

// 带认证（header token）
{
  "method": "GET",
  "url": "https://api.example.com/data",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth"
}
```

### Webhook（`n8n-nodes-base.webhook`，typeVersion: 2）

```javascript
// 基础接收
{
  "path": "my-webhook",
  "httpMethod": "POST",
  "responseMode": "onReceived"
}

// 返回自定义响应（配合 Webhook Response 节点）
{
  "path": "my-webhook",
  "httpMethod": "POST",
  "responseMode": "lastNode"
}
```

**⚠️ Webhook 数据在 `$json.body` 下，不是 `$json`！**
```javascript
❌ {{$json.email}}
✅ {{$json.body.email}}
```

**数据结构**：
```json
{
  "headers": { "content-type": "application/json" },
  "params": {},
  "query": { "token": "abc" },
  "body": { "name": "John", "email": "john@example.com" }
}
```

### Schedule Trigger（`n8n-nodes-base.scheduleTrigger`，typeVersion: 1）

```javascript
// 每 15 分钟
{
  "rule": {
    "interval": [{ "field": "minutes", "minutesInterval": 15 }]
  }
}

// 每天 9 点（必须设置时区）
{
  "rule": {
    "interval": [{ "field": "hours", "hoursInterval": 24 }],
    "hour": 9,
    "minute": 0,
    "timezone": "Asia/Shanghai"
  }
}

// Cron 表达式
{
  "mode": "cron",
  "cronExpression": "0 9 * * 1-5",
  "timezone": "Asia/Shanghai"
}
```

**常用 Cron**：
```
*/15 * * * *     每 15 分钟
0 9 * * *        每天 9 点
0 9 * * 1-5      工作日 9 点
0 0 1 * *        每月 1 号
```

### Set（`n8n-nodes-base.set`，typeVersion: 3）

```javascript
{
  "mode": "manual",
  "duplicateItem": false,
  "assignments": {
    "assignments": [
      { "name": "status", "value": "active", "type": "string" },
      { "name": "count", "value": 100, "type": "number" },
      { "name": "fullName", "value": "={{$json.firstName}} {{$json.lastName}}", "type": "string" },
      { "name": "timestamp", "value": "={{$now.toISO()}}", "type": "string" }
    ]
  }
}
```

**`type` 必须与值类型匹配**：`string` / `number` / `boolean`

### Code（`n8n-nodes-base.code`，typeVersion: 2）

```javascript
// 处理所有 items
{
  "mode": "runOnceForAllItems",
  "jsCode": "return $input.all().map(item => ({\n  json: {\n    name: item.json.name.toUpperCase(),\n    email: item.json.email\n  }\n}));"
}

// 每条 item 单独处理
{
  "mode": "runOnceForEachItem",
  "jsCode": "const data = $input.item.json;\nreturn {\n  json: {\n    fullName: `${data.firstName} ${data.lastName}`,\n    timestamp: new Date().toISOString()\n  }\n};"
}
```

**⚠️ Code 节点里用 `$input.item.json`，不用 `{{...}}` 表达式！**

### IF（`n8n-nodes-base.if`，typeVersion: 2）

```javascript
// 字符串相等
{
  "conditions": {
    "string": [{ "value1": "={{$json.status}}", "operation": "equals", "value2": "active" }]
  }
}

// 字符串包含
{
  "conditions": {
    "string": [{ "value1": "={{$json.email}}", "operation": "contains", "value2": "@example.com" }]
  }
}

// 为空检查（单目运算符，无 value2）
{
  "conditions": {
    "string": [{ "value1": "={{$json.email}}", "operation": "isEmpty" }]
  }
}

// 数字比较
{
  "conditions": {
    "number": [{ "value1": "={{$json.age}}", "operation": "larger", "value2": 18 }]
  }
}

// AND 条件
{
  "conditions": {
    "string": [{ "value1": "={{$json.status}}", "operation": "equals", "value2": "active" }],
    "number": [{ "value1": "={{$json.age}}", "operation": "larger", "value2": 18 }]
  },
  "combineOperation": "all"
}

// OR 条件
{
  "conditions": {
    "string": [
      { "value1": "={{$json.status}}", "operation": "equals", "value2": "active" },
      { "value1": "={{$json.status}}", "operation": "equals", "value2": "pending" }
    ]
  },
  "combineOperation": "any"
}
```

### Switch（`n8n-nodes-base.switch`，typeVersion: 3）

```javascript
{
  "mode": "rules",
  "rules": {
    "rules": [
      {
        "conditions": {
          "string": [{ "value1": "={{$json.status}}", "operation": "equals", "value2": "active" }]
        }
      },
      {
        "conditions": {
          "string": [{ "value1": "={{$json.status}}", "operation": "equals", "value2": "pending" }]
        }
      }
    ]
  },
  "fallbackOutput": "extra"
}
```

规则数量必须与输出端口数量一致。

### Slack（`n8n-nodes-base.slack`，typeVersion: 2）

```javascript
// 发消息
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",
  "text": "消息内容 {{$json.name}}"
}

// 带附件
{
  "resource": "message",
  "operation": "post",
  "channel": "#alerts",
  "text": "Error Alert",
  "attachments": [{
    "color": "#ff0000",
    "fields": [
      { "title": "错误类型", "value": "={{$json.errorType}}" },
      { "title": "时间", "value": "={{$now.toLocaleString()}}" }
    ]
  }]
}
```

Channel 格式：公频用 `#name`，私频或 DM 用 channel ID。

### Gmail（`n8n-nodes-base.gmail`，typeVersion: 2）

```javascript
// 发邮件
{
  "resource": "message",
  "operation": "send",
  "to": "={{$json.email}}",
  "subject": "订单确认 #{{$json.orderId}}",
  "message": "Dear {{$json.name}},\n\n您的订单已确认。",
  "options": { "replyTo": "support@example.com" }
}

// 读邮件
{
  "resource": "message",
  "operation": "getAll",
  "returnAll": false,
  "limit": 10,
  "filters": { "q": "is:unread", "labelIds": ["INBOX"] }
}
```

### Postgres（`n8n-nodes-base.postgres`，typeVersion: 2）

```javascript
// SELECT（始终用参数化查询）
{
  "operation": "executeQuery",
  "query": "SELECT * FROM users WHERE email = $1 AND active = $2",
  "additionalFields": {
    "mode": "list",
    "queryParameters": "={{$json.email}},true"
  }
}

// ❌ 禁止：直接插值（SQL 注入风险）
// "query": "SELECT * FROM users WHERE email = '{{$json.email}}'"

// INSERT
{
  "operation": "insert",
  "table": "users",
  "columns": "name,email,created_at",
  "additionalFields": {
    "mode": "list",
    "queryParameters": "={{$json.name}},={{$json.email}},NOW()"
  }
}

// UPDATE
{
  "operation": "update",
  "table": "users",
  "updateKey": "id",
  "columns": "name,email",
  "additionalFields": {
    "mode": "list",
    "queryParameters": "={{$json.id}},={{$json.name}},={{$json.email}}"
  }
}
```

### OpenAI（`@n8n/n8n-nodes-langchain.openAi`，typeVersion: 1）

```javascript
// Chat completion
{
  "resource": "chat",
  "operation": "complete",
  "messages": {
    "values": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "={{$json.userMessage}}" }
    ]
  },
  "options": { "temperature": 0.7, "maxTokens": 500 }
}
```

---

## 五、Webhook 处理模式

### 响应模式

- **`onReceived`**（默认）：立即返回 200，workflow 在后台继续运行。适合长任务、fire-and-forget。
- **`lastNode`**：等待 workflow 完成再响应，需要配合 **Webhook Response 节点**。适合需要返回数据的场景。

### Webhook Response 节点（`n8n-nodes-base.respondToWebhook`，typeVersion: 1）

```javascript
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({ status: 'success', id: $json.record_id }) }}",
  "options": { "responseCode": 200 }
}
```

### 典型流程：表单提交

```
1. Webhook (path: "contact-form", POST, responseMode: "lastNode")
2. IF (检查 $json.body.email 和 $json.body.name 不为空)
   ├─ True → Postgres (insert into contacts)
             → Slack (通知 #leads)
             → Webhook Response ({"status": "success"})
   └─ False → Webhook Response ({"status": "error", "message": "Missing fields"}, 400)
```

### 安全验证（签名验证）

```javascript
// Code 节点
const crypto = require('crypto');
const signature = $input.item.json.headers['x-signature'];
const secret = 'your-webhook-secret';
const calculated = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify($input.item.json.body))
  .digest('hex');
if (signature !== calculated) throw new Error('Invalid signature');
return [$input.item];
```

---

## 六、定时任务模式

### 典型流程

```
Schedule Trigger → 拉取数据 → 处理/判断 → 推送通知 → 日志记录
```

### 防重叠执行

```
Schedule → Code (检查 global state) → IF (running) → 跳过
                                       └─ False → Set running → 执行 → Clear running
```

```javascript
// Code 节点检查 lock
const state = $getWorkflowStaticData('global');
if (state.running) return [{ json: { skip: true } }];
state.running = true;
return [{ json: { skip: false } }];
```

### 错误处理最佳实践

```
主 workflow:   Schedule → 执行逻辑
错误 workflow: Error Trigger (workflowId: "主workflow的id") → Slack 告警 → Postgres 记录错误
```

### 早退（无数据时）

```
Schedule → Postgres (查询) → IF (结果为空) → 结束
                              └─ True → 处理
```

---

## 七、HTTP API 集成模式

### 分页处理

```javascript
// 游标分页
// 1. HTTP Request (GET /api/items)
// 2. Code (提取 next_cursor)
const resp = $input.first().json;
return [{ json: { items: resp.data, next: resp.next_cursor, has_more: !!resp.next_cursor } }];
// 3. IF (has_more) → 更新游标 → 回到步骤 1

// Offset 分页
// 1. Set (page=1)
// 2. HTTP Request (/api/items?page={{$json.page}})
// 3. Code (has_more = items.length === limit)
// 4. IF (has_more) → Set (page+1) → 回到步骤 2
```

### 限流处理

```
Split In Batches (1 item/batch) → HTTP Request → Wait (1s) → Loop
```

指数退避：
```javascript
const retryCount = $json.retryCount || 0;
const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
```

### 错误处理

```javascript
// HTTP Request 节点设置
{ "continueOnFail": true }

// 下游 IF 检查
{ "conditions": { "string": [{ "value1": "={{$json.error}}", "operation": "isEmpty" }] } }
```

---

## 八、表达式语法速查

```javascript
// 当前 item 数据
{{$json.field}}
{{$json.nested.field}}
{{$json.array[0].name}}

// Webhook 数据（必须加 .body）
{{$json.body.email}}
{{$json.headers['x-api-key']}}
{{$json.query.token}}

// 引用其他节点
{{$node["Node Name"].json.field}}
{{$('Node Name').item.json.field}}

// 时间
{{$now}}                    // 当前时间 (Luxon DateTime)
{{$now.toISO()}}            // ISO 字符串
{{$now.format('YYYY-MM-DD')}}
{{$now.minus({days: 1}).toISO()}}

// 字符串处理
{{"hello".toUpperCase()}}
{{"  text  ".trim()}}

// 数字处理
{{$json.price.toFixed(2)}}
{{Math.abs($json.diff)}}

// 环境变量
{{$env.MY_VAR}}
```

---

## 九、Connections 写法

```json
"connections": {
  "源节点名": {
    "main": [
      [{ "node": "目标节点名", "type": "main", "index": 0 }]
    ]
  },
  "IF 节点名": {
    "main": [
      [{ "node": "True 分支节点", "type": "main", "index": 0 }],
      [{ "node": "False 分支节点", "type": "main", "index": 0 }]
    ]
  }
}
```

- `main[0]` = 第一个输出（IF 的 True 分支）
- `main[1]` = 第二个输出（IF 的 False 分支）
- SplitInBatches: `main[0]` = done，`main[1]` = 每批数据

---

## 十、典型操作流程

**触发已有 workflow（webhook 方式）：**
```bash
n8n-cli list-workflows          # 找 webhook path
n8n-cli trigger <path> --body '{"key":"val"}'
n8n-cli executions --limit 1   # 确认结果
```

**创建新 workflow：**
1. 根据场景选择 Pattern
2. 用节点配置模板构建 JSON
3. `n8n-cli create-workflow --body '{...}'`
4. 在 n8n UI 激活（定时任务需手动激活）

**排查执行问题：**
```bash
n8n-cli executions --workflow <id> --status error --limit 5
n8n-cli get-execution <execution-id>  # 查看详细输出和错误
```

**常见坑点速查：**
| 问题 | 解决 |
|---|---|
| webhook 数据空 | 改 `$json.email` → `$json.body.email` |
| Code 节点取不到数据 | 改 `{{$json.x}}` → `$input.item.json.x` |
| Set 节点数字变字符串 | type 改为 `"number"` |
| 定时任务不跑 | 需在 n8n UI 手动激活 |
| IF 单目运算符报错 | isEmpty/isNotEmpty 不需要 value2 |
| Postgres SQL 注入风险 | 改为 `$1,$2` 参数化查询 |
| Schedule 时间不对 | 设置 `timezone: "Asia/Shanghai"` |
