import { ensure } from './errors';
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const DEMO_PASSWORD = 'MessKhata123!';
/** Local raster previews only. SVG and remote URLs are deliberately unsupported. */
export function validatePhoto(photo: string | null) {
  if (photo === null) return;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo);
  ensure(match, 'PNG, JPEG বা WebP ছবি বেছে নিন।');
  ensure(
    match[2].length <= Math.ceil(PHOTO_MAX_BYTES / 3) * 4,
    'ছবির আকার সর্বোচ্চ 2 MB হতে পারে।',
  );
  let bytes = '';
  try {
    bytes = atob(match[2]);
  } catch {
    ensure(false, 'ছবিটি পড়া যায়নি। অন্য ছবি বেছে নিন।');
  }
  ensure(bytes.length <= PHOTO_MAX_BYTES, 'ছবির আকার সর্বোচ্চ 2 MB হতে পারে।');
  const signature =
    match[1] === 'png'
      ? bytes.startsWith('\x89PNG\r\n\x1a\n')
      : match[1] === 'jpeg'
        ? bytes.startsWith('\xff\xd8\xff')
        : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
  ensure(signature, 'ফাইলটি একটি সঠিক PNG, JPEG বা WebP ছবি হতে হবে।');
}
export function validatePassword(current: string, next: string, confirm: string) {
  ensure(next.length >= 8 && next.length <= 128, 'নতুন পাসওয়ার্ড 8 থেকে 128 অক্ষরের হতে হবে।');
  ensure(next.trim().length >= 8, 'নতুন পাসওয়ার্ডে অন্তত 8টি কার্যকর অক্ষর দিন।');
  ensure(next === confirm, 'নতুন পাসওয়ার্ড ও নিশ্চিতকরণ মিলছে না।');
  ensure(current !== next, 'নতুন পাসওয়ার্ডটি বর্তমান পাসওয়ার্ড থেকে আলাদা দিন।');
}
