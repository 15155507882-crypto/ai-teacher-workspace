'use client';
import { useState, useEffect } from 'react';
import { TopNav } from '@/components/top-nav';
import { ContentList } from '@/components/content-list';
export default function PersonalLessonsPage() {
  return <ContentList contentType="personal_lesson" title="个人备课" />;
}
