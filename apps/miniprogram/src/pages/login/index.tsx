import { useState, useEffect } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { authService } from '../../services/auth';
import { teacherService } from '../../services/teacher';
import { AppPage } from '../../components/base';
import type { SchoolInfo } from '../../types/api';
import './login.scss';

export default function LoginPage() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImg, setCaptchaImg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [school, setSchool] = useState<SchoolInfo | null>(null);

  const [mustChangePwd, setMustChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  const formValid = mobile.length === 11 && password.length >= 6 && captchaCode.length > 0;
  const schoolDisplayName = school ? `${school.short_name || school.name}备课系统` : '备课系统';

  useEffect(() => {
    if (authService.isLoggedIn()) { Taro.switchTab({ url: '/pages/home/index' }); return; }
    loadCaptcha();
    teacherService.getSchoolInfo().then(s => { if (s) setSchool(s); }).catch(() => {});
  }, []);

  const loadCaptcha = async () => {
    setCaptchaError(false); setCaptchaLoading(true);
    try { const d = await authService.getCaptcha(); setCaptchaId(d.captchaId); setCaptchaImg(d.imageBase64); }
    catch { setCaptchaError(true); }
    finally { setCaptchaLoading(false); }
  };

  const handleLogin = async () => {
    if (!formValid) return;
    setError(''); setLoading(true);
    try {
      const res = await authService.login({ mobile, password, captchaId, captchaCode });
      if (res.mustChangePassword) { setMustChangePwd(true); }
      else { Taro.switchTab({ url: '/pages/home/index' }); }
    } catch (err: any) { setError(err.message || '登录失败'); loadCaptcha(); }
    finally { setLoading(false); }
  };

  const handleChangePwd = async () => {
    if (newPwd.length < 8) { setCpError('密码需8-32位，至少包含两类字符（大小写/数字/特殊符号）'); return; }
    if (newPwd !== confirmPwd) { setCpError('两次密码不一致'); return; }
    setCpError(''); setCpLoading(true);
    try {
      await authService.changePassword({ currentPassword: password, newPassword: newPwd });
      await authService.login({ mobile, password: newPwd, captchaId, captchaCode });
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (err: any) { setCpError(err.message || '修改失败'); }
    finally { setCpLoading(false); }
  };

  return (
    <AppPage>
      <View className="login-wrap">

        {/* 品牌区 */}
        <View className="login-top">
          <View className="login-logo">
            <View className="login-logo-book">
              <View className="login-logo-page login-logo-page--left" />
              <View className="login-logo-page login-logo-page--right" />
              <Text className="login-logo-ai">Ai</Text>
              <View className="login-logo-ring" />
            </View>
          </View>
          <Text className="login-name">{schoolDisplayName}</Text>
          <Text className="login-desc">让备课更轻松，教学更高效</Text>
        </View>

        {/* 表单卡片 */}
        <View className="login-card">

          {/* 手机号 */}
          <View className="login-fld">
            <View className="login-fld-icon">
              <View className="login-ico login-ico--phone" />
            </View>
            <Input className="login-inp" type="number" value={mobile}
              placeholder="手机号" placeholderClass="login-inp-ph"
              maxlength={11} onInput={e => { setMobile(e.detail.value); setError(''); }} />
          </View>

          {/* 密码 */}
          <View className="login-fld">
            <View className="login-fld-icon">
              <View className="login-ico login-ico--lock" />
            </View>
            <Input className="login-inp login-inp--pwd" type="text" password={!showPwd}
              value={password} placeholder="密码" placeholderClass="login-inp-ph"
              maxlength={30} onInput={e => { setPassword(e.detail.value); setError(''); }} />
            <View className="login-eye" onClick={() => setShowPwd(!showPwd)}>
              <View className={`login-eye-ico ${showPwd ? 'login-eye-ico--on' : ''}`} />
            </View>
          </View>

          {/* 验证码 */}
          <View className="login-cap-row">
            <View className="login-fld login-fld--cap">
              <View className="login-fld-icon">
                <View className="login-ico login-ico--shield" />
              </View>
              <Input className="login-inp login-inp--cap" type="number" value={captchaCode}
                placeholder="验证码" placeholderClass="login-inp-ph"
                maxlength={4} onInput={e => { setCaptchaCode(e.detail.value); setError(''); }} />
            </View>
            <View className="login-cap-box" onClick={loadCaptcha}>
              {captchaLoading ? <Text className="login-cap-txt">加载中</Text>
               : captchaImg ? <View className="login-cap-img" style={{ backgroundImage: `url(${captchaImg})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
               : <Text className="login-cap-txt">刷新</Text>}
            </View>
          </View>

          {captchaError && <Text className="login-cap-err">验证码加载失败，请点击刷新</Text>}
          {error && <Text className="login-err">{error}</Text>}

          <View className="login-links">
            <Text className="login-link">记住密码</Text>
            <Text className="login-link">忘记密码</Text>
          </View>

          <View className={`login-btn ${!formValid ? 'login-btn--off' : ''} ${loading ? 'login-btn--ing' : ''}`}
            onClick={handleLogin}>
            <Text>{loading ? '登录中...' : '登录'}</Text>
          </View>
        </View>

        <Text className="login-foot">学校智慧教学平台</Text>
      </View>

      {/* 改密弹窗 */}
      {mustChangePwd && (
        <View className="lpwd-mask">
          <View className="lpwd-box">
            <Text className="lpwd-title">修改初始密码</Text>
            <Text className="lpwd-hint">首次登录需修改密码，8-32位，至少包含两类字符</Text>
            <Input className="login-inp lpwd-input" type="text" password value={newPwd} placeholder="新密码" placeholderClass="login-inp-ph" maxlength={32} onInput={e => { setNewPwd(e.detail.value); setCpError(''); }} />
            <Input className="login-inp lpwd-input" type="text" password value={confirmPwd} placeholder="确认密码" placeholderClass="login-inp-ph" maxlength={32} onInput={e => { setConfirmPwd(e.detail.value); setCpError(''); }} />
            {cpError && <Text className="login-err">{cpError}</Text>}
            <View className={`login-btn ${cpLoading ? 'login-btn--ing' : ''}`} onClick={handleChangePwd}>
              <Text>{cpLoading ? '修改中...' : '确认修改'}</Text>
            </View>
          </View>
        </View>
      )}
    </AppPage>
  );
}
