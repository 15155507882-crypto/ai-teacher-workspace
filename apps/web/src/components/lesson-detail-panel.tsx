'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const typeLabels: Record<string, string> = {
  personal_lesson: '个人备课',
  reflection: '教学反思',
  group_lesson: '集体备课',
  plan_summary: '计划总结',
};
const typeColors: Record<string, 'blue' | 'green' | 'orange' | 'purple'> = {
  personal_lesson: 'blue',
  reflection: 'orange',
  group_lesson: 'green',
  plan_summary: 'purple',
};

interface Props {
  contentId: number;
  token: string;
  teacher: any;
  onClose: () => void;
}

export function LessonDetailPanel({ contentId, token, teacher, onClose }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    loadDetail();
  }, [contentId]);

  const loadDetail = async () => {
    setLoading(true);
    setComments([]);
    try {
      const r = await fetch('/api/contents/' + contentId, {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function (r) {
        return r.json();
      });
      var d = r.data || r;
      setDetail(d);
      if (d.content_type === 'group_lesson') {
        var cr = await fetch('/api/group-lessons/' + contentId + '/comments', {
          headers: { Authorization: 'Bearer ' + token },
        }).then(function (r) {
          return r.json();
        });
        setComments(cr && cr.data ? cr.data.items : cr && cr.items ? cr.items : []);
      } else if (d.content_type === 'personal_lesson') {
        var pcr = await fetch('/api/personal-lessons/' + contentId + '/comments', {
          headers: { Authorization: 'Bearer ' + token },
        }).then(function (r) {
          return r.json();
        });
        setComments(pcr && pcr.data ? pcr.data.items : pcr && pcr.items ? pcr.items : []);
        try {
          var refRes = await fetch(
            '/api/teachers/' +
              (teacher && teacher.id ? teacher.id : 1) +
              '/contents?content_type=reflection&size=50',
            {
              headers: { Authorization: 'Bearer ' + token },
            }
          ).then(function (r) {
            return r.json();
          });
          var reflections =
            (refRes && refRes.data ? refRes.data.items : null) || (refRes && refRes.items) || [];
          var linked = reflections.find(function (ref: any) {
            return ref.linked_content_id === contentId || ref.lesson_content_id === contentId;
          });
          setReflectionText(linked ? linked.summary || linked.reflection_text || '' : '');
        } catch (e) {
          setReflectionText('');
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  var submitComment = async function () {
    if (submittingRef.current) return;
    if ((!commentText.trim() && !commentFile) || !detail) return;
    submittingRef.current = true;
    setCommentSubmitting(true);
    var textToSend = commentText.trim();
    var fileToSend = commentFile;
    setCommentText('');
    setCommentFile(null);
    if (commentFileRef.current) commentFileRef.current.value = '';
    try {
      var fileId;
      if (fileToSend) {
        var form = new FormData();
        form.append('file', fileToSend);
        var up = await fetch('/api/ai/upload', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: form,
        }).then(function (r) {
          return r.json();
        });
        if (up.code === 0) fileId = Number(up.data.file_id);
      }
      var apiPath =
        detail.content_type === 'personal_lesson'
          ? '/api/personal-lessons/' + contentId + '/comments'
          : '/api/group-lessons/' + contentId + '/comments';
      var res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ comment_text: textToSend || null, file_id: fileId }),
      }).then(function (r) {
        return r.json();
      });
      if (res.id) {
        setComments(function (prev) {
          return prev.concat([
            {
              id: res.id,
              created_at: res.created_at,
              teacher_name: teacher ? teacher.name : '我',
              comment_text: textToSend || null,
              file_name: fileToSend ? fileToSend.name : null,
            },
          ]);
        });
      }
    } catch (e) {
    } finally {
      setCommentSubmitting(false);
      submittingRef.current = false;
    }
  };

  var deleteComment = async function (commentId: number, isPersonal: boolean) {
    if (!confirm('确认删除这条留言？')) return;
    var apiPath = isPersonal
      ? '/api/personal-lessons/comments/' + commentId
      : '/api/group-lessons/comments/' + commentId;
    try {
      var r = await fetch(apiPath, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      }).then(function (r) {
        return r.json();
      });
      if (r.message === '删除成功') {
        setComments(function (prev) {
          return prev.filter(function (c) {
            return c.id !== commentId;
          });
        });
      } else {
        alert(r.message || '删除失败');
      }
    } catch (e) {}
  };

  var deleteContent = async function () {
    setDeleting(true);
    try {
      var r = await fetch('/api/contents/' + contentId, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ reason: '教师删除' }),
      }).then(function (r) {
        return r.json();
      });
      if (r.code === 0) onClose();
    } catch (e) {
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return React.createElement(
      'div',
      { className: 'p-6 space-y-3' },
      [1, 2, 3].map(function (i) {
        return React.createElement('div', {
          key: i,
          className: 'h-4 bg-slate-100 rounded animate-pulse',
        });
      })
    );
  }
  if (!detail)
    return React.createElement(
      'div',
      { className: 'p-8 text-center text-sm text-slate-400' },
      '加载失败'
    );

  var isGL = detail.content_type === 'group_lesson';
  var isPL = detail.content_type === 'personal_lesson';

  return React.createElement(
    'div',
    { className: 'flex h-full flex-col text-[#10234f]' },
    // Header bar with delete button
    React.createElement(
      'div',
      {
        className:
          'mb-5 flex shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-[#f7faff] px-4 py-3',
      },
      React.createElement(
        'span',
        { className: 'text-sm font-semibold text-[#6d7fa7]' },
        '资料详情'
      ),
      !showDelete
        ? React.createElement(
            'button',
            {
              onClick: function () {
                setShowDelete(true);
              },
              className:
                'rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50',
            },
            '🗑 删除此资料'
          )
        : React.createElement(
            'div',
            { className: 'flex gap-2 items-center' },
            React.createElement('span', { className: 'text-xs text-red-600' }, '确认删除？'),
            React.createElement(
              Button,
              { variant: 'destructive', size: 'sm', onClick: deleteContent, disabled: deleting },
              '确认'
            ),
            React.createElement(
              Button,
              {
                variant: 'outline',
                size: 'sm',
                onClick: function () {
                  setShowDelete(false);
                },
              },
              '取消'
            )
          )
    ),
    // Content area
    React.createElement(
      'div',
      { className: 'flex-1 overflow-y-auto space-y-5' },
      // Type badge
      React.createElement(
        'div',
        { className: 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' },
        React.createElement(
          Badge,
          { variant: typeColors[detail.content_type] || 'default' },
          typeLabels[detail.content_type] || detail.content_type
        ),
        React.createElement(
          'h3',
          { className: 'mt-3 text-xl font-extrabold text-[#10234f]' },
          detail.title
        )
      ),
      // Metadata
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-3 text-sm' },
        React.createElement(
          'div',
          { className: 'rounded-xl border border-slate-100 bg-[#f7faff] p-4 font-semibold' },
          React.createElement('span', { className: 'text-xs text-[#8292b4]' }, '学年'),
          React.createElement(
            'p',
            { className: 'mt-1 text-[#30466f]' },
            detail.academic_year || '—'
          )
        ),
        React.createElement(
          'div',
          { className: 'rounded-xl border border-slate-100 bg-[#f7faff] p-4 font-semibold' },
          React.createElement('span', { className: 'text-xs text-[#8292b4]' }, '学期'),
          React.createElement('p', { className: 'mt-1 text-[#30466f]' }, detail.semester || '—')
        ),
        React.createElement(
          'div',
          { className: 'rounded-xl border border-slate-100 bg-[#f7faff] p-4 font-semibold' },
          React.createElement('span', { className: 'text-xs text-[#8292b4]' }, '创建时间'),
          React.createElement(
            'p',
            { className: 'mt-1 text-[#30466f]' },
            new Date(detail.created_at).toLocaleString('zh-CN')
          )
        ),
        React.createElement(
          'div',
          { className: 'rounded-xl border border-slate-100 bg-[#f7faff] p-4 font-semibold' },
          React.createElement('span', { className: 'text-xs text-[#8292b4]' }, '版本'),
          React.createElement(
            'p',
            { className: 'mt-1 text-[#30466f]' },
            'v' + (detail.version || 1)
          )
        )
      ),
      // AI summary
      (detail.personalLesson && detail.personalLesson[0] && detail.personalLesson[0].body_text) ||
        (detail.groupLesson && detail.groupLesson[0] && detail.groupLesson[0].body_text) ||
        (detail.planSummary && detail.planSummary[0] && detail.planSummary[0].body_text)
        ? React.createElement(
            'div',
            {
              className:
                'rounded-2xl border border-blue-100 bg-blue-50/80 p-5 text-sm leading-relaxed text-[#30466f] whitespace-pre-wrap',
            },
            detail.personalLesson && detail.personalLesson[0]
              ? detail.personalLesson[0].body_text
              : detail.groupLesson && detail.groupLesson[0]
                ? detail.groupLesson[0].body_text
                : detail.planSummary && detail.planSummary[0]
                  ? detail.planSummary[0].body_text
                  : ''
          )
        : null,
      // Attachments
      detail.attachments && detail.attachments.length > 0
        ? React.createElement(
            'div',
            { className: 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' },
            React.createElement(
              'p',
              { className: 'mb-3 text-sm font-bold text-[#6d7fa7]' },
              '附件（' + detail.attachments.length + '）'
            ),
            detail.attachments.map(function (att: any) {
              var isImage =
                att.file && att.file.mime_type && att.file.mime_type.startsWith('image/');
              var isPDF = att.file && att.file.mime_type === 'application/pdf';
              var isWord =
                (att.file && att.file.mime_type && att.file.mime_type.includes('word')) ||
                (att.file && (att.file.file_ext === 'doc' || att.file.file_ext === 'docx'));
              var previewUrl = '/api/files/' + att.file_id + '/preview';
              return React.createElement(
                'div',
                {
                  key: att.id,
                  className: 'mb-3 rounded-xl border border-slate-200 bg-[#f7faff] p-3 last:mb-0',
                },
                React.createElement(
                  'span',
                  { className: 'text-sm font-medium' },
                  (isImage ? '🖼 ' : isPDF ? '📕 ' : isWord ? '📝 ' : '📄 ') +
                    (att.file ? att.file.original_name : '附件')
                ),
                isImage
                  ? React.createElement('img', {
                      src: previewUrl,
                      className: 'w-full max-h-48 object-contain mt-1 rounded',
                      alt: 'preview',
                    })
                  : isPDF
                    ? React.createElement('iframe', {
                        src: previewUrl,
                        className: 'w-full h-48 border rounded mt-1',
                        title: 'preview',
                      })
                    : isWord
                      ? React.createElement(
                          'div',
                          { className: 'text-xs text-amber-600 mt-1' },
                          'Word 文档请下载查看'
                        )
                      : null,
                React.createElement(
                  'a',
                  {
                    href: previewUrl,
                    target: '_blank',
                    className:
                      'mt-2 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50',
                  },
                  '🔍 预览'
                )
              );
            })
          )
        : null,
      // Teaching reflection (personal only)
      isPL
        ? React.createElement(
            'div',
            { className: 'rounded-2xl border border-blue-100 bg-blue-50/70 p-5' },
            React.createElement(
              'p',
              { className: 'mb-2 text-sm font-bold text-[#30466f]' },
              '教学反思'
            ),
            React.createElement(
              'p',
              { className: 'text-sm leading-relaxed text-[#53688f]' },
              reflectionText || '暂无反思内容'
            )
          )
        : null,
      // Comments section
      isGL || isPL
        ? React.createElement(
            'div',
            { className: 'flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-5' },
            React.createElement(
              'p',
              { className: 'mb-3 shrink-0 text-sm font-bold text-[#6d7fa7]' },
              (isGL ? '参与互动' : '留言') + ' (' + comments.length + ')'
            ),
            React.createElement(
              'div',
              { className: 'min-h-0 flex-1 space-y-2 overflow-y-auto' },
              comments.length > 0
                ? comments.map(function (c) {
                    return React.createElement(
                      'div',
                      {
                        key: c.id,
                        className:
                          'group rounded-xl border border-slate-100 bg-[#f7faff] p-3 transition hover:border-blue-100',
                      },
                      React.createElement(
                        'div',
                        { className: 'mb-1 flex items-center justify-between' },
                        React.createElement(
                          'span',
                          { className: 'text-sm font-bold text-[#30466f]' },
                          c.teacher_name
                        ),
                        React.createElement(
                          'div',
                          { className: 'flex items-center gap-2' },
                          React.createElement(
                            'span',
                            { className: 'text-xs text-slate-400' },
                            new Date(c.created_at).toLocaleString('zh-CN')
                          ),
                          teacher && (teacher.role === 'admin' || c.teacher_id === teacher.id)
                            ? React.createElement(
                                'button',
                                {
                                  onClick: function () {
                                    deleteComment(c.id, isPL);
                                  },
                                  className:
                                    'text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100',
                                },
                                '🗑'
                              )
                            : null
                        )
                      ),
                      c.comment_text
                        ? React.createElement(
                            'p',
                            { className: 'text-sm text-slate-600' },
                            c.comment_text
                          )
                        : null,
                      c.file_name
                        ? React.createElement(
                            'a',
                            {
                              href: '/api/files/' + c.file_id + '/download',
                              target: '_blank',
                              className:
                                'mt-1 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700',
                            },
                            '📎 ' + c.file_name
                          )
                        : null
                    );
                  })
                : React.createElement(
                    'p',
                    { className: 'text-sm text-slate-400 text-center py-2' },
                    '暂无留言'
                  )
            ),
            React.createElement(
              'div',
              { className: 'mt-3 shrink-0 border-t border-slate-100 pt-3' },
              commentFile
                ? React.createElement(
                    'div',
                    {
                      className:
                        'mb-2 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-[#30466f]',
                    },
                    React.createElement('span', null, '📎 ' + commentFile.name),
                    React.createElement(
                      'button',
                      {
                        onClick: function () {
                          setCommentFile(null);
                        },
                        className: 'text-red-400 hover:text-red-600',
                      },
                      '\u00D7'
                    )
                  )
                : null,
              React.createElement(
                'div',
                { className: 'flex gap-2' },
                React.createElement('input', {
                  value: commentText,
                  onChange: function (e) {
                    setCommentText(e.target.value);
                  },
                  onKeyDown: function (e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitComment();
                    }
                  },
                  placeholder: '输入评论...',
                  className:
                    'h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100',
                }),
                React.createElement(
                  'label',
                  {
                    className:
                      'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600',
                  },
                  React.createElement('span', null, '+'),
                  React.createElement('input', {
                    type: 'file',
                    ref: commentFileRef,
                    className: 'hidden',
                    accept: '.doc,.docx,.pdf,.jpg,.jpeg,.png,.txt',
                    onChange: function (e) {
                      var f = e.target.files ? e.target.files[0] : null;
                      if (f) setCommentFile(f);
                    },
                  })
                ),
                React.createElement(
                  Button,
                  {
                    size: 'sm',
                    onClick: submitComment,
                    disabled: commentSubmitting || (!commentText.trim() && !commentFile),
                  },
                  '发送'
                )
              )
            )
          )
        : null
    )
  );
}
