import { t } from 'app/i18next-t';
import LoadoutView from 'app/loadout/LoadoutView';
import { useDefinitions } from 'app/manifest/selectors';
import { useThunkDispatch } from 'app/store/thunk-dispatch';
import { useEventBusListener } from 'app/utils/hooks';
import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import Sheet from '../dim-ui/Sheet';
import '../inventory-page/Stores.scss';
import { DimItem, PluggableInventoryItemDefinition } from '../inventory-stores/item-types';
import { allItemsSelector, bucketsSelector, storesSelector } from '../inventory-stores/selectors';
import { deleteLoadout, updateLoadout } from './actions';
import { GeneratedLoadoutStats } from './GeneratedLoadoutStats';
import { stateReducer } from './loadout-drawer-reducer';
import './loadout-drawer.scss';
import { addItem$, editLoadout$ } from './loadout-events';
import { getItemsFromLoadoutItems } from './loadout-item-conversion';
import { Loadout } from './loadout-types';
import { getModsFromLoadout } from './loadout-utils';
import LoadoutDrawerOptions from './LoadoutDrawerOptions';

// TODO: Consider moving editLoadout/addItemToLoadout/loadoutDialogOpen into Redux (actions + state)
// TODO: break out a container from the actual loadout drawer so we can lazy load the drawer

/** Is the loadout drawer currently open? */
export let loadoutDialogOpen = false;

/**
 * The Loadout editor that shows up as a sheet on the Inventory screen. You can build and edit
 * loadouts from this interface.
 */
export default function LoadoutDrawer2() {
  const dispatch = useThunkDispatch();
  const defs = useDefinitions()!;

  const stores = useSelector(storesSelector);
  const allItems = useSelector(allItemsSelector);
  const buckets = useSelector(bucketsSelector)!;
  const [showingItemPicker, setShowingItemPicker] = useState(false);

  // All state and the state of the loadout is managed through this reducer
  const [{ loadout, showClass, storeId, isNew }, stateDispatch] = useReducer(stateReducer, {
    showClass: true,
    isNew: false,
    modPicker: {
      show: false,
    },
    showFashionDrawer: false,
  });

  // Sync this global variable with our actual state. TODO: move to redux
  loadoutDialogOpen = Boolean(loadout);

  // The loadout to edit comes in from the editLoadout$ observable
  useEventBusListener(
    editLoadout$,
    useCallback(({ loadout, storeId, showClass, isNew }) => {
      stateDispatch({
        type: 'editLoadout',
        loadout,
        storeId,
        showClass: Boolean(showClass),
        isNew: Boolean(isNew),
      });
    }, [])
  );

  const loadoutItems = loadout?.items;

  // Turn loadout items into real DimItems
  const [items] = useMemo(
    () => getItemsFromLoadoutItems(loadoutItems, defs, buckets, allItems),
    [defs, buckets, loadoutItems, allItems]
  );

  const onAddItem = useCallback(
    (item: DimItem, e?: MouseEvent | React.MouseEvent, equip?: boolean) =>
      stateDispatch({ type: 'addItem', item, shift: Boolean(e?.shiftKey), items, equip }),
    [items]
  );

  /**
   * If an item comes in on the addItem$ rx observable, add it.
   */
  useEventBusListener(
    addItem$,
    useCallback(({ item, clickEvent }) => onAddItem(item, clickEvent), [onAddItem])
  );

  const close = () => {
    stateDispatch({ type: 'reset' });
    setShowingItemPicker(false);
  };

  // Close the sheet on navigation
  const { pathname } = useLocation();
  useEffect(close, [pathname]);

  const onSaveLoadout = (
    e: React.MouseEvent,
    loadoutToSave: Readonly<Loadout> | undefined = loadout
  ) => {
    e.preventDefault();
    if (!loadoutToSave) {
      return;
    }

    if (loadoutToSave.name === t('Loadouts.FromEquipped')) {
      loadoutToSave = {
        ...loadoutToSave,
        name: `${loadoutToSave.name} ${new Date().toLocaleString()}`,
      };
    }

    dispatch(updateLoadout(loadoutToSave));
    close();
  };

  const saveAsNew = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!loadout) {
      return;
    }
    const newLoadout = {
      ...loadout,
      id: uuidv4(), // Let it be a new ID
    };
    onSaveLoadout(e, newLoadout);
  };

  if (!loadout) {
    return null;
  }

  const onDeleteLoadout = () => {
    dispatch(deleteLoadout(loadout.id));
    close();
  };

  const savedMods = getModsFromLoadout(defs, loadout);

  /** Updates the loadout replacing it's current mods with all the mods in newMods. */
  const onUpdateModHashes = (mods: number[]) => stateDispatch({ type: 'updateMods', mods });
  const onUpdateMods = (newMods: PluggableInventoryItemDefinition[]) =>
    onUpdateModHashes(newMods.map((mod) => mod.hash));

  const handleNotesChanged: React.ChangeEventHandler<HTMLTextAreaElement> = (e) =>
    stateDispatch({ type: 'update', loadout: { ...loadout, notes: e.target.value } });

  const header = (
    <div className="loadout-drawer-header">
      <h1>{isNew ? t('Loadouts.Create') : t('Loadouts.Edit')}</h1>
      <LoadoutDrawerOptions
        loadout={loadout}
        showClass={showClass}
        isNew={isNew}
        onUpdateMods={onUpdateMods}
        updateLoadout={(loadout) => stateDispatch({ type: 'update', loadout })}
        saveLoadout={onSaveLoadout}
        saveAsNew={saveAsNew}
        deleteLoadout={onDeleteLoadout}
      />
      {loadout.notes !== undefined && (
        <textarea
          onChange={handleNotesChanged}
          value={loadout.notes}
          placeholder={t('Loadouts.NotesPlaceholder')}
        />
      )}
      <GeneratedLoadoutStats items={items} loadout={loadout} savedMods={savedMods} />
    </div>
  );

  const selectedStore = stores.find((s) => s.id === storeId);

  return (
    <Sheet onClose={close} header={header} disabled={showingItemPicker}>
      <LoadoutView store={selectedStore!} loadout={loadout} actionButtons={[]} />
    </Sheet>
  );
}
