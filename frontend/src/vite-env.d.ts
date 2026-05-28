/// <reference types="vite/client" />

// SCSS module declarations
declare module '*.scss' {
  const content: Record<string, string>
  export default content
}

// CSS module declarations
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
