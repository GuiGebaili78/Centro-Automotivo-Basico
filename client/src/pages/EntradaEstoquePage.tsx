import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { Button } from '../components/ui/Button';
import { Plus, Search, Trash2, Save, ShoppingCart } from 'lucide-react';

export const EntradaEstoquePage = () => {    
    // Header State
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [invoice, setInvoice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [obs, setObs] = useState('');

    // Items Logic
    const [items, setItems] = useState<any[]>([]);
    
    // New Item Input State
    const [partSearch, setPartSearch] = useState('');
    const [partResults, setPartResults] = useState<any[]>([]);
    const [selectedStockPart, setSelectedStockPart] = useState<any | null>(null);
    const [isNewPart, setIsNewPart] = useState(false);

    // Row Inputs
    const [rowQtd, setRowQtd] = useState('');
    const [rowCost, setRowCost] = useState('');
    const [rowMargin, setRowMargin] = useState('');
    const [rowSale, setRowSale] = useState('');
    const [rowRef, setRowRef] = useState('');
    const [rowObs, setRowObs] = useState('');
    
    // New Part Fields (if isNewPart)
    const [newPartName, setNewPartName] = useState('');
    const [newPartDesc, setNewPartDesc] = useState('');
    const [newPartFab, setNewPartFab] = useState('');
    const [newPartUnit, setNewPartUnit] = useState('UN');

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    // Load Suppliers
    useEffect(() => {
        api.get('/fornecedor').then(res => setSuppliers(res.data)).catch(console.error);
    }, []);

    // Price Calc Effect
    useEffect(() => {
        if (rowCost && rowMargin) {
            const cost = Number(rowCost);
            const margin = Number(rowMargin);
            const sale = cost + (cost * (margin / 100));
            setRowSale(sale.toFixed(2));
        }
    }, [rowCost, rowMargin]);

    useEffect(() => {
        if (rowCost && rowSale && !rowMargin) {
             const cost = Number(rowCost);
             const sale = Number(rowSale);
             if (cost > 0) {
                 const margin = ((sale - cost) / cost) * 100;
                 setRowMargin(margin.toFixed(2));
             }
        }
    }, [rowSale, rowCost]); // Only trigger if Sale changes and Margin is empty, or explicitly desired? 
    // Actually bi-directional calc is tricky. Let's stick to Cost+Margin->Sale priority, but if user types Sale, calc Margin.
    
    const handleRecalcMargin = (saleVal: string) => {
        setRowSale(saleVal);
        const cost = Number(rowCost);
        const sale = Number(saleVal);
        if (cost > 0 && sale > 0) {
             const m = ((sale - cost) / cost) * 100;
             setRowMargin(m.toFixed(2));
        }
    };

    const handleSearchPart = async (q: string) => {
        setPartSearch(q);
        if (q.length < 2) { setPartResults([]); return; }
        try {
            const res = await api.get(`/pecas-estoque/search?q=${q}`);
            setPartResults(res.data);
        } catch(e) { console.error(e); }
    };

    const selectPart = (p: any) => {
        setSelectedStockPart(p);
        setPartSearch(p.nome);
        setPartResults([]);
        setIsNewPart(false);
        
        // Auto-fill cost (last cost) if available? The API returns standard cost or we assume user enters new cost.
        // But we DO want to suggest existing Sale Price.
        setRowSale(Number(p.valor_venda || 0).toFixed(2));
        setRowCost(Number(p.valor_custo || 0).toFixed(2)); // Suggest last cost
    };

    const handleAddItem = () => {
        if (!selectedStockPart && !isNewPart) return;
        if (!rowQtd || !rowCost || !rowSale) {
            setStatusMsg({type: 'error', text: 'Preencha quantidade, custo e venda.'});
            return;
        }

        const newItem = {
            tempId: Date.now(),
            id_pecas_estoque: selectedStockPart ? selectedStockPart.id_pecas_estoque : null,
            new_part_data: isNewPart ? {
                nome: newPartName || partSearch,
                descricao: newPartDesc || newPartName || partSearch,
                fabricante: newPartFab,
                unidade_medida: newPartUnit
            } : null,
            displayName: isNewPart ? (newPartName || partSearch) : selectedStockPart.nome,
            quantidade: Number(rowQtd),
            valor_custo: Number(rowCost),
            margem_lucro: Number(rowMargin),
            valor_venda: Number(rowSale),
            ref_cod: rowRef,
            obs: rowObs
        };

        setItems([...items, newItem]);
        
        // Reset Inputs
        setRowQtd(''); setRowCost(''); setRowMargin(''); setRowSale(''); setRowRef(''); setRowObs('');
        setSelectedStockPart(null); setPartSearch(''); setIsNewPart(false);
        setNewPartName(''); setNewPartDesc(''); setNewPartFab('');
    };

    const handleRemoveItem = (tempId: number) => {
        setItems(items.filter(i => i.tempId !== tempId));
    };

    const handleSubmit = async () => {
        if (!selectedSupplierId) {
            setStatusMsg({type: 'error', text: 'Selecione um Fornecedor.'});
            return;
        }
        if (items.length === 0) {
            setStatusMsg({type: 'error', text: 'Adicione pelo menos um item.'});
            return;
        }

        try {
            const payload = {
                id_fornecedor: Number(selectedSupplierId),
                nota_fiscal: invoice,
                data_compra: new Date(date),
                obs: obs,
                itens: items
            };

            await api.post('/pecas-estoque/entry', payload);
            
            setStatusMsg({type: 'success', text: 'Entrada Registrada com Sucesso!'});
            
            // Clear All
            setItems([]);
            setInvoice('');
            setObs('');
            // Optional: navigate away or stay
        } catch (e) {
            setStatusMsg({type: 'error', text: 'Erro ao processar entrada.'});
        }
    };

    return (
        <div className="space-y-6 pb-20">
             {statusMsg.text && (
                <div className="fixed bottom-8 right-8 z-50">
                     <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({ type: null, text: '' })} />
                </div>
            )}

            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                    <ShoppingCart className="text-primary-600" /> Nova Compra / Entrada de Estoque
                </h1>
                <p className="text-neutral-500">Registre novas aquisições de peças e atualize o estoque automaticamente.</p>
            </div>

            {/* HEADER CARD */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Fornecedor</label>
                    <select 
                        className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-700 outline-none focus:border-primary-500 transition-all"
                        value={selectedSupplierId}
                        onChange={e => setSelectedSupplierId(e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        {suppliers.map(s => <option key={s.id_fornecedor} value={s.id_fornecedor}>{s.nome}</option>)}
                    </select>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Data Compra</label>
                    <input 
                        type="date" 
                        className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-700 outline-none focus:border-primary-500"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Nota Fiscal / Recibo</label>
                    <input 
                        className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-700 outline-none focus:border-primary-500"
                        placeholder="Nº NF"
                        value={invoice}
                        onChange={e => setInvoice(e.target.value)}
                    />
                </div>
            </div>

            {/* ITEM INPUT CARD */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 relative overflow-visible">
                <h3 className="text-sm font-black text-neutral-600 uppercase tracking-widest border-b border-neutral-100 pb-2">
                    Adicionar Item à Compra
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Part Search / New Part Toggle */}
                    <div className="relative z-20"> 
                        <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Buscar Peça ou Cadastrar Nova</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                            <input 
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${selectedStockPart ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 bg-neutral-50'} font-bold outline-none focus:border-primary-500 transition-all`}
                                placeholder="Digite o nome da peça..."
                                value={partSearch}
                                onChange={e => {
                                    handleSearchPart(e.target.value);
                                    if(selectedStockPart) setSelectedStockPart(null); // Clear selection if typing again
                                    // If unknown, allow switch to new
                                }}
                            />
                            {partResults.length > 0 && !selectedStockPart && (
                                <div className="absolute w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                                    {partResults.map(p => (
                                        <button key={p.id_pecas_estoque} onClick={() => selectPart(p)} className="w-full text-left p-3 hover:bg-neutral-50 flex justify-between border-b border-neutral-50 last:border-0">
                                            <span className="font-bold text-neutral-700">{p.nome}</span>
                                            <span className="text-xs font-medium text-neutral-400">{p.fabricante} • {p.estoque_atual} un</span>
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => {
                                            setIsNewPart(true);
                                            setNewPartName(partSearch);
                                            setPartResults([]);
                                            setSelectedStockPart(null);
                                        }}
                                        className="w-full text-left p-3 bg-primary-50 text-primary-700 font-bold hover:bg-primary-100 flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Cadastrar Nova Peça: "{partSearch}"
                                    </button>
                                </div>
                            )}
                            {partResults.length === 0 && partSearch.length > 2 && !selectedStockPart && (
                                <div className="absolute w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-xl p-2 z-50">
                                     <button 
                                        onClick={() => {
                                            setIsNewPart(true);
                                            setNewPartName(partSearch);
                                            setPartResults([]);
                                            setSelectedStockPart(null);
                                        }}
                                        className="w-full text-left p-3 bg-primary-50 text-primary-700 font-bold hover:bg-primary-100 flex items-center gap-2 rounded-lg"
                                    >
                                        <Plus size={16} /> Cadastrar Nova Peça: "{partSearch}"
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* If New Part: Extra Fields */}
                    {isNewPart && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                             <div>
                                 <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Fabricante</label>
                                 <input className="w-full p-3 rounded-xl border border-neutral-200 bg-white" placeholder="Marca" value={newPartFab} onChange={e => setNewPartFab(e.target.value)} />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Unidade</label>
                                 <select className="w-full p-3 rounded-xl border border-neutral-200 bg-white" value={newPartUnit} onChange={e => setNewPartUnit(e.target.value)}>
                                     <option value="UN">Unidade (UN)</option>
                                     <option value="L">Litro (L)</option>
                                     <option value="KG">Quilo (KG)</option>
                                     <option value="KIT">Kit</option>
                                     <option value="PAR">Par</option>
                                 </select>
                             </div>
                        </div>
                    )}
                </div>

                {/* Values Row */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
                     <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Quantidade</label>
                        <input type="number" className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-black text-center outline-none focus:border-primary-500" value={rowQtd} onChange={e => setRowQtd(e.target.value)} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Custo Unit (R$)</label>
                        <input type="number" className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-medium text-right outline-none focus:border-primary-500" placeholder="0.00" value={rowCost} onChange={e => setRowCost(e.target.value)} />
                     </div>
                     <div className="relative">
                        <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Margem (%)</label>
                        <input type="number" className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-medium text-center outline-none focus:border-primary-500" placeholder="%" value={rowMargin} onChange={e => setRowMargin(e.target.value)} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Venda Unit (R$)</label>
                        <input type="number" className="w-full p-3 rounded-xl border border-primary-200 bg-primary-50 text-primary-800 font-bold text-right outline-none focus:border-primary-500" placeholder="0.00" value={rowSale} onChange={e => handleRecalcMargin(e.target.value)} />
                     </div>
                     <div className="flex items-end">
                         <button 
                            onClick={handleAddItem}
                            className="w-full py-3 bg-neutral-900 text-white font-bold rounded-xl shadow-lg hover:bg-black hover:scale-105 transition-all flex justify-center items-center gap-2"
                         >
                             <Plus size={20} /> ADICIONAR
                         </button>
                     </div>
                </div>
                
                {/* Extra Details Row */}
                <div className="grid grid-cols-2 gap-4">
                     <input className="p-2 border-b border-neutral-200 bg-transparent text-sm placeholder:text-neutral-400 outline-none focus:border-primary-500" placeholder="Código Ref/Fabricante (Opcional)" value={rowRef} onChange={e => setRowRef(e.target.value)} />
                     <input className="p-2 border-b border-neutral-200 bg-transparent text-sm placeholder:text-neutral-400 outline-none focus:border-primary-500" placeholder="Observações do item (Opcional)" value={rowObs} onChange={e => setRowObs(e.target.value)} />
                </div>
            </div>

            {/* CART LIST */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
                    <h3 className="text-sm font-black text-neutral-600 uppercase tracking-widest">Itens na Lista</h3>
                    <span className="text-xs font-bold text-neutral-400">{items.length} itens</span>
                </div>
                
                <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-[10px] uppercase font-black text-neutral-400 tracking-wider">
                        <tr>
                            <th className="p-3">Produto</th>
                            <th className="p-3 text-center">Qtd</th>
                            <th className="p-3 text-right">Custo</th>
                            <th className="p-3 text-right">Margem</th>
                            <th className="p-3 text-right">Venda</th>
                            <th className="p-3 text-right">Total Custo</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {items.map(i => (
                            <tr key={i.tempId} className="hover:bg-neutral-50">
                                <td className="p-3">
                                    <div className="font-bold text-neutral-800">{i.displayName}</div>
                                    <div className="text-xs text-neutral-400">{i.ref_cod} {i.obs}</div>
                                    {i.new_part_data && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded uppercase font-bold">NOVO CADASTRO</span>}
                                </td>
                                <td className="p-3 text-center font-bold">{i.quantidade}</td>
                                <td className="p-3 text-right text-neutral-600">R$ {i.valor_custo.toFixed(2)}</td>
                                <td className="p-3 text-right text-blue-600">{i.margem_lucro?.toFixed(1)}%</td>
                                <td className="p-3 text-right font-black text-neutral-800">R$ {i.valor_venda.toFixed(2)}</td>
                                <td className="p-3 text-right text-neutral-500">R$ {(i.quantidade * i.valor_custo).toFixed(2)}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleRemoveItem(i.tempId)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-neutral-400 italic">Nenhum item adicionado.</td></tr>
                        )}
                    </tbody>
                </table>
                
                {items.length > 0 && (
                    <div className="p-4 bg-neutral-100 flex justify-end items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs font-bold text-neutral-500 uppercase">Total da Compra</p>
                            <p className="text-2xl font-black text-neutral-800">R$ {items.reduce((acc, i) => acc + (i.quantidade * i.valor_custo), 0).toFixed(2)}</p>
                        </div>
                        <Button onClick={handleSubmit} variant="success" className="h-12 px-8 text-lg shadow-xl shadow-green-500/20">
                            <Save className="mr-2" /> FINALIZAR ENTRADA
                        </Button>
                    </div>
                )}
            </div>

        </div>
    );
};
