export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/home/index',
    'pages/workspace/index',
    'pages/space/index',
    'pages/space/personal-lessons/index',
    'pages/space/group-lessons/index',
    'pages/space/plans/index',
    'pages/space/reflections/index',
    'pages/content/detail/index',
    'pages/teacher/detail/index',
    'pages/mine/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'AI 教学辅助系统',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F3F7FF',
  },
  tabBar: {
    color: '#8A97AD',
    selectedColor: '#4F7DFF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: '首页', iconPath: 'assets/tabbar/home.png', selectedIconPath: 'assets/tabbar/home-active.png' },
      { pagePath: 'pages/workspace/index', text: 'AI工作台', iconPath: 'assets/tabbar/ai.png', selectedIconPath: 'assets/tabbar/ai-active.png' },
      { pagePath: 'pages/space/index', text: '备课', iconPath: 'assets/tabbar/space.png', selectedIconPath: 'assets/tabbar/space-active.png' },
      { pagePath: 'pages/mine/index', text: '我的', iconPath: 'assets/tabbar/mine.png', selectedIconPath: 'assets/tabbar/mine-active.png' },
    ],
  },
});
