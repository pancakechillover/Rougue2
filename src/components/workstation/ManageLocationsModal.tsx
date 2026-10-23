import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Edit3, Plus, RotateCcw, Tag, Trash2, X } from 'lucide-react';
import { AppState } from '../../types';
import { cn } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import {
  DEFAULT_WORKSTATION_LOCATIONS,
  getWorkstationLocations,
} from '../../lib/workstationUtils';
import {
  LocationIcon,
  LocationIconPicker,
  resolveLocationIconOption,
} from './LocationIcon';

interface ManageLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
}

const DEFAULT_ICONS: Record<string, string> = {
  Home: 'home',
  Lab: 'building',
  Library: 'book',
};

/**
 * Add / rename / delete workstation check-in locations.
 * Shared by the workstation page and the top-bar status chip.
 */
export const ManageLocationsModal: React.FC<ManageLocationsModalProps> = ({
  isOpen,
  onClose,
  state,
  setState,
  syncToCloud,
}) => {
  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);

  const [newLocationInput, setNewLocationInput] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState<string>('building');
  const [editingLocIndex, setEditingLocIndex] = useState<number | null>(null);
  const [editingLocName, setEditingLocName] = useState('');
  const [editingLocIcon, setEditingLocIcon] = useState<string>('building');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  if (!isOpen) return null;

  const commit = (next: AppState) => {
    if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
    return next;
  };

  const handleAddLocation = () => {
    const trimmed = newLocationInput.trim();
    if (!trimmed) return;
    if (locations.some((loc) => loc.toLowerCase() === trimmed.toLowerCase())) {
      setNewLocationInput('');
      return;
    }

    setState((prev) => {
      const updatedIcons = {
        ...(prev.workstationLocationIcons || {}),
        [trimmed]: newLocationIcon,
      };
      return commit({
        ...prev,
        workstationLocations: [...getWorkstationLocations(prev), trimmed],
        workstationLocationIcons: updatedIcons,
      });
    });

    setNewLocationInput('');
    setNewLocationIcon('building');
    playSound('click');
  };

  const startEditingLocation = (index: number) => {
    const locName = locations[index];
    setEditingLocIndex(index);
    setEditingLocName(locName);
    setEditingLocIcon(resolveLocationIconOption(locName, state.workstationLocationIcons).id);
  };

  const handleUpdateLocation = (index: number) => {
    const trimmed = editingLocName.trim();
    if (!trimmed) return;
    const oldName = locations[index];
    const updated = [...locations];
    updated[index] = trimmed;

    setState((prev) => {
      const updatedIcons = { ...(prev.workstationLocationIcons || {}) };
      if (oldName !== trimmed) delete updatedIcons[oldName];
      updatedIcons[trimmed] = editingLocIcon;
      return commit({
        ...prev,
        workstationLocations: updated,
        workstationLocationIcons: updatedIcons,
      });
    });

    setEditingLocIndex(null);
    setEditingLocName('');
    playSound('click');
  };

  const handleDeleteLocation = (index: number) => {
    if (locations.length <= 1) return;
    const locToDelete = locations[index];
    const updated = locations.filter((_, i) => i !== index);

    setState((prev) => {
      const updatedIcons = { ...(prev.workstationLocationIcons || {}) };
      delete updatedIcons[locToDelete];
      return commit({
        ...prev,
        workstationLocations: updated,
        workstationLocationIcons: updatedIcons,
      });
    });

    playSound('pop');
  };

  const handleResetToDefault = () => {
    const defaults = [...DEFAULT_WORKSTATION_LOCATIONS];
    setState((prev) =>
      commit({
        ...prev,
        workstationLocations: defaults,
        workstationLocationIcons: { ...DEFAULT_ICONS },
      })
    );
    setIsConfirmingReset(false);
    setEditingLocIndex(null);
    playSound('click');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Tag size={18} className="text-indigo-400" />
            <span>Manage Check-In Locations</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 shrink-0">
          <label className="text-xs font-bold uppercase tracking-wider block opacity-70">
            Add New Location
          </label>
          <div className="space-y-2 p-3 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-800 border-slate-700 focus-within:border-indigo-500">
                <LocationIcon iconId={newLocationIcon} size={15} />
                <input
                  type="text"
                  placeholder="e.g. Office, Dorm Desk, Cafe"
                  value={newLocationInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewLocationInput(val);
                    if (val.trim()) {
                      setNewLocationIcon(resolveLocationIconOption(val).id);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                  className="w-full text-xs font-medium outline-none bg-transparent text-slate-100 placeholder-slate-400"
                />
              </div>
              <button
                onClick={handleAddLocation}
                disabled={!newLocationInput.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-sm"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-60">
                Select Icon:
              </span>
              <LocationIconPicker
                selectedIconId={newLocationIcon}
                onSelectIcon={(iconId) => setNewLocationIcon(iconId)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <label className="text-xs font-bold uppercase tracking-wider block opacity-70 shrink-0">
            Current Locations ({locations.length})
          </label>
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
            {locations.map((loc, index) => {
              const isEditing = editingLocIndex === index;
              return (
                <div
                  key={`${loc}-${index}`}
                  className={cn(
                    'rounded-xl border transition-colors',
                    isEditing
                      ? 'p-3 border-indigo-500/80 bg-slate-950/60 space-y-2.5 shadow-md'
                      : 'p-2.5 border-slate-700 bg-slate-800/80 flex items-center justify-between gap-2'
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-slate-900 border-indigo-500">
                          <LocationIcon iconId={editingLocIcon} size={15} />
                          <input
                            type="text"
                            value={editingLocName}
                            onChange={(e) => setEditingLocName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateLocation(index)}
                            autoFocus
                            className="w-full text-xs font-bold outline-none bg-transparent text-slate-100"
                          />
                        </div>
                        <button
                          onClick={() => handleUpdateLocation(index)}
                          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                          title="Save Changes"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingLocIndex(null);
                            setEditingLocName('');
                          }}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-60">
                          Select Icon:
                        </span>
                        <LocationIconPicker
                          selectedIconId={editingLocIcon}
                          onSelectIcon={(iconId) => setEditingLocIcon(iconId)}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <LocationIcon
                          locName={loc}
                          customIcons={state.workstationLocationIcons}
                          size={15}
                        />
                        <span className="text-xs font-bold truncate">{loc}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEditingLocation(index)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Edit Location & Icon"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(index)}
                          disabled={locations.length <= 1}
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                          title={locations.length <= 1 ? 'Keep at least one location' : 'Delete Location'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 shrink-0">
          {isConfirmingReset ? (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5">
                <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-100">
                  This will delete all {locations.length} custom locations and restore
                  Home, Lab and Library. Past workstation logs keep their original location
                  names and cannot be relinked.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Reset anyway
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                title="Reset to default: Home, Lab, Library"
              >
                <RotateCcw size={13} />
                <span>Reset to Default 3</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
