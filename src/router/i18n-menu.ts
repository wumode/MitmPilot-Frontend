import { useI18n } from 'vue-i18n'
import { useGlobalSettingsStore } from '@/stores'

// 构建路由菜单，每次调用时使用当前的语言环境
export function getNavMenus() {
  const { t } = useI18n()
  const globalSettingsStore = useGlobalSettingsStore()

  // 检查是否为高级模式
  const isAdvancedMode = globalSettingsStore.get('ADVANCED_MODE') !== false

  return [
    {
      title: t('navItems.dashboard'),
      icon: 'mdi-home-outline',
      to: '/dashboard',
      header: t('menu.start'),
      admin: false,
      footer: true,
      permission: 'manage',
    },
    {
      title: t('navItems.pluginManager'),
      icon: 'mdi-apps',
      to: '/plugins',
      header: t('menu.system'),
      admin: true,
      permission: 'manage',
    },
    {
      title: t('navItems.userManager'),
      icon: 'mdi-account-group-outline',
      to: '/user',
      header: t('menu.system'),
      admin: true,
      permission: 'admin',
    },
    ...(isAdvancedMode
      ? [
          {
            title: t('navItems.settings'),
            icon: 'mdi-cog-outline',
            to: '/setting',
            header: t('menu.system'),
            admin: true,
            permission: 'admin',
          },
        ]
      : []),
  ]
}

// 获取设置标签页
export function getSettingTabs() {
  const { t } = useI18n()

  return [
    {
      title: t('settingTabs.system.title'),
      icon: 'mdi-server-network',
      tab: 'system',
      description: t('settingTabs.system.description'),
    },
    {
      title: t('settingTabs.scheduler.title'),
      icon: 'mdi-list-box',
      tab: 'scheduler',
      description: t('settingTabs.scheduler.description'),
    },
    {
      title: t('settingTabs.notification.title'),
      icon: 'mdi-bell',
      tab: 'notification',
      description: t('settingTabs.notification.description'),
    },
  ]
}



// 获取插件标签页
export function getPluginTabs() {
  const { t } = useI18n()

  return [
    {
      title: t('pluginTabs.installed'),
      tab: 'installed',
      icon: 'mdi-apps',
    },
    {
      title: t('pluginTabs.market'),
      tab: 'market',
      icon: 'mdi-shopping',
    },
  ]
}

