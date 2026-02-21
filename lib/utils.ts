import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 全角換算で指定文字数を超えたら切り捨てる
 * @param text 対象の文字列
 * @param maxFullWidth 全角での最大文字数（デフォルト15）
 */
export const truncateByDisplayWidth = (text: string, maxFullWidth = 15) => {
  const limit = maxFullWidth * 2; // 半角単位での上限は30
  let currentWidth = 0;
  let result = '';

  for (const char of text) {
    // 半角/全角の判定（正規表現で非ASCII文字を全角とする）
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII文字の範囲指定
    const isFullWidth = /[^\x01-\x7E\xA1-\xDF]/.test(char);
    currentWidth += isFullWidth ? 2 : 1;

    if (currentWidth > limit) {
      return `${result}...`;
    }
    result += char;
  }

  return result;
};
