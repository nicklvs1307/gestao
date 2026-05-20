import { useEffect, useRef } from 'react';
import { useIfoodSettings } from '../hooks/useIfoodSettings';

const WIDGET_ID = 'abb71967-b6f1-4c3e-bfa7-68b432ea00c7';
const WIDGET_SCRIPT_URL = 'https://widgets.ifood.com.br/widget.js';

let scriptLoaded = false;
let scriptLoading = false;

interface IfoodWidgetWindow extends Window {
  iFoodWidget?: {
    init: (config: {
      widgetId: string;
      merchantIds: string[];
      autoShow?: boolean;
    }) => void;
  };
}

function initWidget(merchantId: string) {
  const win = window as IfoodWidgetWindow;
  if (win.iFoodWidget) {
    console.log('[iFoodWidget] Initializing with merchantId:', merchantId);
    win.iFoodWidget.init({
      widgetId: WIDGET_ID,
      merchantIds: [merchantId],
      autoShow: true,
    });
    return true;
  }
  console.warn('[iFoodWidget] iFoodWidget not available on window');
  return false;
}

export default function IfoodWidget() {
  const { merchantId, isActive, loading } = useIfoodSettings();
  const initializedRef = useRef(false);
  const merchantRef = useRef(merchantId);

  useEffect(() => {
    merchantRef.current = merchantId;
  }, [merchantId]);

  useEffect(() => {
    console.log('[iFoodWidget] Effect triggered', { merchantId, isActive, loading, initialized: initializedRef.current });

    if (loading) {
      console.log('[iFoodWidget] Still loading settings...');
      return;
    }
    if (!isActive) {
      console.log('[iFoodWidget] Integration is not active');
      return;
    }
    if (!merchantId) {
      console.log('[iFoodWidget] No merchantId configured');
      return;
    }
    if (initializedRef.current) {
      console.log('[iFoodWidget] Already initialized');
      return;
    }

    if (initWidget(merchantId)) {
      initializedRef.current = true;
      return;
    }

    if (!scriptLoaded && !scriptLoading) {
      console.log('[iFoodWidget] Loading script from', WIDGET_SCRIPT_URL);
      scriptLoading = true;
      const script = document.createElement('script');
      script.src = WIDGET_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        console.log('[iFoodWidget] Script loaded successfully');
        scriptLoaded = true;
        scriptLoading = false;
        if (merchantRef.current && !initializedRef.current) {
          initializedRef.current = initWidget(merchantRef.current);
        }
      };
      script.onerror = () => {
        console.error('[iFoodWidget] Failed to load script');
        scriptLoading = false;
      };
      document.head.appendChild(script);
    }
  }, [merchantId, isActive, loading]);

  return null;
}
