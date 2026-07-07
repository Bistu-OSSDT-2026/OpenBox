import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import PluginMarket from './pages/PluginMarket'
import PluginView from './components/PluginView'
import Settings from './pages/Settings'
import { useAppStore } from './store/app.store'

export default function App() {
  const currentPage = useAppStore((s) => s.currentPage)

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />
      case 'market':
        return <PluginMarket />
      case 'pluginView':
        return <PluginView />
      case 'settings':
        return <Settings />
      default:
        return <Home />
    }
  }

  return <MainLayout>{renderPage()}</MainLayout>
}
