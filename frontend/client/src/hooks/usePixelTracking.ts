import { useEffect, useCallback, useRef } from 'react';

interface PixelConfig {
  metaPixelId?: string | null;
  googleAnalyticsId?: string | null;
  internalPixelId?: string | null;
}

interface TrackEventOptions {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  num_items?: number;
  order_id?: string;
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

const loadMetaPixel = (pixelId: string) => {
  if (window.fbq) return;
  
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://connect.facebook.net/en_US/fbevents.js`;
  document.head.appendChild(script);

  window.fbq = function() {
    window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
  };
  window._fbq = window.fbq;
  window.fbq.queue = [];
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
};

const loadGA4 = (measurementId: string) => {
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
};

export const usePixelTracking = (config: PixelConfig) => {
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const { metaPixelId, googleAnalyticsId } = configRef.current;

    if (metaPixelId) {
      loadMetaPixel(metaPixelId);
    }

    if (googleAnalyticsId) {
      loadGA4(googleAnalyticsId);
    }
  }, []);

  const trackPageView = useCallback((pagePath?: string) => {
    const { metaPixelId, googleAnalyticsId } = configRef.current;

    if (metaPixelId) {
      window.fbq('track', 'PageView', {
        page_path: pagePath,
      });
    }

    if (googleAnalyticsId) {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
      });
    }
  }, []);

  const trackViewContent = useCallback((productName: string, productId: string, price: number, category?: string) => {
    const { metaPixelId, googleAnalyticsId } = configRef.current;

    if (metaPixelId) {
      window.fbq('track', 'ViewContent', {
        content_name: productName,
        content_type: 'product',
        content_ids: [productId],
        value: price,
        currency: 'BRL',
        content_category: category,
      });
    }

    if (googleAnalyticsId) {
      window.gtag('event', 'view_item', {
        item_id: productId,
        item_name: productName,
        item_category: category,
        price: price,
        currency: 'BRL',
      });
    }
  }, []);

  const trackAddToCart = useCallback((productName: string, productId: string, price: number, quantity: number = 1, category?: string) => {
    const { metaPixelId, googleAnalyticsId } = configRef.current;

    if (metaPixelId) {
      window.fbq('track', 'AddToCart', {
        content_name: productName,
        content_type: 'product',
        content_ids: [productId],
        value: price * quantity,
        currency: 'BRL',
        contents: [{ id: productId, quantity, item_price: price }],
        num_items: quantity,
      });
    }

    if (googleAnalyticsId) {
      window.gtag('event', 'add_to_cart', {
        items: [{
          item_id: productId,
          item_name: productName,
          item_category: category,
          price: price,
          quantity: quantity,
          currency: 'BRL',
        }],
      });
    }
  }, []);

  const trackInitiateCheckout = useCallback((total: number, items: Array<{ productId: string; name: string; price: number; quantity: number; category?: string }>) => {
    const { metaPixelId, googleAnalyticsId } = configRef.current;

    if (metaPixelId) {
      window.fbq('track', 'InitiateCheckout', {
        value: total,
        currency: 'BRL',
        contents: items.map(item => ({
          id: item.productId,
          quantity: item.quantity,
          item_price: item.price,
        })),
        num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      });
    }

    if (googleAnalyticsId) {
      window.gtag('event', 'begin_checkout', {
        value: total,
        currency: 'BRL',
        items: items.map(item => ({
          item_id: item.productId,
          item_name: item.name,
          item_category: item.category,
          price: item.price,
          quantity: item.quantity,
          currency: 'BRL',
        })),
      });
    }
  }, []);

  const trackPurchase = useCallback((orderId: string, total: number, items: Array<{ productId: string; name: string; price: number; quantity: number; category?: string }>) => {
    const { metaPixelId, googleAnalyticsId, internalPixelId } = configRef.current;

    if (metaPixelId) {
      window.fbq('track', 'Purchase', {
        content_type: 'product',
        value: total,
        currency: 'BRL',
        contents: items.map(item => ({
          id: item.productId,
          quantity: item.quantity,
          item_price: item.price,
        })),
        num_items: items.reduce((sum, item) => sum + item.quantity, 0),
        order_id: orderId,
      });
    }

    if (googleAnalyticsId) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        value: total,
        currency: 'BRL',
        items: items.map(item => ({
          item_id: item.productId,
          item_name: item.name,
          item_category: item.category,
          price: item.price,
          quantity: item.quantity,
          currency: 'BRL',
        })),
      });
    }

    if (internalPixelId) {
      console.log('[Internal Pixel] Purchase:', {
        orderId,
        total,
        items,
        pixelId: internalPixelId,
      });
    }
  }, []);

  return {
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
  };
};
