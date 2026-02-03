/**
 * Converte HEX para HSL
 */
function hexToHslValues(hex: string): { h: number, s: number, l: number } {
    hex = hex.replace(/^#/, '');
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

/**
 * Determina se uma cor é escura ou clara para definir o contraste do texto
 * Retorna os valores HSL para Branco (texto claro) ou Preto (texto escuro)
 */
function getContrastColor(hex: string): string {
    const { l } = hexToHslValues(hex);
    // Se a luminosidade for menor que 60%, o fundo é escuro, então retorna branco (hsl 0 0% 100%)
    // Caso contrário, retorna um cinza muito escuro (hsl 222.2 47.4% 11.2%) para melhor leitura que preto puro
    return l < 60 ? '0 0% 100%' : '222.2 47.4% 11.2%';
}

/**
 * Aplica as cores do restaurante ao CSS root com harmonia calculada
 */
export function applyTheme(settings: any) {
    if (!settings) return;

    const root = document.documentElement;
    
    // Cores Base
    const primary = settings.primaryColor;
    const secondary = settings.secondaryColor;
    const background = settings.backgroundColor;

    // 1. Configura Cor Primária e seu Contraste (Texto dentro do botão primário)
    if (primary) {
        root.style.setProperty('--primary', hexToHsl(primary));
        root.style.setProperty('--primary-foreground', getContrastColor(primary));
        root.style.setProperty('--ring', hexToHsl(primary));
    }
    
    // 2. Configura Cor Secundária e seu Contraste
    if (secondary) {
        root.style.setProperty('--secondary', hexToHsl(secondary));
        root.style.setProperty('--secondary-foreground', getContrastColor(secondary));
        // Muted geralmente segue a secundária mas com menos saturação/brilho
        root.style.setProperty('--muted', hexToHsl(secondary)); 
        root.style.setProperty('--muted-foreground', getContrastColor(secondary));
    }

    // 3. Configura Background e o Texto Principal (Foreground)
    if (background) {
        root.style.setProperty('--background', hexToHsl(background));
        const foregroundColor = getContrastColor(background);
        root.style.setProperty('--foreground', foregroundColor);
        
        // Ajusta cores de borda e inputs para harmonizar com o fundo
        root.style.setProperty('--card', hexToHsl(background));
        root.style.setProperty('--card-foreground', foregroundColor);
        root.style.setProperty('--popover', hexToHsl(background));
        root.style.setProperty('--popover-foreground', foregroundColor);
        
        // Se o fundo for escuro, as bordas precisam ser claras, e vice-versa
        const { l } = hexToHslValues(background);
        if (l < 50) {
            root.style.setProperty('--border', '217 19% 27%'); // Slate-800
            root.style.setProperty('--input', '217 19% 27%');
        } else {
            root.style.setProperty('--border', '214.3 31.8% 91.4%'); // Slate-200
            root.style.setProperty('--input', '214.3 31.8% 91.4%');
        }
    }

    // Imagem de Fundo
    if (settings.backgroundType === 'image' && settings.backgroundImageUrl) {
        document.body.style.backgroundImage = `url(${settings.backgroundImageUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
        
        // Se tem imagem, assumimos que precisamos de um overlay ou contraste alto nos cards
        // Mas deixaremos o CSS dos cards lidar com a transparência/blur se necessário
    } else if (background) {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = background;
    }
}
