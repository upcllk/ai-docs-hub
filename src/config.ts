import { LocalFileProvider } from './providers/LocalFileProvider'

export const provider = new LocalFileProvider({
  baseUrl: import.meta.env.BASE_URL ?? '/',
})

export const currentVersion: string = import.meta.env.VITE_DOC_VERSION ?? 'v1.0'
