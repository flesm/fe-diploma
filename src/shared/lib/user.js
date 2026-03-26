export function shortId(value) {
  return value ? String(value).slice(0, 8) : 'Unknown';
}

export function buildUserFullName(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return fullName || shortId(user?.id);
}

export function getUserAvatarLabel(user) {
  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((value) => String(value).trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return initials || shortId(user?.id).slice(0, 2).toUpperCase();
}

export function getUserPhotoUrl(user) {
  return (
    user?.avatar_url ||
    user?.avatar ||
    user?.photo_url ||
    user?.photo ||
    user?.image_url ||
    ''
  );
}
