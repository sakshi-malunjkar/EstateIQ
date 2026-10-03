import VapiModule from '@vapi-ai/web'

// @vapi-ai/web ships CommonJS; depending on the bundler the default import
// is either the class or the module namespace wrapping it.
const Vapi = VapiModule.default ?? VapiModule

const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY)

export default vapi
