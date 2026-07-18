'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { apiClient } from '@/lib/api/client';

interface ResolutionAlert {
  id: string;
  nome: string;
  municipios: string[];
  palavrasChave: string[];
  valorMinimo: number | null;
  whatsapp: string | null;
  email: string | null;
  isActive: boolean;
}

export function ResolutionAlertModal() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<ResolutionAlert[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [nome, setNome] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [palavraChave, setPalavraChave] = useState('');
  const [valorMinimo, setValorMinimo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  const loadAlerts = async () => {
    try {
      const { data } = await apiClient.get('/resolution-alerts');
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load alerts', e);
    }
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setNome(''); setMunicipio(''); setPalavraChave(''); setValorMinimo(''); setWhatsapp(''); setEmail('');
    setView('form');
  };

  const handleEdit = (alert: ResolutionAlert) => {
    setEditingId(alert.id);
    setNome(alert.nome || '');
    setMunicipio(alert.municipios?.[0] || '');
    setPalavraChave(alert.palavrasChave?.[0] || '');
    setValorMinimo(alert.valorMinimo ? alert.valorMinimo.toString() : '');
    setWhatsapp(alert.whatsapp || '');
    setEmail(alert.email || '');
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este alerta?')) return;
    try {
      await apiClient.delete(`/resolution-alerts/${id}`);
      await loadAlerts();
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/resolution-alerts/${id}`, { isActive });
      await loadAlerts();
    } catch (e: any) {
      alert('Erro ao alterar status: ' + e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return alert('Nome do alerta é obrigatório');
    if (!whatsapp && !email) return alert('Informe pelo menos um WhatsApp ou E-mail');

    setIsLoading(true);
    try {
      const payload = {
        nome,
        municipios: municipio ? [municipio] : [],
        palavrasChave: palavraChave ? [palavraChave] : [],
        valorMinimo: valorMinimo ? parseFloat(valorMinimo) : null,
        whatsapp,
        email
      };

      if (editingId) {
        // API current only supports toggle/delete by id, to "edit" fully we might have to recreate
        // Since backend patch doesn't update all fields yet, we recreate:
        await apiClient.delete(`/resolution-alerts/${editingId}`);
        await apiClient.post('/resolution-alerts', payload);
        alert('Alerta atualizado com sucesso!');
      } else {
        await apiClient.post('/resolution-alerts', payload);
        alert('Alerta criado com sucesso!');
      }
      
      setView('list');
      await loadAlerts();
    } catch (error: any) {
      alert('Erro ao salvar: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        Meus Alertas
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" style={{ padding: 'var(--space-4)' }}>
          <div className="glass-card w-full max-w-lg animate-fadeInScale flex flex-col max-h-[90vh]">
            <div className="card-header shrink-0" style={{ background: 'rgba(20,29,53,0.5)' }}>
              <h3 className="card-title text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {view === 'list' ? 'Meus Alertas de Resolução' : (editingId ? 'Editar Alerta' : 'Novo Alerta')}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-muted hover:text-primary transition-colors text-lg" style={{ background: 'transparent', border: 'none' }}>
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto p-4">
              {view === 'list' ? (
                <div className="flex flex-col gap-4">
                  {alerts.length === 0 ? (
                    <div className="text-center text-muted py-8">
                      Nenhum alerta configurado.
                    </div>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} className="p-4 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-primary">{a.nome}</strong>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggle(a.id, !a.isActive)} className={`px-2 py-1 text-xs rounded-md ${a.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {a.isActive ? 'Ativo' : 'Inativo'}
                            </button>
                            <button onClick={() => handleEdit(a)} className="text-brand hover:text-blue-400">
                              ✏️
                            </button>
                            <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-300">
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-muted">
                          {a.municipios?.length > 0 && <span>📍 {a.municipios[0]} </span>}
                          {a.palavrasChave?.length > 0 && <span>🔑 {a.palavrasChave[0]} </span>}
                        </div>
                        <div className="text-xs text-muted flex gap-3 mt-1">
                          {a.whatsapp && <span>📱 {a.whatsapp}</span>}
                          {a.email && <span>📧 {a.email}</span>}
                        </div>
                      </div>
                    ))
                  )}
                  
                  <button onClick={handleCreateNew} className="btn btn-primary w-full mt-2">
                    + Criar Novo Alerta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="input-group">
                    <label className="input-label">Nome do Alerta</label>
                    <input 
                      type="text" value={nome} onChange={e => setNome(e.target.value)}
                      placeholder="Ex: Alerta Saúde Montes Claros"
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="input-group">
                      <label className="input-label">Município</label>
                      <input 
                        type="text" value={municipio} onChange={e => setMunicipio(e.target.value)}
                        placeholder="Ex: Belo Horizonte"
                        className="input"
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Palavra-Chave (Item)</label>
                      <input 
                        type="text" value={palavraChave} onChange={e => setPalavraChave(e.target.value)}
                        placeholder="Ex: Custeio, Tomógrafo"
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Valor Mínimo (R$)</label>
                    <input 
                      type="number" step="0.01" value={valorMinimo} onChange={e => setValorMinimo(e.target.value)}
                      placeholder="Deixe em branco para qualquer valor"
                      className="input"
                    />
                  </div>

                  <div className="pt-2 border-t border-[rgba(255,255,255,0.1)]">
                    <p className="text-sm text-primary font-medium mb-3">Onde deseja ser notificado?</p>
                    <div className="flex flex-col gap-3">
                      <div className="input-group">
                        <label className="input-label text-xs">WhatsApp</label>
                        <input 
                          type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                          placeholder="Ex: 31988887777"
                          className="input"
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label text-xs">E-mail</label>
                        <input 
                          type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setView('list')} className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>
                      Voltar
                    </button>
                    <button type="submit" disabled={isLoading} className="btn btn-primary">
                      {isLoading ? 'Salvando...' : 'Salvar Alerta'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
