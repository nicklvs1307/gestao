/**
 * Converte HEX para HSL (apenas valores numéricos para o Tailwind 4)
 */
function hexToHslValues(hex: string): { h: number, s: number, l: number } {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
  
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
  
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
  
    return { 
        h: Math.round(h * 360), 
        s: Math.round(s * 100), 
        l: Math.round(l * 100) 
    };
}

export function hexToHsl(hex: string): string {
    const { h, s, l } = hexToHslValues(hex);
    return `${h} ${s}% ${l}%`;
}

function getContrastColor(hex: string): string {
    const { l } = hexToHslValues(hex);
    return l < 60 ? '0 0% 100%' : '222.2 47.4% 11.2%';
}

export function applyTheme(settings: any) {
    if (!settings) return;

    const root = document.documentElement;
    
    const primary = settings.primaryColor;
    const secondary = settings.secondaryColor;
    const background = settings.backgroundColor;

    if (primary) {
        root.style.setProperty('--primary', hexToHsl(primary));
        root.style.setProperty('--primary-foreground', getContrastColor(primary));
        root.style.setProperty('--ring', hexToHsl(primary));
    }
    
    if (secondary) {
        root.style.setProperty('--secondary', hexToHsl(secondary));
        root.style.setProperty('--secondary-foreground', getContrastColor(secondary));
        root.style.setProperty('--accent', hexToHsl(secondary));
        root.style.setProperty('--accent-foreground', getContrastColor(secondary));
    }

    if (background) {
        const hslBg = hexToHsl(background);
        root.style.setProperty('--background', hslBg);
        const foregroundColor = getContrastColor(background);
        root.style.setProperty('--foreground', foregroundColor);
        
        root.style.setProperty('--card', hslBg);
        root.style.setProperty('--card-foreground', foregroundColor);
        root.style.setProperty('--popover', hslBg);
        root.style.setProperty('--popover-foreground', foregroundColor);
        
        const { l } = hexToHslValues(background);
        if (l < 50) {
            root.style.setProperty('--border', '217 19% 27%');
            root.style.setProperty('--input', '217 19% 27%');
            root.style.setProperty('--muted', '217 19% 20%');
            root.style.setProperty('--muted-foreground', '215 20.2% 65.1%');
        } else {
            root.style.setProperty('--border', '214.3 31.8% 91.4%');
            root.style.setProperty('--input', '214.3 31.8% 91.4%');
            root.style.setProperty('--muted', '210 40% 96.1%');
            root.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%');
        }
    }

    if (settings.backgroundType === 'image' && settings.backgroundImageUrl) {
        document.body.style.backgroundImage = `url(${settings.backgroundImageUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
    } else if (background) {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = background;
    }
}
