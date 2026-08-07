## 2024-06-04 - Unnecessary KaTeX Re-Renders
**Learning:** Math formulas rendered with KaTeX inside string interpolation cause significant CPU usage when the parent component updates (like typing or selecting answers in `TestEngine.jsx`), especially if they exist in lists of options.
**Action:** Always wrap components that render heavy LaTeX via external libraries (like `react-katex`) in `React.memo` if they primarily depend on static string props, so that they skip the re-parse/re-render cycle unless the text actually changes.
