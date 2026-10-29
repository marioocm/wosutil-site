import { mountSiteFooter, mountSiteHeader } from './components/site-layout'

const app = document.getElementById('app')
if (!app) throw new Error('Missing element #app')

mountSiteHeader(app, { active: 'simulator' })
mountSiteFooter(app)
