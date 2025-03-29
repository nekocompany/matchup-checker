/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // ここ重要（Reactプロジェクトの場合）
  ],
  darkMode: 'class', // ← 追加（ダークモードを手動で切り替えるため）
  theme: {
    extend: {},
  },
  plugins: [],
}
