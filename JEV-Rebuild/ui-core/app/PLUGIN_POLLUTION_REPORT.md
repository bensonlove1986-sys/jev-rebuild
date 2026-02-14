# 插件系统污染扫描报告

## 扫描结果概览

| 规则 | 违规文件数量 | 主要违规类型 |
|------|--------------|--------------|
| P1   | 6            | 插件越权 import store / eventBus |
| P2   | 4            | 相对路径穿越 |
| P3   | 0            | 协议文件反向依赖 |
| P4   | 0            | 导出不一致 |
| P5   | 1            | 运行期全局变量 |

## 详细违规信息

### 1. 规则 P1（插件越权 import）

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/plugins/PluginsDock.tsx
- 违规代码：
  ```typescript
  import { useCustomersStore } from '../../../store/customersStore';
  import { useMessagesStore } from '../../../store/messagesStore';
  ```
- 建议：移除直接 import，改为通过 ctx 获取客户和消息数据

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/plugins/SmartReplyPlugin.tsx
- 违规代码：
  ```typescript
  import { useCustomersStore } from '../../../store/customersStore';
  import { useMessagesStore } from '../../../store/messagesStore';
  ```
- 建议：移除直接 import，改为通过 ctx 获取客户和消息数据

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/types/AIPlugin.ts
- 违规代码：
  ```typescript
  import type { EventBus } from '../../../utils/eventBus';
  ```
- 建议：移除对 EventBus 的依赖，改为使用插件内部的事件机制

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/plugins/AutoReplyPlugin/AutoReplyModal.tsx
- 违规代码：
  ```typescript
  import { SmartAssistContext } from '../../context/SmartAssistContext';
  ```
- 建议：移除直接 import，改为通过 props 获取上下文数据

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/plugins/TranslatePlugin/TranslateModal.tsx
- 违规代码：
  ```typescript
  import { SmartAssistContext } from '../../context/SmartAssistContext';
  ```
- 建议：移除直接 import，改为通过 props 获取上下文数据

### 2. 规则 P2（相对路径穿越）

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/plugins/AutoReplyPlugin/AutoReplyModal.tsx
- 违规代码：
  ```typescript
  import DraggableModal from '../../../../components/DraggableModal/DraggableModal';
  import { generateAutoReply } from '../../../../services/autoReply.service';
  import { translateToChinese } from '../../../../services/translate.service';
  ```
- 建议：将公共组件和服务移到插件系统内部，或通过 ctx 注入

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/plugins/TranslatePlugin/TranslateModal.tsx
- 违规代码：
  ```typescript
  import DraggableModal from '../../../../components/DraggableModal/DraggableModal';
  import { translateToChinese } from '../../../../services/translate.service';
  import { detectLanguageAndCountry } from '../../../../services/languageDetection.service';
  ```
- 建议：将公共组件和服务移到插件系统内部，或通过 ctx 注入

### 3. 规则 P5（运行期全局变量）

#### 违规文件：D:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/plugins/AutoReplyPlugin/AutoReplyPluginComponent.tsx
- 违规代码：
  ```typescript
  const { eventBus } = require('../../../../../utils/eventBus');
  ```
- 建议：移除直接 require，改为通过 ctx.eventBus 获取事件总线

## 清理计划

1. **移除插件对 store 的直接依赖**
   - 修改 PluginsDock.tsx，移除 store import
   - 修改 SmartReplyPlugin.tsx，移除 store import
   - 修改 AIPlugin.ts，移除 EventBus 依赖

2. **清理相对路径穿越**
   - 将公共组件和服务移到插件系统内部
   - 或通过 ctx 注入外部服务

3. **移除运行期全局变量**
   - 修改 AutoReplyPluginComponent.tsx，移除直接 require eventBus
   - 改为通过 ctx.eventBus 获取事件总线

4. **重建插件协议基线**
   - 清理 AIPlugin.ts，只保留 interface 定义
   - 清理 PluginEvent.ts，只保留事件类型定义
   - 确保 ChatModule.tsx 成为唯一的 ctx 注入点

## 预期效果

- Vite dev server 不再出现 Failed to resolve import 错误
- Vite dev server 不再出现 Internal server error
- 所有插件可被动态 import
- 插件 mount / unmount 不抛异常
- 插件删除后不影响主聊天模块
- plugins/** 下不存在任何 store / eventBus import
