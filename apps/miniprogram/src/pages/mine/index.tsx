import { useState, useEffect } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { authService } from '../../services/auth';
import { contentService } from '../../services/content';
import { AppPage } from '../../components/base';
import type { TeacherBrief, ContentStatsData } from '../../types/api';
import './mine.scss';

export default function MinePage() {
  const [teacher, setTeacher] = useState<TeacherBrief | null>(null);
  const [stats, setStats] = useState<ContentStatsData | null>(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const loadData = () => {
    try {
      const data = Taro.getStorageSync('teacher');
      if (data) {
        const t = JSON.parse(data) as TeacherBrief;
        setTeacher(t);
        contentService.getStatsByTeacher(t.id).then(setStats).catch(() => {});
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { loadData(); }, []);
  useDidShow(() => { loadData(); });

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) authService.logout();
      },
    });
  };

  const handleChangePwd = async () => {
    if (!oldPwd) { setPwdError('请输入当前密码'); return; }
    if (newPwd.length < 8) { setPwdError('新密码至少8位，需包含大小写/数字/特殊字符至少两种'); return; }
    setPwdError('');
    setPwdSaving(true);
    try {
      await authService.changePassword({ currentPassword: oldPwd, newPassword: newPwd });
      Taro.showToast({ title: '密码修改成功，请重新登录', icon: 'success' });
      setTimeout(() => authService.logout(), 1500);
    } catch (err: any) {
      setPwdError(err.message || '修改失败');
    } finally {
      setPwdSaving(false);
    }
  };

  const goToMyContent = () => Taro.navigateTo({ url: '/pages/space/personal-lessons/index' });
  const goToReflections = () => Taro.navigateTo({ url: '/pages/space/reflections/index' });
  const goToPlans = () => Taro.navigateTo({ url: '/pages/space/plans/index' });
  const goToGroups = () => Taro.navigateTo({ url: '/pages/space/group-lessons/index' });
  const goToAdminEntry = () => Taro.showToast({ title: '管理后台请使用 Web 端访问', icon: 'none' });
  const clearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '将清除本地数据（不影响服务器数据）',
      success: (res) => {
        if (res.confirm) {
          Taro.clearStorageSync();
          Taro.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  };

  return (
    <AppPage>
      <View className="mine-setting"><Text>设</Text></View>
      <View className="mine-header">
        <View className="mine-avatar">
          <Text className="mine-avatar__text">{teacher?.name?.charAt(0) || '师'}</Text>
        </View>
        <View className="mine-info">
          <Text className="mine-name">{teacher?.name || '教师'}</Text>
          <Text className="mine-mobile">{teacher?.mobile || '八年级语文教师'}</Text>
          {teacher?.role === 'admin' && (
            <View className="mine-role-tag"><Text>管理员</Text></View>
          )}
        </View>
      </View>

      {/* 统计卡片 */}
      {stats && (
        <View className="mine-stats">
          <Text className="mine-stats__title">AI 能力统计</Text>
          <View className="mine-stat">
            <Text className="mine-stat__num">{stats.personal_lesson}</Text>
            <Text className="mine-stat__label">个人备课</Text>
          </View>
          <View className="mine-stat">
            <Text className="mine-stat__num">{stats.group_lesson}</Text>
            <Text className="mine-stat__label">集体备课</Text>
          </View>
          <View className="mine-stat">
            <Text className="mine-stat__num">{stats.plan_summary}</Text>
            <Text className="mine-stat__label">计划总结</Text>
          </View>
          <View className="mine-stat">
            <Text className="mine-stat__num">{stats.reflection}</Text>
            <Text className="mine-stat__label">教学反思</Text>
          </View>
        </View>
      )}

      {/* 功能列表 */}
      <View className="mine-menu">
        <View className="mine-menu-item" onClick={goToMyContent}>
          <Text className="mine-menu-item__icon">备</Text>
          <Text className="mine-menu-item__label">我的备课</Text>
          <Text className="mine-menu-item__arrow">→</Text>
        </View>

        <View className="mine-menu-item" onClick={goToReflections}>
          <Text className="mine-menu-item__icon">思</Text>
          <Text className="mine-menu-item__label">我的反思</Text>
          <Text className="mine-menu-item__arrow">→</Text>
        </View>

        <View className="mine-menu-item" onClick={goToPlans}>
          <Text className="mine-menu-item__icon">划</Text>
          <Text className="mine-menu-item__label">我的计划总结</Text>
          <Text className="mine-menu-item__arrow">→</Text>
        </View>

        <View className="mine-menu-item" onClick={goToGroups}>
          <Text className="mine-menu-item__icon">组</Text>
          <Text className="mine-menu-item__label">我的集体备课</Text>
          <Text className="mine-menu-item__arrow">→</Text>
        </View>

        <View className="mine-menu-item" onClick={() => setShowPwdModal(true)}>
          <Text className="mine-menu-item__icon">密</Text>
          <Text className="mine-menu-item__label">修改密码</Text>
          <Text className="mine-menu-item__arrow">→</Text>
        </View>

        {teacher?.role === 'admin' && (
          <View className="mine-menu-item" onClick={goToAdminEntry}>
            <Text className="mine-menu-item__icon">管</Text>
            <View className="mine-menu-item__content">
              <Text className="mine-menu-item__label">管理后台</Text>
              <Text className="mine-menu-item__desc">请使用 Web 端访问完整后台</Text>
            </View>
            <Text className="mine-menu-item__arrow">→</Text>
          </View>
        )}

        <View className="mine-menu-item" onClick={clearCache}>
          <Text className="mine-menu-item__icon">清</Text>
          <Text className="mine-menu-item__label">清除缓存</Text>
          <Text className="mine-menu-item__arrow">→</Text>
        </View>
      </View>

      {/* 退出登录 */}
      <View className="mine-logout" onClick={handleLogout}>
        <Text>退出登录</Text>
      </View>

      <View className="mine-version"><Text>AI 教学辅助系统 V1.0.0</Text></View>

      {/* 修改密码弹窗 */}
      {showPwdModal && (
        <View className="mine-modal-mask" onClick={() => setShowPwdModal(false)}>
          <View className="mine-modal" onClick={e => e.stopPropagation()}>
            <Text className="mine-modal__title">修改密码</Text>
            <Input
              className="mine-modal__input"
              type="text"
              password
              value={oldPwd}
              onInput={e => setOldPwd(e.detail.value)}
              placeholder="当前密码"
            />
            <Input
              className="mine-modal__input"
              type="text"
              password
              value={newPwd}
              onInput={e => setNewPwd(e.detail.value)}
              placeholder="新密码（8-32位）"
            />
            {pwdError && (
              <View className="mine-modal__error"><Text>{pwdError}</Text></View>
            )}
            <View className={`mine-modal__btn ${pwdSaving ? 'mine-modal__btn--disabled' : ''}`} onClick={handleChangePwd}>
              <Text>{pwdSaving ? '保存中...' : '确认修改'}</Text>
            </View>
            <View className="mine-modal__cancel" onClick={() => setShowPwdModal(false)}>
              <Text>取消</Text>
            </View>
          </View>
        </View>
      )}
    </AppPage>
  );
}
