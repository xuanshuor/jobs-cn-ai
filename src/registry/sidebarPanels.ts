import type { ReactNode } from "react";

/** 侧栏可插拔区块：新增分析卡片时在此注册 */
export interface SidebarPanel {
  id: string;
  title: string;
  render: () => ReactNode;
}
