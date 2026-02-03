import React from 'react';
import type { Order } from '../types'; 
import { format } from 'date-fns';

export interface ReceiptSettings {
  showLogo: boolean;
  showAddress: boolean;
  fontSize: 'small' | 'medium' | 'large';
  headerText: string;
  footerText: string;
}

interface ReceiptPreviewProps {
  settings: ReceiptSettings;
  dummyOrder?: boolean; // Se true, mostra dados falsos para preview
  restaurantName: string;
  restaurantAddress?: string;
  logoUrl?: string;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ 
  settings, 
  dummyOrder = false, 
  restaurantName,
  restaurantAddress,
  logoUrl 
}) => {
  
  // Dados Mockados para Visualização
  const mockItems = [
    { qty: 1, name: 'X-Bacon Artesanal', price: 28.90, obs: 'Sem cebola', addons: ['Bacon Extra'] },
    { qty: 2, name: 'Coca-Cola Lata', price: 6.00, obs: '', addons: [] },
  ];

  // Configuração de Estilos Baseados nas Settings
  const getFontSize = () => {
    switch(settings.fontSize) {
      case 'small': return '10px';
      case 'large': return '14px';
      default: return '12px';
    }
  };

  return (
    <div className="receipt-preview-wrapper shadow-2xl border border-gray-300 bg-white mx-auto" style={{ width: '302px', minHeight: '400px', padding: '10px', fontFamily: '"Courier New", Courier, monospace', color: '#000' }}>
      
      {/* Cabeçalho */}
      <div className="text-center mb-4 border-b border-dashed border-black pb-2">
        {settings.showLogo && logoUrl && (
          <div className="mb-2 flex justify-center grayscale contrast-200">
             <img src={logoUrl} alt="Logo" style={{ maxHeight: '60px', maxWidth: '100%' }} />
          </div>
        )}
        
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{restaurantName || 'NOME DO RESTAURANTE'}</h2>
        
        {settings.showAddress && (
           <p style={{ fontSize: '11px', margin: '5px 0' }}>{restaurantAddress || 'Endereço Completo, 123'}</p>
        )}

        {settings.headerText && (
            <p style={{ fontSize: '11px', margin: '5px 0', whiteSpace: 'pre-wrap' }}>{settings.headerText}</p>
        )}
        
        <p style={{ fontSize: '10px', marginTop: '5px' }}>{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      </div>

      {/* Info Pedido */}
      <div className="mb-2 pb-2 border-b border-dashed border-black">
         <p style={{ fontWeight: 'bold', fontSize: '14px' }}>SENHA: 1042</p>
         <p>MESA 05</p>
         <p>Cliente: João Silva</p>
      </div>

      {/* Itens */}
      <table style={{ width: '100%', fontSize: getFontSize() }}>
        <thead>
           <tr style={{ textAlign: 'left' }}>
             <th style={{ width: '10%' }}>Qtd</th>
             <th style={{ width: '60%' }}>Item</th>
             <th style={{ width: '30%', textAlign: 'right' }}>R$</th>
           </tr>
        </thead>
        <tbody>
           {mockItems.map((item, idx) => (
             <React.Fragment key={idx}>
               <tr style={{ verticalAlign: 'top' }}>
                 <td>{item.qty}x</td>
                 <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                 <td style={{ textAlign: 'right' }}>{(item.price * item.qty).toFixed(2).replace('.', ',')}</td>
               </tr>
               {item.addons.map((addon, i) => (
                 <tr key={`add-${i}`}>
                    <td></td>
                    <td style={{ fontSize: '0.9em' }}>+ {addon}</td>
                    <td></td>
                 </tr>
               ))}
               {item.obs && (
                 <tr>
                    <td></td>
                    <td style={{ fontSize: '0.9em', fontStyle: 'italic' }}>Obs: {item.obs}</td>
                    <td></td>
                 </tr>
               )}
               <tr><td colSpan={3} style={{ height: '5px' }}></td></tr>
             </React.Fragment>
           ))}
        </tbody>
      </table>

      {/* Totais */}
      <div className="mt-4 pt-2 border-t border-dashed border-black text-right" style={{ fontSize: getFontSize() }}>
         <p>Subtotal: 40,90</p>
         <p>Taxa Entrega: 5,00</p>
         <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '5px 0' }}>TOTAL: 45,90</p>
      </div>

      {/* Rodapé */}
      <div className="mt-4 text-center" style={{ fontSize: '10px' }}>
         {settings.footerText && (
            <p style={{ marginBottom: '5px', whiteSpace: 'pre-wrap' }}>{settings.footerText}</p>
         )}
         <p>*** NÃO É DOCUMENTO FISCAL ***</p>
         <p>Sistema: CardapioDigital</p>
      </div>

    </div>
  );
};

export default ReceiptPreview;
