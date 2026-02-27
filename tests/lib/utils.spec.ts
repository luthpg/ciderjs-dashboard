import { describe, expect, it } from 'vitest';
import { cn, truncateByDisplayWidth } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('複数のクラス文字列を正しく結合できること', () => {
      expect(cn('p-2', 'm-4')).toBe('p-2 m-4');
    });

    it('Tailwindの競合するクラスを適切にマージできること', () => {
      // tailwind-mergeの機能により、後勝ちになる想定
      expect(cn('p-2 text-red-500', 'p-4')).toBe('text-red-500 p-4');
    });

    it('条件付きクラス（オブジェクト）を処理できること', () => {
      expect(cn('base-class', { 'active-class': true, hidden: false })).toBe(
        'base-class active-class',
      );
    });
  });

  describe('truncateByDisplayWidth', () => {
    it('制限文字数以下の場合はそのまま返すこと（半角）', () => {
      expect(truncateByDisplayWidth('abc', 5)).toBe('abc');
    });

    it('制限文字数以下の場合はそのまま返すこと（全角）', () => {
      expect(truncateByDisplayWidth('あいう', 5)).toBe('あいう');
    });

    it('制限文字数を超えた場合は切り詰められて "..." が付与されること（半角）', () => {
      // 5 * 2 = 10（半角10文字が上限）
      expect(truncateByDisplayWidth('abcdefghijk', 5)).toBe('abcdefghij...');
    });

    it('制限文字数を超えた場合は切り詰められて "..." が付与されること（全角）', () => {
      // 全角は1文字で幅2としてカウント。5 * 2 = 10（全角5文字が上限）
      expect(truncateByDisplayWidth('あいうえおか', 5)).toBe('あいうえお...');
    });

    it('半角と全角が混在している文字列を正確に計算して切り詰めること', () => {
      // a(1)あ(2)b(1)い(2)c(1)う(2)d(1)え(2) = 計12幅。上限10幅で切り捨て。
      // aあbいcう (1+2+1+2+1+2=9幅) まで許容され、d(1)を入れると10幅。
      // 実装のロジックに忠実にテストする。
      expect(truncateByDisplayWidth('aあbいcうdえ', 5)).toBe('aあbいcうd...');
    });
  });
});
