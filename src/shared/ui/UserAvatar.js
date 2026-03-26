import React from 'react';
import { getUserAvatarLabel, getUserPhotoUrl } from '../lib/user';

export function UserAvatar({ user, size = 'md' }) {
  const photoUrl = getUserPhotoUrl(user);
  const label = getUserAvatarLabel(user);

  return (
    <span
      aria-label={label}
      className={`user-avatar user-avatar-${size}`}
      title={label}
    >
      {photoUrl ? (
        <img alt={label} className="user-avatar-image" src={photoUrl} />
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
