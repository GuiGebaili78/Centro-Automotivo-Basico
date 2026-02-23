/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        transparent: "transparent",
        current: "current",
        extend: {
            fontFamily: {
                // Força o sistema inteiro a usar Roboto como padrão
                sans: ['Roboto', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb', // Azul Principal
                    700: '#1d4ed8',
                    800: '#1e40af', // Azul Sidebar/Escuro
                    900: '#1e3a8a',
                },
                secondary: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    500: '#f97316', // Laranja Principal
                    600: '#ea580c',
                    700: '#c2410c',
                },
                success: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    500: '#22c55e', // Verde Principal (Lucros, Sucesso)
                    600: '#16a34a',
                    700: '#15803d',
                },
                highlight: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    500: '#a855f7', // Roxo Principal (Destaques, Ações Especiais)
                    600: '#9333ea',
                    700: '#7e22ce',
                },
                // Tremor colors...
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
                        muted: "#f8fafc", // Ajustado para a paleta slate
                        subtle: "#f1f5f9",
                        DEFAULT: "#ffffff",
                        emphasis: "#334155",
                    },
                    border: {
                        DEFAULT: "#e2e8f0",
                    },
                    ring: {
                        DEFAULT: "#e2e8f0",
                    },
                    content: {
                        subtle: "#94a3b8",
                        DEFAULT: "#64748b",
                        emphasis: "#334155",
                        strong: "#0f172a",
                        inverted: "#ffffff",
                    },
                },
            },
            boxShadow: {
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
    safelist: [
        {
            pattern: /^(bg|text|border|ring|stroke|fill)-(tremor|primary|secondary|success|highlight)/,
            variants: ['hover', 'ui-selected'],
        },
    ],
    plugins: [],
};