# 宜搭开发助手数据文件

本目录包含宜搭开发助手所需的数据文件，包括常用代码片段和组件配置信息。

## 文件说明

- `commonCodeData.json` - 常用代码片段数据
- `componentsData.json` - 组件配置数据
- `codeTemplate.txt` - 添加新代码片段的模板
- `codeHelper.js` - 辅助工具，帮助转换代码为JSON格式

## 如何添加新的代码片段

### 方法一：使用辅助工具（推荐）

1. 打开浏览器控制台
2. 复制并粘贴 `codeHelper.js` 的内容到控制台
3. 使用以下命令创建新的代码片段：

```javascript
// 示例
const newItem = createCodeItem(
  '标题', 
  `function example() {
    console.log("Hello World");
  }`, 
  '描述'
);
```

4. 复制输出的JSON对象
5. 将其添加到 `commonCodeData.json` 文件的数组中

### 方法二：手动编辑

1. 打开 `codeTemplate.txt` 模板文件
2. 按照模板说明编写代码和其他信息
3. 将完成的JSON对象添加到 `commonCodeData.json` 文件的数组中

## 注意事项

- JSON格式要求严格，请确保格式正确
- 在添加新条目后，确保JSON中的逗号使用正确
- 代码中的双引号需要转义为 `\"`
- 换行符需要转义为 `\n`

## JSON数据结构说明

### commonCodeData.json

```javascript
[
  {
    "title": "代码片段标题",
    "description": "代码功能简述",
    "code": "代码内容（转义后的字符串）"
  },
  // 更多代码片段...
]
```

### componentsData.json

```javascript
{
  "form": [
    {
      "name": "组件名称",
      "description": "组件描述",
      "type": "组件类型",
      "schema": "组件Schema配置（JSON字符串）"
    },
    // 更多表单组件...
  ],
  "advanced": [
    // 高级组件配置...
  ]
}
``` 