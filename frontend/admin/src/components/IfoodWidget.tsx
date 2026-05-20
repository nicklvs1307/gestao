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
    win.iFoodWidget.init({
      widgetId: WIDGET_ID,
      merchantIds: [merchantId],
      autoShow: false,
    });
    return true;
  }
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
    if (loading || !isActive || !merchantId || initializedRef.current) return;

    if (initWidget(merchantId)) {
      initializedRef.current = true;
      return;
    }

    if (!scriptLoaded && !scriptLoading) {
      scriptLoading = true;
      const script = document.createElement('script');
      script.src = WIDGET_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        scriptLoaded = true;
        scriptLoading = false;
        if (merchantRef.current && !initializedRef.current) {
          initializedRef.current = initWidget(merchantRef.current);
        }
      };
      document.head.appendChild(script);
    }
  }, [merchantId, isActive, loading]);

  return null;
}
