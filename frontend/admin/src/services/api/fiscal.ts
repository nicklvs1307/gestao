import apiClient from './client';

export interface Invoice {
    id: string;
    restaurantId: string;
    orderId?: string;
    type: string;
    status: string;
    number?: number;
    series?: number;
    accessKey?: string;
    protocol?: string;
    xml?: string;
    xmlUrl?: string;
    pdfUrl?: string;
    errorMessage?: string;
    attemptLog?: Array<{ attempt: number; timestamp: string; error?: string; status: string }>;
    ccorrectionCount?: number;
    lastCorrection?: string;
    issuedAt: string;
    updatedAt: string;
}

export interface FiscalConfig {
    companyName?: string;
    cnpj?: string;
    ie?: string;
    im?: string;
    taxRegime?: string;
    state?: string;
    city?: string;
    ibgeCode?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    zipCode?: string;
    emissionMode?: string;
    environment?: string;
    cscId?: string;
    cscToken?: string;
    certificate?: string;
    provider?: string;
}

export interface CertificateStatus {
    installed: boolean;
    valid?: boolean;
    expiresAt?: string;
    daysUntilExpiry?: number;
    subject?: string;
    isExpired?: boolean;
    warning?: boolean;
}

export interface MonthlyReport {
    period: { month: number; year: number };
    summary: {
        total: number;
        authorized: number;
        rejected: number;
        pending: number;
        canceled: number;
        successRate: number;
    };
    invoices: Invoice[];
}

export interface QueueStatus {
    pending: number;
    processing: number;
    failed: number;
    completed: number;
}

export interface RateLimitStatus {
    count: number;
    threshold: number;
    windowMs: number;
    firstRejectionAt?: string;
}

// === Configuração ===

export const getFiscalConfig = async (): Promise<FiscalConfig> => {
    const response = await apiClient.get('/fiscal/config');
    return response.data;
};

export const saveFiscalConfig = async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/fiscal/config', data);
    return response.data;
};

// === Certificado ===

export const uploadCertificate = async (file: File, password: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    const response = await apiClient.post('/fiscal/config/certificate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const getCertificateStatus = async (): Promise<CertificateStatus> => {
    const response = await apiClient.get('/fiscal/config/status');
    return response.data;
};

// === Notas Fiscais ===

export const emitInvoice = async (orderId: string) => {
    const response = await apiClient.post('/fiscal/invoices/emit', { orderId });
    return response.data;
};

export const getInvoices = async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const response = await apiClient.get('/fiscal/invoices', { params });
    return response.data;
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/fiscal/invoices/${id}`);
    return response.data;
};

export const cancelInvoice = async (invoiceId: string, reason: string) => {
    const response = await apiClient.post('/fiscal/invoices/cancel', { invoiceId, reason });
    return response.data;
};

export const inutilizeInvoice = async (nNFInicio: number, nNFFim: number, reason: string) => {
    const response = await apiClient.post('/fiscal/invoices/inutilize', { nNFInicio, nNFFim, reason });
    return response.data;
};

export const sendCartaCorrecao = async (invoiceId: string, corrections: string) => {
    const response = await apiClient.post('/fiscal/invoices/carta-correcao', { invoiceId, corrections });
    return response.data;
};

// === Consultas ===

export const consultReceipt = async (recibo: string) => {
    const response = await apiClient.get(`/fiscal/consult/${recibo}`);
    return response.data;
};

// === Relatórios ===

export const getMonthlyReport = async (month: number, year: number): Promise<MonthlyReport> => {
    const response = await apiClient.get('/fiscal/reports/monthly', { params: { month, year } });
    return response.data;
};

export const exportMonthlyXmls = async (month: number, year: number) => {
    const response = await apiClient.get(`/fiscal/invoices/export/${month}/${year}`, {
        responseType: 'blob'
    });
    return response.data;
};

// === PDF ===

export const generatePdf = async (invoiceId: string) => {
    const response = await apiClient.get(`/fiscal/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
    });
    return response.data;
};

// === Validações ===

export const validateCnpj = async (cnpj: string) => {
    const response = await apiClient.get(`/fiscal/validate-cnpj/${cnpj}`);
    return response.data;
};

export const searchCep = async (cep: string) => {
    const response = await apiClient.get(`/fiscal/cep/${cep}`);
    return response.data;
};

// === Rate Limit ===

export const getRateLimitStatus = async (): Promise<RateLimitStatus> => {
    const response = await apiClient.get('/fiscal/rate-limit/status');
    return response.data;
};

// === Fila de Retry ===

export const getQueueStatus = async (): Promise<QueueStatus> => {
    const response = await apiClient.get('/fiscal/queue/status');
    return response.data;
};

export const retryManual = async (orderId: string) => {
    const response = await apiClient.post('/fiscal/queue/retry', { orderId });
    return response.data;
};
