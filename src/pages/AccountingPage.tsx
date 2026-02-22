import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CreditCard, BarChart3 } from "lucide-react";
import InvoicesTab from "@/components/accounting/InvoicesTab";
import PaymentsTab from "@/components/accounting/PaymentsTab";
import ReportsTab from "@/components/accounting/ReportsTab";

const AccountingPage = () => {
  const [tab, setTab] = useState("invoices");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Comptabilité</h1>
        <p className="text-muted-foreground text-sm">Factures, paiements et rapports financiers</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices" className="gap-2"><FileText className="h-4 w-4" /> Factures</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Paiements</TabsTrigger>
          <TabsTrigger value="reports" className="gap-2"><BarChart3 className="h-4 w-4" /> Rapports</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingPage;
