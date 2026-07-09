export enum Permission {
  DatabaseRead = 'database:read',
  DatabaseWrite = 'database:write',
  ShellExec = 'shell:exec',
  NetworkFetch = 'network:fetch',
  Notification = 'notification',
  Clipboard = 'clipboard',
  Dialog = 'dialog',
  Shortcut = 'shortcut'
}

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission)

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.DatabaseRead]: '读取数据库（插件配置以外）',
  [Permission.DatabaseWrite]: '写入数据库',
  [Permission.ShellExec]: '执行系统命令',
  [Permission.NetworkFetch]: '发起网络请求',
  [Permission.Notification]: '发送系统通知',
  [Permission.Clipboard]: '读写剪贴板',
  [Permission.Dialog]: '打开系统对话框',
  [Permission.Shortcut]: '注册全局快捷键'
}
