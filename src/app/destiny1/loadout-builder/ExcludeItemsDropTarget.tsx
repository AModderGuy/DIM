import clsx from 'clsx';
import React from 'react';
import { useDrop } from 'react-dnd';
import { DimItem } from '../../inventory-stores/item-types';

interface Props {
  className?: string;
  children?: React.ReactNode;
  onExcluded(lockedItem: DimItem): void;
}

export default function ExcludeItemsDropTarget({ className, children, onExcluded }: Props) {
  const [{ isOver, canDrop }, dropRef] = useDrop<
    DimItem,
    unknown,
    { isOver: Boolean; canDrop: boolean }
  >(
    () => ({
      accept: ['Helmet', 'Gauntlets', 'Chest', 'Leg', 'ClassItem', 'Artifact', 'Ghost'],
      collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
      drop: onExcluded,
    }),
    [onExcluded]
  );
  return (
    <div
      ref={dropRef}
      className={clsx(className, {
        'on-drag-hover': canDrop && isOver,
        'on-drag-enter': canDrop,
      })}
    >
      {children}
    </div>
  );
}
