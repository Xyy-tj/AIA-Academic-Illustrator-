# prompts_config.py

# ==========================================
# STEP 1: THE ARCHITECT (DO NOT MODIFY)
# ==========================================
ARCHITECT_PROMPT_TEMPLATE = """
# Role
你是一位 CVPR/NeurIPS 顶刊的**视觉架构师**。你的核心能力是将抽象的论文逻辑转化为**具体的、结构化的、几何级的视觉指令**。

# Objective
阅读我提供的论文内容，输出一份 [VISUAL SCHEMA]。这份 Schema 将被直接发送给 AI 绘图模型，因此必须使用**强硬的物理描述**。

# Output Language
请将所有输出中的文本标签（尤其是 "Key Text Labels"）严格使用{language_name_cn}，不得混用中英文，不得翻译为其他语言。

# Phase 1: Layout Strategy Selector (关键步骤：布局决策)
在生成 Schema 之前，请先分析论文逻辑，从以下**布局原型**中选择最合适的一个（或组合）：
1. Linear Pipeline: 左→右流向 (适合 Data Processing, Encoding-Decoding)。
2. Cyclic/Iterative: 中心包含循环箭头 (适合 Optimization, RL, Feedback Loops)。
3. Hierarchical Stack: 上→下或下→上堆叠 (适合 Multiscale features, Tree structures)。
4. Parallel/Dual-Stream: 上下平行的双流结构 (适合 Multi-modal fusion, Contrastive Learning)。
5. Central Hub: 一个核心模块连接四周组件 (适合 Agent-Environment, Knowledge Graphs)。

# Phase 2: Schema Generation Rules
1. Dynamic Zoning: 根据选择的布局，定义 2-5 个物理区域 (Zones)。不要局限于 3 个。
2. Internal Visualization: 必须定义每个区域内部的"物体" (Icons, Grids, Trees)，禁止使用抽象概念。
3. Explicit Connections: 如果是循环过程，必须明确描述 "Curved arrow looping back from Zone X to Zone Y"。

# Output Format (The Golden Schema)
请严格遵守以下 Markdown 结构输出：

---BEGIN PROMPT---

[Style & Meta-Instructions]
High-fidelity scientific schematic, technical vector illustration, clean white background, distinct boundaries, academic textbook style. High resolution 4k, strictly 2D flat design with subtle isometric elements.

[LAYOUT CONFIGURATION]
* **Selected Layout**: [例如：Cyclic Iterative Process with 3 Nodes]
* **Composition Logic**: [例如：A central triangular feedback loop surrounded by input/output panels]
* **Color Palette**: Professional Pastel (Azure Blue, Slate Grey, Coral Orange, Mint Green).

[ZONE 1: LOCATION - LABEL]
* **Container**: [形状描述, e.g., Top-Left Panel]
* **Visual Structure**: [具体描述, e.g., A stack of documents]
* **Key Text Labels**: "[Text 1]"

[ZONE 2: LOCATION - LABEL]
* **Container**: [形状描述, e.g., Central Circular Engine]
* **Visual Structure**: [具体描述, e.g., A clockwise loop connecting 3 internal modules: A (Gear), B (Graph), C (Filter)]
* **Key Text Labels**: "[Text 2]", "[Text 3]"

[ZONE 3: LOCATION - LABEL]
... (Add Zone 4/5 if necessary based on layout)

[CONNECTIONS]
1. [描述连接线, e.g., A curved dotted arrow looping from Zone 2 back to Zone 1 labeled "Feedback"]
2. [描述连接线, e.g., A wide flow arrow from Zone 2 to Zone 3]

---END PROMPT---

# Input Data
{paper_content}
"""

# ==========================================
# STEP 2: THE RENDERER (DO NOT MODIFY)
# ==========================================
RENDERER_PROMPT_TEMPLATE = """
**Style Reference & Execution Instructions:**

1. **Art Style (Visio/Illustrator Aesthetic):**
   Generate a **professional academic architecture diagram** suitable for a top-tier computer science paper (CVPR/NeurIPS).
   * **Visuals:** Flat vector graphics, distinct geometric shapes, clean thin outlines, and soft pastel fills (Azure Blue, Slate Grey, Coral Orange).
   * **Layout:** Strictly follow the spatial arrangement defined below.
   * **Vibe:** Technical, precise, clean white background. NOT hand-drawn, NOT photorealistic, NOT 3D render, NO shadows/shading.

2. **CRITICAL TEXT CONSTRAINTS (Read Carefully):**
   * **DO NOT render meta-labels:** Do not write words like "ZONE 1", "LAYOUT CONFIGURATION", "Input", "Output", or "Container" inside the image. These are structural instructions for YOU, not text for the image.
   * **ONLY render "Key Text Labels":** Only text inside double quotes (e.g., "[Text]") listed under "Key Text Labels" should appear in the diagram.
   * **Font:** Use a clean, bold Sans-Serif font (like Roboto or Helvetica) for all labels.

2. **Label Language Policy:**
   All text labels rendered in the diagram must be strictly in {language_name_en}. Do not translate or mix languages. Use exactly the labels provided in the schema.

3. **Visual Schema Execution:**
   Translate the following structural blueprint into the final image:

{visual_schema_content}
"""

# ==========================================
# STEP 2 EXTENDED: WITH REFERENCE IMAGES
# ==========================================
RENDERER_WITH_REFERENCES_TEMPLATE = """
**Style Reference & Execution Instructions:**

1. **Art Style (Reference-Guided):**
   I have provided reference images of academic diagrams that I like. Please study their:
   - Color palette and color harmony
   - Layout structure and spacing
   - Line weight and connector styles
   
   Generate a new diagram that **mimics the style** of these references but follows the **structure** defined in the schema below.

2. **CRITICAL TEXT CONSTRAINTS (Read Carefully):**
   * **DO NOT render meta-labels:** Do not write words like "ZONE 1", "LAYOUT CONFIGURATION", "Input", "Output", or "Container" inside the image. These are structural instructions for YOU, not text for the image.
   * **ONLY render "Key Text Labels":** Only text inside double quotes (e.g., "[Text]") listed under "Key Text Labels" should appear in the diagram.
   * **Font:** Use a clean, bold Sans-Serif font (like Roboto or Helvetica) for all labels.

2. **Label Language Policy:**
   All text labels rendered in the diagram must be strictly in {language_name_en}. Do not translate or mix languages. Use exactly the labels provided in the schema.

3. **Visual Schema Execution:**
   Translate the following structural blueprint into the final image:

{visual_schema_content}
"""

# ==========================================
# TRANSLATION PROMPT
# ==========================================
TRANSLATION_PROMPT_TEMPLATE = """
将这张图片中的**所有文字部分**进行翻译，确保图片本身完全不变，仅调整文字显示，不要遗漏。
Translate the text content visible in the provided image from {source_language} to {target_language}.
"""

# ==========================================
# EXTRACTION PROMPT
# ==========================================
EXTRACTION_PROMPT_TEMPLATE = """
# Role
你是专业的“UI资产拆解与重绘专家”，擅长将复杂的系统架构图转化为高质量的“游戏资产精灵图（Sprite Sheet）”或“克诺林（Knolling）”风格的素材包。

# Task
我会提供一张系统架构图。请你识别图中的所有视觉主体，将其**拆解**、**重绘**并**平铺**在一张白底图片上。

# Workflow Steps & Constraints
1. **组件拆解 (Deconstruction & Exploded View)**：
   - 识别图中所有的独立元素模块，颗粒度适中，不超过10个。
   - **关键要求**：对于“列表型组合容器”，将其拆散为原本的组成单体。不要保留列表组合状态，通过“爆炸视图”的逻辑将它们作为独立零件列出。
   
2. **视觉风格 (Visual Style)**：
   - **Knolling Layout**：采用克诺林摄影风格，所有元素按网格整齐排列，互不重叠，间距均匀。
   - **Isometric View**：保持原本的等轴测（2.5D）视角，确保所有图标的透视一致。
   - **Sprite Sheet Quality**：每个元素都应清晰、完整，边缘锐利，适合作为独立的 UI 素材使用。保持与原图一致的配色和图示风格（如玻璃质感、科技蓝/绿配色）。

3. **内容过滤 (Content Filtering)**：
   - **保留**：容器、图标、容器内的核心图示（如齿轮、网络拓扑、文档图标）。
   - **合并**：如果文字是图标的一部分，请保留。
   - **去除**：去除单纯的连接线（复杂的流程箭头除外）、单纯的背景装饰。

4. **排版与标注 (Layout & Labeling)**：
   - 背景：纯白背景 (#FFFFFF)。
   - 排序：遵循“从原本的图片位置关系”或“视觉相似性”进行聚类排列。
   - 编号：在每个独立元素下方标注 E01, E02... 等编号。

# Output Format
请直接输出生成的图片，无需解释过程。
"""

# ==========================================
# PPT GENERATION PROMPT
# ==========================================
PPT_GENERATION_PROMPT_TEMPLATE = """
生成一张powerpoint讲解展示图。
整体要求
采用简约美学风格，纯白背景呈现高科技与学术感并存的氛围，运用精致的数据可视化手法。
除特有名词，演示文本均使用中文。
画面内容仅作为表达逻辑，你可以作为参考并且需进一步完善细节，使画面呈现高密度、紧凑的信息表达

项目整体目标
引发观众共鸣，展示低价值工作占用大量时间的现象。


画面内容
{user_description}


页面比例：16:9，主要元素应该限制在画面中心16：8的范围
信息密度：每页上屏不超过 6 行要点；更多内容放讲稿或备注
组件习惯：
左侧：逻辑/要点；右侧：图示/对比/示例
多层次组件建议使用“卡片”容器：标题 + 内容 + 小标签（收益/注意）
{style_prompt}
呈现风格：高信息密度、克制、干净；少装饰，多结构；偏学术化、工程化表达
"""
