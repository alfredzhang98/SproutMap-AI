# SproutMap AI 补充产品设计文档：多工作流、Agent 流程、上下文管理与工具化实现

## 0. 文档目的

这份文档不是传统 MVP PRD，而是 **产品逻辑探索文档 + Agent 架构设计文档 + Claude 开发提示文档**。

上一版 MVP 只定义了：

```text
Chat → Candidate Cards → Canvas Nodes → Node-scoped Chat
```

但这个还不够。真正有价值的是：用户在不同场景下，对话输出的结构不同，思维导图的加入方式也应该不同。

例如：

1. 用户问“有哪些方法？”
   应该生成并列方案节点。

2. 用户问“如何一步步做？”
   应该生成流程图 / step-by-step 节点。

3. 用户问“这个点展开一下？”
   应该在当前节点下面生成子节点。

4. 用户问一个和当前主题无关的问题。
   应该创建新的离散主题岛。

5. 用户问“总结一下当前思路”。
   应该重构已有节点，而不是创建大量新节点。

6. 用户问“帮我比较 A/B/C”。
   应该生成比较矩阵，而不是普通 mindmap。

7. 用户让 AI 深入某个节点。
   系统应该只拼接该节点相关上下文，而不是整段聊天历史。

所以 SproutMap AI 的核心不是“AI 生成思维导图”，而是：

```text
根据用户意图，选择合适的思维结构，并用局部上下文持续生长。
```

---

# 1. 产品核心定位

## 1.1 产品一句话

SproutMap AI 是一个节点式 AI 思考工作台，将线性 GPT 对话转换为可编辑、可追问、可重组的知识地图。

## 1.2 产品本质

不是：

```text
AI Mind Map Generator
```

而是：

```text
AI Context Operating System for Thinking
```

中文理解：

```text
不是让 GPT 帮你画图，而是用图来管理 GPT 的上下文。
```

## 1.3 核心差异化

普通 ChatGPT：

```text
擅长回答，但上下文线性堆积，复杂项目容易乱。
```

普通 AI 思维导图：

```text
擅长生成图，但后续深入对话能力弱。
```

SproutMap AI：

```text
对话负责生成想法。
卡片负责中间筛选。
画布负责结构组织。
节点负责局部上下文。
Agent 负责不同类型的思考流程。
```

---

# 2. 信息流总体架构

SproutMap AI 不应该只有一个 LLM 调用，而应该有多个轻量 Agent 和工具协作。

## 2.1 总流程

```text
用户输入
↓
Intent Agent 判断用户意图
↓
Context Builder 选择相关上下文
↓
LLM Answer Agent 生成正常回答
↓
Card Extractor Agent 提取候选卡片
↓
Structure Planner Agent 判断卡片如何入图
↓
Map Patch Generator 生成图修改建议
↓
用户确认 / 拖拽 / 编辑
↓
Map State 更新
↓
Node Memory 更新
```

## 2.2 为什么不能只用一个大 prompt

如果只用一个大 prompt，让 LLM 同时完成：

1. 回答问题
2. 总结卡片
3. 判断关系
4. 更新 map
5. 管理上下文
6. 生成 UI 操作

结果会不稳定。

更好的方法是拆成几个专门 Agent：

```text
Intent Agent：判断用户现在想干什么
Context Agent：决定用哪些上下文
Answer Agent：负责回答
Card Agent：负责抽取卡片
Map Agent：负责图结构
Memory Agent：负责总结和沉淀
```

这样每个 Agent 的任务简单，输出更稳定，也更方便调试。

---

# 3. 用户工作流分类

SproutMap AI 应该支持多种工作流，而不是所有问题都生成同一种 mindmap。

## 3.1 工作流 A：从零创建主题

### 用户行为

用户输入一个大需求：

```text
我想开发一个 GPT 对话式思维导图工具，怎么设计？
```

### 系统行为

1. 生成 workspace title。
2. 创建 root node。
3. 给出正常回答。
4. 提炼 3–7 张候选卡片。
5. 推荐这些卡片挂到 root node 下。

### 生成结构

```text
GPT 对话式思维导图工具
├── 用户输入逻辑
├── 候选卡片机制
├── 画布交互逻辑
├── 节点上下文管理
└── 商业化模式
```

### Agent 流程

```text
Intent Agent → create_root
Context Builder → empty/global context
Answer Agent → broad answer
Card Agent → extract topic-level cards
Map Agent → suggest children of root
Memory Agent → create initial workspace summary
```

---

## 3.2 工作流 B：展开当前节点

### 用户行为

用户选中节点：

```text
候选卡片机制
```

然后问：

```text
这个具体怎么设计？
```

### 系统行为

1. 只使用当前节点路径和相关上下文。
2. 生成回答。
3. 生成当前节点下的子卡片。
4. 推荐挂到当前节点下面。

### 生成结构

```text
候选卡片机制
├── 自动抽取
├── 用户筛选
├── 拖拽入图
├── 标题编辑
└── 卡片状态管理
```

### Agent 流程

```text
Intent Agent → expand_selected_node
Context Builder → selected node + ancestors + siblings + children
Answer Agent → detailed answer
Card Agent → extract sub-concepts
Map Agent → suggest contains / part_of relation
Memory Agent → update selected node detail summary
```

---

## 3.3 工作流 C：生成并列方案

### 用户行为

用户问：

```text
剧本生成有哪三种方法？
```

或者：

```text
这个产品的商业化方式有哪些？
```

### 系统判断

这类问题关键词通常包括：

```text
有哪些
几种方法
方案
路线
approaches
methods
options
types
strategies
```

### 系统行为

1. 识别为 options / methods。
2. 创建一个主题节点。
3. 下面生成并列 method cards。
4. 关系类型为 `option_of`。

### 生成结构

```text
商业化方式
├── BYO API 免费工具
├── SaaS 订阅
├── 团队知识工作台
└── 模板市场
```

### Agent 流程

```text
Intent Agent → generate_options
Answer Agent → compare possible options
Card Agent → extract method cards
Map Agent → create option_of edges
Ranking Agent 可选 → 按成本/收益/难度排序
```

---

## 3.4 工作流 D：生成流程 / 步骤

### 用户行为

用户问：

```text
如何构建剧本分镜？
```

或者：

```text
这个产品从输入到生成 mindmap 的流程是什么？
```

### 系统判断

这类问题关键词通常包括：

```text
如何
流程
步骤
step by step
workflow
pipeline
process
```

### 系统行为

1. 识别为 process / workflow。
2. 生成流程节点。
3. 每一步是一个 step card。
4. 节点之间用 `next_step` 关系。
5. 每一步都可以继续展开。

### 生成结构

```text
构建剧本分镜流程
→ 明确故事目标
→ 拆分场景
→ 生成镜头列表
→ 添加镜头语言
→ 检查连续性
```

### 节点展开

用户点击：

```text
生成镜头列表
```

继续问：

```text
这一步具体怎么做？
```

系统生成：

```text
生成镜头列表
├── 镜头编号
├── 场景描述
├── 镜头尺寸
├── 摄影机运动
└── 时长估计
```

### Agent 流程

```text
Intent Agent → generate_steps
Answer Agent → produce ordered workflow
Card Agent → extract step cards
Map Agent → create next_step edges
Flow Optimizer Agent → check sequence consistency
```

---

## 3.5 工作流 E：创建离散主题岛

### 用户行为

当前 map 是：

```text
GPT 对话思维导图工具
```

用户突然问：

```text
RTX 5090 怎么赚钱？
```

### 系统行为

1. 判断和当前节点相关性低。
2. 不强行挂到当前主题下。
3. 创建新的 topic island。
4. 在画布上保持空间分离。

### 生成结构

```text
Island 1: GPT 对话思维导图工具
├── 候选卡片
├── 节点上下文
└── 画布交互

Island 2: RTX 5090 赚钱方式
├── 本地视频生成服务
├── 模型推理出租
├── AI 短视频生产
└── 自动化剪辑服务
```

### Agent 流程

```text
Intent Agent → create_discrete_topic
Relevance Agent → compare current selected context vs new question
Map Agent → create new island
Memory Agent → create island summary
```

---

## 3.6 工作流 F：比较 / 决策矩阵

### 用户行为

用户问：

```text
mindmap.io、Mapify、Heptabase 这几种产品的区别是什么？
```

或者：

```text
这个产品应该先做 BYO API 还是订阅制？
```

### 系统行为

这种问题不应该直接生成普通树状图。

应该生成：

1. Comparison node。
2. Option cards。
3. Criteria cards。
4. Decision / recommendation card。
5. 可选矩阵视图。

### 生成结构

```text
商业模式选择
├── 方案 A：BYO API
├── 方案 B：订阅制
├── 评估维度
│   ├── 开发成本
│   ├── 用户接受度
│   ├── 收入稳定性
│   └── 支付系统复杂度
└── 初步结论：先 BYO API，再订阅
```

### Agent 流程

```text
Intent Agent → compare_options
Answer Agent → analytical comparison
Card Agent → extract options + criteria + decision
Map Agent → create comparison cluster
Decision Agent → generate recommendation summary
```

---

## 3.7 工作流 G：总结 / 重构已有图

### 用户行为

用户说：

```text
帮我把当前图整理得更清楚。
```

或者：

```text
这些节点有点乱，帮我重新归类。
```

### 系统行为

这时候不应该继续新增一堆节点。

应该：

1. 读取当前 map。
2. 找重复节点。
3. 找孤立节点。
4. 找层级错误。
5. 生成重构建议。
6. 以 Map Patch Preview 展示。
7. 用户确认后才修改。

### Map Patch 类型

```text
merge_nodes
rename_node
move_node
change_edge_relation
create_group_node
collapse_subtree
```

### Agent 流程

```text
Intent Agent → refine_existing_nodes
Map Analyzer Agent → inspect current map
Refactor Agent → propose map patch
User Confirmation → apply patch
Memory Agent → update summaries
```

---

## 3.8 工作流 H：单节点深度研究

### 用户行为

用户点击一个节点：

```text
Context Builder
```

然后问：

```text
这个模块怎么实现得更稳定？
```

### 系统行为

1. 构建该节点的局部上下文。
2. 检索相关子节点和来源消息。
3. 给出深入回答。
4. 不一定生成很多新节点。
5. 可能生成：

   * Implementation cards
   * Risk cards
   * Test cards
   * Alternative cards

### Agent 流程

```text
Intent Agent → deep_dive_node
Context Builder → node-focused context
Answer Agent → deep technical answer
Card Agent → extract only high-value cards
Map Agent → suggest child/risk/decision nodes
```

---

# 4. 卡片系统设计

## 4.1 为什么需要卡片

卡片是聊天和思维导图之间的缓冲层。

如果没有卡片，AI 会直接把所有内容加入图里，导致：

```text
图太满
关系混乱
用户不可控
信息密度过高
```

有了卡片之后，流程变成：

```text
AI 生成内容
↓
AI 提炼候选卡片
↓
用户确认价值
↓
卡片进入图
```

这让用户始终掌握结构控制权。

---

## 4.2 卡片不是节点

候选卡片是 temporary object。

正式节点是 persistent object。

### 候选卡片状态

```text
pending: 等待处理
accepted: 已加入图
discarded: 已丢弃
deferred: 暂时保留，之后处理
```

建议增加 `deferred`，因为用户可能觉得某张卡现在不想加，但以后可能用。

---

## 4.3 卡片类型

推荐类型：

```text
Topic：主题
Concept：概念
Method：方法
Step：步骤
Question：问题
Decision：决策
Evidence：证据
Risk：风险
Example：例子
Tool：工具
Agent：Agent 流程
Workflow：工作流
Metric：评价指标
```

相比 MVP 版本，这里新增：

```text
Example
Tool
Agent
Workflow
Metric
```

因为你的产品本身需要管理工具、Agent 和不同流程。

---

## 4.4 卡片显示信息

每张卡片显示：

```text
标题
类型标签
一句话摘要
建议父节点
建议关系
置信度
来源消息
操作按钮
```

不要显示太多正文。

示例：

```text
[Workflow]
标题：候选卡片入图流程
摘要：AI 先生成候选卡片，用户确认后再进入思维导图。
建议位置：用户交互逻辑 > 卡片系统
建议关系：part_of
置信度：0.86
```

---

# 5. Map Patch Preview 设计

## 5.1 为什么需要 Map Patch Preview

用户不应该被迫接受 AI 的图结构。

每次 AI 生成内容后，系统应该显示一个“本次建议如何修改图”的预览。

这就是 Map Patch Preview。

## 5.2 Patch 类型

```ts
type MapPatchOperation =
  | "create_node"
  | "create_edge"
  | "move_node"
  | "rename_node"
  | "update_summary"
  | "merge_nodes"
  | "split_node"
  | "create_topic_island"
  | "insert_between"
  | "change_edge_relation"
  | "collapse_subtree";
```

## 5.3 Patch Preview 示例

```json
{
  "patchSummary": "建议在“用户交互逻辑”下新增 4 个子节点，并将“拖拽入图”设为流程步骤。",
  "operations": [
    {
      "type": "create_node",
      "title": "候选卡片生成",
      "parent": "用户交互逻辑",
      "relation": "part_of"
    },
    {
      "type": "create_node",
      "title": "拖拽入图",
      "parent": "用户交互逻辑",
      "relation": "next_step"
    }
  ]
}
```

## 5.4 用户操作

用户可以：

```text
Accept all
Accept selected
Edit before accept
Drag manually
Regenerate patch
Discard patch
```

这一步会显著提升产品可控性。

---

# 6. 自动连接逻辑

## 6.1 不要完全自动

AI 可以推荐连接，但不要直接强制连接。

建议分三档：

```text
高置信度：显示 ghost node，默认挂到推荐位置
中置信度：显示候选卡片，标注建议父节点
低置信度：只放在卡片区，不连接
```

## 6.2 置信度规则

```text
confidence >= 0.80:
  show ghost node on canvas

0.50 <= confidence < 0.80:
  show candidate card with suggested parent

confidence < 0.50:
  show unlinked candidate card
```

## 6.3 自动判断关系类型

### contains / part_of

适合：

```text
A 包含 B
B 是 A 的组成部分
B 是 A 的子模块
```

### option_of

适合：

```text
几种方法
几个方案
几个类型
不同路线
```

### next_step

适合：

```text
流程
步骤
pipeline
workflow
implementation order
```

### supports

适合：

```text
证据支持观点
实验结果支持结论
引用支持动机
```

### contradicts

适合：

```text
反例
风险
限制
冲突观点
```

### unresolved_question

适合：

```text
未解决问题
需要进一步探索
未来要问的问题
```

---

# 7. 上下文管理设计

## 7.1 核心原则

永远不要默认把完整聊天历史发给 LLM。

默认应该只发送：

```text
当前节点路径
当前节点摘要
当前节点详细内容
父节点摘要
兄弟节点摘要
子节点摘要
最近相关消息
当前问题
```

## 7.2 Context Mode

用户应该可以选择：

```text
Global：使用整个 workspace 摘要
Selected Node：只使用当前节点附近上下文
Selected Subtree：使用当前节点和所有子节点
Selected Island：使用当前主题岛
Manual Selection：用户手动选择节点作为上下文
```

MVP 可以先做前三个，后续增加后两个。

## 7.3 Context Builder 输出

```json
{
  "workspaceTitle": "SproutMap AI",
  "contextMode": "selected_node",
  "selectedPath": [
    "SproutMap AI",
    "用户交互逻辑",
    "候选卡片机制"
  ],
  "selectedNode": {
    "title": "候选卡片机制",
    "summary": "AI 输出先被提炼成候选卡片，用户确认后再加入画布。",
    "detail": "候选卡片是对话和地图之间的缓冲层，用于避免 AI 自动生成过多节点。"
  },
  "nearbyNodes": {
    "parent": "用户交互逻辑",
    "siblings": ["拖拽入图", "节点级对话", "Map Patch Preview"],
    "children": ["卡片类型", "卡片状态", "卡片操作"]
  },
  "recentRelevantMessages": [
    "用户之前强调，不希望 AI 一次吐出一堆内容导致不知道如何加入 map。"
  ],
  "userQuestion": "这个卡片机制怎么做得更清晰？"
}
```

## 7.4 Context Compression

每个节点需要维护自己的压缩摘要。

不要每次都从原始聊天重新总结。

节点应该有：

```text
shortSummary: 一句话摘要
detailSummary: 详细摘要
decisionLog: 关键决策
openQuestions: 未解决问题
sourceMessageIds: 来源消息
```

这就是你提到的“不要每次东西都重新调用”。

---

# 8. Tool / Skill 机制设计

SproutMap AI 应该有一些内部工具，不是所有任务都让 LLM 从零想。

这些工具可以是前端/后端的 deterministic functions，也可以是 prompt-based skill。

## 8.1 工具分类

### Deterministic Tools

这些不需要 LLM：

```text
getNodePath(nodeId)
getSubtree(nodeId)
getSiblingNodes(nodeId)
getTopicIsland(nodeId)
createNodeFromCard(card)
createEdge(source, target, relation)
applyMapPatch(patch)
undoMapPatch(patchId)
autoLayout(graph)
findDuplicateTitles(nodes)
```

### LLM Skills

这些需要 LLM，但应该固定 prompt 和输出 schema：

```text
intent_classification_skill
card_extraction_skill
relationship_planning_skill
context_summarization_skill
map_refactor_skill
workflow_generation_skill
comparison_generation_skill
node_deep_dive_skill
```

---

## 8.2 推荐内部 tools

### Tool 1: classifyIntent

输入：

```json
{
  "userMessage": "...",
  "selectedNode": "...",
  "workspaceSummary": "..."
}
```

输出：

```json
{
  "intent": "generate_steps",
  "confidence": 0.87,
  "reason": "User asks 'how to' and expects a workflow."
}
```

---

### Tool 2: buildContext

输入：

```json
{
  "contextMode": "selected_node",
  "selectedNodeId": "node_123",
  "graph": "...",
  "messages": "..."
}
```

输出：

```json
{
  "selectedPath": [],
  "selectedNode": {},
  "nearbyNodes": {},
  "recentRelevantMessages": []
}
```

这个应该尽量 deterministic，不要每次调用 LLM。

---

### Tool 3: extractCards

输入：

```json
{
  "answer": "...",
  "intent": "generate_options",
  "selectedNode": "..."
}
```

输出：

```json
{
  "cards": [
    {
      "title": "...",
      "type": "method",
      "summary": "...",
      "detail": "..."
    }
  ]
}
```

---

### Tool 4: planMapPatch

输入：

```json
{
  "cards": [],
  "currentGraph": {},
  "selectedNodeId": "...",
  "intent": "generate_options"
}
```

输出：

```json
{
  "patchSummary": "...",
  "operations": []
}
```

---

### Tool 5: summarizeNodeMemory

输入：

```json
{
  "node": {},
  "newMessages": [],
  "newChildren": []
}
```

输出：

```json
{
  "shortSummary": "...",
  "detailSummary": "...",
  "decisionLog": [],
  "openQuestions": []
}
```

---

### Tool 6: detectNewTopicIsland

输入：

```json
{
  "userMessage": "...",
  "selectedNodeSummary": "...",
  "workspaceSummary": "..."
}
```

输出：

```json
{
  "isNewIsland": true,
  "suggestedIslandTitle": "RTX 5090 Monetization",
  "confidence": 0.91
}
```

---

### Tool 7: refactorMap

输入：

```json
{
  "nodes": [],
  "edges": [],
  "userInstruction": "帮我整理当前图"
}
```

输出：

```json
{
  "proposedOperations": [
    {
      "type": "merge_nodes",
      "nodes": ["node_a", "node_b"],
      "newTitle": "..."
    }
  ]
}
```

---

# 9. Agent 架构设计

## 9.1 Agent 不是必须真的多线程

所谓 Agent，可以先实现为多个函数 + prompt 模板。

不需要复杂 agent framework。

可以这样：

```ts
class IntentAgent {}
class AnswerAgent {}
class CardAgent {}
class MapPlannerAgent {}
class MemoryAgent {}
```

每个 Agent 负责固定输入输出。

---

## 9.2 Agent 1: Intent Agent

职责：

```text
判断用户当前问题属于哪种工作流。
```

输出：

```ts
type IntentResult = {
  intent:
    | "create_root"
    | "expand_selected_node"
    | "generate_options"
    | "generate_steps"
    | "compare_options"
    | "create_discrete_topic"
    | "refactor_map"
    | "deep_dive_node"
    | "summarize_branch"
    | "general_answer";
  confidence: number;
  shouldCreateCards: boolean;
  preferredMapMode: "tree" | "flow" | "matrix" | "island" | "none";
};
```

---

## 9.3 Agent 2: Context Agent

职责：

```text
根据 intent 和 contextMode 决定给 LLM 什么上下文。
```

上下文不能太多。

优先级：

```text
selected node > node path > children > siblings > island summary > workspace summary > recent messages
```

---

## 9.4 Agent 3: Answer Agent

职责：

```text
生成正常、可读、有帮助的回答。
```

注意：

Answer Agent 的目标不是生成图，而是回答问题。

它应该输出：

```text
answer
reasoning summary
important points
```

不要让它直接改 map。

---

## 9.5 Agent 4: Card Agent

职责：

```text
从回答中提炼 3–7 个候选卡片。
```

规则：

```text
少而精
一张卡一个概念
标题短
摘要清楚
不重复
类型明确
```

---

## 9.6 Agent 5: Map Planner Agent

职责：

```text
判断候选卡片如何进入 map。
```

输出：

```text
建议父节点
建议关系
建议位置
是否新主题岛
是否流程结构
是否比较结构
置信度
```

---

## 9.7 Agent 6: Memory Agent

职责：

```text
更新节点摘要和 workspace 摘要。
```

它避免每次都重新读完整聊天。

当节点被更新时，只增量更新：

```text
shortSummary
detailSummary
decisionLog
openQuestions
```

---

## 9.8 Agent 7: Refactor Agent

职责：

```text
当用户觉得图乱时，提出整理方案。
```

它不直接修改图。

它只输出 patch preview。

---

# 10. 不同工作流的 Agent Pipeline

## 10.1 Create Root Pipeline

```text
User Input
→ Intent Agent: create_root
→ Answer Agent
→ Card Agent: topic cards
→ Map Planner: children of root
→ Memory Agent: create workspace summary
→ UI: show root + candidate cards
```

---

## 10.2 Expand Node Pipeline

```text
User selects node
→ User asks question
→ Intent Agent: expand_selected_node
→ Context Agent: selected node context
→ Answer Agent
→ Card Agent: sub-cards
→ Map Planner: attach under selected node
→ Memory Agent: update selected node
→ UI: show patch preview
```

---

## 10.3 Generate Flow Pipeline

```text
User asks how-to/workflow
→ Intent Agent: generate_steps
→ Context Agent
→ Answer Agent: ordered workflow
→ Card Agent: step cards
→ Map Planner: next_step edges
→ Flow Optimizer: check order
→ UI: show flow patch
```

---

## 10.4 Generate Options Pipeline

```text
User asks methods/options
→ Intent Agent: generate_options
→ Context Agent
→ Answer Agent: options
→ Card Agent: method cards
→ Map Planner: option_of edges
→ UI: show option branch patch
```

---

## 10.5 New Topic Island Pipeline

```text
User asks unrelated question
→ Intent Agent
→ Relevance Agent: low relation to selected context
→ Answer Agent
→ Card Agent
→ Map Planner: create topic island
→ Memory Agent: create island summary
→ UI: show new island preview
```

---

## 10.6 Refactor Pipeline

```text
User asks to clean map
→ Intent Agent: refactor_map
→ Map Analyzer: detect duplicates, orphan nodes, weak relations
→ Refactor Agent: propose patch
→ UI: patch preview
→ User accepts
→ applyMapPatch
```

---

# 11. UI 交互细节补充

## 11.1 Chat Panel 不只是聊天

Chat Panel 应该包含三块：

```text
Conversation
Candidate Cards
Map Patch Preview
```

而不是只有聊天记录。

## 11.2 Candidate Cards 区域

建议分组：

```text
Recommended for selected node
Possible new island
Unlinked ideas
Deferred cards
```

这样用户不会被一堆卡片淹没。

## 11.3 卡片拖拽逻辑

### 拖到节点上

```text
变成该节点子节点
```

### 拖到两个节点之间的边上

```text
插入中间节点
```

### 拖到空白画布

```text
创建新主题岛
```

### 拖到同级区域

```text
创建 sibling node
```

### 拖到流程节点附近

```text
询问是否插入为 before / after step
```

---

## 11.4 Ghost Node

高置信度建议可以直接在画布上以 ghost node 显示。

Ghost node 特征：

```text
半透明
虚线边框
显示 Accept / Edit / Reject
不进入正式 graph state
```

这样用户一眼能看到 AI 建议的结构，但不会被强制接受。

---

## 11.5 Node Inspector

每个节点的右侧面板应该包含：

```text
Title
Type
One-line summary
Detail summary
User notes
Source messages
Children
Related nodes
Open questions
Ask from this node
Summarize subtree
Refactor children
```

---

## 11.6 Context Preview

高级模式下，在用户发送问题前，可以显示：

```text
This question will use:
- Current node
- 3 ancestor nodes
- 4 child summaries
- 2 sibling summaries
- 5 recent messages
```

这会让用户信任系统没有乱用上下文。

---

# 12. 数据结构补充

## 12.1 Node Memory

每个节点需要长期记忆：

```ts
type NodeMemory = {
  nodeId: string;
  shortSummary: string;
  detailSummary: string;
  decisionLog: string[];
  openQuestions: string[];
  sourceMessageIds: string[];
  lastUpdatedAt: string;
};
```

## 12.2 Topic Island

```ts
type TopicIsland = {
  id: string;
  title: string;
  summary: string;
  rootNodeIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

## 12.3 Map Patch

```ts
type MapPatch = {
  id: string;
  summary: string;
  operations: MapPatchOperation[];
  createdBy: "ai" | "user";
  status: "pending" | "accepted" | "rejected" | "partially_accepted";
  createdAt: string;
};
```

## 12.4 Map Patch Operation

```ts
type MapPatchOperation = {
  id: string;
  type:
    | "create_node"
    | "create_edge"
    | "move_node"
    | "rename_node"
    | "update_node_summary"
    | "merge_nodes"
    | "split_node"
    | "create_topic_island"
    | "insert_between"
    | "change_edge_relation"
    | "collapse_subtree";

  payload: Record<string, any>;
  confidence?: number;
  explanation?: string;
};
```

---

# 13. Prompt 设计

## 13.1 总 System Prompt

```text
You are the structure engine of SproutMap AI.

SproutMap AI is not a normal chatbot and not a simple mind map generator. It is a visual AI workspace that turns conversations into candidate cards, map nodes, and node-scoped context.

Your job is to help the app:
1. Answer the user's question clearly.
2. Extract concise candidate cards.
3. Suggest how those cards should be attached to the current map.
4. Preserve local context and avoid polluting unrelated branches.

Important principles:
- Do not create too many cards.
- A map node is not a paragraph. It is a distilled thinking unit.
- Keep card titles short.
- Put details in summaries, not titles.
- If the user asks for methods/options, create parallel method cards.
- If the user asks for workflow/steps, create ordered step cards.
- If the user asks something unrelated to the current selected node, suggest a new topic island.
- If the user asks to reorganize, propose a patch instead of directly changing the map.
- Never delete or overwrite user content without confirmation.
```

---

## 13.2 Intent Agent Prompt

```text
Classify the user's intent in the SproutMap AI workspace.

Inputs:
- User message
- Selected node, if any
- Workspace summary
- Recent context

Return JSON only.

Possible intents:
- create_root
- expand_selected_node
- generate_options
- generate_steps
- compare_options
- create_discrete_topic
- refactor_map
- deep_dive_node
- summarize_branch
- general_answer

Also return:
- confidence
- shouldCreateCards
- preferredMapMode: tree | flow | matrix | island | none
- reason
```

---

## 13.3 Card Extraction Prompt

```text
Extract candidate cards from the assistant answer.

Rules:
- Generate 3 to 7 cards maximum.
- Each card must represent one atomic idea.
- Do not create cards for trivial sentences.
- Titles must be short and clear.
- Use one of these types:
  Topic, Concept, Method, Step, Question, Decision, Evidence, Risk, Example, Tool, Agent, Workflow, Metric.
- If the answer contains a process, create Step cards.
- If the answer contains alternatives, create Method cards.
- If the answer contains implementation components, create Tool or Concept cards.
- If the answer contains unresolved uncertainty, create Question or Risk cards.

Return JSON only.
```

---

## 13.4 Map Planner Prompt

```text
You are the map planner for SproutMap AI.

Given:
- Current graph
- Selected node
- Candidate cards
- User intent
- Context mode

Decide how candidate cards should be added to the map.

Return a MapPatch.

Rules:
- Do not directly modify the map.
- Suggest operations only.
- Use confidence scores.
- Prefer attaching to the selected node if relevance is high.
- Create a new topic island if relevance is low.
- Use next_step edges for workflows.
- Use option_of edges for alternatives.
- Use supports/contradicts for evidence and risks.
- Avoid creating duplicate nodes.
- If a similar node already exists, suggest merge or link instead of duplicate creation.
```

---

## 13.5 Memory Agent Prompt

```text
Update the memory summary for a node or topic island.

Inputs:
- Existing node memory
- New accepted cards
- New chat messages
- User edits
- New children

Return:
- shortSummary
- detailSummary
- decisionLog
- openQuestions
- sourceMessageIds

Rules:
- Preserve user decisions.
- Do not remove important details.
- Compress repeated content.
- Keep shortSummary under 25 words.
- Keep detailSummary concise but informative.
```

---

## 13.6 Refactor Agent Prompt

```text
Analyze the current map and propose a cleanup patch.

Look for:
- Duplicate nodes
- Overly broad nodes
- Nodes under wrong parents
- Missing intermediate group nodes
- Unclear edge relations
- Orphan nodes
- Branches that should become a separate topic island
- Flow nodes that are incorrectly represented as hierarchy
- Option nodes that should be siblings

Return a MapPatch only.

Do not delete anything directly.
Every operation must be user-confirmable.
```

---

# 14. Claude 开发 Prompt

Use the following prompt in Claude Code or Cursor.

```text
I am building a React + TypeScript web app called SproutMap AI.

This is not a simple AI mind-map generator. It is a chat-first, card-first, node-scoped AI thinking workspace.

Core idea:
- User chats normally.
- LLM gives a normal answer.
- The system extracts candidate cards from the answer.
- Candidate cards are temporary.
- User decides which cards become permanent map nodes.
- The map is built with React Flow.
- Each map node stores a concise title, one-line summary, detailed summary, user notes, source messages, and local memory.
- User can select any node and ask a follow-up question using only that node's local context.
- The product supports multiple workflows:
  1. Create root topic.
  2. Expand selected node.
  3. Generate parallel options.
  4. Generate step-by-step workflow.
  5. Create unrelated topic island.
  6. Compare options.
  7. Refactor existing map.
  8. Deep-dive into a single node.

I need you to implement the product architecture in a modular way.

Do not hard-code everything into one giant LLM call.

Please create:
1. Data types for nodes, edges, candidate cards, topic islands, node memory, map patches, and chat messages.
2. A Zustand store.
3. A three-panel UI:
   - left chat + candidate card tray + patch preview
   - center React Flow canvas
   - right inspector
4. Deterministic tools:
   - getNodePath
   - getSubtree
   - getSiblingNodes
   - getTopicIsland
   - buildContext
   - createNodeFromCard
   - applyMapPatch
   - undoMapPatch
   - detectDuplicateTitles
   - autoLayout
5. LLM skill wrappers:
   - classifyIntent
   - generateAnswer
   - extractCards
   - planMapPatch
   - summarizeNodeMemory
   - refactorMap
6. Prompt templates for each skill.
7. A backend API route that accepts the user’s OpenAI API key and calls OpenAI.
8. A model whitelist.
9. Local persistence.
10. Drag-and-drop candidate cards into the React Flow canvas.
11. Ghost nodes for high-confidence AI suggestions.
12. Map Patch Preview before applying AI changes.

Important UX principles:
- Do not automatically add everything to the map.
- Always stage LLM outputs as candidate cards or map patches first.
- Limit generated cards to 3–7.
- Keep map nodes concise.
- Store detailed summaries in the inspector, not on the canvas.
- User edits always override AI suggestions.
- Never delete user-created content without confirmation.
- If the user's new question is unrelated to the selected node, create a separate topic island.
- If the user asks for workflow, generate next_step edges.
- If the user asks for options, generate option_of edges.

Please implement this step by step:
1. First create the data model and Zustand store.
2. Then create the layout and mock UI.
3. Then create React Flow nodes and edges.
4. Then implement candidate card drag-and-drop.
5. Then implement map patch preview.
6. Then implement context builder.
7. Then implement LLM API route and skill wrappers.
8. Then connect the chat flow.
9. Then add persistence.
10. Then polish the UI.

Before coding each step, briefly explain the design choice.
After coding each step, ensure the app still runs.
```

---

# 15. 最重要的产品判断

SproutMap AI 的核心不是“生成更漂亮的图”。

核心是：

```text
把 GPT 对话拆成可管理的思维单元，并让每个思维单元拥有自己的上下文。
```

所以开发优先级应该是：

```text
1. 卡片抽取质量
2. 卡片入图逻辑
3. 节点上下文拼接
4. Map Patch Preview
5. 多工作流 Agent Pipeline
6. UI 美观
```

UI 可以晚一点漂亮，但逻辑必须先清楚。

---

# 16. 下一步建议

Claude 后续应该重点探索这几个问题：

1. 什么情况下 AI 应该生成卡片？
2. 什么情况下 AI 只回答、不生成卡片？
3. 什么情况下生成 flow？
4. 什么情况下生成 option branch？
5. 什么情况下创建 topic island？
6. 如何显示 Map Patch Preview 最清晰？
7. 如何防止图越来越乱？
8. 如何把节点 summary 用作未来上下文？
9. 如何让用户信任 AI 没有乱拼上下文？
10. 如何设计节点和卡片之间的区别，让用户一眼明白？

如果这些逻辑做好，这个产品会比普通 AI mindmap 工具强很多。

# 17. AI 自动生成 vs 用户手动拖拽：决策机制与自动化等级控制

## 17.1 为什么这个问题是产品核心

SproutMap AI 不能极端化。

如果完全依赖用户手动拖拽：

```text
AI 回答
↓
生成候选卡片
↓
所有卡片都需要用户一个个拖进图
```

问题是：

1. 用户操作成本太高。
2. 用户会觉得产品不够智能。
3. 大量结构化内容无法快速沉淀。
4. 用户每次都要判断卡片放哪里，容易疲劳。

但如果完全依赖 AI 自动生成：

```text
AI 回答
↓
自动生成大量节点
↓
自动连接所有关系
```

问题是：

1. 图很快变乱。
2. 节点太多，用户失去控制。
3. AI 关系判断可能错误。
4. 用户不知道哪些内容真的重要。
5. 后续上下文会被错误结构污染。

因此，SproutMap AI 需要一个中间策略：

```text
AI 负责高置信度结构化。
用户负责低置信度决策和关键知识选择。
```

这就是产品的核心 trade-off。

---

## 17.2 设计原则

## Principle 1: AI 可以自动生成，但不能无限自动扩展

AI 可以生成：

1. Root node
2. 明确的子节点
3. 明确的流程步骤
4. 明确的并列方案
5. 高置信度关系
6. 临时 ghost nodes
7. Map Patch Preview

AI 不应该直接生成：

1. 大量深层节点
2. 多层复杂树
3. 跨主题连接
4. 低置信度关系
5. 删除或覆盖用户内容
6. 用户没有确认的 map refactor
7. 长文本节点

核心规则：

```text
AI 可以生成结构建议，但复杂结构必须经过用户确认。
```

---

## Principle 2: 越靠近用户当前意图，AI 自动化程度越高

如果用户明确说：

```text
帮我生成这个流程图
```

AI 可以更主动。

如果用户只是普通聊天：

```text
这个东西怎么理解？
```

AI 应该只生成候选卡片，不应该强行改图。

因此自动化程度取决于用户意图。

---

## Principle 3: 越影响长期知识结构，越需要用户确认

进入正式 map 的内容会影响后续上下文。

所以：

```text
临时内容可以自动生成。
永久结构需要确认。
```

具体来说：

```text
Chat answer: AI 自动生成
Candidate cards: AI 自动生成
Ghost nodes: AI 自动生成
Permanent nodes: 需要用户确认或满足高置信度自动规则
Cross-branch edges: 必须用户确认
Refactor operations: 必须用户确认
Delete / merge: 必须用户确认
```

---

## Principle 4: AI 应该先少量生成，再等待用户继续扩展

不要让 AI 一次生成完整大图。

更好的策略是：

```text
每次生成 3–7 个高质量节点
用户确认
再从某个节点继续展开
```

这样图会像树一样逐步生长，而不是一次爆炸。

---

# 17.3 自动化等级

SproutMap AI 应该定义 5 个自动化等级。

## Level 0: No map action

AI 只回答，不生成卡片，不改图。

适合：

1. 用户问很简单的问题。
2. 用户只是闲聊。
3. 用户明确说“先别加到图里”。
4. 当前问题没有结构化价值。

示例：

```text
用户：这个词什么意思？
系统：只回答，不生成 map。
```

---

## Level 1: Generate candidate cards only

AI 回答后生成候选卡片，但不放到画布。

适合：

1. 普通解释型问题。
2. 信息有一定价值，但结构关系不明确。
3. 用户没有选中节点。
4. AI 不确定应该放哪里。
5. 新内容可能和当前主题弱相关。

示例：

```text
用户：这个产品有哪些风险？
系统：
- 回答问题
- 生成 Risk cards
- 放到候选卡片区
- 不自动入图
```

---

## Level 2: Ghost nodes preview

AI 在画布上生成半透明 ghost nodes，但不正式加入图。

适合：

1. AI 对父节点和关系比较有把握。
2. 用户当前选中了明确节点。
3. 内容数量不多。
4. 生成结构对当前节点有明显帮助。
5. 但仍需要用户确认。

示例：

```text
用户选中：候选卡片机制
用户：这个下面应该有哪些模块？
系统：
- 在“候选卡片机制”下显示 4 个 ghost nodes
- 用户可以 Accept / Edit / Reject
```

---

## Level 3: Auto-add within selected scope

AI 可以自动加入节点，但只能在当前选中节点或当前主题岛内部。

适合：

1. 用户明确要求生成结构。
2. 关系非常明确。
3. 节点数量较少。
4. 不涉及跨主题连接。
5. 不会修改已有用户内容。

示例：

```text
用户选中：剧本分镜流程
用户：帮我生成五个步骤。
系统：
- 自动创建 5 个 step nodes
- 自动用 next_step 连接
- 显示 Undo 和 Review patch
```

注意：

Level 3 必须提供 Undo。

---

## Level 4: Auto-generate map patch with confirmation

AI 生成一组复杂 map patch，但用户确认后才应用。

适合：

1. 重构当前图。
2. 合并重复节点。
3. 改变层级。
4. 生成多层结构。
5. 创建新的 topic island。
6. 比较矩阵 / 复杂流程图。

示例：

```text
用户：帮我把这部分整理成更清晰的结构。
系统：
- 生成 Map Patch Preview
- 显示将新增、移动、合并哪些节点
- 用户确认后才执行
```

---

## Level 5: Fully automatic mode

AI 自动生成和更新 map，不需要逐步确认。

这个不建议作为默认模式。

只适合：

1. 用户明确开启 Auto Mode。
2. 空白新图。
3. 用户想快速从一段长文本生成初稿。
4. 用户之后愿意手动整理。
5. 不是长期重要项目。

示例：

```text
用户：把这段文章直接生成完整 mindmap。
系统：
- 自动生成完整 mindmap
- 标记为 draft map
- 提供 Clean up / Simplify / Collapse 操作
```

默认不启用 Level 5。

---

# 17.4 自动化决策表

系统可以根据以下因素决定自动化等级。

| 判断因素      | 低自动化        | 高自动化             |
| --------- | ----------- | ---------------- |
| 用户意图是否明确  | 模糊问题        | 明确要求生成结构         |
| 是否选中节点    | 未选中         | 已选中明确节点          |
| 内容关系是否清楚  | 关系不确定       | 明确父子/流程/并列       |
| 节点数量      | 超过 7 个      | 3–7 个            |
| 是否跨主题     | 跨多个主题       | 当前主题内部           |
| 是否修改已有结构  | 会移动/合并/删除   | 只新增节点            |
| 置信度       | < 0.5       | > 0.8            |
| 是否影响长期上下文 | 影响大         | 影响小或可撤销          |
| 用户模式      | Manual Mode | Auto Assist Mode |
| 图复杂度      | 已经很复杂       | 当前图很简单           |

---

# 17.5 自动化决策算法

可以实现一个 `decideAutomationLevel` 函数。

```ts
type AutomationLevel =
  | "none"
  | "candidate_only"
  | "ghost_preview"
  | "auto_add_scoped"
  | "patch_preview"
  | "full_auto_draft";

type AutomationDecisionInput = {
  intent: UserIntent;
  userExplicitCommand: boolean;
  selectedNodeId?: string;
  relationConfidence: number;
  relevanceToSelectedNode: number;
  proposedNodeCount: number;
  proposedMaxDepth: number;
  modifiesExistingStructure: boolean;
  createsCrossTopicEdges: boolean;
  createsNewTopicIsland: boolean;
  graphComplexityScore: number;
  userAutomationPreference: "manual" | "balanced" | "auto_assist";
};

type AutomationDecision = {
  level: AutomationLevel;
  reason: string;
  requiresUserConfirmation: boolean;
  allowUndo: boolean;
};
```

推荐规则：

```ts
function decideAutomationLevel(input: AutomationDecisionInput): AutomationDecision {
  if (input.intent === "general_answer" && !input.userExplicitCommand) {
    return {
      level: "candidate_only",
      reason: "The user asked a general question without explicitly requesting map generation.",
      requiresUserConfirmation: true,
      allowUndo: false
    };
  }

  if (input.modifiesExistingStructure || input.createsCrossTopicEdges) {
    return {
      level: "patch_preview",
      reason: "The proposed update modifies existing map structure or creates cross-topic relations.",
      requiresUserConfirmation: true,
      allowUndo: true
    };
  }

  if (input.proposedNodeCount > 7 || input.proposedMaxDepth > 2) {
    return {
      level: "patch_preview",
      reason: "The proposed structure is too large for automatic insertion.",
      requiresUserConfirmation: true,
      allowUndo: true
    };
  }

  if (
    input.userExplicitCommand &&
    input.selectedNodeId &&
    input.relationConfidence >= 0.8 &&
    input.relevanceToSelectedNode >= 0.8 &&
    input.proposedNodeCount <= 7 &&
    !input.createsCrossTopicEdges
  ) {
    return {
      level: "auto_add_scoped",
      reason: "The user explicitly requested structure generation within a clear selected scope.",
      requiresUserConfirmation: false,
      allowUndo: true
    };
  }

  if (
    input.selectedNodeId &&
    input.relationConfidence >= 0.65 &&
    input.relevanceToSelectedNode >= 0.65
  ) {
    return {
      level: "ghost_preview",
      reason: "The proposed structure is likely relevant but should be visually confirmed.",
      requiresUserConfirmation: true,
      allowUndo: true
    };
  }

  return {
    level: "candidate_only",
    reason: "The relation is uncertain, so cards should stay in the candidate tray.",
    requiresUserConfirmation: true,
    allowUndo: false
  };
}
```

---

# 17.6 按用户指令触发不同自动化

## 用户说“生成一个 mindmap”

这属于明确命令。

系统可以：

```text
Level 4 或 Level 5
```

如果是空白图，可以 Level 5 draft。

如果已有复杂图，应该 Level 4 patch preview。

---

## 用户说“这个下面有哪些点？”

这属于当前节点扩展。

如果选中节点明确：

```text
Level 2 或 Level 3
```

如果没有选中节点：

```text
Level 1 或 Level 4
```

---

## 用户说“帮我整理当前图”

这属于重构。

必须：

```text
Level 4 patch preview
```

不能直接改。

---

## 用户说“我先随便问问”

这属于普通对话。

应该：

```text
Level 0 或 Level 1
```

---

## 用户说“把这段文本直接变成图”

这属于输入转图。

可以：

```text
Level 5 draft map
```

但生成的图应该标记为：

```text
Draft generated map
```

并提供：

```text
Simplify
Collapse
Confirm structure
```

---

# 17.7 用户模式设置

产品可以提供三个模式。

## Manual Mode

适合高控制用户。

行为：

```text
AI 只生成候选卡片。
用户手动拖拽或点击加入。
```

适合：

1. 科研写作
2. 重要项目
3. 长期知识库
4. 用户非常在意结构准确性

---

## Balanced Mode

默认模式。

行为：

```text
AI 自动生成候选卡片和 ghost nodes。
高置信度结构可以局部自动加入。
复杂修改需要确认。
```

适合大多数用户。

这是默认推荐。

---

## Auto Assist Mode

适合快速生成。

行为：

```text
AI 可以自动生成较完整的 draft map。
用户之后再编辑。
```

适合：

1. 快速头脑风暴
2. 把文章变成图
3. 故事大纲初稿
4. 会议纪要整理

不适合：

1. 重要科研知识库
2. 精准逻辑推理
3. 长期项目结构

---

# 17.8 UI 如何表达自动化等级

用户必须知道 AI 正在做什么。

建议在 Chat Panel 或 Map Patch Preview 上显示：

```text
AI action: Candidate cards only
AI action: Ghost preview
AI action: Auto-added to selected node
AI action: Patch requires review
AI action: Draft map generated
```

示例：

```text
AI 建议：
- 生成 5 张候选卡片
- 其中 3 张建议挂到“上下文管理”下
- 2 张建议作为新主题岛
- 没有自动修改正式图
```

或者：

```text
AI 已自动加入：
- 5 个流程步骤已加入“剧本分镜流程”
- 已使用 next_step 关系连接
- 你可以 Undo 或 Review patch
```

---

# 17.9 自动生成的数量控制

为了防止混乱，必须有硬限制。

## 默认限制

```text
每次最多生成 7 张候选卡片
每次最多自动加入 5 个节点
每次最多生成 1 层子节点
流程最多 7 步
并列方案最多 6 个
低置信度节点不自动入图
```

## 长文本转图模式

如果用户输入很长文本，可以突破限制，但必须分层：

```text
第一层：最多 5 个主分支
第二层：每个主分支最多 5 个子节点
第三层：默认折叠，不直接展开
```

并且标记为：

```text
Draft Map
```

---

# 17.10 什么应该 AI 自动生成

AI 适合自动生成：

## 1. Root node

当用户第一次描述一个项目时，AI 可以自动生成 root。

```text
用户：我想开发一个节点式 AI 对话工具。
Root：节点式 AI 对话工具
```

## 2. 高层主题分支

如果用户问的是 broad planning，AI 可以生成少量一级主题。

```text
用户：这个产品需要考虑什么？
AI 自动建议：
- 用户流程
- 上下文管理
- 卡片系统
- 画布交互
- 商业模式
```

这些可以作为 ghost nodes 或 patch preview。

## 3. 明确流程步骤

如果用户明确说“生成流程”，AI 可以自动生成 step nodes。

```text
用户：帮我生成从输入到入图的流程。
AI 自动生成：
输入 → 回答 → 卡片提取 → Map Patch → 用户确认 → 入图
```

## 4. 明确并列方案

如果用户问“有哪些方法/方案”，AI 可以生成 option nodes。

```text
商业化方案
├── BYO API
├── 订阅制
└── 团队版
```

## 5. 当前节点内部的局部扩展

如果用户选中节点后问“这个下面有什么”，AI 可以较主动生成。

因为作用范围明确。

## 6. 节点摘要和详情

AI 应该自动维护：

```text
shortSummary
detailSummary
openQuestions
decisionLog
```

这些不一定需要用户手动。

---

# 17.11 什么应该用户手动拖拽或确认

用户应该控制：

## 1. 低置信度卡片

如果 AI 不确定放哪，放在候选区让用户拖。

## 2. 跨主题关系

例如把“商业模式”和“技术架构”连接起来，这种关系可能很主观。

必须用户确认。

## 3. 新主题岛是否与旧主题连接

AI 可以建议：

```text
这个新主题可能和当前主题有关。
```

但是否连线由用户决定。

## 4. 合并节点

合并会改变知识结构，必须确认。

## 5. 删除节点

永远不要自动删除。

## 6. 修改用户编辑过的标题

用户改过的标题优先级最高。

AI 可以建议重命名，但不能自动覆盖。

## 7. 多层复杂结构

如果 AI 一次生成两层以上结构，需要 preview。

用户确认后再加入。

## 8. 长期项目中的关键决策节点

例如：

```text
先做 BYO API，不做订阅
```

这种 Decision node 最好用户确认。

---

# 17.12 自动化等级与工作流对应表

| 工作流     | 默认自动化等级       | 说明                       |
| ------- | ------------- | ------------------------ |
| 普通问答    | Level 0–1     | 只回答或生成候选卡                |
| 从零创建主题  | Level 2–4     | 可生成 root 和一级 ghost nodes |
| 展开当前节点  | Level 2–3     | 当前范围明确，可较主动              |
| 生成流程    | Level 3–4     | 明确流程可自动局部加入              |
| 生成并列方案  | Level 2–3     | 方案清楚时可自动加入               |
| 新主题岛    | Level 2–4     | 可创建岛，但连接需确认              |
| 比较决策    | Level 1–4     | 复杂结构建议 patch preview     |
| 重构已有图   | Level 4       | 必须确认                     |
| 删除/合并   | Level 4       | 必须确认                     |
| 长文本直接转图 | Level 5 draft | 只作为草稿图                   |

---

# 17.13 推荐默认策略

SproutMap AI 默认应该使用 **Balanced Mode**。

默认行为：

```text
1. AI 自动回答。
2. AI 自动生成候选卡片。
3. 如果用户选中节点，AI 可以显示 ghost nodes。
4. 如果用户明确要求生成流程/方案，AI 可以局部自动加入。
5. 如果涉及跨主题、重构、合并、删除，则必须 patch preview。
6. 如果 AI 不确定，就留在候选卡片区。
```

一句话：

```text
AI 主动建议，用户掌控结构。
```

---

# 17.14 给 Claude 的开发要求补充

在开发 prompt 中加入以下内容：

```text
Add an automation-control system.

The app must not force everything into manual drag-and-drop, and must not let AI automatically generate large messy maps.

Implement a decision layer called decideAutomationLevel.

The decision layer should choose one of:
- none
- candidate_only
- ghost_preview
- auto_add_scoped
- patch_preview
- full_auto_draft

Inputs should include:
- user intent
- whether the user explicitly requested map generation
- selected node
- relation confidence
- relevance to selected node
- proposed node count
- proposed maximum depth
- whether the operation modifies existing structure
- whether it creates cross-topic edges
- graph complexity score
- user automation preference

Default product mode should be Balanced Mode.

Rules:
- General questions should usually generate candidate cards only.
- If the user explicitly asks for a flow or options under a selected node, allow scoped auto-add with undo.
- If the update modifies existing structure, creates cross-topic links, merges nodes, deletes nodes, or creates more than 7 nodes, require patch preview.
- If confidence is medium, show ghost nodes.
- If confidence is low, keep cards in the candidate tray.
- Never auto-delete nodes.
- Never overwrite user-edited titles.
- Always show the user what AI action was taken.
- Always provide undo for any automatic map update.
```

---

# 17.15 最终产品判断

SproutMap AI 的关键不是：

```text
AI 自动 vs 用户手动
```

而是：

```text
在正确的时候自动，在不确定的时候让用户控制。
```

最终体验应该是：

```text
AI 负责降低整理成本。
用户负责确认知识结构。
```

这才是长期可用的 AI 思维导图工具。
