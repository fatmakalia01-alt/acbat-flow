# 📊 RAPPORT COMPLET DES FONCTIONNALITÉS - ACBAT ERP

## 🎯 Vue d'ensemble

**ACBAT ERP** est un système de gestion d'entreprise complet conçu pour les distributeurs et installateurs de portes blindées et systèmes de galandage. L'application intègre tous les aspects de la chaîne de valeur : de la création du devis à la facturation finale, en passant par la gestion du stock, le suivi des livraisons et l'installation sur chantier.

---

## 🏗️ Architecture technique

### Stack technologique
- **Frontend** : React 18 + TypeScript + Vite
- **UI/UX** : shadcn/ui + Radix UI + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + Realtime)
- **Fonctions Edge** : Deno pour opérations sensibles
- **État & Cache** : TanStack Query
- **PDF** : @react-pdf/renderer pour documents
- **Géolocalisation** : Google Maps API
- **Notifications** : Temps réel via Supabase Realtime

### Structure des dossiers
```
src/
├── components/          # Composants React réutilisables
├── pages/              # Pages de l'application
├── contexts/           # Contextes React (Auth)
├── hooks/              # Hooks personnalisés
├── integrations/       # Intégrations externes (Supabase)
├── lib/                # Utilitaires et helpers
└── assets/             # Images et fichiers statiques
```

---

## 👥 Système de rôles et permissions

### 🔴 MANAGER (Administrateur)
**Permissions** : Accès complet à toutes les fonctionnalités

**Fonctionnalités** :
- Créer/modifier/supprimer des utilisateurs
- Valider les commandes en dernier recours
- Accéder à tous les tableaux de bord
- Gérer la configuration système
- Visualiser les logs d'audit
- Gérer les délégations

**Dashboard spécifique** :
- KPIs globaux de l'entreprise
- Répartition des commandes par statut
- Alertes critiques et retards
- Performance par équipe

### 🟠 DIRECTEUR D'EXPLOITATION
**Permissions** : Supervision de tous les départements

**Fonctionnalités** :
- Valider les commandes (délégation manager)
- Superviser tous les workflows
- Accéder aux analytics avancés
- Gérer les délégations
- Coordination inter-départements

### 🟡 RESPONSABLE COMMERCIAL
**Permissions** : Gestion commerciale complète

**Fonctionnalités** :
- Créer et valider les devis
- Gérer le portefeuille clients
- Créer des commandes
- Suivre le pipeline de ventes
- Analytics des performances commerciales

**Actions quotidiennes** :
```typescript
// Créer un devis
const createQuote = async (clientId: string, products: Product[]) => {
  const quote = await supabase.from('quotes').insert({
    client_id: clientId,
    items: products,
    status: 'brouillon'
  })
  
  // Générer PDF du devis
  const pdf = await generateQuotePDF(quote)
  
  // Envoyer par email au client
  await sendQuoteEmail(clientId, pdf)
}
```

### 🟢 COMMERCIAL
**Permissions** : Gestion de son portefeuille

**Fonctionnalités** :
- Créer des devis pour ses clients
- Suivre ses commandes en cours
- Mettre à jour les informations clients
- Consulter son tableau de performance

### 🔵 RESPONSABLE ACHAT
**Permissions** : Gestion des achats et stock

**Fonctionnalités** :
- Gérer les fournisseurs italiens
- Créer des commandes fournisseurs
- Suivre les importations (douane, transit)
- Gérer les niveaux de stock
- Négocier les prix d'achat

**Workflow achat** :
```typescript
// Créer commande fournisseur
const createPurchaseOrder = async (supplierId: string, items: Item[]) => {
  const po = await supabase.from('purchase_orders').insert({
    supplier_id: supplierId,
    status: 'brouillon',
    estimated_arrival: addDays(30),
    total_amount_eur: calculateTotal(items)
  })
  
  // Suivre statut import
  await trackImportStatus(po.id)
}
```

### 🟣 RESPONSABLE LOGISTIQUE
**Permissions** : Gestion des livraisons

**Fonctionnalités** :
- Planifier les tournées de livraison
- Assigner les chauffeurs
- Suivre les statuts de livraison
- Optimiser les routes
- Gérer les retours et incidents

### 🟤 RESPONSABLE TECHNIQUE
**Permissions** : Gestion des installations

**Fonctionnalités** :
- Planifier les chantiers
- Assigner les équipes techniques
- Suivre la qualité des installations
- Gérer les planning techniques
- Valider les installations

### ⚫ TECHNICIEN MONTAGE
**Permissions** : Accès à ses chantiers

**Fonctionnalités** :
- Consulter ses chantiers assignés
- Mettre à jour le statut d'installation
- Prendre des photos avant/après
- Signaler des problèmes techniques
- Valider la fin d'installation

### 🟠 RESPONSABLE SAV
**Permissions** : Gestion du support client

**Fonctionnalités** :
- Gérer les tickets de support
- Assigner les interventions
- Suivre la satisfaction client
- Créer des rapports SAV
- Gérer les garanties

### 🔴 RESPONSABLE COMPTABLE
**Permissions** : Gestion financière

**Fonctionnalités** :
- Créer et émettre des factures
- Suivre les paiements
- Gérer les échéances
- Créer des rapports financiers
- Gérer le recouvrement

### 🟡 CLIENT (Portail)
**Permissions** : Accès à ses données uniquement

**Fonctionnalités** :
- Suivre ses commandes en temps réel
- Télécharger ses documents (devis, factures, BL)
- Créer des tickets SAV
- Consulter l'historique de ses commandes

### 🟢 LIVREUR
**Permissions** : Accès aux livraisons assignées

**Fonctionnalités** :
- Voir ses livraisons du jour
- Mettre à jour le statut de livraison
- Collecter les signatures
- Prendre des photos de livraison
- Navigation GPS vers les clients

---

## 🔄 Workflow complet de suivi des commandes

### Étape 1: Création de la commande
**Acteurs**: Commercial / Responsable Commercial  
**Statut**: `brouillon` → `en_validation`

**Processus** :
1. Sélection du client et du site
2. Ajout des produits avec quantités
3. Calcul automatique des totaux (HT, TVA, TTC)
4. Définition du délai initial
5. Enregistrement en brouillon
6. Lancement vers validation

**Code** :
```typescript
const createOrder = async (orderData: OrderData) => {
  // Créer la commande
  const { data: order } = await supabase
    .from('client_orders')
    .insert({
      client_id: orderData.clientId,
      site_id: orderData.siteId,
      status: 'brouillon',
      initial_delay_days: orderData.delayDays,
      created_by: user.id
    })
    .select()
    .single()

  // Créer les items
  for (const item of orderData.items) {
    await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price_ht: item.priceHt,
      total_ht: item.quantity * item.priceHt,
      total_ttc: item.quantity * item.priceTtc
    })
  }

  // Calculer les totaux
  await updateOrderTotals(order.id)
  
  // Déclencher le workflow
  if (orderData.launchImmediately) {
    await launchOrder(order.id)
  }
}
```

### Étape 2: Validation commerciale
**Acteurs**: Responsable Commercial / Manager  
**Statut**: `en_validation` → `validee`

**Processus** :
1. Réception notification de nouvelle commande
2. Vérification du devis et des conditions
3. Validation commerciale
4. Passage en commande validée
5. Déclenchement du workflow technique

**Notifications** :
```typescript
// Notification au manager
await supabase.rpc('notify_management', {
  p_title: 'Nouvelle commande à valider',
  p_message: `Commande ${order.reference} en attente de validation`,
  p_type: 'info',
  p_order_id: order.id
})
```

### Étape 3: Commande fournisseur
**Acteurs**: Responsable Achat  
**Statut**: `validee` → `en_commande_fournisseur`

**Processus** :
1. Réception de la commande validée
2. Création de la commande fournisseur
3. Envoi au fournisseur italien
4. Suivi de la production et de l'expédition
5. Gestion du transport et de la douane

**Suivi import** :
```typescript
const trackSupplierOrder = async (orderId: string) => {
  const statusFlow = [
    'brouillon',
    'en_commande', 
    'en_transit',
    'en_douane',
    'receptionne'
  ]
  
  // Mise à jour automatique du statut
  await supabase.from('purchase_orders')
    .update({ status: 'en_transit' })
    .eq('id', orderId)
    
  // Notification du changement
  await notifyStatusChange(orderId, 'Commande en transit vers la Tunisie')
}
```

### Étape 4: Réception marchandises
**Acteurs**: Responsable Logistique  
**Statut**: `en_commande_fournisseur` → `en_reception`

**Processus** :
1. Notification d'arrivée au port
2. Dédouanement et contrôle
3. Réception en entrepôt
4. Contrôle qualité
5. Mise à jour du stock

**Mise à jour stock** :
```typescript
const receiveGoods = async (receptionData: ReceptionData) => {
  // Créer mouvement de stock
  await supabase.from('stock_movements').insert({
    product_id: receptionData.productId,
    quantity: receptionData.quantity,
    type: 'in',
    reason: 'Réception fournisseur'
  })
  
  // Mettre à jour le stock
  await supabase.from('stock')
    .update({ quantity: stock.quantity + receptionData.quantity })
    .eq('product_id', receptionData.productId)
}
```

### Étape 5: Préparation technique
**Acteurs**: Responsable Technique  
**Statut**: `en_reception` → `en_preparation`

**Processus** :
1. Planification du chantier
2. Préparation des kits d'installation
3. Assignation de l'équipe technique
4. Planification du rendez-vous client
5. Préparation du matériel nécessaire

### Étape 6: Livraison & Installation
**Acteurs**: Chauffeur / Technicien  
**Statut**: `en_preparation` → `en_livraison`

**Processus** :
1. Chargement du matériel
2. Livraison chez le client
3. Installation par l'équipe technique
4. Photos avant/après
5. Signature de réception client
6. Validation technique

**Application mobile** :
```typescript
const completeInstallation = async (installationData: InstallationData) => {
  // Prendre photo avant
  const beforePhoto = await takePhoto('before')
  
  // Réaliser l'installation
  await performInstallation(installationData)
  
  // Prendre photo après
  const afterPhoto = await takePhoto('after')
  
  // Collecter signature client
  const clientSignature = await collectSignature()
  
  // Mettre à jour le statut
  await supabase.from('deliveries').update({
    status: 'livree',
    photo_before_url: beforePhoto,
    photo_after_url: afterPhoto,
    pv_signed: true
  })
}
```

### Étape 7: Validation client
**Acteurs**: Client  
**Statut**: `en_livraison` → `livree`

**Processus** :
1. Inspection de l'installation par le client
2. Test de fonctionnement
3. Signature du procès-verbal
4. Feedback de satisfaction
5. Clôture de l'intervention

### Étape 8: Facturation & Paiement
**Acteurs**: Responsable Comptable  
**Statut**: `livree` → `en_facturation`

**Processus** :
1. Création de la facture finale
2. Envoi au client
3. Suivi du paiement
4. Gestion des échéances
5. Relances si nécessaire

**Génération facture** :
```typescript
const generateInvoice = async (orderId: string) => {
  // Récupérer les données de la commande
  const order = await getOrderDetails(orderId)
  
  // Créer la facture
  const invoice = await supabase.from('invoices').insert({
    order_id: orderId,
    client_id: order.client_id,
    reference: generateInvoiceReference(),
    total_ht: order.total_ht,
    tva_amount: order.tva_amount,
    total_ttc: order.total_ttc,
    due_date: addDays(30)
  })
  
  // Générer PDF
  const pdf = await generateInvoicePDF(invoice)
  
  // Envoyer par email
  await sendInvoiceEmail(order.client_id, pdf)
}
```

### Étape 9: Clôture & Archivage
**Acteurs**: Manager / Directeur  
**Statut**: `en_facturation` → `cloturee`

**Processus** :
1. Vérification du paiement
2. Clôture comptable
3. Archivage des documents
4. Mise à jour des statistiques
5. Feedback final

---

## 📱 Interfaces par rôle

### Interface Manager
```tsx
const ManagerDashboard = () => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="CA Mensuel" value="125 000 DT" trend="+12%" />
        <KPICard title="Commandes actives" value="47" trend="+5" />
        <KPICard title="Retards" value="3" trend="-2" />
        <KPICard title="Satisfaction" value="94%" trend="+2%" />
      </div>
      
      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RevenueChart />
        <OrderStatusChart />
      </div>
      
      {/* Alertes */}
      <AlertPanel alerts={criticalAlerts} />
      
      {/* Tableau des commandes */}
      <OrdersTable orders={recentOrders} />
    </div>
  )
}
```

### Interface Commercial
```tsx
const CommercialDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Mes statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Mes devis" value="12" subtext="3 en attente" />
        <MetricCard title="Mes commandes" value="8" subtext="2 en retard" />
        <MetricCard title="Taux conversion" value="66%" subtext="+5% vs mois dernier" />
      </div>
      
      {/* Pipeline de ventes */}
      <SalesPipeline prospects={prospects} />
      
      {/* Actions rapides */}
      <QuickActions>
        <Button onClick={() => createQuote()}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau devis
        </Button>
        <Button variant="outline" onClick={() => viewClients()}>
          <Users className="mr-2 h-4 w-4" />
          Mes clients
        </Button>
      </QuickActions>
      
      {/* Mes commandes récentes */}
      <MyRecentOrders orders={myRecentOrders} />
    </div>
  )
}
```

### Interface Client (Portail)
```tsx
const ClientPortal = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header client */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl">
        <h1 className="text-3xl font-bold">Bonjour, {clientName} 👋</h1>
        <p className="text-blue-100 mt-2">Votre espace ACBAT - Suivi de vos projets</p>
      </div>
      
      {/* Sélecteur de commande */}
      <OrderSelector orders={clientOrders} onSelect={setSelectedOrder} />
      
      {/* Timeline de la commande */}
      {selectedOrder && (
        <OrderTimeline order={selectedOrder} />
      )}
      
      {/* Documents */}
      <DocumentSection order={selectedOrder}>
        <DocumentDownload type="devis" onDownload={downloadQuote} />
        <DocumentDownload type="bon_livraison" onDownload={downloadDelivery} />
        <DocumentDownload type="facture" onDownload={downloadInvoice} />
      </DocumentSection>
      
      {/* Support */}
      <SupportSection onCreateTicket={createSupportTicket} />
    </div>
  )
}
```

---

## 🔔 Système de notifications

### Types de notifications

#### 1. Info (Bleu)
**Utilisation** : Informations générales, changements de statut
```typescript
const infoNotification = {
  type: 'info',
  title: 'Commande créée',
  message: 'La commande CMD-2026-015 a été créée avec succès',
  icon: <Info className="text-blue-500" />
}
```

#### 2. Alerte délai (Orange)
**Utilisation** : Approche d'une échéance
```typescript
const deadlineAlert = {
  type: 'alerte_delai',
  title: 'Échéance proche',
  message: 'L\'étape "Préparation technique" arrive à échéance dans 2 jours',
  icon: <Clock className="text-orange-500" />
}
```

#### 3. Dépassement (Rouge)
**Utilisation** : Délai dépassé - Action urgente requise
```typescript
const overdueAlert = {
  type: 'depassement',
  title: 'Délai dépassé',
  message: 'L\'étape "Livraison" de la commande CMD-2026-015 est en retard',
  icon: <AlertTriangle className="text-red-500" />,
  alert_level: 'rouge_clignotant'
}
```

#### 4. Transition (Violet)
**Utilisation** : Changement d'étape dans le workflow
```typescript
const transitionNotification = {
  type: 'transition',
  title: 'Étape terminée',
  message: 'Passage à l\'étape "Installation" pour la commande CMD-2026-015',
  icon: <Zap className="text-purple-500" />
}
```

### Système de monitoring des délais

```typescript
// Hook de surveillance des délais
const useDeadlineMonitor = () => {
  useEffect(() => {
    const checkDeadlines = async () => {
      const overdueSteps = await supabase
        .from('order_workflow_steps')
        .select('*')
        .eq('status', 'in_progress')
        .lt('due_date', new Date().toISOString())

      overdueSteps.data?.forEach(step => {
        // Marquer comme retardé
        markAsDelayed(step.id)
        
        // Jouer un son d'alerte
        playAlertSound()
        
        // Créer notification
        createNotification({
          user_id: getResponsibleUser(step.responsible_role),
          title: '⚠️ Délai dépassé',
          message: `L\'étape "${step.step_name}" a dépassé son délai`,
          type: 'depassement',
          action_required: true,
          action_type: 'report_delay'
        })
      })
    }

    // Vérifier toutes les minutes
    const interval = setInterval(checkDeadlines, 60000)
    return () => clearInterval(interval)
  }, [])
}
```

---

## 📊 Analytics et reporting

### KPIs principaux

#### Performance commerciale
- **Taux de conversion** : Devis → Commandes
- **CA par commercial** : Mensuel/annuel
- **Panier moyen** : Par client et par commande
- **Délai moyen** : Devis → Commande validée

#### Performance opérationnelle
- **Délai moyen** : Commande → Livraison
- **Taux de retard** : Par étape du workflow
- **Productivité** : Commandes par équipe
- **Qualité** : Taux de retour/SAV

#### Performance financière
- **CA mensuel** : Evolution vs objectifs
- **Marge par produit** : Analyse par référence
- **Délai de paiement** : Moyenne clientèle
- **Impayés** : Montant et ancienneté

### Dashboards interactifs

```typescript
const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('month')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex justify-between items-center">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
        <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
      </div>
      
      {/* Grille de graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart dateRange={dateRange} />
        <OrderStatusChart dateRange={dateRange} />
        <ProductPerformanceChart metric={selectedMetric} />
        <TeamPerformanceChart dateRange={dateRange} />
      </div>
      
      {/* Tableau détaillé */}
      <DetailedMetricsTable dateRange={dateRange} />
    </div>
  )
}
```

### Rapports automatisés

#### Rapport hebdomadaire (Email)
```typescript
const generateWeeklyReport = async () => {
  const report = {
    period: 'Semaine du 15/01 au 21/01/2026',
    kpis: {
      newOrders: 12,
      completedOrders: 8,
      revenue: '96 500 DT',
      averageDelay: '2.3 jours'
    },
    alerts: [
      '3 commandes en retard de livraison',
      'Stock critique sur références D6',
      '2 clients en retard de paiement'
    ],
    nextWeek: {
      plannedDeliveries: 15,
      expectedRevenue: '125 000 DT',
      priorityActions: ['Finaliser commandes fournisseurs', 'Planifier équipes techniques']
    }
  }
  
  await sendEmailToManagers(report)
}
```

---

## 🔧 Configuration et paramètres

### Configuration des délais par défaut

```typescript
// config/workflow.config.ts
export const WORKFLOW_DELAYS = {
  creation_commande: 2,           // 2 jours
  validation_commerciale: 1,      // 1 jour
  commande_fournisseur: 30,      // 30 jours (import Italie)
  reception_marchandises: 2,      // 2 jours
  preparation_technique: 3,       // 3 jours
  livraison_installation: 1,      // 1 jour
  validation_client: 0,           // Immédiat
  facturation_paiement: 7,        // 7 jours
  cloture_archivage: 0           // Immédiat
}

export const ALERT_THRESHOLDS = {
  warning: 2,    // Alerte 2 jours avant l'échéance
  critical: 0    // Alerte critique à l'échéance
}
```

### Configuration des emails

```typescript
// config/email.config.ts
export const EMAIL_TEMPLATES = {
  newOrder: {
    subject: 'Nouvelle commande #{reference} créée',
    template: 'emails/new-order.html',
    variables: ['reference', 'client_name', 'total_amount']
  },
  orderValidated: {
    subject: 'Votre commande #{reference} est validée',
    template: 'emails/order-validated.html',
    variables: ['reference', 'client_name', 'estimated_delivery']
  },
  deliveryScheduled: {
    subject: 'Livraison programmée pour le {delivery_date}',
    template: 'emails/delivery-scheduled.html',
    variables: ['reference', 'delivery_date', 'delivery_time']
  }
}
```

### Configuration des permissions

```typescript
// config/permissions.config.ts
export const ROLE_PERMISSIONS = {
  manager: {
    users: ['create', 'read', 'update', 'delete'],
    orders: ['create', 'read', 'update', 'delete'],
    invoices: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update']
  },
  commercial: {
    clients: ['create', 'read', 'update'],
    quotes: ['create', 'read', 'update'],
    orders: ['create', 'read', 'update'],
    my_clients: ['read', 'update']
  },
  client: {
    my_orders: ['read'],
    my_documents: ['read'],
    support_tickets: ['create', 'read']
  }
}
```

---

## 🚀 Installation et déploiement

### Prérequis
- Node.js 18+ 
- PostgreSQL 14+
- Supabase CLI
- Git

### Installation locale

```bash
# 1. Cloner le repository
git clone https://github.com/votre-org/acbat-erp.git
cd acbat-erp

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Modifier les variables dans .env

# 4. Configurer Supabase
supabase init
supabase db push

# 5. Lancer l'application
npm run dev
```

### Variables d'environnement

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email configuration
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your-email@gmail.com
VITE_SMTP_PASSWORD=your-app-password

# App configuration
VITE_APP_NAME=ACBAT ERP
VITE_APP_URL=http://localhost:5173
VITE_SUPPORT_EMAIL=support@acbat.tn
```

### Déploiement production

```bash
# Build de production
npm run build

# Tests
npm run test
npm run test:e2e

# Déploiement
npm run deploy

# Migration base de données
supabase db push --env production
```

---

## � Slider de présentation (intégration dans l’application)

### Objectif
Présenter ACBAT ERP en 5 slides avec un carrousel interactif intégré à l’interface (page d’accueil ou dashboard).

### Composant slider
```tsx
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const slides = [
  {
    id: 1,
    title: "Bienvenue dans ACBAT ERP",
    subtitle: "La solution complète pour votre gestion d'entreprise",
    description:
      "Suivez vos commandes, votre stock, vos livraisons et votre SAV dans une seule interface.",
    color: "from-blue-600 to-purple-600",
  },
  {
    id: 2,
    title: "Workflow de commandes automatisé",
    subtitle: "9 étapes maîtrisées de bout en bout",
    description:
      "De la création du devis jusqu'à la facturation, chaque étape est tracée et notifiée.",
    color: "from-emerald-600 to-teal-600",
  },
  {
    id: 3,
    title: "Rôles et permissions avancés",
    subtitle: "Chaque utilisateur voit ce qui le concerne",
    description:
      "Manager, commercial, logistique, technique, comptabilité, client… chacun a son espace dédié.",
    color: "from-orange-500 to-red-600",
  },
  {
    id: 4,
    title: "Suivi temps réel",
    subtitle: "Prenez les bonnes décisions au bon moment",
    description:
      "Dashboards, alertes de retard, notifications : vous gardez toujours le contrôle sur vos commandes.",
    color: "from-indigo-600 to-sky-600",
  },
  {
    id: 5,
    title: "Portail client moderne",
    subtitle: "Une expérience premium pour vos clients",
    description:
      "Ils suivent leurs projets, téléchargent leurs documents et ouvrent des tickets SAV en autonomie.",
    color: "from-slate-800 to-slate-900",
  },
]

export function PresentationSlider() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(id)
  }, [isPlaying])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl shadow-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="w-full flex-shrink-0">
              <Card
                className={`bg-gradient-to-br ${slide.color} text-white p-8 h-[360px] md:h-[420px]`}
              >
                <div className="flex flex-col md:flex-row items-center justify-between h-full gap-8">
                  <div className="flex-1">
                    <h2 className="text-3xl md:text-4xl font-bold mb-3">
                      {slide.title}
                    </h2>
                    <h3 className="text-lg md:text-xl mb-4 opacity-90">
                      {slide.subtitle}
                    </h3>
                    <p className="text-sm md:text-base opacity-80 mb-6 max-w-xl">
                      {slide.description}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button size="sm" variant="secondary">
                        Découvrir le dashboard
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/15 text-white border-white/30"
                      >
                        Voir le suivi des commandes
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 hidden md:flex items-center justify-center">
                    <div className="bg-white/15 rounded-xl p-4 w-full max-w-md backdrop-blur-sm border border-white/20">
                      <div className="aspect-video rounded-lg bg-black/30 flex items-center justify-center">
                        <span className="text-sm md:text-base text-white/70">
                          Aperçu visuel : {slide.title}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/25 hover:bg-black/40 rounded-full p-2 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/25 hover:bg-black/40 rounded-full p-2 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={() => setIsPlaying((p) => !p)}
          className="absolute top-3 right-3 bg-black/25 hover:bg-black/40 rounded-full p-2 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white" />
          )}
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentSlide
                  ? "bg-white scale-110"
                  : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 text-center text-xs text-muted-foreground">
        Slide {currentSlide + 1} sur {slides.length}
      </div>
    </div>
  )
}
```

### Utilisation dans une page
```tsx
import { PresentationSlider } from "@/components/PresentationSlider"

export default function Index() {
  return (
    <div className="p-6 space-y-8">
      <PresentationSlider />
    </div>
  )
}
```

---

## �📞 Support et maintenance

### Maintenance préventive
- **Sauvegardes automatiques** quotidiennes
- **Monitoring** des performances
- **Mise à jour** régulière des dépendances
- **Audit de sécurité** mensuel

### Support technique
- **Documentation** complète
- **Formation** des utilisateurs
- **Hotline** dédiée
- **Tickets de support** intégrés

### Évolution et améliorations
- **Roadmap** consultable
- **Feedback** utilisateurs collecté
- **Mises à jour** régulières
- **Nouvelles fonctionnalités** planifiées

---

## 🎯 Conclusion

ACBAT ERP est une solution complète qui transforme la gestion d'entreprise avec :

✅ **Automatisation** complète des processus  
✅ **Visibilité** en temps réel sur toutes les opérations  
✅ **Collaboration** optimisée entre les équipes  
✅ **Satisfaction client** améliorée via le portail dédié  
✅ **Croissance** facilitée par les analytics et rapports  
✅ **Sécurité** renforcée avec gestion granulaire des accès  
✅ **Évolutivité** assurée par l'architecture moderne  

L'application est **prête pour la production** avec une architecture scalable et sécurisée. Elle répond aux besoins spécifiques du secteur des portes blindées et systèmes de galandage tout en restant adaptable à d'autres métiers du bâtiment.

**Pour démarrer** : [http://localhost:5173](http://localhost:5173)  
**Documentation technique** : Disponible sur demande  
**Support** : support@acbat.tn
