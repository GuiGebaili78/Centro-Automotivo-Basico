/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}", // Necessário para os relatórios Tremor
    ],
    theme: {
        transparent: "transparent",
        current: "current",
        extend: {
            colors: {
                // Definindo as cores que usamos no index.css
                primary: {
                    100: "#dbeafe", // Azul clarinho (para anéis de foco e backgrounds)
                    600: "#2563eb", // Azul principal
                    700: "#1d4ed8", // Azul hover
                    800: "#2b458a", // Azul Botão Sidebar
                },
                secondary: {
                    500: "#f97316", // Laranja/Amber
                    600: "#ea580c",
                },
                // Configuração específica para o Tremor herdar seu padrão
                tremor: {
                    brand: {
                        faint: "#dbeafe",
                        muted: "#bfdbfe",
                        subtle: "#60a5fa",
                        DEFAULT: "#2563eb",
                        emphasis: "#1d4ed8",
                        inverted: "#ffffff",
                    },
                    background: {
                        muted: "#f9fafb",
                        subtle: "#f3f4f6",
                        DEFAULT: "#ffffff",
                        emphasis: "#374151",
                    },
                    border: {
                        DEFAULT: "#e5e7eb",
                    },
                    ring: {
                        DEFAULT: "#e5e7eb",
                    },
                    content: {
                        subtle: "#9ca3af",
                        DEFAULT: "#6b7280",
                        emphasis: "#374151",
                        strong: "#111827",
                        inverted: "#ffffff",
                    },
                },
            },
            boxShadow: {
                // Um sombreado mais suave e moderno para seus cards
                'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            },
            borderRadius: {
                'tremor-small': '0.375rem',
                'tremor-default': '0.5rem',
                'tremor-full': '9999px',
            },
            fontSize: {
                'tremor-label': ['0.75rem', { lineHeight: '1rem' }],
                'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
                'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
                'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
            },
        },
    },
    // Esta parte é importante para o Tremor funcionar corretamente com as cores novas
    safelist: [
        {
            pattern: /^(bg|text|border|ring|stroke|fill)-(tremor|primary|secondary)/,
            variants: ['hover', 'ui-selected'],
        },
    ],
    plugins: [],
};