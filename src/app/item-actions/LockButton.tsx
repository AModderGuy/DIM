import { trackTriumph } from 'app/dim-api/basic-actions';
import { useHotkey } from 'app/hotkeys/useHotkey';
import { t } from 'app/i18next-t';
import { setItemLockState } from 'app/inventory-actions/item-move-service';
import { hideItemPopup } from 'app/item-popup/item-popup';
import { useThunkDispatch } from 'app/store/thunk-dispatch';
import clsx from 'clsx';
import React, { useState } from 'react';
import { DimItem } from '../inventory-stores/item-types';
import {
  AppIcon,
  lockIcon,
  starIcon,
  starOutlineIcon,
  trackedIcon,
  unlockedIcon,
  unTrackedIcon,
} from '../shell/icons';
import ActionButton from './ActionButton';
import styles from './LockButton.m.scss';

interface Props {
  item: DimItem;
  type: 'lock' | 'track';
  children?: React.ReactNode;
}

export default function LockButton({ type, item, children }: Props) {
  const [locking, setLocking] = useState(false);
  const dispatch = useThunkDispatch();

  const lockUnlock = async () => {
    if (locking) {
      return;
    }

    let state = false;
    if (type === 'lock') {
      state = !item.locked;
    } else if (type === 'track') {
      state = !item.tracked;
    }

    if (item.pursuit?.recordHash) {
      dispatch(trackTriumph({ recordHash: item.pursuit.recordHash, tracked: state }));
      hideItemPopup();
      return;
    }

    setLocking(true);
    try {
      await dispatch(setItemLockState(item, state, type));
    } finally {
      setLocking(false);
    }
  };

  useHotkey('l', t('Hotkey.LockUnlock'), lockUnlock);

  const title = lockButtonTitle(item, type);

  const icon =
    type === 'lock'
      ? item.locked
        ? item.type === 'Finishers'
          ? starIcon
          : lockIcon
        : item.type === 'Finishers'
        ? starOutlineIcon
        : unlockedIcon
      : item.tracked
      ? trackedIcon
      : unTrackedIcon;

  const iconElem = <AppIcon className={clsx({ [styles.inProgress]: locking })} icon={icon} />;

  return (
    <ActionButton onClick={lockUnlock} title={title}>
      {children ? (
        <>
          {iconElem} {children}
        </>
      ) : (
        iconElem
      )}
    </ActionButton>
  );
}

export function lockButtonTitle(item: DimItem, type: 'lock' | 'track') {
  const data = { itemType: item.typeName };
  return (
    (type === 'lock'
      ? !item.locked
        ? item.type === 'Finishers'
          ? t('MovePopup.FavoriteUnFavorite.Favorite', data)
          : t('MovePopup.LockUnlock.Lock', data)
        : item.type === 'Finishers'
        ? t('MovePopup.FavoriteUnFavorite.Unfavorite', data)
        : t('MovePopup.LockUnlock.Unlock', data)
      : !item.tracked
      ? t('MovePopup.TrackUntrack.Track', data)
      : t('MovePopup.TrackUntrack.Untrack', data)) + ' [L]'
  );
}
