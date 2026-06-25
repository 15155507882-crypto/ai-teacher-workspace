export interface MemoryState {
  lastRecognitionResult?: {
    type: string;
    title: string;
    subject?: string;
    grade?: string;
  };
  pendingActions: string[];
  conversationTurns: number;
}

export class AIMemory {
  static detectIntent(text: string, _state: MemoryState): string {
    const t = text.trim();
    if (/^(保存|确认|好的|可以|行|嗯|对|是的|确认保存|保存吧)$/.test(t)) return 'confirm';
    if (/^(撤销|取消|不要了|算了)$/.test(t)) return 'undo';
    if (/^(改成?|修改?|标题|叫).*/.test(t) || /.*(叫|命名|标题).*/.test(t)) return 'modify_title';
    if (/换成?(集体|个人|反思|计划|总结)/.test(t) || /不是(备课|反思|集体|计划)/.test(t))
      return 'modify_type';
    if (/换成?.*(课|上.?课|上次|之前|那一课)/.test(t) || /关联.*(换|改|上一)/.test(t))
      return 'change_link';
    return 'new_content';
  }

  static extractNewTitle(text: string): string | null {
    const patterns = [
      /叫[「《]?(.+?)[」》]?[吧吗]?$/,
      /改成?[「《]?(.+?)[」》]?[吧吗]?$/,
      /标题[是为:：]?\s*[「《]?(.+?)[」》]?$/,
      /命名[是为:：]?\s*[「《]?(.+?)[「《]?$/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[1].trim();
    }
    return text.replace(/^(改成?|修改?|标题|叫|命名为?)/, '').trim() || null;
  }

  static extractNewType(text: string): string | null {
    if (/个人|备课/.test(text)) return 'personal_lesson';
    if (/反思|教学反思/.test(text)) return 'reflection';
    if (/集体|集体备课/.test(text)) return 'group_lesson';
    if (/计划|总结/.test(text)) return 'plan_summary';
    return null;
  }
}
