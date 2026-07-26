import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, CheckCircle, Clock, Check, Building2, Truck, ShoppingCart, Trash2, Eye, Printer, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { procurementApi, stakeholdersApi, projectsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface POItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  project_id?: string;
  project_name?: string;
  date: string;
  status: string;
  total_amount: number;
  notes?: string;
  items: POItem[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

export function PurchaseOrderPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newPo, setNewPo] = useState<Partial<PurchaseOrder>>({
    po_number: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    total_amount: 0,
    items: [{ description: '', quantity: 1, unit_price: 0, total_price: 0 }]
  });

  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [posRes, vendorsRes, projectsRes] = await Promise.all([
        procurementApi.getPurchaseOrders(),
        stakeholdersApi.getVendors(),
        projectsApi.getProjects()
      ]);
      setPos(posRes.data);
      setVendors(vendorsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching PO data:', error);
      addToast('error', 'Fetch Error', 'Failed to fetch Purchase Orders.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePO = async () => {
    try {
      if (!newPo.vendor_id || !newPo.items || newPo.items.length === 0) {
        addToast('warning', 'Validation', 'Please select a vendor and add at least one item.');
        return;
      }
      const res = await procurementApi.createPurchaseOrder(newPo);
      setPos([...pos, res.data]);
      setIsModalOpen(false);
      addToast('success', 'PO Created', `Purchase Order ${res.data.po_number} created.`);
      setNewPo({
        po_number: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        total_amount: 0,
        items: [{ description: '', quantity: 1, unit_price: 0, total_price: 0 }]
      });
    } catch (error) {
      addToast('error', 'Creation Error', 'Failed to create Purchase Order.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await procurementApi.deletePurchaseOrder(id);
      setPos(pos.filter(p => p.id !== id));
      setDeleteConfirmId(null);
      addToast('success', 'Deleted', 'Purchase Order has been deleted.');
    } catch (error) {
      addToast('error', 'Delete Error', 'Failed to delete Purchase Order.');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await procurementApi.updatePurchaseOrderStatus(id, newStatus);
      // Re-fetch everything so AP Invoice badge appears immediately
      await fetchData();
      addToast('success', 'Status Updated', 
        newStatus === 'Completed' 
          ? `✅ PO Completed! AP Invoice & Journal Entry otomatis dibuat.`
          : `PO status changed to ${newStatus}.`
      );
    } catch (error) {
      addToast('error', 'Update Error', 'Failed to update PO status.');
    }
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    if (!newPo.items) return;
    const updatedItems = [...newPo.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    const grandTotal = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    setNewPo({ ...newPo, items: updatedItems, total_amount: grandTotal });
  };

  const filteredPos = pos.filter(p =>
    p.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.vendor_name && p.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    if (status === 'Draft') return 'bg-secondary/50 text-textSecondary';
    if (status === 'Approved') return 'bg-primary/10 text-primary';
    if (status === 'Completed') return 'bg-success/10 text-success';
    return 'bg-danger/10 text-danger';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/procurement" className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Purchase Orders (PO) / SPK</h1>
            <p className="text-textSecondary text-sm">Manage orders for Subcontractors, Lab Testing, and Equipment Rentals.</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New PO
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total PO', value: pos.length, color: 'text-textPrimary' },
          { label: 'Draft', value: pos.filter(p => p.status === 'Draft').length, color: 'text-textSecondary' },
          { label: 'Approved', value: pos.filter(p => p.status === 'Approved').length, color: 'text-primary' },
          { label: 'Completed', value: pos.filter(p => p.status === 'Completed').length, color: 'text-success' },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border p-4 rounded-xl shadow-sm">
            <p className="text-xs text-textSecondary">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by PO Number or Vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-textPrimary rounded-lg hover:bg-secondary/10 text-sm">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-textSecondary text-xs uppercase border-b border-border">
                <th className="p-4 font-medium">PO Number</th>
                <th className="p-4 font-medium">Vendor / Subcon</th>
                <th className="p-4 font-medium">Project</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Terintegrasi ke</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-textSecondary">Loading...</td></tr>
              ) : filteredPos.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-textSecondary">No Purchase Orders found. Create your first PO!</td></tr>
              ) : (
                filteredPos.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-primary flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {p.po_number}
                      </span>
                    </td>
                    <td className="p-4 text-textPrimary">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-textSecondary" />
                        {p.vendor_name || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-textSecondary text-sm">{p.project_name || 'General'}</td>
                    <td className="p-4 text-textSecondary text-sm">{p.date}</td>
                    <td className="p-4 font-bold text-textPrimary">{formatCurrency(p.total_amount)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusColor(p.status)}`}>
                        {p.status === 'Draft' && <Clock className="w-3 h-3" />}
                        {p.status === 'Approved' && <Truck className="w-3 h-3" />}
                        {p.status === 'Completed' && <CheckCircle className="w-3 h-3" />}
                        {p.status}
                      </span>
                    </td>
                    {/* Integration Status Column */}
                    <td className="p-4">
                      {p.status === 'Completed' ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-success/10 text-success rounded-full font-medium">
                            ✓ AP Invoice (Hutang)
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                            ✓ Journal Entry
                          </span>
                          {p.project_name && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-secondary/30 text-textSecondary rounded-full font-medium">
                              ✓ Project Cost
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-textSecondary italic">Belum — Complete PO dulu</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-2">
                        {/* View Document */}
                        <button
                          onClick={() => setSelectedPo(p)}
                          title="View Document"
                          className="p-1.5 rounded-lg bg-background border border-border text-textSecondary hover:text-primary hover:border-primary transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Approve */}
                        {p.status === 'Draft' && (
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'Approved')}
                            className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {p.status === 'Approved' && (
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'Completed')}
                            className="px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20 transition-colors"
                          >
                            Complete
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          title="Delete PO"
                          className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DOCUMENT MODAL */}
      {selectedPo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Document Preview — {selectedPo.po_number}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-card rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Printer className="w-4 h-4" /> Print / Export PDF
                </button>
                <button onClick={() => setSelectedPo(null)} className="p-2 text-textSecondary hover:text-textPrimary">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PO Document */}
            <div className="p-8 overflow-y-auto flex-1 bg-white text-gray-800 font-sans print:p-0">
              {/* Company Header */}
              <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">ANSA ENTERPRISE</h1>
                  <p className="text-sm text-gray-500 mt-1">Geotechnical, Drilling & Laboratory Services</p>
                  <p className="text-xs text-gray-400">Jl. [Alamat Perusahaan] | Tel: [Nomor Telp] | Email: [Email]</p>
                </div>
                <div className="text-right">
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Purchase Order</p>
                    <p className="text-xl font-bold text-gray-900">{selectedPo.po_number}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Date: {selectedPo.date}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full mt-1 inline-block
                    ${selectedPo.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      selectedPo.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'}`}>
                    {selectedPo.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Vendor & Project Info */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Issued To (Vendor / Subcon)</p>
                  <p className="font-bold text-gray-900 text-lg">{selectedPo.vendor_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">For Project</p>
                  <p className="font-semibold text-gray-700">{selectedPo.project_name || 'General Expense'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="p-3 text-left font-medium w-8">#</th>
                    <th className="p-3 text-left font-medium">Description of Work / Item</th>
                    <th className="p-3 text-center font-medium w-20">Qty</th>
                    <th className="p-3 text-right font-medium w-36">Unit Price</th>
                    <th className="p-3 text-right font-medium w-36">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPo.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-3 text-gray-500">{idx + 1}</td>
                      <td className="p-3 text-gray-800">{item.description}</td>
                      <td className="p-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="p-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                      <td className="p-3 text-right font-semibold text-gray-900">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-900">
                    <td colSpan={4} className="p-3 text-right font-bold text-gray-700 text-base">Grand Total</td>
                    <td className="p-3 text-right font-bold text-gray-900 text-lg">{formatCurrency(selectedPo.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Notes */}
              {selectedPo.notes && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes & Terms</p>
                  <p className="text-sm text-gray-600">{selectedPo.notes}</p>
                </div>
              )}

              {/* Signature */}
              <div className="grid grid-cols-2 gap-8 mt-10">
                <div className="text-center">
                  <div className="border-b border-gray-300 h-16 mb-2"></div>
                  <p className="text-sm font-semibold text-gray-700">Issued by</p>
                  <p className="text-xs text-gray-500">Authorized Signatory / ANSA Enterprise</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-300 h-16 mb-2"></div>
                  <p className="text-sm font-semibold text-gray-700">Received & Agreed by</p>
                  <p className="text-xs text-gray-500">{selectedPo.vendor_name || 'Vendor'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-danger" />
            </div>
            <h3 className="text-lg font-bold text-textPrimary mb-2">Hapus Purchase Order?</h3>
            <p className="text-sm text-textSecondary mb-6">
              Tindakan ini tidak bisa dibatalkan. PO ini akan dihapus permanen dari sistem.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-border rounded-lg text-textSecondary hover:bg-background transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 bg-danger text-white rounded-lg font-medium hover:bg-danger/90 transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background">
              <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" /> Create Purchase Order (SPK)
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">PO Number</label>
                  <input type="text" value={newPo.po_number || ''} onChange={(e) => setNewPo({...newPo, po_number: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Date</label>
                  <input type="date" value={newPo.date || ''} onChange={(e) => setNewPo({...newPo, date: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Vendor / Subcontractor <span className="text-danger">*</span></label>
                  <select value={newPo.vendor_id || ''} onChange={(e) => setNewPo({...newPo, vendor_id: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary">
                    <option value="">-- Select Vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Project (Optional)</label>
                  <select value={newPo.project_id || ''} onChange={(e) => setNewPo({...newPo, project_id: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary">
                    <option value="">-- General Expense --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-textSecondary">Order Items</label>
                  <button onClick={() => setNewPo({...newPo, items: [...(newPo.items||[]), {description:'', quantity:1, unit_price:0, total_price:0}]})}
                    className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Row
                  </button>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-background">
                      <tr>
                        <th className="p-2 text-left text-textSecondary font-medium">Description</th>
                        <th className="p-2 text-left text-textSecondary font-medium w-24">Qty</th>
                        <th className="p-2 text-left text-textSecondary font-medium w-40">Unit Price (IDR)</th>
                        <th className="p-2 text-left text-textSecondary font-medium w-40">Total</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newPo.items?.map((item, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="p-2">
                            <input type="text" value={item.description} placeholder="e.g. Sewa Excavator 1 minggu"
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              className="w-full p-1.5 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-sm" />
                          </td>
                          <td className="p-2">
                            <input type="number" min="1" value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value)||0)}
                              className="w-full p-1.5 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-sm" />
                          </td>
                          <td className="p-2">
                            <input type="number" min="0" value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value)||0)}
                              className="w-full p-1.5 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-sm" />
                          </td>
                          <td className="p-2 font-medium text-textPrimary text-sm">{formatCurrency(item.total_price)}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => {
                              const updated = newPo.items!.filter((_, i) => i !== idx);
                              setNewPo({...newPo, items: updated, total_amount: updated.reduce((s,i)=>s+i.total_price,0)});
                            }} className="text-danger hover:text-danger/70 font-bold">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-background border-t border-border flex justify-end gap-4 font-bold">
                    <span className="text-textSecondary">Grand Total:</span>
                    <span className="text-primary text-lg">{formatCurrency(newPo.total_amount||0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Notes / Terms & Conditions</label>
                <textarea value={newPo.notes||''} onChange={(e) => setNewPo({...newPo, notes: e.target.value})} rows={2}
                  placeholder="e.g. Pembayaran dilakukan setelah pekerjaan selesai dan BA ditandatangani."
                  className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary text-sm" />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-background flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-textSecondary hover:text-textPrimary font-medium">Cancel</button>
              <button onClick={handleCreatePO} className="px-6 py-2 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
                <Check className="w-4 h-4" /> Issue Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
