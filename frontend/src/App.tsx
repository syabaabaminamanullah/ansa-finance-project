import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { Screensaver } from './components/ui/Screensaver';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './modules/dashboard/pages/DashboardPage';
import { MasterDataPage } from './modules/master-data/pages/MasterDataPage';
import { CompanyPage } from './modules/master-data/pages/CompanyPage';
import { BranchPage } from './modules/master-data/pages/BranchPage';
import { CostCenterPage } from './modules/master-data/pages/CostCenterPage';
import { CoaPage } from './modules/master-data/pages/CoaPage';
import { TaxPage } from './modules/master-data/pages/TaxPage';
import { CurrencyPage } from './modules/master-data/pages/CurrencyPage';
import { BankPage } from './modules/master-data/pages/BankPage';

// Project Management Pages
import { ProjectDashboard } from './modules/project-management/pages/ProjectDashboard';
import { ProjectDetail } from './modules/project-management/pages/ProjectDetail';

// Project Structure Pages
import { ProjectPage } from './modules/master-data/pages/ProjectPage';
import { AreaPage } from './modules/master-data/pages/AreaPage';
import { WorkPackagePage } from './modules/master-data/pages/WorkPackagePage';
import { ActivityPage } from './modules/master-data/pages/ActivityPage';

// Stakeholders Pages
import { CustomerPage } from './modules/master-data/pages/CustomerPage';
import { VendorPage } from './modules/master-data/pages/VendorPage';

// HR Pages
import { EmployeePage } from './modules/master-data/pages/EmployeePage';
import { CrewPage } from './modules/master-data/pages/CrewPage';
import { ShiftPage } from './modules/master-data/pages/ShiftPage';

// HR Module Pages
import { HRDashboard } from './modules/hr/pages/HRDashboard';
import { EmployeeListPage } from './modules/hr/pages/EmployeeListPage';
import { CrewListPage } from './modules/hr/pages/CrewListPage';

// Settings Module Pages
import { SettingsLayout } from './modules/settings/pages/SettingsLayout';
import { GeneralSettings } from './modules/settings/pages/GeneralSettings';
import { UserRolesSettings } from './modules/settings/pages/UserRolesSettings';
import { AppearanceSettings } from './modules/settings/pages/AppearanceSettings';
import { SecuritySettings } from './modules/settings/pages/SecuritySettings';
import { DataManagementSettings } from './modules/settings/pages/DataManagementSettings';

// Asset & Inventory Pages
import { WarehousePage } from './modules/master-data/pages/WarehousePage';
import { RigPage } from './modules/master-data/pages/RigPage';
import { EquipmentPage as EquipmentMasterPage } from './modules/master-data/pages/EquipmentMasterPage';
import { MaterialPage } from './modules/master-data/pages/MaterialPage';
import { InventoryItemPage } from './modules/master-data/pages/InventoryItemPage';
import { FixedAssetDashboard } from './modules/assets/pages/FixedAssetDashboard';
import AssetManagementPage from './modules/assets/pages/AssetManagementPage';

// Inventory Module Pages
import { InventoryDashboard } from './modules/inventory/pages/InventoryDashboard';
import { StockBalancePage } from './modules/inventory/pages/StockBalancePage';
import { InventoryTransactionList } from './modules/inventory/pages/InventoryTransactionList';
import { InventoryTransactionForm } from './modules/inventory/pages/InventoryTransactionForm';

// Document Management Pages
import { DocumentExplorerPage } from './modules/documents/pages/DocumentExplorerPage';

// Finance Pages
import { FinanceDashboard } from './modules/finance/pages/FinanceDashboard';
import { JournalPage } from './modules/finance/pages/JournalPage';
import { GeneralLedgerPage } from './modules/finance/pages/GeneralLedgerPage';
import { ApInvoicePage } from './modules/finance/pages/ApInvoicePage';
import { ArInvoicePage } from './modules/finance/pages/ArInvoicePage';
import { BillingSchedulePage } from './modules/finance/pages/BillingSchedulePage';
import { FinancialReportsPage } from './modules/finance/pages/FinancialReportsPage';
import { AssetDepreciationReport } from './modules/finance/pages/AssetDepreciationReport';
import { ArAgingReport } from './modules/finance/pages/ArAgingReport';
import { ApAgingReport } from './modules/finance/pages/ApAgingReport';
import { ExpensePage } from './modules/finance/pages/ExpensePage';
import { AllJournalEntriesPage } from './modules/finance/pages/AllJournalEntriesPage';
import { ProjectFinancialReportsPage } from './modules/finance/pages/ProjectFinancialReportsPage';
import { PurchaseOrderPage } from './modules/finance/pages/PurchaseOrderPage';
import { SmartForecastPage } from './modules/finance/pages/SmartForecastPage';

// Equipment Pages
import { EquipmentDashboard } from './modules/equipment/pages/EquipmentDashboard';
import { EquipmentListPage } from './modules/equipment/pages/EquipmentListPage';
import { EquipmentDispatchPage } from './modules/equipment/pages/EquipmentDispatchPage';

function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // Check for readonly mode in URL from portfolio
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'readonly') {
      sessionStorage.setItem('isReadOnly', 'true');
      // Clean up URL so it doesn't look messy
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [theme]);

  return (
    <Router>
      <Screensaver />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Master Data Routes */}
          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="master-data/company" element={<CompanyPage />} />
          <Route path="master-data/branch" element={<BranchPage />} />
          <Route path="master-data/cost-center" element={<CostCenterPage />} />
          
          <Route path="master-data/coa" element={<CoaPage />} />
          <Route path="master-data/tax" element={<TaxPage />} />
          <Route path="master-data/currency" element={<CurrencyPage />} />
          <Route path="master-data/bank" element={<BankPage />} />

          {/* Project Structure Routes */}
          <Route path="master-data/project" element={<ProjectPage />} />
          <Route path="master-data/area" element={<AreaPage />} />
          <Route path="master-data/work-package" element={<WorkPackagePage />} />
          <Route path="master-data/activity" element={<ActivityPage />} />

          {/* Stakeholders Routes */}
          <Route path="master-data/customer" element={<CustomerPage />} />
          <Route path="master-data/vendor" element={<VendorPage />} />

          {/* HR Routes */}
          <Route path="master-data/employee" element={<EmployeePage />} />
          <Route path="master-data/crew" element={<CrewPage />} />
          <Route path="master-data/shift" element={<ShiftPage />} />

          {/* Asset & Inventory Routes */}
          <Route path="master-data/warehouse" element={<WarehousePage />} />
          <Route path="master-data/rig" element={<RigPage />} />
          <Route path="master-data/equipment" element={<EquipmentMasterPage />} />
          <Route path="master-data/material" element={<MaterialPage />} />
          <Route path="master-data/inventory" element={<InventoryItemPage />} />

          {/* Project Management Routes */}
          <Route path="projects" element={<ProjectDashboard />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          
          {/* Finance Routes */}
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="finance/journals" element={<JournalPage />} />
          <Route path="finance/all-journals" element={<AllJournalEntriesPage />} />
          <Route path="finance/gl" element={<GeneralLedgerPage />} />
          <Route path="finance/ap-invoices" element={<ApInvoicePage />} />
          <Route path="finance/ar-invoices" element={<ArInvoicePage />} />
          <Route path="finance/billing" element={<BillingSchedulePage />} />
          <Route path="finance/reports" element={<FinancialReportsPage />} />
          <Route path="finance/project-reports" element={<ProjectFinancialReportsPage />} />
          <Route path="finance/smart-forecast" element={<SmartForecastPage />} />
          <Route path="smart-forecast" element={<SmartForecastPage />} />
          <Route path="finance/asset-depreciation" element={<AssetDepreciationReport />} />
          <Route path="finance/ar-aging" element={<ArAgingReport />} />
          <Route path="finance/ap-aging" element={<ApAgingReport />} />
          <Route path="finance/expenses" element={<ExpensePage />} />

          <Route path="procurement" element={<PurchaseOrderPage />} />
          <Route path="inventory">
            <Route index element={<InventoryDashboard />} />
            <Route path="balances" element={<StockBalancePage />} />
            <Route path="transactions" element={<InventoryTransactionList />} />
            <Route path="transactions/new" element={<InventoryTransactionForm />} />
          </Route>
          <Route path="equipment">
            <Route index element={<EquipmentDashboard />} />
            <Route path="list" element={<EquipmentListPage />} />
            <Route path="dispatch" element={<EquipmentDispatchPage />} />
          </Route>
          <Route path="assets">
            <Route index element={<FixedAssetDashboard />} />
            <Route path="list" element={<AssetManagementPage />} />
          </Route>
          <Route path="hr">
            <Route index element={<HRDashboard />} />
            <Route path="employees" element={<EmployeeListPage />} />
            <Route path="crews" element={<CrewListPage />} />
          </Route>
          
          {/* Documents */}
          <Route path="documents" element={<DocumentExplorerPage />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<GeneralSettings />} />
            <Route path="users" element={<UserRolesSettings />} />
            <Route path="appearance" element={<AppearanceSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="data" element={<DataManagementSettings />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
