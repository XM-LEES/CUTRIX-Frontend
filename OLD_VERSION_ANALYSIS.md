# 旧版本 CUTRIX 前端功能分析报告

## 对比版本
- **旧版本：** `/old` 文件夹
- **新版本：** `/CUTRIX-Frontend` 文件夹

---

## 一、订单填写功能对比

### 旧版本特点 ⭐⭐⭐⭐⭐

#### 1. **矩阵式批量录入（核心亮点）**
旧版本在 `ProductionOrders.tsx` 中实现了非常优秀的订单录入方式：

**常规尺码矩阵表**
```typescript
// 预设常规尺码
const REGULAR_SIZES = ['90', '100', '110', '120', '130', '140', '150', '160'];

// 矩阵式表格布局
颜色 | 90 | 100 | 110 | 120 | 130 | 140 | 150 | 160
-----|----|----|-----|-----|-----|-----|-----|-----
红色 | 10 | 20 |  30 |  40 |  50 |  30 |  20 | 10
蓝色 | 15 | 25 |  35 |  45 |  55 |  35 |  25 | 15
```

**优势：**
- ✅ **快速录入：** 一行填写一个颜色的所有尺码
- ✅ **批量操作：** 可以添加多行，每行对应一个颜色
- ✅ **视觉清晰：** 表格式布局，一目了然
- ✅ **减少错误：** 尺码固定，不会输入错误的尺码

**特殊尺码补充**
```typescript
// 针对非标尺码单独添加
特殊尺码明细：
颜色: [白色] 尺码: [XS] 数量: [50]
颜色: [白色] 尺码: [4XL] 数量: [20]
```

**数据处理逻辑：**
```typescript
const handleCreate = async (values: any) => {
  // 1. 从矩阵中提取有效数据
  const matrixItems = (values.matrix || [])
    .flatMap((row) => {
      return Object.entries(row.sizes || {})
        .filter(([, quantity]) => quantity && quantity > 0)
        .map(([size, quantity]) => ({ 
          color: row.color, 
          size, 
          quantity 
        }));
    });
  
  // 2. 合并特殊尺码
  const specialItems = (values.special_items || [])
    .filter(item => item && item.color && item.size && item.quantity > 0);
  
  // 3. 组合所有明细
  const allItems = [...matrixItems, ...specialItems];
};
```

### 新版本实现

**当前实现（`CUTRIX-Frontend/src/pages/Orders.tsx`）**
- ❌ **逐条录入：** 每个颜色-尺码-数量组合需要单独一行
- ❌ **操作繁琐：** 对于多尺码订单，需要重复添加很多行
- ❌ **效率较低：** 适合明细较少的订单，不适合批量录入

**对比示例：**
录入一个 8 个尺码的红色订单：
- 旧版本：1 行（填写 8 个数字输入框）
- 新版本：8 行（每行需要选择颜色、输入尺码、输入数量）

---

## 二、生产计划创建功能对比

### 旧版本特点 ⭐⭐⭐⭐⭐

#### 1. **实时需求对比功能（核心亮点）**
`ProductionPlanningCreate.tsx` 实现了极其强大的可视化对比系统：

**双表格对比视图**
```
┌─────────────────────────┬─────────────────────────┐
│  订单需求概览 (目标)     │  生产计划汇总 (当前)     │
├─────────────────────────┼─────────────────────────┤
│ 颜色 | 90 | 100 | 110  │ 颜色 | 90 | 100 | 110  │
│ 红色 | 10 |  20 |  30  │ 红色 | 12 |  24 |  36  │
│ 蓝色 | 15 |  25 |  35  │ 蓝色 | 15 |  25 |  35  │
└─────────────────────────┴─────────────────────────┘
```

**智能颜色标记**
```typescript
const SummaryCell = ({ planned, required }) => {
  const diff = planned - required;
  let color = 'inherit';
  if (diff > 0) color = '#1677ff';  // 超出: 蓝色
  if (diff < 0) color = '#f5222d';  // 缺少: 红色
  if (diff === 0 && required > 0) color = '#52c41a'; // 正好: 绿色
  
  return <Text style={{ color }}>{planned} / {required}</Text>;
};
```

**实时计算逻辑**
```typescript
// 根据所有排版方案实时计算总产量
const plannedSupply = useMemo(() => {
  const supply = {};
  layouts.forEach((layout) => {
    const { colors, planned_layers, ratios } = layout;
    
    colors.forEach((color) => {
      Object.values(ratios).forEach((ratioInfo) => {
        supply[color][ratioInfo.size] = 
          (supply[color][ratioInfo.size] || 0) + 
          (planned_layers * ratioInfo.ratio);
      });
    });
  });
  return supply;
}, [layouts]);
```

**效果：**
- ✅ **实时反馈：** 修改排版方案时，立即看到产量变化
- ✅ **防止错误：** 直观看到哪些尺码超产、哪些缺少
- ✅ **优化决策：** 帮助制定最优的排版方案

#### 2. **排版方案设计器**

**灵活的版型配置**
```typescript
排版方案 #1
├─ 版长 (cm): 1.85
├─ 颜色 (可多选): [红色, 蓝色, 白色]
├─ 尺码比例:
│  ├─ 90:  2 件
│  ├─ 100: 3 件
│  ├─ 110: 4 件
│  ├─ 120: 5 件
│  └─ ...
└─ 拉布层数: 50 层
```

**自动计算逻辑**
- 排版方案 × 拉布层数 = 每个尺码的产量
- 支持多个排版方案组合使用
- 每个方案可以应用到多个颜色

#### 3. **只显示未计划订单**
```typescript
const { unplannedOrders, fetchUnplannedOrders } = useOrderStore();

// 下拉框只显示还没有创建计划的订单
<Select
  options={unplannedOrders.map((o) => ({
    value: o.order_id,
    label: `${o.order_number} (客户: ${o.customer_name})`
  }))}
/>
```

### 新版本实现

**当前实现（`CUTRIX-Frontend/src/pages/Plans.tsx`）**
- ❌ **缺少实时对比：** 无法看到计划产量与订单需求的对比
- ❌ **需手动计算：** 制定计划时需要自己计算是否满足需求
- ❌ **容易出错：** 可能导致超产或少产

**建议改进方向：**
1. 参考旧版本实现双表格对比视图
2. 添加实时计算和颜色标记
3. 实现智能的排版方案设计器

---

## 三、Worker 登录后的页面对比

### 旧版本特点 ⭐⭐⭐⭐⭐

#### `WorkerDashboard.tsx` - 工人专属工作台

**专为一线工人设计的简洁界面**

**布局特点：**
```
┌──────────────────────────────────────────────────────┐
│  CUTRIX 工人工作台                 王师傅 (工号: 007) │
│                                  [我的记录] [退出登录] │
├──────────────────────────────────────────────────────┤
│  我的任务                     共 3 项    1 项紧急      │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐          │
│  │ 紧急订单-ABC123 的生产计划              │ ← 红色边框 │
│  │ 订单号: ABC123                         │          │
│  │ ██████████████░░░░░░ 72%              │          │
│  │ 360 / 500 层                           │          │
│  └────────────────────────────────────────┘          │
│                                                       │
│  ┌────────────────────────────────────────┐          │
│  │ 常规订单-XYZ789 的生产计划              │ ← 蓝色边框 │
│  │ 订单号: XYZ789                         │          │
│  │ ███████████░░░░░░░░ 55%               │          │
│  │ 220 / 400 层                           │          │
│  └────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────┘
```

**关键特性：**

1. **任务分组显示**
```typescript
// 按生产计划分组显示任务
const { taskGroups } = useTaskStore();

taskGroups.map(group => ({
  plan_id: 1,
  plan_name: "紧急订单-ABC123 的生产计划",
  order_number: "ABC123",
  total_planned: 500,    // 计划总层数
  total_completed: 360,  // 已完成层数
}));
```

2. **紧急任务高亮**
```typescript
// 自动识别紧急任务
const urgentPlans = taskGroups
  .filter(p => p.plan_name.includes("紧急"))
  .length;

// 视觉区分
style={{
  borderLeft: group.plan_name.includes("紧急") 
    ? '4px solid #cf1322'  // 红色
    : '4px solid #1677ff'  // 蓝色
}}
```

3. **进度可视化**
```typescript
// 直观的进度条
<Progress 
  percent={Math.round((total_completed / total_planned) * 100)} 
  strokeWidth={16} 
/>

// 数字进度
<Text>{total_completed} / {total_planned} 层</Text>
```

4. **简化操作**
- 点击卡片直接进入任务详情
- 大字体，适合车间环境使用
- 专注于当前任务，无干扰信息

#### `TaskOperation.tsx` - 任务操作页面 ⭐⭐⭐⭐⭐

**专为车间一线工人设计的日志提交界面**

**布局设计：**
```
┌──────────────────────────────────────────────────────────┐
│  [返回] 紧急订单-ABC123 的生产计划  订单号: ABC123      │
├────────────────────┬─────────────────────────────────────┤
│  选择任务          │ 正在为 [1.85cm版] 的 红色 录入本次  │
│                    │ 完成层数                            │
│ ▼ 1.85cm版         │                                     │
│   红色 120/150     │        ┌──────────────┐             │
│   蓝色  80/150     │        │     125      │ ← 大数字显示│
│                    │        └──────────────┘             │
│ ▼ 2.10cm版         │                                     │
│   白色  50/100     │  ┌───┬───┬───┐                      │
│   黑色  30/100     │  │ 7 │ 8 │ 9 │                      │
│                    │  ├───┼───┼───┤                      │
│                    │  │ 4 │ 5 │ 6 │  ← 数字键盘          │
│                    │  ├───┼───┼───┤                      │
│                    │  │ 1 │ 2 │ 3 │                      │
│                    │  ├───┼───┼───┤                      │
│                    │  │ C │ 0 │Del│                      │
│                    │  └───┴───┴───┘                      │
│                    │                                     │
│                    │  [      提交记录      ] ← 大按钮    │
└────────────────────┴─────────────────────────────────────┘
```

**核心特性：**

1. **按版型分组（Collapse 折叠面板）**
```typescript
// 任务按排版方案（版型）分组
<Collapse accordion defaultActiveKey={firstUnfinishedLayoutId}>
  {currentPlan.layouts?.map(layout => (
    <Panel header={layout.layout_name} key={layout.layout_id}>
      {layout.tasks?.map(task => (
        <TaskCard task={task} />
      ))}
    </Panel>
  ))}
</Collapse>

// 自动展开第一个有未完成任务的版
const firstUnfinishedLayoutId = useMemo(() => {
  const layout = currentPlan.layouts?.find(l => 
    l.tasks?.some(t => t.completed_layers < t.planned_layers)
  );
  return layout?.layout_id;
}, [currentPlan]);
```

2. **大数字键盘界面**
```typescript
const KeypadButton = ({ value, onClick }) => (
  <Button 
    style={{ 
      height: 70,      // 大按钮，方便点击
      fontSize: 28,    // 大字体，方便看清
      fontWeight: 500 
    }} 
    onClick={() => onClick(value)}
  >
    {value}
  </Button>
);

// 键盘布局
const keypad = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['C', '0', 'Del']
];
```

3. **键盘输入逻辑**
```typescript
const handleKeyPress = (key: string) => {
  if (key === 'C') {
    setInputValue('0');           // 清空
  } else if (key === 'Del') {
    setInputValue(                // 退格
      inputValue.length > 1 
        ? inputValue.slice(0, -1) 
        : '0'
    );
  } else {
    // 数字输入
    if (inputValue.length >= 5) return; // 限制长度
    setInputValue(
      inputValue === '0' 
        ? key 
        : inputValue + key
    );
  }
};
```

4. **任务选择与高亮**
```typescript
// 点击任务卡片切换任务
<div
  onClick={() => {
    setInputValue('0');      // 切换任务时重置输入
    setSelectedTask(task);
  }}
  style={{
    backgroundColor: selectedTask?.task_id === task.task_id 
      ? '#e6f4ff'            // 选中背景色
      : 'white',
    borderRight: selectedTask?.task_id === task.task_id 
      ? '4px solid #1677ff'  // 选中边框
      : 'none'
  }}
>
  <Text>{task.color}</Text>
  <Text>{task.completed_layers} / {task.planned_layers} 层</Text>
  {task.completed_layers >= task.planned_layers 
    ? <Tag color="success">已完成</Tag>
    : <Tag color="processing">还少 {差值} 层</Tag>
  }
</div>
```

5. **智能默认选择**
```typescript
// 页面加载时自动选中第一个未完成的任务
useEffect(() => {
  if (currentPlan) {
    const firstUnfinishedTask = currentPlan.layouts
      ?.flatMap(l => l.tasks || [])
      .find(t => t.completed_layers < t.planned_layers);
    setSelectedTask(firstUnfinishedTask || null);
  }
}, [currentPlan]);
```

6. **提交日志**
```typescript
const handleSubmit = async () => {
  const layers = parseInt(inputValue, 10);
  
  // 验证
  if (!layers || layers <= 0) {
    message.error("请输入有效的层数");
    return;
  }
  
  // 构建日志对象
  const log = {
    task_id: selectedTask.task_id,
    worker_id: user.worker_id,
    process_name: '拉布',
    layers_completed: layers,
  };
  
  await submitLog(log);
  message.success("记录提交成功！");
  setInputValue('0');  // 重置输入
};
```

**设计优势：**

✅ **适合车间环境**
- 大按钮、大字体，戴手套也能准确操作
- 简洁界面，无干扰信息
- 快速提交，不影响工作节奏

✅ **防止错误**
- 自动选中未完成任务
- 按版型分组，不会选错任务
- 输入限制，防止输入过大数值

✅ **提升效率**
- 数字键盘快速输入
- 一键提交，即时反馈
- 实时显示完成进度

✅ **用户体验**
- 高亮显示当前选中任务
- 清晰的进度标识（已完成/还少 X 层）
- 友好的成功提示

### 新版本实现

**当前实现（`CUTRIX-Frontend/src/pages/Dashboard.tsx`）**
- ❌ **没有工人专属视图：** 所有角色看到相同的仪表板
- ❌ **缺少任务分组：** 工人无法快速找到自己的任务
- ❌ **信息过载：** 显示了工人不需要的统计信息

**建议改进方向：**
1. 根据角色显示不同的 Dashboard
2. 为 Worker 角色实现专门的任务工作台
3. 添加任务分组和进度可视化功能

---

## 四、员工管理功能对比

### 旧版本特点 ⭐⭐⭐⭐

#### `Workers.tsx` - 细粒度权限控制

**智能的权限管理逻辑**

1. **防止误删管理员**
```typescript
// 1. Admin 无法被删除
// 2. Manager 无法删除自己
disabled={
  record.role === 'admin' || 
  (record.role === 'manager' && isSelf)
}
```

2. **分级编辑权限**
```typescript
// Manager 无法编辑 Admin
let canEdit = true;
if (currentUser?.role === 'manager' && record.role === 'admin') {
  canEdit = false;
}
```

3. **自我保护机制**
```typescript
// 管理员编辑自己时，禁止修改关键字段
const isEditingSelf = editingWorker?.worker_id === currentUser?.worker_id;

// 不能修改自己的角色
const isRoleSelectDisabled = isEditingSelf && 
  (currentUser?.role === 'admin' || currentUser?.role === 'manager');

// 不能停用自己的账户
const isStatusSwitchDisabled = isEditingSelf && 
  (currentUser?.role === 'admin' || currentUser?.role === 'manager');

// Admin 不能修改自己的名字
const isNameInputDisabled = isEditingSelf && 
  currentUser?.role === 'admin';
```

4. **分离的密码修改功能**
```typescript
// 独立的修改密码对话框
<Modal title={`为 "${editingWorker?.name}" 修改密码`}>
  <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
    <Input.Password />
  </Form.Item>
  <Form.Item 
    name="confirm" 
    dependencies={['password']}
    rules={[
      { required: true },
      ({ getFieldValue }) => ({
        validator(_, value) {
          if (!value || getFieldValue('password') === value) {
            return Promise.resolve();
          }
          return Promise.reject('两次输入的密码不一致!');
        },
      }),
    ]}
  >
    <Input.Password />
  </Form.Item>
</Modal>
```

5. **角色可视化**
```typescript
const roleMap = {
  admin: { text: '管理员', color: 'red' },
  manager: { text: '车间主任', color: 'orange' },
  worker: { text: '员工', color: 'blue' },
  pattern_maker: { text: '打版员', color: 'green' },
};

// 在列表中显示彩色标签
<Tag color={roleMap[role]?.color}>
  {roleMap[role]?.text}
</Tag>

// 编辑自己时显示中文角色名（禁用状态）
{isRoleSelectDisabled ? (
  <Input value={roleMap[editingWorker?.role]?.text} disabled />
) : (
  <Select>...</Select>
)}
```

6. **员工分组功能**
```typescript
// 只有 worker 角色才显示分组字段
{roleValue === 'worker' && (
  <Form.Item name="worker_group" label="员工分组 (可选)">
    <Input placeholder="例如: A组, B组" />
  </Form.Item>
)}
```

### 新版本实现

**当前实现（`CUTRIX-Frontend/src/pages/Users.tsx`）**
- ✅ **基本功能完整：** 创建、编辑、删除、角色分配
- ✅ **密码管理：** 独立的密码设置功能
- ⚠️ **权限控制：** 相对简单，可参考旧版本增强

**旧版本的优势：**
1. ✅ **更细粒度的权限控制**
2. ✅ **更好的自我保护机制**
3. ✅ **更友好的 UI 反馈**（禁用状态显示中文）
4. ✅ **员工分组功能**

---

## 五、旧版本的其他优秀设计

### 1. **级联删除确认**
```typescript
// 删除订单时检查关联的计划
const handleDelete = async (id: number) => {
  const plan = await fetchPlanByOrderId(id);
  
  if (plan) {
    Modal.confirm({
      title: '确认级联删除',
      content: (
        <div>
          <p style={{ color: '#ff4d4f' }}>
            ⚠️ 此订单有关联的生产计划，删除订单将同时删除相关生产计划
          </p>
          <p>确定要继续删除吗？此操作不可撤销。</p>
        </div>
      ),
      onOk: async () => {
        await deletePlan(plan.plan_id);
        await deleteOrder(id);
      },
    });
  }
};
```

### 2. **Zustand 状态管理**
旧版本使用了更细粒度的状态分割：
```
store/
├─ authStore.ts      - 认证状态
├─ orderStore.ts     - 订单状态
├─ planStore.ts      - 计划状态
├─ taskStore.ts      - 任务状态
└─ workerStore.ts    - 员工状态
```

每个 store 独立管理自己的数据和方法，更符合关注点分离原则。

### 3. **错误处理模式**
```typescript
const handleAction = async (
  action: () => Promise<any>, 
  successMsg: string, 
  errorMsg: string
) => {
  try {
    await action();
    message.success(successMsg);
    // 清理状态
    setIsModalOpen(false);
    form.resetFields();
    fetchData(); // 刷新数据
  } catch (err) {
    message.error((err as Error).message || errorMsg);
  }
};

// 使用
handleAction(
  () => createWorker(values),
  '员工创建成功',
  '创建失败'
);
```

---

## 总结与建议

### 旧版本的核心优势

| 功能模块 | 优势 | 重要性 |
|---------|------|--------|
| 订单录入 | 矩阵式批量录入，效率极高 | ⭐⭐⭐⭐⭐ |
| 计划创建 | 实时需求对比，智能提示 | ⭐⭐⭐⭐⭐ |
| 工人工作台 | 专属简洁界面，任务聚焦 | ⭐⭐⭐⭐⭐ |
| 员工管理 | 细粒度权限控制，安全性高 | ⭐⭐⭐⭐ |
| 状态管理 | 模块化清晰，易维护 | ⭐⭐⭐⭐ |

### 新版本需要改进的地方

#### 🔴 高优先级（严重影响用户体验）

1. **订单录入优化**
   - 实现矩阵式批量录入界面
   - 支持常规尺码快速填写
   - 保留特殊尺码补充功能

2. **计划创建增强**
   - 实现双表格对比视图
   - 添加实时计算和颜色标记
   - 实现排版方案设计器

3. **Worker 专属界面**
   - 实现工人专属的 Dashboard
   - 添加任务分组和进度可视化
   - 简化操作流程，适合车间环境

#### 🟡 中优先级（提升易用性）

4. **员工管理增强**
   - 参考旧版本的权限控制逻辑
   - 添加更多的自我保护机制
   - 优化禁用状态的显示（显示中文）

5. **级联删除确认**
   - 检查关联数据
   - 友好的确认提示
   - 防止误删重要数据

#### 🟢 低优先级（代码质量）

6. **状态管理重构**
   - 考虑拆分 authStore 为多个 store
   - 每个模块独立管理状态
   - 提高代码可维护性

7. **错误处理统一**
   - 提取通用的错误处理函数
   - 统一的成功/失败提示
   - 自动刷新数据

---

## 实施建议

### Phase 1: 核心功能增强（2-3 天）
1. 实现矩阵式订单录入
2. 实现计划创建的实时对比功能
3. 创建 Worker 专属 Dashboard

### Phase 2: 权限与安全（1-2 天）
4. 增强员工管理的权限控制
5. 实现级联删除确认

### Phase 3: 代码优化（1-2 天）
6. 重构状态管理
7. 统一错误处理模式

---

**分析完成时间：** 2025-12-03  
**分析人员：** AI Assistant  
**建议优先级：** 高优先级功能应尽快实施

