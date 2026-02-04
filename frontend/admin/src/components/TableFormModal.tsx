import React, { useState, useEffect } from 'react';
import { createTable, updateTable } from '../services/api';
import { X, Utensils, Save, Loader2 } from 'lucide-react';
import type { Table } from '@/types/index';

interface TableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  tableToEdit?: Table | null;
}

const TABLE_STATUSES = [
    { value: 'free', label: 'Livre' },
    { value: 'occupied', label: 'Ocupada' },
    { value: 'needs_cleaning', label: 'Limpeza' }
];

const TableFormModal: React.FC<TableFormModalProps> = ({ isOpen, onClose, onSave, tableToEdit }) => {
  const [number, setNumber] = useState(0);
  const [status, setStatus] = useState('free');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!tableToEdit;

  useEffect(() => {
    if (tableToEdit) {
      setNumber(tableToEdit.number);
      setStatus(tableToEdit.status);
    } else {
      setNumber(0);
      setStatus('free');
    }
  }, [tableToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (number <= 0) {
      alert('O número da mesa deve ser positivo.');
      return;
    }

    setIsSubmitting(true);
    const tableData = { number, status };

    try {
      if (isEditing && tableToEdit) {
        await updateTable(tableToEdit.id, tableData);
      } else {
        await createTable(tableData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save table:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Utensils size={20} />
            </div>
            <h3 className="font-bold text-slate-900">{isEditing ? 'Editar Mesa' : 'Nova Mesa'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} id="table-form" className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Número da Mesa</label>
            <input 
                type="number" 
                className="ui-input w-full"
                value={number} 
                onChange={e => setNumber(parseInt(e.target.value))} 
                required 
                autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Status Inicial</label>
            <select 
                className="ui-input w-full cursor-pointer"
                value={status} 
                onChange={e => setStatus(e.target.value)}
            >
              {TABLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </form>

        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          <button type="button" className="ui-button-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="ui-button-primary flex-1" form="table-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEditing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableFormModal;
