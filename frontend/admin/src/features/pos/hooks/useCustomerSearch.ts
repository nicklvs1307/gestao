import { useState } from 'react';
import { searchCustomers } from '../../../services/api';
import { usePosStore } from './usePosStore';
import { toast } from 'sonner';

export const useCustomerSearch = (deliveryOrders: any[]) => {
    const pos = usePosStore();
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [customerAddresses, setCustomerAddresses] = useState<string[]>([]);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

    const handleSearchCustomer = async (term: string) => {
        setCustomerSearchTerm(term);
        if (term.length < 3) {
            setCustomerResults([]);
            return;
        }
        setIsSearchingCustomer(true);
        try {
            const results = await searchCustomers(term);
            setCustomerResults(results.customers || []);
        } catch (error) {
            console.error("Erro na busca:", error);
        } finally {
            setIsSearchingCustomer(false);
        }
    };

    const handleSelectCustomer = (customer: any) => {
        pos.setDeliveryInfo({
            ...pos.deliveryInfo,
            name: customer.name,
            phone: customer.phone,
            address: customer.address || ''
        });

        // VERIFICAÇÃO DE PEDIDO ATIVO
        const activeOrder = deliveryOrders.find(o => 
            (o.deliveryOrder?.phone === customer.phone || o.deliveryOrder?.name === customer.name) &&
            ['PENDING', 'PREPARING', 'READY'].includes(o.status)
        );

        if (activeOrder) {
            pos.setActiveDeliveryOrderId(activeOrder.id);
            toast.info(`Cliente possui pedido em aberto (#${activeOrder.dailyOrderNumber}). Itens serão adicionados a ele.`);
        } else {
            pos.setActiveDeliveryOrderId(null);
        }

        const historyAddresses = customer.deliveryOrders
            ?.map((o: any) => o.address)
            .filter((addr: string, i: number, self: string[]) => addr && self.indexOf(addr) === i) || [];
        
        if (customer.address && !historyAddresses.includes(customer.address)) {
            historyAddresses.unshift(customer.address);
        }
        setCustomerAddresses(historyAddresses);
        setCustomerResults([]);
        setCustomerSearchTerm('');
    };

    const handleSelectCounterCustomer = (customer: any) => {
        pos.setCustomerName(customer.name);
        if (customer.phone) {
            pos.setDeliveryInfo({
                ...pos.deliveryInfo,
                name: customer.name,
                phone: customer.phone,
                address: customer.address || 'Retirada no Balcão',
                deliveryType: 'retirada'
            });
        }
        setCustomerResults([]);
        setCustomerSearchTerm('');
    };

    return {
        customerSearchTerm,
        customerResults,
        customerAddresses,
        isSearchingCustomer,
        handleSearchCustomer,
        handleSelectCustomer,
        handleSelectCounterCustomer,
        setCustomerAddresses
    };
};
