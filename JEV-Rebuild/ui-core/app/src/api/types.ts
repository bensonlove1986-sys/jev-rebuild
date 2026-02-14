// src/api/types.ts

// 只能是 /api/... 形式
export type ApiPath = `/api/${string}`;

// 编译期防止传 URL
export type ForbiddenUrl =
  | `http://${string}`
  | `https://${string}`
  | `${string}.ts`
  | `${string}.js`;