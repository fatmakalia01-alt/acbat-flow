import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Styles pour le PDF
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    logo: {
        width: 100,
        height: 40,
    },
    titleContainer: {
        alignItems: 'right',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a365d',
    },
    infoSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    infoBox: {
        width: '45%',
    },
    infoTitle: {
        fontSize: 8,
        color: '#718096',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    table: {
        marginTop: 20,
        width: 'auto',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingVertical: 5,
        minHeight: 25,
    },
    tableHeader: {
        backgroundColor: '#F7FAFC',
        fontWeight: 'bold',
    },
    col1: { width: '40%' },
    col2: { width: '15%', textAlign: 'center' },
    col3: { width: '20%', textAlign: 'right' },
    col4: { width: '25%', textAlign: 'right' },
    totals: {
        marginTop: 30,
        alignItems: 'right',
        paddingRight: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 5,
    },
    totalLabel: {
        width: 100,
        textAlign: 'right',
        color: '#718096',
    },
    totalVal: {
        width: 100,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    grandTotal: {
        fontSize: 14,
        color: '#1a365d',
        borderTopWidth: 1,
        borderTopColor: '#1a365d',
        paddingTop: 5,
        marginTop: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#A0AEC0',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 10,
    }
});

interface OrderPDFProps {
    order: any;
    items: any[];
    type: 'devis' | 'facture';
}

const OrderPDF = ({ order, items, type }: OrderPDFProps) => {
    const isQuote = type === 'devis';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold' }}>ACBAT Flow</Text>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{isQuote ? 'DEVIS' : 'FACTURE'}</Text>
                        <Text>N° {order.reference}</Text>
                        <Text>Date: {format(new Date(order.created_at || new Date()), 'dd/MM/yyyy', { locale: fr })}</Text>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>De:</Text>
                        <Text style={{ fontWeight: 'bold' }}>ACBAT SERVICE</Text>
                        <Text>123 Rue de l'Industrie</Text>
                        <Text>Tunis, Tunisie</Text>
                        <Text>MF: 1234567/A/P/M/000</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>Destinataire:</Text>
                        <Text style={{ fontWeight: 'bold' }}>{order.clients?.full_name}</Text>
                        {order.clients?.company_name && <Text>{order.clients.company_name}</Text>}
                        <Text>{order.clients?.address || 'Adresse non renseignée'}</Text>
                        <Text>Tél: {order.clients?.phone || '-'}</Text>
                    </View>
                </View>

                {/* Table Articles */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.col1}>Description</Text>
                        <Text style={styles.col2}>Qté</Text>
                        <Text style={styles.col3}>P.U. HT</Text>
                        <Text style={styles.col4}>Total TTC</Text>
                    </View>

                    {items.map((item, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.col1}>{item.products?.name || item.description}</Text>
                            <Text style={styles.col2}>{item.quantity}</Text>
                            <Text style={styles.col3}>{(item.unit_price_ht || 0).toLocaleString('fr-TN')} TND</Text>
                            <Text style={styles.col4}>{(item.total_ttc || 0).toLocaleString('fr-TN')} TND</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total HT:</Text>
                        <Text style={styles.totalVal}>{(order.total_ht || 0).toLocaleString('fr-TN')} TND</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TVA (19%):</Text>
                        <Text style={styles.totalVal}>{(order.tva_amount || 0).toLocaleString('fr-TN')} TND</Text>
                    </View>
                    <View style={[styles.totalRow, styles.grandTotal]}>
                        <Text style={[styles.totalLabel, { color: '#000' }]}>TOTAL TTC:</Text>
                        <Text style={[styles.totalVal, { color: '#000' }]}>{(order.total_ttc || 0).toLocaleString('fr-TN')} TND</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>SARL ACBAT SERVICE - Capital 10.000 DT - RC: B123452023 - Tunis</Text>
                    <Text>Merci de votre confiance !</Text>
                </View>
            </Page>
        </Document>
    );
};

export default OrderPDF;
