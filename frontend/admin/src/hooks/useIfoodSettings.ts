import { useState, useEffect, useRef } from 'react';
import { getIfoodSettings } from '../services/api/integrations';

interface IfoodSettings {
  ifoodMerchantId: string | null;
  ifoodIntegrationActive: boolean;
  ifoodCredentialsConfigured: boolean;
}

interface UseIfoodSettingsReturn {
  merchantId: string | null;
  isActive: boolean;
  loading: boolean;
}

let cachedSettings: IfoodSettings | null = null;

export function useIfoodSettings(): UseIfoodSettingsReturn {
  const [settings, setSettings] = useState<IfoodSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (cachedSettings || fetchingRef.current) return;

    fetchingRef.current = true;
    getIfoodSettings()
      .then((data) => {
        const rawMerchantId = data.ifoodMerchantId;
        const result: IfoodSettings = {
          ifoodMerchantId: rawMerchantId && rawMerchantId.trim() !== '' ? rawMerchantId : null,
          ifoodIntegrationActive: data.ifoodIntegrationActive === true,
          ifoodCredentialsConfigured: data.ifoodCredentialsConfigured === true,
        };
        cachedSettings = result;
        setSettings(result);
      })
      .catch(() => {
        setSettings({
          ifoodMerchantId: null,
          ifoodIntegrationActive: false,
          ifoodCredentialsConfigured: false,
        });
      })
      .finally(() => {
        setLoading(false);
        fetchingRef.current = false;
      });
  }, []);

  return {
    merchantId: settings?.ifoodMerchantId ?? null,
    isActive: settings?.ifoodIntegrationActive ?? false,
    loading,
  };
}
