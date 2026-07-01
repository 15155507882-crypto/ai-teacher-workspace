import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { contentService, commentService } from '../../../services/content';
import { AppPage, AppNavBar, LoadingSkeleton, EmptyState, TypeTag, StatusTag, ActionSheet } from '../../../components/base';
import { ContentDetail as ContentDetailType, CommentItem } from '../../../types/api';
import './detail.scss';

export default function ContentDetailPage() {
  const [detail, setDetail] = useState<ContentDetailType | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useLoad((options) => {
    if (options?.id) {
      loadDetail(Number(options.id));
    }
  });

  const loadDetail = async (id: number) => {
    setLoading(true);
    try {
      const data = await contentService.getDetail(id);
      setDetail(data);

      // 加载评论
      if (data.content_type === 'group_lesson') {
        const res = await commentService.getGroupComments(id).catch(() => ({ items: [] }));
        setComments(res.items);
      } else if (data.content_type === 'personal_lesson') {
        const res = await commentService.getPersonalComments(id).catch(() => ({ items: [] }));
        setComments(res.items);
      }
    } catch (err: any) {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!detail) return;
    Taro.showModal({
      title: '确认删除',
      content: '删除后不可恢复，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await contentService.delete(detail.id);
            Taro.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 1500);
          } catch (err: any) {
            Taro.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !detail || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      if (detail.content_type === 'group_lesson') {
        await commentService.addGroupComment(detail.id, { comment_text: commentText.trim() });
      } else {
        await commentService.addPersonalComment(detail.id, { comment_text: commentText.trim() });
      }
      Taro.showToast({ title: '评论成功', icon: 'success' });
      setCommentText('');
      // 重新加载评论
      loadDetail(detail.id);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '评论失败', icon: 'none' });
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppPage>
        <AppNavBar title="内容详情" showBack onBack={() => Taro.navigateBack()} />
        <LoadingSkeleton lines={6} type="card" />
      </AppPage>
    );
  }

  if (!detail) {
    return (
      <AppPage>
        <AppNavBar title="内容详情" showBack onBack={() => Taro.navigateBack()} />
        <EmptyState text="内容不存在" />
      </AppPage>
    );
  }

  // 提取子表信息
  const subData = detail.personal_lesson || detail.group_lesson || detail.plan_summary || detail.reflection;
  const isReflection = detail.content_type === 'reflection';

  return (
    <AppPage>
      <AppNavBar title="内容详情" showBack onBack={() => Taro.navigateBack()} />

      <ScrollView scrollY className="detail-scroll">
        {/* 标题区 */}
        <View className="detail-header">
          <View className="detail-header__tags">
            <TypeTag type={detail.content_type} />
            <StatusTag status={detail.status} />
          </View>
          <Text className="detail-header__title">{detail.title}</Text>
          <View className="detail-header__meta">
            <Text className="detail-header__meta-item">学年：{detail.academic_year}</Text>
            <Text className="detail-header__meta-item">学期：{detail.semester}</Text>
            <Text className="detail-header__meta-item">创建：{detail.created_at.slice(0, 10)}</Text>
          </View>
        </View>

        {/* Tab 切换 */}
        <View className="detail-tabs">
          <View
            className={`detail-tab ${activeTab === 'info' ? 'detail-tab--active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Text>基本信息</Text>
          </View>
          <View
            className={`detail-tab ${activeTab === 'comments' ? 'detail-tab--active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            <Text>评论 ({comments.length})</Text>
          </View>
        </View>

        {activeTab === 'info' ? (
          <View className="detail-body">
            {/* 基本信息 */}
            {subData && (
              <View className="detail-section">
                <Text className="detail-section__title">基本信息</Text>
                {subData.subject && (
                  <View className="detail-row">
                    <Text className="detail-row__label">学科</Text>
                    <Text className="detail-row__value">{subData.subject}</Text>
                  </View>
                )}
                {subData.grade && (
                  <View className="detail-row">
                    <Text className="detail-row__label">年级</Text>
                    <Text className="detail-row__value">{subData.grade}</Text>
                  </View>
                )}
                {subData.lesson_date && (
                  <View className="detail-row">
                    <Text className="detail-row__label">日期</Text>
                    <Text className="detail-row__value">{subData.lesson_date}</Text>
                  </View>
                )}
                {isReflection && subData.lesson_content_id && (
                  <View className="detail-row">
                    <Text className="detail-row__label">关联备课</Text>
                    <Text className="detail-row__value detail-row__value--link"
                      onClick={() => Taro.redirectTo({ url: `/pages/content/detail/index?id=${subData.lesson_content_id}` })}
                    >
                      查看 →
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 摘要 */}
            {detail.summary && (
              <View className="detail-section">
                <Text className="detail-section__title">AI 摘要</Text>
                <Text className="detail-section__text">{detail.summary}</Text>
              </View>
            )}

            {/* 正文 */}
            {subData?.body_text && (
              <View className="detail-section">
                <Text className="detail-section__title">正文内容</Text>
                <Text className="detail-section__text">{subData.body_text}</Text>
              </View>
            )}

            {/* 反思正文 */}
            {isReflection && subData?.reflection_text && (
              <View className="detail-section">
                <Text className="detail-section__title">反思内容</Text>
                <Text className="detail-section__text">{subData.reflection_text}</Text>
              </View>
            )}

            {/* 附件 */}
            {detail.attachments && detail.attachments.length > 0 && (
              <View className="detail-section">
                <Text className="detail-section__title">附件</Text>
                {detail.attachments.map(att => (
                  <View key={att.id} className="detail-attachment"
                    onClick={() => {
                      const fid = att.file_id;
                      if (att.file?.preview_status === 'SUCCESS' || att.file?.mime_type?.startsWith('image/')) {
                        Taro.showToast({ title: '预览功能请使用完整版', icon: 'none' });
                      } else {
                        // 触发下载
                        Taro.downloadFile({
                          url: `http://localhost:3000/api/files/${fid}/download`,
                          header: { Authorization: `Bearer ${Taro.getStorageSync('accessToken')}` },
                          success: (res) => {
                            if (res.statusCode === 200) {
                              Taro.openDocument({
                                filePath: res.tempFilePath,
                                showMenu: true,
                              }).catch(() => {
                                Taro.showToast({ title: '请使用完整版查看', icon: 'none' });
                              });
                            }
                          },
                          fail: () => Taro.showToast({ title: '下载失败', icon: 'none' }),
                        });
                      }
                    }}
                  >
                    <Text className="detail-attachment__icon">附</Text>
                    <View className="detail-attachment__info">
                      <Text className="detail-attachment__name">{att.file?.original_name || '未知文件'}</Text>
                      <Text className="detail-attachment__size">
                        {att.file?.preview_status === 'SUCCESS' ? '可预览' : '点击下载'}
                      </Text>
                    </View>
                    <Text className="detail-attachment__arrow">↓</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className="detail-body">
            {comments.length === 0 ? (
              <EmptyState text="暂无评论" />
            ) : (
              comments.map(c => (
                <View key={c.id} className="detail-comment">
                  <View className="detail-comment__header">
                    <Text className="detail-comment__author">{c.teacher_name}</Text>
                    <Text className="detail-comment__time">{c.created_at.slice(0, 10)}</Text>
                  </View>
                  {c.comment_text && (
                    <Text className="detail-comment__text">{c.comment_text}</Text>
                  )}
                  {c.file_name && (
                    <Text className="detail-comment__file">附件 {c.file_name}</Text>
                  )}
                </View>
              ))
            )}
            {/* 评论输入区 */}
            <View className="detail-comment-input">
              <Input
                className="detail-comment-input__field"
                value={commentText}
                onInput={e => setCommentText(e.detail.value)}
                placeholder="写下你的评论..."
                adjustPosition
              />
              <View
                className={`detail-comment-input__send ${!commentText.trim() || commentSubmitting ? 'detail-comment-input__send--disabled' : ''}`}
                onClick={handleSubmitComment}
              >
                <Text>{commentSubmitting ? '...' : '发送'}</Text>
              </View>
            </View>
            <View style={{ height: '40px' }} />
          </View>
        )}

        <View style={{ height: '100px' }} />
      </ScrollView>

      {/* 底部操作栏 */}
      <View className="detail-actions">
        <View className="detail-action" onClick={() => Taro.showToast({ title: 'AI 优化功能开发中', icon: 'none' })}>
          <Text className="detail-action__icon">AI</Text>
          <Text className="detail-action__label">AI优化</Text>
        </View>
        <View className="detail-action" onClick={() => Taro.showToast({ title: '编辑功能开发中', icon: 'none' })}>
          <Text className="detail-action__icon">编</Text>
          <Text className="detail-action__label">编辑</Text>
        </View>
        <View className="detail-action" onClick={() => Taro.showToast({ title: '导出功能开发中', icon: 'none' })}>
          <Text className="detail-action__icon">导</Text>
          <Text className="detail-action__label">导出Word</Text>
        </View>
        <View className="detail-action" onClick={() => setShowActions(true)}>
          <Text className="detail-action__icon">⋯</Text>
          <Text className="detail-action__label">更多</Text>
        </View>
      </View>

      {/* 更多操作弹窗 */}
      <ActionSheet
        visible={showActions}
        items={[
          { label: '删除', action: () => { setShowActions(false); handleDelete(); } },
        ]}
        onClose={() => setShowActions(false)}
      />
    </AppPage>
  );
}
